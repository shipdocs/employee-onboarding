// Vercel API Route: /api/crew/onboarding/progress.js - Manage onboarding progress
const { supabase } = require('../../../lib/supabase');
const { requireCrew } = require('../../../lib/auth');
const { trainingRateLimit } = require('../../../lib/rateLimit');
async function handler(req, res) {
  try {
    const userId = req.user.userId;

    if (req.method === 'GET') {
      // Get current onboarding progress
      const { data: progress, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        // console.error('Error fetching onboarding progress:', _error);
        return res.status(500).json({ error: 'Database error' });
      }

      return res.json({ progress: progress || null });

    } else if (req.method === 'POST') {
      // Create or update onboarding progress
      const {
        current_step,
        completed_steps,
        selected_role_focus,
        custom_preferences,
        is_completed
      } = req.body;

      // Check if progress already exists
      const { data: existingProgress } = await supabase
        .from('onboarding_progress')
        .select('id')
        .eq('user_id', userId)
        .single();

      let result;
      if (existingProgress) {
        // Update existing progress
        const updateData = {
          updated_at: new Date().toISOString()
        };

        if (current_step !== undefined) updateData.current_step = current_step;
        if (completed_steps !== undefined) updateData.completed_steps = completed_steps;
        if (selected_role_focus !== undefined) updateData.selected_role_focus = selected_role_focus;
        if (custom_preferences !== undefined) updateData.custom_preferences = custom_preferences;
        if (is_completed !== undefined) {
          updateData.is_completed = is_completed;
          if (is_completed) {
            updateData.completed_at = new Date().toISOString();
          }
        }

        const { data, error } = await supabase
          .from('onboarding_progress')
          .update(updateData)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          // console.error('Error updating onboarding progress:', _error);
          // console.error('Update data was:', updateData);
          // console.error('User ID:', userId);
          return res.status(500).json({
            error: 'Failed to update progress',
            details: _error.message,
            code: error.code
          });
        }

        result = data;
      } else {
        // Create new progress
        const { data, error } = await supabase
          .from('onboarding_progress')
          .insert({
            user_id: userId,
            current_step: current_step || 0,
            completed_steps: completed_steps || [],
            selected_role_focus,
            custom_preferences: custom_preferences || {},
            is_completed: is_completed || false,
            completed_at: is_completed ? new Date().toISOString() : null
          })
          .select()
          .single();

        if (error) {
          // console.error('Error creating onboarding progress:', _error);
          return res.status(500).json({ error: 'Failed to create progress' });
        }

        result = data;
      }

      // Update user table if onboarding is completed
      if (is_completed) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            onboarding_completed_at: new Date().toISOString(),
            training_preferences: custom_preferences || {}
          })
          .eq('id', userId);

        if (userUpdateError) {
          // console.error('Error updating user onboarding completion:', userUpdateError);
        }
      }

      return res.json({ progress: result });

    } else if (req.method === 'DELETE') {
      // Reset onboarding progress (for testing)
      const { error } = await supabase
        .from('onboarding_progress')
        .delete()
        .eq('user_id', userId);

      if (error) {
        // console.error('Error deleting onboarding progress:', _error);
        return res.status(500).json({ error: 'Failed to reset progress' });
      }

      // Also clear user onboarding completion
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          onboarding_completed_at: null,
          training_preferences: {}
        })
        .eq('id', userId);

      if (userUpdateError) {
        // console.error('Error clearing user onboarding completion:', userUpdateError);
      }

      return res.json({ message: 'Onboarding progress reset successfully' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (_error) {
    // console.error('Error in onboarding progress endpoint:', _error);
    res.status(500).json({
      error: 'Failed to manage onboarding progress',
      message: _error.message
    });
  }
}

module.exports = trainingRateLimit(requireCrew(handler));
