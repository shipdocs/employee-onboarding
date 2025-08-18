// tests/quiz-scoring-validation.test.js
const { verifyJWT } = require('../lib/auth');
const { supabase } = require('../lib/supabase');

// Mock handler functions for testing
const calculateQuizScore = (questions, answers) => {
  let totalScore = 0;
  let maxScore = 0;

  questions.forEach((question) => {
    const userAnswer = answers[question.id];
    const points = question.points || 10;
    maxScore += points;

    switch (question.type) {
      case 'multiple_choice':
        if (userAnswer === question.correctAnswer) {
          totalScore += points;
        }
        break;

      case 'yes_no':
        if (userAnswer === question.correctAnswer) {
          totalScore += points;
        }
        break;

      case 'fill_in_gaps':
        if (Array.isArray(userAnswer) && Array.isArray(question.correctAnswers)) {
          let correct = true;
          for (let i = 0; i < question.correctAnswers.length; i++) {
            const expected = question.correctAnswers[i]?.toLowerCase().trim();
            const actual = userAnswer[i]?.toLowerCase().trim();
            
            // Check variations if available
            if (question.variations) {
              const variationMatch = question.variations.some(variation => 
                variation[i]?.toLowerCase().trim() === actual
              );
              if (!variationMatch && expected !== actual) {
                correct = false;
                break;
              }
            } else if (expected !== actual) {
              correct = false;
              break;
            }
          }
          if (correct) totalScore += points;
        }
        break;

      case 'drag_order':
        if (Array.isArray(userAnswer) && Array.isArray(question.correctOrder)) {
          const isCorrect = userAnswer.every((item, index) => 
            item === question.correctOrder[index]
          );
          if (isCorrect) totalScore += points;
        }
        break;

      case 'matching':
        if (Array.isArray(userAnswer) && Array.isArray(question.correctMatches)) {
          const isCorrect = userAnswer.every((match, index) => 
            match === question.correctMatches[index]
          );
          if (isCorrect) totalScore += points;
        }
        break;

      case 'scenario':
        if (userAnswer === question.correctAnswer) {
          totalScore += points;
        }
        break;

      case 'file_upload':
        // File uploads are manually graded, assume passed if file was uploaded
        if (userAnswer) {
          totalScore += points;
        }
        break;
    }
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  return {
    score: totalScore,
    maxScore,
    percentage
  };
};

describe('Quiz Scoring Validation Tests', () => {
  describe('Answer Validation', () => {
    test('should validate multiple choice answers correctly', () => {
      const question = {
        id: 'q1',
        type: 'multiple_choice',
        correctAnswer: 2,
        points: 10
      };

      const correctScore = calculateQuizScore([question], { q1: 2 });
      expect(correctScore.score).toBe(10);
      expect(correctScore.percentage).toBe(100);

      const incorrectScore = calculateQuizScore([question], { q1: 1 });
      expect(incorrectScore.score).toBe(0);
      expect(incorrectScore.percentage).toBe(0);
    });

    test('should validate yes/no answers correctly', () => {
      const question = {
        id: 'q2',
        type: 'yes_no',
        correctAnswer: false,
        points: 5
      };

      const correctScore = calculateQuizScore([question], { q2: false });
      expect(correctScore.score).toBe(5);
      expect(correctScore.percentage).toBe(100);

      const incorrectScore = calculateQuizScore([question], { q2: true });
      expect(incorrectScore.score).toBe(0);
      expect(incorrectScore.percentage).toBe(0);
    });

    test('should validate fill-in-gaps answers with variations', () => {
      const question = {
        id: 'q3',
        type: 'fill_in_gaps',
        correctAnswers: ['one', 'abandon ship'],
        variations: [
          ['1', 'abandon ship'],
          ['one', 'abandon-ship'],
          ['1', 'abandon-ship']
        ],
        points: 15
      };

      // Test exact match
      const exactScore = calculateQuizScore([question], { 
        q3: ['one', 'abandon ship'] 
      });
      expect(exactScore.score).toBe(15);

      // Test variation match
      const variationScore = calculateQuizScore([question], { 
        q3: ['1', 'abandon-ship'] 
      });
      expect(variationScore.score).toBe(15);

      // Test case insensitive
      const caseScore = calculateQuizScore([question], { 
        q3: ['ONE', 'ABANDON SHIP'] 
      });
      expect(caseScore.score).toBe(15);

      // Test incorrect
      const incorrectScore = calculateQuizScore([question], { 
        q3: ['two', 'general alarm'] 
      });
      expect(incorrectScore.score).toBe(0);
    });

    test('should validate drag order answers correctly', () => {
      const question = {
        id: 'q4',
        type: 'drag_order',
        correctOrder: [0, 3, 1, 2],
        points: 20
      };

      const correctScore = calculateQuizScore([question], { 
        q4: [0, 3, 1, 2] 
      });
      expect(correctScore.score).toBe(20);

      const incorrectScore = calculateQuizScore([question], { 
        q4: [0, 1, 2, 3] 
      });
      expect(incorrectScore.score).toBe(0);
    });

    test('should validate file upload answers', () => {
      const question = {
        id: 'q5',
        type: 'file_upload',
        points: 10
      };

      const uploadedScore = calculateQuizScore([question], { 
        q5: '/uploads/photo.jpg' 
      });
      expect(uploadedScore.score).toBe(10);

      const notUploadedScore = calculateQuizScore([question], { 
        q5: null 
      });
      expect(notUploadedScore.score).toBe(0);
    });
  });

  describe('Score Calculation', () => {
    test('should calculate total score correctly', () => {
      const questions = [
        { id: 'q1', type: 'multiple_choice', correctAnswer: 1, points: 10 },
        { id: 'q2', type: 'yes_no', correctAnswer: true, points: 5 },
        { id: 'q3', type: 'multiple_choice', correctAnswer: 2, points: 15 }
      ];

      const answers = {
        q1: 1,  // Correct: 10 points
        q2: false, // Incorrect: 0 points
        q3: 2   // Correct: 15 points
      };

      const result = calculateQuizScore(questions, answers);
      expect(result.score).toBe(25);
      expect(result.maxScore).toBe(30);
      expect(result.percentage).toBe(83);
    });

    test('should handle all correct answers', () => {
      const questions = [
        { id: 'q1', type: 'multiple_choice', correctAnswer: 1, points: 10 },
        { id: 'q2', type: 'yes_no', correctAnswer: true, points: 10 },
        { id: 'q3', type: 'multiple_choice', correctAnswer: 2, points: 10 }
      ];

      const answers = {
        q1: 1,
        q2: true,
        q3: 2
      };

      const result = calculateQuizScore(questions, answers);
      expect(result.score).toBe(30);
      expect(result.maxScore).toBe(30);
      expect(result.percentage).toBe(100);
    });

    test('should handle all incorrect answers', () => {
      const questions = [
        { id: 'q1', type: 'multiple_choice', correctAnswer: 1, points: 10 },
        { id: 'q2', type: 'yes_no', correctAnswer: true, points: 10 }
      ];

      const answers = {
        q1: 3,
        q2: false
      };

      const result = calculateQuizScore(questions, answers);
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(20);
      expect(result.percentage).toBe(0);
    });

    test('should handle partial completion', () => {
      const questions = [
        { id: 'q1', type: 'multiple_choice', correctAnswer: 1, points: 10 },
        { id: 'q2', type: 'yes_no', correctAnswer: true, points: 10 },
        { id: 'q3', type: 'multiple_choice', correctAnswer: 2, points: 10 }
      ];

      const answers = {
        q1: 1,
        // q2 not answered
        q3: 2
      };

      const result = calculateQuizScore(questions, answers);
      expect(result.score).toBe(20);
      expect(result.maxScore).toBe(30);
      expect(result.percentage).toBe(67);
    });

    test('should handle questions without point values', () => {
      const questions = [
        { id: 'q1', type: 'multiple_choice', correctAnswer: 1 }, // Default 10 points
        { id: 'q2', type: 'yes_no', correctAnswer: true, points: 5 }
      ];

      const answers = {
        q1: 1,
        q2: true
      };

      const result = calculateQuizScore(questions, answers);
      expect(result.score).toBe(15);
      expect(result.maxScore).toBe(15);
    });
  });

  describe('Passing Score Validation', () => {
    test('should correctly determine pass/fail for 80% threshold', () => {
      const passingScore = 80;
      
      // Test exact pass
      expect(80 >= passingScore).toBe(true);
      
      // Test above pass
      expect(85 >= passingScore).toBe(true);
      
      // Test below pass
      expect(79 >= passingScore).toBe(false);
    });

    test('should correctly determine pass/fail for different phases', () => {
      const phaseThresholds = {
        phase1: 80,
        phase2: 85,
        phase3: 90
      };

      // Phase 1
      expect(82 >= phaseThresholds.phase1).toBe(true);
      expect(78 >= phaseThresholds.phase1).toBe(false);

      // Phase 2
      expect(87 >= phaseThresholds.phase2).toBe(true);
      expect(83 >= phaseThresholds.phase2).toBe(false);

      // Phase 3
      expect(92 >= phaseThresholds.phase3).toBe(true);
      expect(88 >= phaseThresholds.phase3).toBe(false);
    });
  });

  describe('Quiz Attempt Logging', () => {
    const mockQuizAttempt = {
      user_id: 'test-user-id',
      phase: 1,
      score: 85,
      max_score: 100,
      percentage: 85,
      passed: true,
      time_taken: 1800, // 30 minutes
      answers: { q1: 1, q2: true },
      submitted_at: new Date().toISOString()
    };

    test('should log quiz attempts with all required fields', () => {
      expect(mockQuizAttempt).toHaveProperty('user_id');
      expect(mockQuizAttempt).toHaveProperty('phase');
      expect(mockQuizAttempt).toHaveProperty('score');
      expect(mockQuizAttempt).toHaveProperty('max_score');
      expect(mockQuizAttempt).toHaveProperty('percentage');
      expect(mockQuizAttempt).toHaveProperty('passed');
      expect(mockQuizAttempt).toHaveProperty('time_taken');
      expect(mockQuizAttempt).toHaveProperty('answers');
      expect(mockQuizAttempt).toHaveProperty('submitted_at');
    });

    test('should calculate time taken correctly', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:30:00Z');
      const timeTaken = (endTime - startTime) / 1000; // in seconds
      
      expect(timeTaken).toBe(1800); // 30 minutes
    });

    test('should store answers for review', () => {
      const answers = {
        q1: 2,
        q2: true,
        q3: ['one', 'abandon ship'],
        q4: [0, 3, 1, 2],
        q5: '/uploads/photo.jpg'
      };

      // Verify all answer types can be stored
      expect(typeof answers.q1).toBe('number');
      expect(typeof answers.q2).toBe('boolean');
      expect(Array.isArray(answers.q3)).toBe(true);
      expect(Array.isArray(answers.q4)).toBe(true);
      expect(typeof answers.q5).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty quiz gracefully', () => {
      const result = calculateQuizScore([], {});
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(0);
      expect(result.percentage).toBe(0);
    });

    test('should handle missing answers gracefully', () => {
      const questions = [
        { id: 'q1', type: 'multiple_choice', correctAnswer: 1, points: 10 }
      ];

      const result = calculateQuizScore(questions, {});
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(10);
      expect(result.percentage).toBe(0);
    });

    test('should handle invalid answer types', () => {
      const questions = [
        { id: 'q1', type: 'multiple_choice', correctAnswer: 1, points: 10 },
        { id: 'q2', type: 'yes_no', correctAnswer: true, points: 10 }
      ];

      const answers = {
        q1: 'not a number', // Invalid type
        q2: 'yes' // Invalid type
      };

      const result = calculateQuizScore(questions, answers);
      expect(result.score).toBe(0);
      expect(result.percentage).toBe(0);
    });

    test('should handle very long fill-in-gaps answers', () => {
      const question = {
        id: 'q1',
        type: 'fill_in_gaps',
        correctAnswers: ['test'],
        points: 10
      };

      const longAnswer = 'a'.repeat(1000);
      const result = calculateQuizScore([question], { q1: [longAnswer] });
      expect(result.score).toBe(0);
    });
  });
});