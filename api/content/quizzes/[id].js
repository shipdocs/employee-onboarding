const db = require('../../../lib/database-direct');
const { requireAuth } = require('../../../lib/auth');
const { apiRateLimit } = require('../../../lib/rateLimit');
module.exports = apiRateLimit(requireAuth(async function handler(req, res) {
  try {
    // Check if user has content editing permissions
    if (req.user.role !== 'admin' && (req.user.role !== 'manager' || !req.user.permissions?.includes('content_edit'))) {
      return res.status(403).json({ error: 'Insufficient permissions for content editing' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      // Get specific quiz
      const { data: quiz, error } = await supabase
        .from('quiz_content')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // console.error('Error fetching quiz:', _error);
        return res.status(500).json({ error: 'Failed to fetch quiz' });
      }

      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      return res.status(200).json(quiz);
    }

    if (req.method === 'PUT') {
      // Update quiz
      const { title, description, timeLimit, passingScore, questions, phase, status } = req.body;

      // Validate required fields
      if (!title) {
        return res.status(400).json({ error: 'Quiz title is required' });
      }
      if (timeLimit === undefined || timeLimit === null || timeLimit <= 0) {
        return res.status(400).json({ error: 'Time limit must be greater than 0 minutes' });
      }
      if (passingScore === undefined || passingScore === null || passingScore <= 0 || passingScore > 100) {
        return res.status(400).json({ error: 'Passing score must be between 1 and 100' });
      }
      if (!questions) {
        return res.status(400).json({ error: 'Questions are required' });
      }
      if (!Array.isArray(questions)) {
        return res.status(400).json({ error: 'Questions must be an array' });
      }
      if (questions.length === 0) {
        return res.status(400).json({ error: 'At least one question is required' });
      }

      // Check if quiz exists
      const existingQuizResult = await db.query('SELECT id, title, version FROM quiz_content WHERE id = $1', [id]);
    const existingQuiz = existingQuizResult.rows[0];
    const fetchError = !existingQuiz;

      if (fetchError || !existingQuiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      // Create version history entry
      await supabase
        .from('quiz_history')
        .insert({
          quiz_id: id,
          version: existingQuiz.version,
          title: existingQuiz.title,
          created_by: req.user.id,
          created_at: new Date().toISOString()
        });

      const { data: updatedQuiz, error } = await supabase
        .from('quiz_content')
        .update({
          title,
          description,
          time_limit: timeLimit,
          passing_score: passingScore,
          questions,
          phase: phase || null,
          status: status || 'draft',
          updated_by: req.user.id,
          updated_at: new Date().toISOString(),
          version: existingQuiz.version + 1
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        // console.error('Error updating quiz:', _error);
        return res.status(500).json({ error: 'Failed to update quiz' });
      }

      // Log the action
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.user.id,
          action: 'update_quiz',
          resource_type: 'quiz',
          resource_id: id,
          details: {
            title,
            question_count: questions.length,
            old_version: existingQuiz.version,
            new_version: existingQuiz.version + 1
          }
        });

      return res.status(200).json(updatedQuiz);
    }

    if (req.method === 'DELETE') {
      // Delete quiz
      const quizResult = await db.query('SELECT id, title, phase FROM quiz_content WHERE id = $1', [id]);
    const quiz = quizResult.rows[0];
    const fetchError = !quiz;

      if (fetchError || !quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      // Check if quiz is being used by any users
      const { data: activeAttempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('user_id')
        .eq('quiz_id', id)
        .limit(1);

      if (attemptsError) {
        // console.error('Error checking quiz usage:', attemptsError);
        return res.status(500).json({ error: 'Failed to check quiz usage' });
      }

      if (activeAttempts && activeAttempts.length > 0) {
        return res.status(409).json({
          error: 'Cannot delete quiz - it has been attempted by crew members'
        });
      }

      // Delete the quiz
      const { error: deleteError } = await supabase
        .from('quiz_content')
        .delete()
        .eq('id', id);

      if (deleteError) {
        // console.error('Error deleting quiz:', deleteError);
        return res.status(500).json({ error: 'Failed to delete quiz' });
      }

      // Log the action
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.user.id,
          action: 'delete_quiz',
          resource_type: 'quiz',
          resource_id: id,
          details: { title: quiz.title, phase: quiz.phase }
        });

      return res.status(200).json({ message: 'Quiz deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (_error) {
    // console.error('API error:', _error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));
