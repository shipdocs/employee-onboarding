/**
 * GDPR Self-Service API - Request Data Export
 * Allows users to request their personal data export
 */

const { supabase } = require('../../lib/supabase');
const { authenticateRequest } = require('../../lib/auth');
const { applyApiSecurityHeaders } = require('../../lib/securityHeaders');
const { userRateLimit } = require('../../lib/rateLimit');

module.exports = async function handler(req, res) {
  // Apply security headers
  applyApiSecurityHeaders(res);

  // Apply rate limiting (stricter for export requests)
  const rateLimitResult = await userRateLimit(req, res, { max: 5, windowMs: 60 * 60 * 1000 }); // 5 per hour
  if (!rateLimitResult.success) {
    return res.status(429).json({
      error: 'Too many export requests. Please wait before requesting again.',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { exportType } = req.body;

    // Validate export type
    const validExportTypes = ['personal', 'complete'];
    if (!exportType || !validExportTypes.includes(exportType)) {
      return res.status(400).json({
        error: 'Invalid export type. Must be "personal" or "complete"'
      });
    }

    // Check for existing pending requests (with fallback if table doesn't exist)
    let existingRequests = [];
    try {
      const { data, error: checkError } = await supabase
        .from('data_exports')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'processing')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (checkError && checkError.code !== '42P01') { // 42P01 = table doesn't exist
        console.error('Error checking existing requests:', checkError);
        return res.status(500).json({ error: 'Failed to check existing requests' });
      }

      existingRequests = data || [];
    } catch (error) {
      console.log('Data exports table not available, proceeding without check');
      existingRequests = [];
    }

    if (existingRequests && existingRequests.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending export request. Please wait for it to complete.',
        existingRequest: existingRequests[0]
      });
    }

    // Create export request
    const exportRequest = {
      user_id: user.id,
      export_type: exportType,
      status: 'processing',
      requested_at: new Date().toISOString(),
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        requestedSections: exportType === 'complete' ? [
          'profile',
          'training_progress',
          'certificates',
          'quiz_results',
          'audit_logs',
          'preferences'
        ] : [
          'profile',
          'preferences'
        ]
      }
    };

    // Try to create export request (with fallback if table doesn't exist)
    let newRequest;
    try {
      const { data, error: insertError } = await supabase
        .from('data_exports')
        .insert(exportRequest)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating export request:', insertError);
        return res.status(500).json({ error: 'Failed to create export request' });
      }

      newRequest = data;
    } catch (error) {
      console.error('Data exports table not available:', error);
      return res.status(503).json({
        error: 'Data export service is currently unavailable. Please try again later.',
        details: 'Database table not configured'
      });
    }

    // Log audit event
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'request_data_export',
        resource_type: 'data_export',
        resource_id: newRequest.id,
        details: {
          exportType,
          requestId: newRequest.id,
          estimatedProcessingTime: exportType === 'complete' ? '2-4 hours' : '30-60 minutes'
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    // Trigger background processing (in a real implementation, this would be a queue job)
    // For now, we'll simulate with a simple status update after a delay
    setTimeout(async () => {
      try {
        await processDataExport(newRequest.id, user.id, exportType);
      } catch (error) {
        console.error('Background export processing error:', error);
      }
    }, 1000); // Start processing after 1 second

    res.status(201).json({
      success: true,
      message: 'Data export request created successfully',
      request: {
        id: newRequest.id,
        type: 'export',
        exportType: newRequest.export_type,
        status: newRequest.status,
        createdAt: newRequest.created_at,
        estimatedCompletion: new Date(Date.now() + (exportType === 'complete' ? 4 * 60 * 60 * 1000 : 60 * 60 * 1000)).toISOString()
      }
    });

  } catch (error) {
    console.error('Export request API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Background function to process data export
 * In production, this would be handled by a queue system
 */
async function processDataExport(requestId, userId, exportType) {
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, exportType === 'complete' ? 30000 : 10000));

    // Collect user data based on export type
    const userData = await collectUserData(userId, exportType);

    // Generate export file (in production, this would create a ZIP file)
    const fileName = `data-export-${userId}-${Date.now()}.json`;
    const fileSize = JSON.stringify(userData).length;

    // Update request status
    const { error: updateError } = await supabase
      .from('data_exports')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_name: fileName,
        file_size: fileSize,
        download_url: `/api/gdpr/download/${requestId}`, // This would be a signed URL in production
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating export request:', updateError);
      throw updateError;
    }

    // Store the actual data (in production, this would be stored in secure file storage)
    const { error: dataError } = await supabase
      .from('export_data')
      .insert({
        request_id: requestId,
        data: userData,
        created_at: new Date().toISOString()
      });

    if (dataError) {
      console.error('Error storing export data:', dataError);
      throw dataError;
    }

    console.log(`Data export completed for request ${requestId}`);

  } catch (error) {
    console.error('Export processing error:', error);

    // Update request status to failed
    await supabase
      .from('data_exports')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId);
  }
}

/**
 * Collect user data for export
 */
async function collectUserData(userId, exportType) {
  const userData = {
    exportInfo: {
      userId,
      exportType,
      generatedAt: new Date().toISOString(),
      dataRetentionPolicy: 'Data will be available for download for 7 days'
    }
  };

  try {
    // Always include basic profile data
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, created_at, updated_at')
      .eq('id', userId)
      .single();

    userData.profile = profile;

    if (exportType === 'complete') {
      // Include training progress
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      userData.trainingProgress = progress || [];

      // Include certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId);

      userData.certificates = certificates || [];

      // Include quiz results
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId);

      userData.quizResults = quizResults || [];

      // Include audit logs (last 90 days only for privacy)
      const { data: auditLogs } = await supabase
        .from('audit_log')
        .select('action, resource_type, created_at, details')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      userData.auditLogs = auditLogs || [];
    }

    return userData;

  } catch (error) {
    console.error('Error collecting user data:', error);
    throw error;
  }
}
