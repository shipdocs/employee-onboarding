// Vercel API Route: /api/training/quiz/[phase]/submit.js - Submit quiz answers with REAL SCORING
const { supabase } = require('../../../../lib/supabase');
const { requireAuth } = require('../../../../lib/auth');
const AutomatedCertificateService = require('../../../../services/automated-certificate-service');
const DynamicPdfService = require('../../../../lib/dynamicPdfService');
const { createAPIHandler, createError, createValidationError, createDatabaseError, createNotFoundError } = require('../../../../lib/apiHandler');
const { calculateScore, validateQuizTime, generateAttemptId } = require('../scoring');
const { trainingRateLimit } = require('../../../../lib/rateLimit');

// Import quiz data directly - same data used in quiz-questions.js
const quizData = {
  phase1: {
    title: 'Phase 1: Immediate Safety Training Assessment',
    description: 'Comprehensive assessment covering immediate safety procedures, equipment identification, and emergency response protocols.',
    timeLimit: 45,
    passingScore: 80,
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
        explanation: "All incidents, including near misses and minor injuries, must be reported immediately to the captain regardless of the person's initial assessment. This ensures proper documentation and medical evaluation.",
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
    const userId = req.user.userId;

    const { phase } = req.query;
    const { answers, quizSessionId, startTime } = req.body;

    if (!phase || !answers) {
      throw createValidationError('Phase and answers are required', {
        missingFields: [...(!phase ? ['phase'] : []), ...(!answers ? ['answers'] : [])]
      });
    }

    if (!Array.isArray(answers)) {
      throw createValidationError('Invalid answers format - expected array', {
        receivedType: typeof answers
      });
    }

    if (!quizSessionId) {
      throw createValidationError('Quiz session not found. Please refresh and try again.', {
        missingFields: ['quizSessionId']
      });
    }

    const phaseNum = parseInt(phase);
    if (!phaseNum || phaseNum < 1 || phaseNum > 3) {
      throw createValidationError('Invalid phase number', {
        phase: phase,
        validRange: '1-3'
      });
    }

    // Validate quiz session - check if it exists and belongs to this user
    const { data: quizSession, error: sessionError } = await supabase
      .from('quiz_randomization_sessions')
      .select('user_id, phase, created_at, randomized_questions')
      .eq('session_id', quizSessionId)
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .single();

    if (sessionError) {
      throw createDatabaseError('Quiz session not found. Please refresh and try again.', {
        originalError: sessionError.message
      });
    }

    if (!quizSession) {
      throw createNotFoundError('Quiz session');
    }

    // Check if session has expired (30 minutes from creation)
    const sessionCreated = new Date(quizSession.created_at);
    const now = new Date();
    const sessionAgeMinutes = (now - sessionCreated) / (1000 * 60);

    if (sessionAgeMinutes > 30) {
      throw createError('AUTH_SESSION_EXPIRED', 'Quiz session has expired. Please refresh and start again.');
    }

    // Validate quiz completion time
    const timeValidation = validateQuizTime(
      startTime || quizSession.created_at,
      now,
      5 // Minimum 5 minutes for maritime safety quiz
    );

    if (timeValidation.suspicious) {
      // Log suspicious activity but don't block submission
      await supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          action: 'quiz_suspicious_time',
          details: {
            phase: phaseNum,
            durationMinutes: timeValidation.durationMinutes,
            sessionId: quizSessionId
          }
        });
    }

    // Get the quiz questions for this phase
    const phaseKey = `phase${phaseNum}`;
    const phaseQuiz = quizData[phaseKey];

    if (!phaseQuiz || !phaseQuiz.questions) {
      throw createError('QUIZ_CONFIG_ERROR', 'Quiz questions not found for this phase');
    }

    // Get the questions in the order they were presented to the user
    let questionsForScoring = phaseQuiz.questions;

    // If we have randomization data, reorder questions to match what user saw
    if (quizSession.randomized_questions && Array.isArray(quizSession.randomized_questions)) {
      const randomizedOrder = quizSession.randomized_questions;
      questionsForScoring = randomizedOrder
        .map(item => phaseQuiz.questions.find(q => q.id === item.id))
        .filter(Boolean);
    }

    // REAL SCORING - Calculate actual score based on correct answers
    const scoreResult = calculateScore(questionsForScoring, answers);

    // Check for recent quiz attempts to prevent rapid retakes
    const { data: recentAttempts, error: recentError } = await supabase
      .from('quiz_results')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('completed_at', { ascending: false });

    if (!recentError && recentAttempts && recentAttempts.length > 2) {
      throw createError('QUIZ_LIMIT_EXCEEDED', 'You have exceeded the maximum number of quiz attempts in 24 hours. Please try again tomorrow.');
    }

    // Get user's training session for this phase
    const { data: session, error: sessionTrainingError } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('phase', phaseNum)
      .single();

    if (sessionTrainingError) {
      throw createDatabaseError('Training session not found', {
        originalError: sessionTrainingError.message
      });
    }

    if (!session) {
      throw createError('TRAINING_PHASE_NOT_FOUND', `Training session not found for phase ${phaseNum}`);
    }

    // Generate unique attempt ID
    const attemptId = generateAttemptId();

    // Save quiz result with REAL scoring data
    const quizResult = {
      user_id: userId,
      phase: phaseNum,
      score: scoreResult.earnedPoints,
      total_questions: scoreResult.totalQuestions,
      passed: scoreResult.passed,
      answers: answers, // Store raw answers
      quiz_session_id: quizSessionId,
      review_status: scoreResult.requiresManualReview ? 'pending_review' : 'approved',
      completed_at: new Date().toISOString(),
      // Store additional metadata in answers_data field
      answers_data: JSON.stringify({
        attemptId: attemptId,
        detailedResults: scoreResult.detailedResults,
        correctAnswers: scoreResult.correctAnswers,
        incorrectAnswers: scoreResult.incorrectAnswers,
        percentage: scoreResult.percentage,
        earnedPoints: scoreResult.earnedPoints,
        totalPoints: scoreResult.totalPoints,
        unansweredQuestions: scoreResult.unansweredQuestions,
        timeValidation: timeValidation,
        passingScore: phaseQuiz.passingScore || 80
      })
    };

    const { data: result, error: resultError } = await supabase
      .from('quiz_results')
      .insert(quizResult)
      .select()
      .single();

    if (resultError) {
      throw createDatabaseError('Failed to save quiz result', {
        originalError: resultError.message
      });
    }

    // Log quiz attempt for audit
    await supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action: 'quiz_submitted',
        details: {
          phase: phaseNum,
          score: scoreResult.percentage,
          passed: scoreResult.passed,
          attemptId: attemptId,
          durationMinutes: timeValidation.durationMinutes
        }
      });

    // Update training session status if quiz passed
    if (scoreResult.passed) {
      const { error: updateError } = await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        // Log error but don't fail the submission
        console.error('Error updating training session:', updateError);
      }

      // Check if all phases are complete
      try {
        const { data: completedSessions, error: sessionsError } = await supabase
          .from('training_sessions')
          .select('phase, status')
          .eq('user_id', userId)
          .eq('status', 'completed');

        if (!sessionsError && completedSessions) {
          const completedPhases = completedSessions.map(session => session.phase);
          const allPhasesCompleted = [1, 2, 3].every(phase => completedPhases.includes(phase));

          if (allPhasesCompleted) {
            // Trigger certificate generation
            try {
              const dynamicResults = await DynamicPdfService.processWorkflowTrigger(
                userId,
                null,
                'workflow_complete',
                {
                  workflowName: 'Maritime Onboarding Training',
                  workflowDescription: 'Complete maritime safety training program',
                  completedPhase: phaseNum,
                  allPhases: completedPhases
                }
              );

              if (!dynamicResults || dynamicResults.length === 0) {
                // Fallback to legacy certificate generation
                await AutomatedCertificateService.generateAndDistributeCertificate(userId);
              }
            } catch (pdfError) {
              console.error('Certificate generation error:', pdfError);
              // Try legacy system as fallback
              try {
                await AutomatedCertificateService.generateAndDistributeCertificate(userId);
              } catch (legacyError) {
                console.error('Both PDF systems failed:', legacyError);
              }
            }
          }
        }
      } catch (checkError) {
        console.error('Error checking phase completion status:', checkError);
      }
    }

    // Return REAL scoring results
    res.json({
      success: true,
      quizId: result.id,
      attemptId: attemptId,
      score: scoreResult.correctAnswers,
      totalQuestions: scoreResult.totalQuestions,
      percentage: scoreResult.percentage,
      passed: scoreResult.passed,
      passingScore: phaseQuiz.passingScore || 80,
      earnedPoints: scoreResult.earnedPoints,
      totalPoints: scoreResult.totalPoints,
      timeSpent: timeValidation.durationMinutes,
      requiresManualReview: scoreResult.requiresManualReview,
      message: scoreResult.passed
        ? 'Congratulations! You passed the quiz.'
        : `Quiz not passed. You scored ${scoreResult.percentage}% but need ${phaseQuiz.passingScore || 80}% to pass. Please review the material and try again.`,
      detailedFeedback: scoreResult.unansweredQuestions.length > 0
        ? `Note: You left ${scoreResult.unansweredQuestions.length} question(s) unanswered.`
        : null
    });
}

// Create the standardized handler with error handling
const apiHandler = createAPIHandler(handler, {
  allowedMethods: ['POST']
});

// Export with authentication
module.exports = trainingRateLimit(requireAuth(apiHandler));
