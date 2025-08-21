/**
 * Data Export/GDPR Management API
 * Admin interface for managing GDPR data export requests and deletion jobs
 */

const db = require('../../lib/database-direct');
const { authenticateRequest } = require('../../lib/auth');
const { adminRateLimit } = require('../../lib/rateLimit');
const fs = require('fs/promises');
const path = require('path');

async function getDataExports(req, res) {
  try {
    // Get all data exports with user information
    const { data: exports, error: exportsError } = await supabase
      .from('data_exports')
      .select(`
        *,
        users (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (exportsError) {
      console.error('Error fetching data exports:', exportsError);
      return res.status(500).json({ error: 'Failed to fetch data exports' });
    }

    // Calculate statistics
    const stats = {
      total: exports.length,
      pending: exports.filter(e => e.status === 'pending').length,
      processing: exports.filter(e => e.status === 'processing').length,
      completed: exports.filter(e => e.status === 'completed').length,
      failed: exports.filter(e => e.status === 'failed').length,
      totalSize: exports
        .filter(e => e.file_size)
        .reduce((sum, e) => sum + e.file_size, 0)
    };

    // Transform exports data
    const transformedExports = exports.map(exportItem => ({
      id: exportItem.id,
      export_type: exportItem.export_type,
      status: exportItem.status,
      file_path: exportItem.file_path,
      file_size: exportItem.file_size,
      user_email: exportItem.users?.email,
      user_name: exportItem.users ?
        `${exportItem.users.first_name} ${exportItem.users.last_name}`.trim() :
        null,
      created_at: exportItem.created_at,
      completed_at: exportItem.completed_at,
      error_message: exportItem.error_message
    }));

    return res.json({
      exports: transformedExports,
      stats: {
        ...stats,
        totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
      }
    });
  } catch (error) {
    console.error('Get data exports error:', error);
    return res.status(500).json({ error: 'Failed to fetch data exports' });
  }
}

async function createDataExport(req, res, user) {
  try {
    const { exportType, userId, includePersonalData = true, includeActivityData = true } = req.body;

    if (!exportType) {
      return res.status(400).json({ error: 'Export type is required' });
    }

    // Create data export record
    const { data: newExport, error: createError } = await supabase
      .from('data_exports')
      .insert({
        export_type: exportType,
        user_id: userId,
        status: 'pending',
        requested_by: user.id,
        export_options: {
          include_personal_data: includePersonalData,
          include_activity_data: includeActivityData,
          requested_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating data export:', createError);
      return res.status(500).json({ error: 'Failed to create data export' });
    }

    // Start background processing
    processDataExportAsync(newExport.id, exportType, userId, {
      include_personal_data: includePersonalData,
      include_activity_data: includeActivityData
    });

    // Log the creation
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'admin_data_export_requested',
        resource_type: 'data_export',
        resource_id: newExport.id,
        details: {
          export_id: newExport.id,
          export_type: exportType,
          target_user_id: userId,
          timestamp: new Date().toISOString()
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    return res.status(201).json({
      export: {
        id: newExport.id,
        export_type: newExport.export_type,
        status: newExport.status,
        created_at: newExport.created_at
      }
    });
  } catch (error) {
    console.error('Create data export error:', error);
    return res.status(500).json({ error: 'Failed to create data export' });
  }
}

async function processDataExportAsync(exportId, exportType, userId, options) {
  try {
    // Update status to processing
    await supabase
      .from('data_exports')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', exportId);

    // Collect user data based on export type
    let userData = {};

    if (exportType === 'full_user_data' || exportType === 'gdpr_export') {
      // Get user profile data
      if (options.include_personal_data) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        userData.profile = profile;
      }

      // Get activity data
      if (options.include_activity_data) {
        const { data: activities } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        userData.activities = activities;

        // Get training progress
        const { data: training } = await supabase
          .from('training_progress')
          .select('*')
          .eq('user_id', userId);

        userData.training = training;

        // Get quiz results
        const { data: quizzes } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', userId);

        userData.quizzes = quizzes;
      }
    }

    // Create export data with metadata
    const exportData = {
      export_metadata: {
        export_id: exportId,
        export_type: exportType,
        user_id: userId,
        created_at: new Date().toISOString(),
        options: options
      },
      user_data: userData
    };

    // Store export data in the export_data table instead of file system
    const { data: exportRecord, error: insertError } = await supabase
      .from('export_data')
      .insert({
        request_id: exportId,
        data: exportData,
        file_name: `export-${exportId}-${Date.now()}.json`,
        file_size: JSON.stringify(exportData).length
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to store export data: ${insertError.message}`);
    }

    const fileSize = JSON.stringify(exportData).length;

    // Update export record with completion
    await supabase
      .from('data_exports')
      .update({
        status: 'completed',
        file_path: exportRecord.file_name,
        file_size: fileSize,
        completed_at: new Date().toISOString()
      })
      .eq('id', exportId);

    console.log(`Data export ${exportId} completed successfully`);

  } catch (error) {
    console.error(`Data export ${exportId} failed:`, error);

    // Update export record with error
    await supabase
      .from('data_exports')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', exportId);
  }
}

async function handler(req, res) {
  try {
    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        return await getDataExports(req, res);
      case 'POST':
        return await createDataExport(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Data exports API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = adminRateLimit(handler);
