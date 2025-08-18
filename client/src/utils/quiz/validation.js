/**
 * Validation utility functions for quiz functionality
 */

/**
 * Checks if a question type should auto-advance after answering
 * @param {string} questionType - Type of the question
 * @returns {boolean} Whether to auto-advance
 */
export const shouldAutoAdvance = (questionType) => {
  return ['multiple_choice', 'yes_no', 'scenario'].includes(questionType);
};

/**
 * Validates if a question has been answered
 * @param {Object} question - Question object
 * @param {any} answer - Current answer value
 * @param {Object} uploadedFiles - Uploaded files object
 * @returns {boolean} Whether the question is answered
 */
export const isQuestionAnswered = (question, answer, uploadedFiles = {}) => {
  if (!question) return false;

  switch (question.type) {
    case 'file_upload':
      return !!(uploadedFiles[question.id] && answer);

    case 'drag_order':
      return Array.isArray(answer) && answer.length > 0;

    case 'matching':
      return Array.isArray(answer) &&
             answer.length > 0 &&
             answer.every(match => match !== null);

    case 'fill_in_gaps':
      return Array.isArray(answer) &&
             answer.length > 0 &&
             answer.every(ans => ans && ans.trim() !== '');

    default:
      return answer !== undefined &&
             answer !== null &&
             answer !== '' &&
             (typeof answer !== 'string' || answer.trim() !== '');
  }
};

/**
 * Calculates quiz progress percentage
 * @param {number} currentIndex - Current question index
 * @param {number} totalQuestions - Total number of questions
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgress = (currentIndex, totalQuestions) => {
  if (!totalQuestions || totalQuestions === 0) return 0;
  return Math.round(((currentIndex + 1) / totalQuestions) * 100);
};

