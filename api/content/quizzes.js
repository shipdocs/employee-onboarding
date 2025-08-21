const { supabase } = require('../../lib/database-supabase-compat');
const { requireManagerOrAdmin } = require('../../lib/auth.js');
const { apiRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  try {

    // User is available in req.user thanks to requireManagerOrAdmin wrapper
    const user = req.user;

    if (req.method === 'GET') {

      // Get all quizzes
      const { data: quizzes, error } = await supabase
        .from('quiz_content')
        .select('*')
        .order('phase', { ascending: true });

      if (error) {
        // console.error('❌ [DB] Error fetching quizzes:', _error);
        // Check if table doesn't exist
        if (error.code === '42P01') {

          return res.status(200).json([]);
        }
        return res.status(500).json({ error: 'Failed to fetch quizzes' });
      }

      return res.status(200).json(quizzes || []);
    }

    if (req.method === 'POST') {
      // Create new quiz
      const { title, description, timeLimit, passingScore, questions, phase } = req.body;

      if (!title || !timeLimit || !passingScore || !questions) {
        return res.status(400).json({ error: 'Title, time limit, passing score, and questions are required' });
      }

      if (questions.length === 0) {
        return res.status(400).json({ error: 'At least one question is required' });
      }

      const { data: newQuiz, error } = await supabase
        .from('quiz_content')
        .insert({
          title,
          description,
          time_limit: timeLimit,
          passing_score: passingScore,
          questions,
          phase: phase || null,
          status: 'draft',
          created_by: user.id,
          updated_by: user.id
        })
        .select('*')
        .single();

      if (error) {
        // console.error('Error creating quiz:', _error);
        return res.status(500).json({ error: 'Failed to create quiz' });
      }

      // Log the action
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'create_quiz',
          resource_type: 'quiz',
          resource_id: newQuiz.id,
          details: { title, question_count: questions.length, phase }
        });

      return res.status(201).json(newQuiz);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in quizzes:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with authentication wrapper
module.exports = apiRateLimit(requireManagerOrAdmin(handler));
