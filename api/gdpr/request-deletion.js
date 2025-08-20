/**
 * GDPR Self-Service API - Request Data Deletion
 * Allows users to request deletion of their personal data (Right to be Forgotten)
 */

const { supabase } = require('../../lib/supabase');
const { authenticateRequest } = require('../../lib/auth');
const { applyApiSecurityHeaders } = require('../../lib/securityHeaders');
const { userRateLimit } = require('../../lib/rateLimit');

module.exports = async function handler(req, res) {
  // Apply security headers
  applyApiSecurityHeaders(res);

  // Apply strict rate limiting for deletion requests
  const rateLimitResult = await userRateLimit(req, res, { max: 2, windowMs: 24 * 60 * 60 * 1000 }); // 2 per day
  if (!rateLimitResult.success) {
    return res.status(429).json({
      error: 'Too many deletion requests. Please contact support if you need assistance.',
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

    const { confirmationText, reason } = req.body;

    // Validate confirmation text
    if (confirmationText !== 'DELETE MY DATA') {
      return res.status(400).json({
        error: 'Invalid confirmation text. Please type exactly "DELETE MY DATA" to confirm.'
      });
    }

    // Check for existing pending deletion requests
    const { data: existingRequests, error: checkError } = await supabase
      .from('data_deletions')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .in('status', ['processing', 'pending_approval'])
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (checkError) {
      console.error('Error checking existing deletion requests:', checkError);
      return res.status(500).json({ error: 'Failed to check existing requests' });
    }

    if (existingRequests && existingRequests.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending deletion request. Please contact support for assistance.',
        existingRequest: existingRequests[0]
      });
    }

    // Check if user has active training or certificates that need to be retained
    const { data: activeTraining, error: trainingError } = await supabase
      .from('user_progress')
      .select('id, phase_id, status')
      .eq('user_id', user.id)
      .eq('status', 'in_progress');

    if (trainingError) {
      console.error('Error checking active training:', trainingError);
      return res.status(500).json({ error: 'Failed to check training status' });
    }

    const { data: certificates, error: certError } = await supabase
      .from('certificates')
      .select('id, certificate_type, issued_at')
      .eq('user_id', user.id)
      .gte('issued_at', new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString()); // Last 5 years

    if (certError) {
      console.error('Error checking certificates:', certError);
      return res.status(500).json({ error: 'Failed to check certificates' });
    }

    // Determine deletion type based on data retention requirements
    let deletionType = 'complete';
    let retentionNotice = null;

    if (certificates && certificates.length > 0) {
      deletionType = 'partial';
      retentionNotice = 'Some data (certificates and related training records) must be retained for legal compliance (maritime regulations require 5-year retention). Personal identifiers will be anonymized.';
    }

    if (activeTraining && activeTraining.length > 0) {
      return res.status(400).json({
        error: 'Cannot process deletion request while you have active training in progress. Please complete or cancel your training first.',
        activeTraining: activeTraining.map(t => ({ id: t.id, phaseId: t.phase_id }))
      });
    }

    // Create deletion request
    const deletionRequest = {
      user_id: user.id,
      deletion_type: deletionType,
      status: deletionType === 'complete' ? 'processing' : 'pending_approval',
      reason: reason || 'User requested data deletion via self-service portal',
      requested_at: new Date().toISOString(),
      confirmation_text: confirmationText,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        retentionNotice,
        certificatesCount: certificates?.length || 0,
        activeTrainingCount: activeTraining?.length || 0,
        estimatedProcessingTime: deletionType === 'complete' ? '24-48 hours' : '3-5 business days (requires manual review)'
      }
    };

    const { data: newRequest, error: insertError } = await supabase
      .from('data_deletions')
      .insert(deletionRequest)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating deletion request:', insertError);
      return res.status(500).json({ error: 'Failed to create deletion request' });
    }

    // Log audit event
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'request_data_deletion',
        resource_type: 'data_deletion',
        resource_id: newRequest.id,
        details: {
          deletionType,
          requestId: newRequest.id,
          retentionNotice,
          requiresApproval: deletionType === 'partial'
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    // Send notification to compliance team for partial deletions
    if (deletionType === 'partial') {
      await notifyComplianceTeam(newRequest, user);
    } else {
      // Start automatic processing for complete deletions
      setTimeout(async () => {
        try {
          await processDataDeletion(newRequest.id, user.id, deletionType);
        } catch (error) {
          console.error('Background deletion processing error:', error);
        }
      }, 1000);
    }

    res.status(201).json({
      success: true,
      message: deletionType === 'complete'
        ? 'Data deletion request created successfully. Processing will begin shortly.'
        : 'Data deletion request created successfully. Manual review required due to legal retention requirements.',
      request: {
        id: newRequest.id,
        type: 'deletion',
        deletionType: newRequest.deletion_type,
        status: newRequest.status,
        createdAt: newRequest.created_at,
        retentionNotice,
        estimatedCompletion: deletionType === 'complete'
          ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Deletion request API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Notify compliance team for manual review
 */
async function notifyComplianceTeam(deletionRequest, user) {
  try {
    // In production, this would send an email or create a ticket
    console.log(`Manual deletion review required for user ${user.id}, request ${deletionRequest.id}`);

    // Create a notification record
    await supabase
      .from('compliance_notifications')
      .insert({
        type: 'data_deletion_review',
        priority: 'high',
        user_id: user.id,
        request_id: deletionRequest.id,
        message: `Data deletion request requires manual review due to legal retention requirements. User: ${user.email}`,
        created_at: new Date().toISOString(),
        assigned_to: 'compliance-team'
      });

  } catch (error) {
    console.error('Error notifying compliance team:', error);
  }
}

/**
 * Background function to process data deletion
 */
async function processDataDeletion(requestId, userId, deletionType) {
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds for demo

    if (deletionType === 'complete') {
      // Complete deletion - remove all user data
      await performCompleteDeletion(userId);
    } else {
      // Partial deletion - anonymize but retain required data
      await performPartialDeletion(userId);
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('data_deletions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_by: 'system'
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating deletion request:', updateError);
      throw updateError;
    }

    console.log(`Data deletion completed for request ${requestId}`);

  } catch (error) {
    console.error('Deletion processing error:', error);

    // Update request status to failed
    await supabase
      .from('data_deletions')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId);
  }
}

/**
 * Perform complete data deletion
 */
async function performCompleteDeletion(userId) {
  // In production, this would carefully delete data while preserving referential integrity
  console.log(`Performing complete deletion for user ${userId}`);

  // This is a simulation - in production you'd need to:
  // 1. Delete user data from all tables
  // 2. Anonymize audit logs
  // 3. Remove file uploads
  // 4. Update foreign key references
  // 5. Preserve minimal data for legal/audit purposes
}

/**
 * Perform partial deletion (anonymization)
 */
async function performPartialDeletion(userId) {
  // In production, this would anonymize personal data while retaining required records
  console.log(`Performing partial deletion (anonymization) for user ${userId}`);

  // This is a simulation - in production you'd need to:
  // 1. Replace personal identifiers with anonymous IDs
  // 2. Remove contact information
  // 3. Retain training records and certificates
  // 4. Update audit logs to remove personal data
  // 5. Maintain data integrity for compliance
}
