const { supabase } = require('../../../lib/supabase.js');
const { requireAuth } = require('../../../lib/auth.js');
const { apiRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  try {

    // User is available in req.user thanks to requireManagerOrAdmin wrapper
    const user = req.user;

    if (req.method === 'GET') {

      // Get all training phases
      const { data: phases, error } = await supabase
        .from('training_phases')
        .select('*')
        .order('phase_number', { ascending: true });

      if (error) {
        // console.error('❌ [DB] Error fetching training phases:', _error);
        // Check if table doesn't exist
        if (error.code === '42P01') {

          return res.status(200).json([]);
        }
        return res.status(500).json({ error: 'Failed to fetch training phases' });
      }

      return res.status(200).json(phases || []);
    }

    if (req.method === 'POST') {
      // Only managers/admins can create training phases
      if (user.role !== 'manager' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions to create training phases' });
      }

      // Create new training phase with enhanced rich content support
      const {
        title,
        description,
        time_limit,
        items,
        passing_score = 80,
        status = 'draft',
        media_attachments = [],
        content_metadata = {}
      } = req.body;

      if (!title || !time_limit || !items) {
        return res.status(400).json({ error: 'Title, time limit, and items are required' });
      }

      // Validate items structure
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array' });
      }

      // Validate each item
      for (const item of items) {
        if (!item.title || !item.number || !item.category) {
          return res.status(400).json({ error: 'Each item must have title, number, and category' });
        }
      }

      // Get the next phase number
      const { data: lastPhase } = await supabase
        .from('training_phases')
        .select('phase_number')
        .order('phase_number', { ascending: false })
        .limit(1)
        .single();

      const phaseNumber = lastPhase ? lastPhase.phase_number + 1 : 1;

      const { data: newPhase, error } = await supabase
        .from('training_phases')
        .insert({
          phase_number: phaseNumber,
          title,
          description,
          time_limit,
          items,
          status,
          version: 1,
          passing_score,
          media_attachments,
          content_metadata: {
            ...content_metadata,
            created_via: 'rich_content_editor',
            creation_date: new Date().toISOString()
          },
          created_by: user.id,
          updated_by: user.id
        })
        .select('*')
        .single();

      if (error) {
        // console.error('Error creating training phase:', _error);
        return res.status(500).json({ error: 'Failed to create training phase' });
      }

      // Log the action
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'create_training_phase',
          resource_type: 'training_phase',
          resource_id: newPhase.id,
          details: { title, phase_number: phaseNumber }
        });

      return res.status(201).json(newPhase);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in training/phases:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with authentication wrapper that allows all authenticated users
module.exports = apiRateLimit(requireAuth(handler));
