// Quiz Scoring Module - Real answer validation and scoring logic
const crypto = require('crypto');
const { isEnabled, FEATURES } = require('../../../config/features');
const { environmentConfig } = require('../../../config/environment');
const { trainingRateLimit } = require('../../../lib/rateLimit');

/**
 * Normalizes text for comparison
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Validates a single quiz answer
 * @param {Object} question - Question object with correct answer
 * @param {any} userAnswer - User's submitted answer
 * @returns {Object} Validation result { correct: boolean, points: number }
 */
function validateAnswer(question, userAnswer) {
  if (!question || userAnswer === undefined || userAnswer === null) {
    return { correct: false, points: 0 };
  }

  switch (question.type) {
    case 'multiple_choice':
      // For multiple choice, compare the selected index
      const isCorrect = userAnswer === question.correctAnswer;
      return {
        correct: isCorrect,
        points: isCorrect ? (question.points || 10) : 0
      };

    case 'yes_no':
      // For yes/no questions, compare boolean values
      const userBool = userAnswer === true || userAnswer === 'true' || userAnswer === 'yes';
      return {
        correct: userBool === question.correctAnswer,
        points: userBool === question.correctAnswer ? (question.points || 5) : 0
      };

    case 'fill_in_gaps':
      // For fill in gaps, check against correct answers and variations
      if (!Array.isArray(userAnswer)) {
        return { correct: false, points: 0 };
      }

      let allCorrect = true;
      const correctAnswers = question.correctAnswers || [];
      const variations = question.variations || [];

      for (let i = 0; i < correctAnswers.length; i++) {
        const userText = normalizeText(userAnswer[i]);
        const correctText = normalizeText(correctAnswers[i]);

        let isAnswerCorrect = userText === correctText;

        // Check variations if available
        if (!isAnswerCorrect && variations.length > 0) {
          for (const variation of variations) {
            if (Array.isArray(variation) && variation[i]) {
              if (normalizeText(variation[i]) === userText) {
                isAnswerCorrect = true;
                break;
              }
            }
          }
        }

        if (!isAnswerCorrect) {
          allCorrect = false;
          break;
        }
      }

      return {
        correct: allCorrect,
        points: allCorrect ? (question.points || 10) : 0
      };

    case 'drag_order':
      // For drag order, compare the order arrays
      if (!Array.isArray(userAnswer) || !Array.isArray(question.correctOrder)) {
        return { correct: false, points: 0 };
      }

      const orderCorrect = userAnswer.length === question.correctOrder.length &&
        userAnswer.every((val, index) => val === question.correctOrder[index]);

      return {
        correct: orderCorrect,
        points: orderCorrect ? (question.points || 12) : 0
      };

    case 'matching':
      // For matching questions, check all pairs
      if (!Array.isArray(userAnswer) || !Array.isArray(question.correctMatches)) {
        return { correct: false, points: 0 };
      }

      const matchesCorrect = userAnswer.length === question.correctMatches.length &&
        userAnswer.every((match, index) => match === question.correctMatches[index]);

      return {
        correct: matchesCorrect,
        points: matchesCorrect ? (question.points || 10) : 0
      };

    case 'file_upload':
      // File uploads are manually reviewed, so we give partial credit if uploaded
      const hasUpload = userAnswer && (typeof userAnswer === 'string' || typeof userAnswer === 'object');
      return {
        correct: hasUpload, // Will be fully validated during manual review
        points: hasUpload ? (question.points || 10) : 0,
        requiresReview: true
      };

    default:
      // For any other question types, do a simple string comparison
      const userStr = normalizeText(userAnswer);
      const correctStr = normalizeText(question.correctAnswer);
      const isMatch = userStr === correctStr;

      return {
        correct: isMatch,
        points: isMatch ? (question.points || 5) : 0
      };
  }
}

/**
 * Calculates the overall quiz score
 * @param {Array} questions - Array of quiz questions with correct answers
 * @param {Array} userAnswers - Array of user's answers
 * @returns {Object} Score result with detailed breakdown
 */
