// Vercel API Route: /api/crew/training/phase/[phase].js - Get specific phase training details
const { supabase } = require('../../../../lib/database-supabase-compat');
const { requireCrew } = require('../../../../lib/auth');
const { getCachedPhaseInfo, getCachedTrainingItems, invalidateContentCache } = require('../../../../lib/contentCache');
const { trainingRateLimit } = require('../../../../lib/rateLimit');
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

    // Add training items to session
    session.training_items = trainingItems || [];

    // Get quiz results for this phase
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .order('completed_at', { ascending: false });

    if (quizError) {
      // console.error('Error fetching quiz results:', quizError);
      return res.status(500).json({ error: 'Failed to fetch quiz results' });
    }

    // Calculate progress
    const completedItemsArray = session.training_items.filter(item => item.completed);
    const completedItemsCount = completedItemsArray.length;
    const totalItems = session.training_items.length;
    const progressPercentage = totalItems > 0 ? Math.round((completedItemsCount / totalItems) * 100) : 0;

    // Get phase information with caching
    const phaseInfo = await getCachedPhaseInfo(phaseNum, async () => {
      const dbPhaseInfo = await getPhaseInfoFromDatabase(phaseNum);
      if (dbPhaseInfo) {
        return dbPhaseInfo;
      }

      return getPhaseInfo(phaseNum);
    });

    // Format training items and merge with database content
    const formattedItems = session.training_items
      .sort((a, b) => a.item_number - b.item_number)
      .map(item => {
        // Find matching database content for this item
        const dbItem = phaseInfo?.items?.find(dbItem =>
          dbItem.number === item.item_number.toString().padStart(2, '0') ||
          dbItem.number === item.item_number.toString()
        );

        return {
          id: item.id,
          itemNumber: item.item_number,
          title: item.title || dbItem?.title,
          description: item.description || dbItem?.description,
          content: item.content || dbItem?.content, // Prefer session content over database content
          category: item.category || dbItem?.category,
          completed: item.completed,
          completedAt: item.completed_at,
          instructorInitials: item.instructor_initials,
          comments: item.comments,
          proofPhotoPath: item.proof_photo_path,
          proofPhotoUrl: item.proof_photo_path ?
            getFileUrl('training-photos', item.proof_photo_path) : null,
          // Add rich content from database if available
          richContent: dbItem?.content || null
        };
      });

    // Get latest quiz result
    const latestQuiz = quizResults.length > 0 ? quizResults[0] : null;

    // Determine if quiz is available
    const canTakeQuiz = progressPercentage === 100; // All training items completed
    const hasPassedQuiz = latestQuiz && latestQuiz.passed && latestQuiz.review_status === 'approved';

    res.json({
      session: {
        id: session.id,
        phase: session.phase,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        dueDate: session.due_date
      },
      phaseInfo,
      progress: {
        completedItems: completedItemsCount,
        totalItems,
        progressPercentage,
        canTakeQuiz,
        hasPassedQuiz
      },
      // Return completed items as array for frontend compatibility
      completedItems: completedItemsArray.map(item => ({
        id: item.id,
        number: item.item_number,
        title: item.title,
        completedAt: item.completed_at
      })),
      items: formattedItems,
      quiz: latestQuiz ? {
        id: latestQuiz.id,
        score: latestQuiz.score,
        totalQuestions: latestQuiz.total_questions,
        percentage: latestQuiz.percentage,
        passed: latestQuiz.passed,
        reviewStatus: latestQuiz.review_status,
        completedAt: latestQuiz.completed_at,
        reviewedAt: latestQuiz.reviewed_at,
        reviewComments: latestQuiz.review_comments
      } : null,
      quizHistory: quizResults.map(quiz => ({
        id: quiz.id,
        score: quiz.score,
        totalQuestions: quiz.total_questions,
        percentage: quiz.percentage,
        passed: quiz.passed,
        reviewStatus: quiz.review_status,
        completedAt: quiz.completed_at
      }))
    });

  } catch (_error) {
    // console.error('Error in phase training details:', _error);
    res.status(500).json({ error: 'Failed to fetch phase training details' });
  }
}

// Helper function to get phase information from database
async function getPhaseInfoFromDatabase(phase) {
  try {
    const { data: phaseData, error } = await supabase
      .from('training_phases')
      .select('*')
      .eq('phase_number', phase)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      // console.error('Error fetching phase info from database:', _error);
      return null;
    }

    if (!phaseData) {
      return null;
    }

    // Transform database format to expected format
    return {
      title: phaseData.title,
      description: phaseData.description,
      duration: `${phaseData.time_limit} hours`,
      objectives: phaseData.items?.flatMap(item => item.content?.objectives || []) || [],
      passingScore: phaseData.passing_score ?? 80,
      items: phaseData.items || [],
      mediaFiles: phaseData.media_attachments || []
    };
  } catch (_error) {
    // console.error('Error fetching phase info from database:', _error);
    return null;
  }
}

// Helper function to get phase information (static fallback)
function getPhaseInfo(phase) {
  const phaseData = {
    1: {
      title: 'Phase 1: Basic Safety Training',
      description: 'Essential safety procedures and emergency protocols',
      duration: '24 hours',
      objectives: [
        'Understand basic safety procedures',
        'Learn emergency response protocols',
        'Familiarize with safety equipment',
        'Complete safety documentation'
      ],
      passingScore: 80
    },
    2: {
      title: 'Phase 2: Operational Training',
      description: 'Vessel operations and cargo handling procedures',
      duration: '72 hours',
      objectives: [
        'Master vessel operational procedures',
        'Learn cargo handling techniques',
        'Understand navigation basics',
        'Complete operational assessments'
      ],
      passingScore: 85
    },
    3: {
      title: 'Phase 3: Advanced Training',
      description: 'Advanced procedures and specialized operations',
      duration: '1 week',
      objectives: [
        'Advanced operational procedures',
        'Specialized equipment operation',
        'Leadership and communication',
        'Final competency assessment'
      ],
      passingScore: 90
    }
  };

  return phaseData[phase] || null;
}

// Helper function to get file URL from Supabase Storage
function getFileUrl(bucket, path) {
  if (!path) return null;

  try {
    // TODO: Replace with MinIO storage implementation
    const data = { publicUrl: `http://localhost:9000/${bucket}/${path}` };

    return data.publicUrl;
  } catch (_error) {
    // console.error('Error getting file URL:', _error);
    return null;
  }
}

module.exports = trainingRateLimit(requireCrew(handler));
