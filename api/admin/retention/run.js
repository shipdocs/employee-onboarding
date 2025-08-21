// Vercel API Route: /api/admin/retention/run.js
const db = require('../../../lib/database-direct');
const { authenticateRequest } = require('../../../lib/auth');
const { wrapWithErrorHandling } = require('../../../lib/apiHandler');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  // Verify admin authentication with proper blacklist checking
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dryRun = !(req.body && req.body.dryRun === false);
  const start = Date.now();

  const { data, error } = await supabase.rpc('perform_data_retention_run', { dry_run: dryRun });
  const ms = Date.now() - start;

  if (error) {
    return res.status(500).json({ error: 'Retention run failed', details: error.message, durationMs: ms});
  }

  return res.status(200).json({ dryRun, results: data || [], durationMs: ms});
}

// export with error handling
module.exports = adminRateLimit(wrapWithErrorHandling(handler, { allowedMethods: ['POST'], requireAuth: true }));
