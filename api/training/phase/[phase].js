// Vercel API Route: /api/training/phase/[phase].js - Get training phase details
// This endpoint provides training phase details for crew members

const db = require('../../../lib/database');
const { requireAuth } = require('../../../lib/auth');
const { trainingRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phase } = req.query;
    const userId = req.user.userId;

    if (!phase) {
      return res.status(400).json({ error: 'Phase is required' });
    }

    const phaseNum = parseInt(phase);
    if (!phaseNum || phaseNum < 1 || phaseNum > 3) {
      return res.status(400).json({ error: 'Invalid phase number' });
    }

    // Get training session for this phase
    const { data: sessions, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessionError) {
      // console.error('Error fetching training session:', sessionError);
      return res.status(500).json({ error: 'Failed to fetch training session' });
    }

    if (!sessions || sessions.length === 0) {

      // Create a new training session for this phase
      const { data: newSession, error: createError } = await supabase
        .from('training_sessions')
        .insert({
          user_id: userId,
          phase: phaseNum,
          status: 'not_started',
          due_date: new Date(Date.now() + (phaseNum * 7 * 24 * 60 * 60 * 1000)).toISOString()
        })
        .select()
        .single();

      if (createError) {
        // console.error('Error creating training session:', createError);
        return res.status(500).json({ error: 'Failed to create training session' });
      }

      // Use the newly created session
      sessions = [newSession];
    }

    const session = sessions[0];

    // Get training items for this session
    const { data: trainingItems, error: itemsError } = await supabase
      .from('training_items')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      // console.error('Error fetching training items:', itemsError);
      // Don't fail if training items are missing, just continue with empty array
    }

    // Get quiz results for this phase
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .order('completed_at', { ascending: false });

    if (quizError) {
      // console.error('Error fetching quiz results:', quizError);
    }

    // Calculate progress
    const items = trainingItems || [];
    const completedItems = items.filter(item => item.completed).length;
    const totalItems = items.length;
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Get phase information from database
    const phaseInfoResult = await db.query('SELECT * FROM training_phases WHERE phase_number = $1', [phaseNum]);
    const phaseInfo = phaseInfoResult.rows[0];
    const phaseError = !phaseInfo;

    if (phaseError) {
      // console.error('Error fetching phase info:', phaseError);
    }

    // Format response to match frontend expectations
    const response = {
      id: session.id,
      phase: phaseNum,
      title: phaseInfo?.title || `Phase ${phaseNum}`,
      description: phaseInfo?.description || '',
      status: session.status,
      completedItems: completedItems,
      totalItems: totalItems || phaseInfo?.items?.length || 0,
      actualItemCount: totalItems || phaseInfo?.items?.length || 0,
      progressPercentage: progressPercentage,
      items: items.map((item, index) => ({
        id: item.id,
        number: item.item_number || (index + 1).toString().padStart(2, '0'),
        title: item.title,
        description: item.description,
        completed: item.completed,
        completedAt: item.completed_at
      })),
      quiz: quizResults && quizResults.length > 0 ? {
        id: quizResults[0].id,
        score: quizResults[0].score,
        passed: quizResults[0].passed,
        completedAt: quizResults[0].completed_at
      } : null
    };

    res.json(response);

  } catch (error) {
    // console.error('Error in training phase endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch training phase details' });
  }
}

module.exports = trainingRateLimit(requireAuth(handler));
