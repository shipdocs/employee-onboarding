const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireManagerOrAdmin } = require('../../../../lib/auth');
const { invalidateContentCache } = require('../../../../lib/contentCache');
const { apiRateLimit } = require('../../../../lib/rateLimit');
const { db } = require('../../../../lib/database');

async function handler(req, res) {
  try {

    // User is available in req.user thanks to requireManagerOrAdmin wrapper
    const user = req.user;

    const { id } = req.query;

    if (req.method === 'GET') {
      // Get specific training phase
      const { data: phase, error } = await supabase
        .from('training_phases')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // console.error('Error fetching training phase:', error);
        return res.status(500).json({ error: 'Failed to fetch training phase' });
      }

      if (!phase) {
        return res.status(404).json({ error: 'Training phase not found' });
      }

      return res.status(200).json(phase);
    }

    if (req.method === 'PUT') {
      // Update training phase

      const {
        title,
        description,
        timeLimit,
        time_limit,
        items,
        status,
        passing_score,
        media_attachments,
        content_metadata,
        approval_notes
      } = req.body;

      // Handle both timeLimit and time_limit formats
      const actualTimeLimit = timeLimit || time_limit;

      if (!title || !actualTimeLimit || !items) {
        // Missing required fields:
        //   missingFields: validationErrors,
        //   title: !!title,
        //   timeLimit: !!actualTimeLimit,
        //   items: !!items
        // });
        return res.status(400).json({ error: 'Title, time limit, and items are required' });
      }

      // Check if phase exists
      const existingPhaseResult = await db.query('SELECT id, title, version FROM training_phases WHERE id = $1', [id]);
    const existingPhase = existingPhaseResult.rows[0];
    const fetchError = !existingPhase;

      if (fetchError || !existingPhase) {
        return res.status(404).json({ error: 'Training phase not found' });
      }

      // Create version history entry (if table exists)
      try {
        await supabase
          .from('training_phase_history')
          .insert({
            phase_id: id,
            version: existingPhase.version,
            title: existingPhase.title,
            created_by: user.id
          });
      } catch (historyError) {

        // Continue with update even if history fails
      }

      // Prepare update data with rich content support
      const updateData = {
        title,
        description,
        time_limit: actualTimeLimit,
        items,
        status: status || 'draft',
        updated_by: user.id,
        version: existingPhase.version + 1
      };

      // Add rich content fields if provided
      if (passing_score !== undefined) {
        updateData.passing_score = passing_score;
      }

      if (media_attachments !== undefined) {
        updateData.media_attachments = media_attachments;
      }

      if (content_metadata !== undefined) {
        updateData.content_metadata = {
          ...existingPhase.content_metadata,
          ...content_metadata,
          last_updated_via: 'rich_content_editor',
          last_update_date: new Date().toISOString()
        };
      }

      // Handle approval workflow
      if (status === 'published') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
        if (approval_notes) {
          updateData.approval_notes = approval_notes;
        }
      } else if (status === 'rejected') {
        updateData.approval_notes = approval_notes || 'Rejected';
      }

      const { data: updatedPhase, error } = await supabase
        .from('training_phases')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        // console.error('Error updating training phase:', error);
        return res.status(500).json({ error: 'Failed to update training phase' });
      }

      // Invalidate cache for this phase
      invalidateContentCache('phase', updatedPhase.phase_number);

      // Log the action (if audit_log table exists)
      try {
        await supabase
          .from('audit_log')
          .insert({
            user_id: user.id,
            action: 'update_training_phase',
            resource_type: 'training_phase',
            resource_id: id,
            details: { title, old_version: existingPhase.version, new_version: existingPhase.version + 1 }
          });
      } catch (auditError) {

        // Continue even if audit logging fails
      }

      return res.status(200).json(updatedPhase);
    }

    if (req.method === 'DELETE') {
      // Delete training phase
      const phaseResult = await db.query('SELECT id, title, phase_number FROM training_phases WHERE id = $1', [id]);
    const phase = phaseResult.rows[0];
    const fetchError = !phase;

      if (fetchError || !phase) {
        return res.status(404).json({ error: 'Training phase not found' });
      }

      // Check if phase is being used by any users (skip if table doesn't exist)
      try {
        const { data: activeUsers, error: usersError } = await supabase
          .from('user_training_progress')
          .select('user_id')
          .eq('phase', phase.phase_number)
          .limit(1);

        if (usersError && usersError.code !== '42P01') {
          // console.error('Error checking phase usage:', usersError);
          return res.status(500).json({ error: 'Failed to check phase usage' });
        }

        if (activeUsers && activeUsers.length > 0) {
          return res.status(409).json({
            error: 'Cannot delete training phase - it is currently being used by crew members'
          });
        }
      } catch (error) {
        // Table doesn't exist, continue with deletion

      }

      // Delete the phase
      const { error: deleteError } = await supabase
        .from('training_phases')
        .delete()
        .eq('id', id);

      if (deleteError) {
        // console.error('Error deleting training phase:', deleteError);
        return res.status(500).json({ error: 'Failed to delete training phase' });
      }

      // Log the action (if audit_log table exists)
      try {
        await supabase
          .from('audit_log')
          .insert({
            user_id: user.id,
            action: 'delete_training_phase',
            resource_type: 'training_phase',
            resource_id: id,
            details: { title: phase.title, phase_number: phase.phase_number }
          });
      } catch (auditError) {

        // Continue even if audit logging fails
      }

      return res.status(200).json({ message: 'Training phase deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    // console.error('❌ [ERROR] Critical error in training/phases/[id]:', error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with authentication wrapper
module.exports = apiRateLimit(requireManagerOrAdmin(handler));
