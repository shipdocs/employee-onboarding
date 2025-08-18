// Vercel API Route: /api/admin/audit-log.js
const { supabase } = require('../../lib/supabase');
const { authenticateRequest } = require('../../lib/auth');
const { adminRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  // Verify admin authentication with proper blacklist checking
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = 1,
      limit = 25,
      user_id,
      action,
      resource_type,
      from_date,
      to_date
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Build the query
    let query = supabase
      .from('audit_log')
      .select(`
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        created_at,
        users!inner(
          id,
          email,
          first_name,
          last_name,
          role
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (resource_type) {
      query = query.eq('resource_type', resource_type);
    }

    if (from_date) {
      query = query.gte('created_at', from_date);
    }

    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    // Apply pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data: auditLogs, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', _error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    // Transform the data for frontend consumption
    const transformedLogs = auditLogs.map(log => ({
      id: log.id,
      user_id: log.user_id,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
      user: log.users ? {
        id: log.users.id,
        email: log.users.email,
        first_name: log.users.first_name,
        last_name: log.users.last_name,
        role: log.users.role,
        full_name: `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim()
      } : null
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    return res.json({
      data: transformedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      filters: {
        user_id,
        action,
        resource_type,
        from_date,
        to_date
      }
    });

  } catch (_error) {
    console.error('Audit log API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = adminRateLimit(handler);