function calculateScore(questions, userAnswers) {
  if (!Array.isArray(questions) || !Array.isArray(userAnswers)) {
    throw new Error('Invalid input: questions and answers must be arrays');
  }

  // Check if quiz scoring is enabled
  const scoringEnabled = isEnabled(FEATURES.QUIZ_SCORING_ENABLED);

  // In development, allow fake scoring if feature is disabled
  if (!scoringEnabled && !environmentConfig.isProduction()) {
    console.log('📝 [QUIZ] Fake scoring enabled for development');

    // Generate a random but realistic score for development
    const baseScore = 75 + Math.floor(Math.random() * 20); // 75-94%
    const totalQuestions = questions.length;
    const correctAnswers = Math.floor((baseScore / 100) * totalQuestions);
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);
    const earnedPoints = Math.floor((baseScore / 100) * totalPoints);

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      earnedPoints,
      totalPoints,
      percentage: baseScore,
      passed: baseScore >= 80,
      requiresManualReview: false,
      detailedResults: questions.map((q, idx) => ({
        questionId: q.id,
        questionType: q.type,
        answered: true,
        correct: idx < correctAnswers,
        pointsEarned: idx < correctAnswers ? (q.points || 10) : 0,
        pointsPossible: q.points || 10,
        requiresReview: false
      })),
      answeredQuestions: totalQuestions,
      unansweredQuestions: [],
      fakeScoring: true // Flag to indicate fake scoring was used
    };
  }

  // Real scoring logic
  const results = {
    totalQuestions: questions.length,
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalPoints: 0,
    earnedPoints: 0,
    percentage: 0,
    passed: false,
    requiresManualReview: false,
    detailedResults: [],
    answeredQuestions: 0,
    unansweredQuestions: []
  };

  // Calculate total possible points
  results.totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);

  // Validate each answer
  questions.forEach((question, index) => {
    const userAnswer = userAnswers[index];

    // Check if question was answered
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      results.unansweredQuestions.push({
        questionId: question.id,
        questionIndex: index,
        question: question.question
      });

      results.detailedResults.push({
        questionId: question.id,
        questionType: question.type,
        answered: false,
        correct: false,
        pointsEarned: 0,
        pointsPossible: question.points || 10
      });

      results.incorrectAnswers++;
    } else {
      results.answeredQuestions++;

      const validation = validateAnswer(question, userAnswer);

      if (validation.correct) {
        results.correctAnswers++;
        results.earnedPoints += validation.points;
      } else {
        results.incorrectAnswers++;
      }

      if (validation.requiresReview) {
        results.requiresManualReview = true;
      }

      results.detailedResults.push({
        questionId: question.id,
        questionType: question.type,
        answered: true,
        correct: validation.correct,
        pointsEarned: validation.points,
        pointsPossible: question.points || 10,
        requiresReview: validation.requiresReview || false
      });
    }
  });

  // Calculate percentage based on points
  if (results.totalPoints > 0) {
    results.percentage = Math.round((results.earnedPoints / results.totalPoints) * 100);
  }

  // Determine if passed (default 80% for maritime safety)
  results.passed = results.percentage >= 80;

  return results;
}

/**
 * Validates quiz completion time
 * @param {Date} startTime - Quiz start time
 * @param {Date} endTime - Quiz end time
 * @param {number} minMinutes - Minimum minutes required
 * @returns {Object} Time validation result
 */
function validateQuizTime(startTime, endTime, minMinutes = 5) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMinutes = (end - start) / (1000 * 60);

  return {
    durationMinutes: Math.round(durationMinutes),
    tooFast: durationMinutes < minMinutes,
    suspicious: durationMinutes < minMinutes / 2
  };
}

/**
 * Generates a unique quiz attempt ID
 * @returns {string} Unique attempt ID
 */
function generateAttemptId() {
  return `attempt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

module.exports = trainingRateLimit({
  validateAnswer,
  calculateScore,
  validateQuizTime,
  generateAttemptId,
  normalizeText
});
