// API endpoint for linking existing training content to workflow items
const { requireAdmin } = require('../../../../lib/auth');
async function handler(req, res) {
  try {
    const { itemId } = req.query;
    const user = req.user;

    if (req.method === 'POST') {
      const { training_phase_id, training_item_number } = req.body;

      if (!training_phase_id) {
        return res.status(400).json({
          success: false,
          error: 'training_phase_id is required'
        });
      }

      const { supabase } = require('../../../../lib/supabase');
const { apiRateLimit } = require('../../../../lib/rateLimit');

      // Validate that the training phase exists and is published
      const { data: trainingPhase, error: phaseError } = await supabase
        .from('training_phases')
        .select('id, title, status, items')
        .eq('id', training_phase_id)
        .eq('status', 'published')
        .single();

      if (phaseError || !trainingPhase) {
        return res.status(404).json({
          success: false,
          error: 'Training phase not found or not published'
        });
      }

      // If training_item_number is provided, validate it exists
      if (training_item_number) {
        const trainingItem = trainingPhase.items?.find(
          item => item.number === training_item_number
        );

        if (!trainingItem) {
          return res.status(404).json({
            success: false,
            error: `Training item ${training_item_number} not found in phase ${trainingPhase.title}`
          });
        }
      }

      // Update the workflow item
      const { error: updateError } = await supabase
        .from('workflow_phase_items')
        .update({
          content_source: 'training_phase',
          training_phase_id: training_phase_id,
          training_item_number: training_item_number || '01'
        })
        .eq('id', itemId);

      if (updateError) {
        throw updateError;
      }

      return res.status(200).json({
        success: true,
        message: 'Training content linked successfully',
        workflow_item_id: itemId,
        training_phase_id: training_phase_id,
        training_item_number: training_item_number || '01',
        training_phase_title: trainingPhase.title
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [API] Link training content endpoint error:', _error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: _error.message
    });
  }
}

module.exports = apiRateLimit(requireAdmin(handler));
