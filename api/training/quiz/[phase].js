// Vercel API Route: /api/training/quiz/[phase].js - Get quiz questions for a phase
const { supabase } = require('../../../lib/supabase');
const { verifyJWT } = require('../../../lib/auth');
const crypto = require('crypto');
const { trainingRateLimit } = require('../../../lib/rateLimit');

// Fallback quiz data for compatibility
const fallbackQuizData = {
  phase1: {
    title: 'Phase 1: Immediate Safety Training Assessment',
    description: 'Comprehensive assessment covering immediate safety procedures, equipment identification, and emergency response protocols.',
    timeLimit: 45, // minutes
    passingScore: 80, // percentage
    questions: [
      {
        id: 'p1_q1',
        type: 'file_upload',
        category: 'equipment_identification',
        question: 'Take a photo of a fire extinguisher on your vessel and upload it below. The photo must clearly show the pressure gauge and instruction label.',
        instructions: 'Ensure the photo is clear and shows both the pressure gauge and instruction label. Accepted formats: JPG, PNG. Maximum file size: 5MB.',
        points: 10,
        required: true
      },
      {
        id: 'p1_q2',
        type: 'multiple_choice',
        category: 'emergency_procedures',
        question: 'What is the first action you should take when the general alarm sounds?',
        options: [
          'Continue with current work',
          'Report to muster station immediately',
          'Call the captain',
          'Check the Red Book'
        ],
        correctAnswer: 1,
        explanation: 'When the general alarm sounds, all crew must report to their designated muster station immediately as per emergency procedures.',
        points: 8
      },
      {
        id: 'p1_q3',
        type: 'yes_no',
        category: 'safety_equipment',
        question: 'Is it acceptable to use a damaged life jacket during an emergency?',
        correctAnswer: false,
        explanation: 'Never use damaged safety equipment. Always inspect life jackets before use and report any damage immediately.',
        points: 6
      },
      {
        id: 'p1_q4',
        type: 'fill_in_gaps',
        category: 'emergency_procedures',
        question: 'Complete the emergency signal: Seven short blasts followed by _____ long blast(s) indicates _____ alarm.',
        correctAnswers: ['one', 'abandon ship'],
        variations: [
          ['1', 'abandon ship'],
          ['one', 'abandon-ship'],
          ['1', 'abandon-ship']
        ],
        explanation: 'Seven short blasts followed by one long blast is the international signal for abandon ship.',
        points: 10
      },
      {
        id: 'p1_q5',
        type: 'drag_order',
        category: 'emergency_procedures',
        question: 'Arrange the following actions in the correct order when discovering a fire:',
        items: [
          'Raise the alarm',
          'Attempt to extinguish if safe to do so',
          'Evacuate the area if fire cannot be controlled',
          'Report to bridge/duty officer'
        ],
        correctOrder: [0, 3, 1, 2],
        explanation: 'The correct sequence is: Raise alarm, Report to bridge, Attempt to extinguish if safe, Evacuate if necessary.',
        points: 12
      },
      {
        id: 'p1_q6',
        type: 'file_upload',
        category: 'equipment_identification',
        question: 'Take a photo of the emergency shutoff valve for the main engine and upload it below.',
        instructions: 'Photo must clearly show the valve handle and any identification labels. Accepted formats: JPG, PNG. Maximum file size: 5MB.',
        points: 10,
        required: true
      },
      {
        id: 'p1_q7',
        type: 'multiple_choice',
        category: 'safety_procedures',
        question: 'When should you report an incident to the captain?',
        options: [
          'Only if someone is seriously injured',
          'Only if there is property damage',
          'All incidents, including near misses',
          'Only if asked by a senior officer'
        ],
        correctAnswer: 2,
        explanation: "All incidents, including near misses and minor injuries, must be reported immediately to the captain regardless of the person's initial assessment.",
        points: 8
      }
    ]
  },
  phase2: {
    title: 'Phase 2: Operational Training Assessment',
    description: 'Advanced operational procedures, cargo handling, and vessel-specific systems assessment.',
    timeLimit: 60,
    passingScore: 85,
    questions: [
      {
        id: 'p2_q1',
        type: 'multiple_choice',
        category: 'navigation',
        question: 'What is the primary purpose of a bow thruster?',
        options: [
          'Increase forward speed',
          'Provide lateral thrust for maneuvering',
          'Reduce fuel consumption',
          'Emergency propulsion backup'
        ],
        correctAnswer: 1,
        explanation: 'Bow thrusters provide lateral thrust to help with maneuvering, especially during docking operations.',
        points: 8
      },
      {
        id: 'p2_q2',
        type: 'file_upload',
        category: 'equipment_operation',
        question: 'Take a photo of the cargo pump control panel and upload it below.',
        instructions: 'Photo must show all control switches and indicators clearly. Accepted formats: JPG, PNG. Maximum file size: 5MB.',
        points: 10,
        required: true
      }
    ]
  },
  phase3: {
    title: 'Phase 3: Advanced Training Assessment',
    description: 'Comprehensive assessment of all training phases and advanced procedures.',
    timeLimit: 90,
    passingScore: 90,
    questions: [
      {
        id: 'p3_q1',
        type: 'multiple_choice',
        category: 'advanced_operations',
        question: 'During cargo operations, what is the maximum allowed loading rate?',
        options: [
          'As fast as possible',
          'According to vessel specifications',
          '50% of pump capacity',
          'Determined by shore facility'
        ],
        correctAnswer: 1,
        explanation: 'Loading rates must always follow vessel specifications and safety procedures.',
        points: 10
      }
    ]
  }
};

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { phase } = req.query;

    if (!phase) {
      return res.status(400).json({ error: 'Phase parameter is required' });
    }

    // Get quiz data from database first, fallback to static data
    let phaseQuiz = null;

    // Try to get quiz data from database
    const { data: dbQuizData, error: quizError } = await supabase
      .from('quiz_content')
      .select('*')
      .eq('phase', parseInt(phase))
      .eq('status', 'published')
      .single();

    if (dbQuizData) {
      // Use database content
      phaseQuiz = {
        title: dbQuizData.title,
        description: dbQuizData.description,
        timeLimit: dbQuizData.time_limit,
        passingScore: dbQuizData.passing_score,
        questions: dbQuizData.questions || []
      };
    } else {
      // Fallback to static data
      const phaseKey = `phase${phase}`;
      phaseQuiz = fallbackQuizData[phaseKey];

      if (!phaseQuiz) {
        return res.status(404).json({ error: 'Quiz not found for this phase' });
      }
    }

    // Randomize question order for this session
    const randomizedQuestions = [...phaseQuiz.questions].sort(() => Math.random() - 0.5);

    // For multiple choice questions, randomize option order
    const processedQuestions = randomizedQuestions.map(question => {
      if (question.type === 'multiple_choice' && question.options) {
        const originalCorrect = question.correctAnswer;
        const optionsWithIndex = question.options.map((option, index) => ({ option, originalIndex: index }));
        const shuffledOptions = optionsWithIndex.sort(() => Math.random() - 0.5);

        return {
          ...question,
          options: shuffledOptions.map(item => item.option),
          correctAnswer: shuffledOptions.findIndex(item => item.originalIndex === originalCorrect)
        };
      }
      return question;
    });

    // Generate quiz session ID
    const quizSessionId = crypto.randomUUID();

    // Log quiz randomization for audit trail
    const { error: logError } = await supabase
      .from('quiz_randomization_sessions')
      .insert({
        session_id: quizSessionId,
        user_id: decoded.userId,
        phase: parseInt(phase),
        randomized_questions: randomizedQuestions.map(q => ({ id: q.id, order: q.order })),
        created_at: new Date().toISOString()
      });

    if (logError) {
      // console.error('Error logging quiz randomization:', logError);
    }

    res.json({
      phase: parseInt(phase),
      title: phaseQuiz.title,
      description: phaseQuiz.description,
      timeLimit: phaseQuiz.timeLimit,
      passingScore: phaseQuiz.passingScore,
      totalQuestions: processedQuestions.length,
      totalPoints: processedQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
      questions: processedQuestions,
      quizSessionId: quizSessionId
    });

  } catch (_error) {
    // console.error('Error fetching quiz questions:', _error);
    res.status(500).json({
      error: 'Failed to fetch quiz questions',
      message: _error.message
    });
  }
}

module.exports = trainingRateLimit(handler);
