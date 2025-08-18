/**
 * GDPR Self-Service API - Get User's Requests
 * Allows users to view their own GDPR requests
 */

const { supabase } = require('../../lib/supabase');
const { authenticateRequest } = require('../../lib/auth');
const { applyApiSecurityHeaders } = require('../../lib/securityHeaders');
const { userRateLimit } = require('../../lib/rateLimit');

module.exports = async function handler(req, res) {
  // Apply security headers
  applyApiSecurityHeaders(res);

  // Apply rate limiting
  const rateLimitResult = await userRateLimit(req, res);
  if (!rateLimitResult.success) {
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: rateLimitResult.retryAfter 
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's GDPR requests
    const { data: exportRequests, error: exportError } = await supabase
      .from('data_exports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (exportError) {
      console.error('Error fetching export requests:', exportError);
      return res.status(500).json({ error: 'Failed to fetch export requests' });
    }

    const { data: deletionRequests, error: deletionError } = await supabase
      .from('data_deletions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (deletionError) {
      console.error('Error fetching deletion requests:', deletionError);
      return res.status(500).json({ error: 'Failed to fetch deletion requests' });
    }

    // Combine and format requests
    const allRequests = [
      ...(exportRequests || []).map(req => ({
        id: req.id,
        type: 'export',
        exportType: req.export_type,
        status: req.status,
        createdAt: req.created_at,
        completedAt: req.completed_at,
        fileName: req.file_name,
        fileSize: req.file_size
      })),
      ...(deletionRequests || []).map(req => ({
        id: req.id,
        type: 'deletion',
        deletionType: req.deletion_type,
        status: req.status,
        createdAt: req.created_at,
        completedAt: req.completed_at,
        reason: req.reason
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Log audit event
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'view_gdpr_requests',
        resource_type: 'gdpr_requests',
        resource_id: user.id,
        details: { requestCount: allRequests.length },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    res.status(200).json({
      success: true,
      requests: allRequests,
      summary: {
        totalRequests: allRequests.length,
        exportRequests: exportRequests?.length || 0,
        deletionRequests: deletionRequests?.length || 0,
        pendingRequests: allRequests.filter(r => r.status === 'processing').length,
        completedRequests: allRequests.filter(r => r.status === 'completed').length
      }
    });

  } catch (error) {
    console.error('GDPR requests API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
