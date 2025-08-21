const { requireManagerOrAdmin } = require('../../../lib/auth.js');
const { workflowService } = require('../../../lib/workflowService.js');
const { apiRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  try {
    const user = req.user;
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({ error: 'Workflow slug is required' });
    }

    if (req.method === 'GET') {
      try {
        // Get workflow by slug with phases
        const workflow = await workflowService.getWorkflowBySlug(slug);
        if (!workflow) {
          return res.status(404).json({ error: `Workflow not found: ${slug}` });
        }

        return res.status(200).json(workflow);
      } catch (error) {
        console.error('❌ [GET] Failed to fetch workflow by slug:', error);
        return res.status(500).json({ error: 'Failed to fetch workflow' });
      }
    }

    // Handle other HTTP methods if needed in the future
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ [WORKFLOW-SLUG] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiRateLimit(requireManagerOrAdmin(handler));
