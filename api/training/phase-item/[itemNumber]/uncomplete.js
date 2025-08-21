// Vercel API Route: /api/training/phase/[phase]/item/[itemNumber]/uncomplete.js - Mark training item as incomplete
const { supabase } = require('../../../../../../lib/supabase');
const { requireCrew } = require('../../../../../../lib/auth');
const { trainingRateLimit } = require('../../../../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phase, itemNumber } = req.query;
    const userId = req.user.userId;

    if (!phase || !itemNumber) {
      return res.status(400).json({ error: 'Phase and item number are required' });
    }

    const phaseNum = parseInt(phase);
    const itemNum = parseInt(itemNumber);

    if (!phaseNum || phaseNum < 1 || phaseNum > 3) {
      return res.status(400).json({ error: 'Invalid phase number' });
    }

    if (!itemNum || itemNum < 1) {
      return res.status(400).json({ error: 'Invalid item number' });
    }

    // Get training session for this phase
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Training session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        error: 'Cannot modify completed training session',
        currentStatus: session.status
      });
    }

    // Get the specific training item
    const { data: item, error: itemError } = await supabase
      .from('training_items')
      .select('*')
      .eq('session_id', session.id)
      .eq('item_number', itemNum)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Training item not found' });
    }

    if (!item.completed_at) {
      return res.status(400).json({
        error: 'Training item is already incomplete'
      });
    }

    // Mark item as incomplete
    const { data: updatedItem, error: updateError } = await supabase
      .from('training_items')
      .update({
        completed: false,
        completed_at: null,
        instructor_initials: null,
        comments: null
      })
      .eq('id', item.id)
      .select()
      .single();

    if (updateError) {
      // console.error('Error updating training item:', updateError);
      return res.status(500).json({ error: 'Failed to uncomplete training item' });
    }

    // Update session status back to in_progress if it was completed
    if (session.status === 'completed') {
      const { error: sessionUpdateError } = await supabase
        .from('training_sessions')
        .update({
          status: 'in_progress',
          completed_at: null
        })
        .eq('id', session.id);

      if (sessionUpdateError) {
        // console.error('Error updating session status:', sessionUpdateError);
        // Don't fail the request, but log the error
      }
    }

    // Get updated progress (using completed_at for consistency)
    const allItemsResult = await db.query('SELECT id, completed_at FROM training_items WHERE session_id = $1', [session.id]);
    const allItems = allItemsResult.rows;
    const allItemsError = false;

    if (allItemsError) {
      // console.error('Error checking all items:', allItemsError);
      return res.status(500).json({ error: 'Failed to check completion status' });
    }

    const totalItems = allItems.length;
    const completedItems = allItems.filter(i => i.completed_at !== null).length;

    res.json({
      message: 'Training item marked as incomplete',
      item: {
        id: updatedItem.id,
        itemNumber: updatedItem.item_number,
        title: updatedItem.title,
        completed: updatedItem.completed,
        completedAt: updatedItem.completed_at,
        instructorInitials: updatedItem.instructor_initials,
        comments: updatedItem.comments
      },
      progress: {
        completedItems,
        totalItems,
        progressPercentage: Math.round((completedItems / totalItems) * 100),
        allCompleted: false
      }
    });

  } catch (_error) {
    // console.error('Error uncompleting training item:', _error);
    res.status(500).json({ error: 'Failed to uncomplete training item' });
  }
}

module.exports = trainingRateLimit(requireCrew(handler));
