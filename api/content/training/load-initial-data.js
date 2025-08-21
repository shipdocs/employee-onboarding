const db = require('../../../lib/database');
const { requireAdmin } = require('../../../lib/auth');
const trainingData = require('../../../config/training-data');
const { apiRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  try {

    // User is available in req.user thanks to requireAdmin wrapper
    const user = req.user;

    if (req.method !== 'POST') {

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if data already exists

    const { data: existingPhases, error: checkError } = await supabase
      .from('training_phases')
      .select('id')
      .limit(1);

    if (checkError) {
      // console.error('❌ [DB] Error checking existing phases:', checkError);
      // Check if table doesn't exist
      if (checkError.code === '42P01') {

        return res.status(400).json({
          error: 'Database tables not found. Please run the migration first.',
          details: 'Run the migration: 20250602000002_content_management_system.sql'
        });
      }
      return res.status(500).json({ error: 'Failed to check existing data' });
    }

    if (existingPhases && existingPhases.length > 0) {

      return res.status(409).json({ error: 'Training phases already exist. Delete existing data first if you want to reload.' });
    }

    // Load training phases from config

    const phases = Object.entries(trainingData.phases).map(([phaseNumber, phaseData]) => ({
      phase_number: parseInt(phaseNumber),
      title: phaseData.title,
      description: phaseData.description,
      time_limit: phaseData.timeLimit,
      items: phaseData.items,
      status: 'published',
      created_by: user.id,
      updated_by: user.id
    }));

    // Insert all phases

    const { data: insertedPhases, error: insertError } = await supabase
      .from('training_phases')
      .insert(phases)
      .select();

    if (insertError) {
      // console.error('❌ [DB] Error inserting training phases:', insertError);
      return res.status(500).json({ error: 'Failed to load training phases' });
    }

    // Load quiz data

    const quizzes = Object.entries(trainingData.quizzes).map(([phase, questions]) => ({
      phase: parseInt(phase),
      title: `Phase ${phase} Quiz`,
      description: `Assessment for Phase ${phase}`,
      time_limit: 45,
      passing_score: 80,
      questions: questions,
      status: 'published',
      created_by: user.id,
      updated_by: user.id
    }));

    const { data: insertedQuizzes, error: quizError } = await supabase
      .from('quiz_content')
      .insert(quizzes)
      .select();

    if (quizError) {
      // console.error('❌ [DB] Error inserting quizzes:', quizError);
      // Don't fail completely if quizzes fail
    } else {

    }

    return res.status(200).json({
      message: 'Initial data loaded successfully',
      phases: insertedPhases?.length || 0,
      quizzes: insertedQuizzes?.length || 0
    });

  } catch (error) {
    // console.error('❌ [ERROR] Critical error in load-initial-data:', error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with authentication wrapper
module.exports = apiRateLimit(requireAdmin(handler));
