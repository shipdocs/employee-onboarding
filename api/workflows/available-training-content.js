// API endpoint to get available training content for linking to workflows
const { requireAdmin } = require('../../lib/auth');
const db = require('../../lib/database-direct');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  try {
    const user = req.user;

    if (req.method === 'GET') {

      // Get all published training phases with their items
      const { data: trainingPhases, error } = await supabase
        .from('training_phases')
        .select('id, phase_number, title, description, items, time_limit, status')
        .eq('status', 'published')
        .order('phase_number');

      if (error) {
        throw error;
      }

      // Transform the data to make it easier to use in the UI
      const availableContent = trainingPhases?.map(phase => ({
        id: phase.id,
        phase_number: phase.phase_number,
        title: phase.title,
        description: phase.description,
        time_limit: phase.time_limit,
        items: phase.items?.map(item => ({
          number: item.number,
          title: item.title,
          description: item.description,
          category: item.category,
          has_rich_content: !!(
            item.content?.overview ||
            item.content?.objectives?.length > 0 ||
            item.content?.keyPoints?.length > 0 ||
            item.content?.procedures?.length > 0
          )
        })) || []
      })) || [];

      return res.status(200).json({
        success: true,
        training_phases: availableContent,
        total_phases: availableContent.length,
        total_items: availableContent.reduce((sum, phase) => sum + phase.items.length, 0)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [API] Available training content endpoint error:', _error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: _error.message
    });
  }
}

module.exports = apiRateLimit(requireAdmin(handler));
