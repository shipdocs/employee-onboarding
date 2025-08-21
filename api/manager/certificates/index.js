/**
 * API endpoint for listing all certificates
 * GET /api/manager/certificates
 *
 * This endpoint allows managers to view all certificates in the system
 * with filtering and pagination options.
 */

const db = require('../../../lib/database');
const { requireManager } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  try {
    const managerId = req.user.userId;

    // Parse query parameters
    const {
      page = 1,
      limit = 10,
      user_id,
      certificate_type,
      from_date,
      to_date,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Start building the query
    let query = supabase
      .from('certificates')
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          position,
          vessel_assignment
        )
      `);

    // Apply filters if provided
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (certificate_type) {
      query = query.eq('certificate_type', certificate_type);
    }

    if (from_date) {
      query = query.gte('issued_at', from_date);
    }

    if (to_date) {
      query = query.lte('issued_at', to_date);
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute the query
    const { data: certificates, error, count } = await query;

    if (error) {
      // console.error('Error fetching certificates:', error);
      // console.error('Query details:', { sort_by, sort_order, page, limit });
      return res.status(500).json({
        error: 'Failed to fetch certificates',
        details: error.message,
        query: { sort_by, sort_order, page, limit }
      });
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      // console.error('Error counting certificates:', countError);
      return res.status(500).json({ error: 'Failed to count certificates' });
    }

    // Return the certificates with pagination info
    return res.status(200).json({
      certificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    // console.error('Error in certificates list endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = adminRateLimit(requireManager(handler));
