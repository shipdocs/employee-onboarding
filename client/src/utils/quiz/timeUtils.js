/**
 * Time utility functions for quiz functionality
 */

/**
 * Formats seconds into MM:SS display format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Gets timer color class based on remaining time
 * @param {number} timeRemaining - Remaining time in seconds
 * @returns {string} Tailwind CSS class for timer color
 */
export const getTimerColor = (timeRemaining) => {
  if (timeRemaining <= 60) return 'text-red-600';
  if (timeRemaining <= 180) return 'text-yellow-600';
  return 'text-gray-700';
};

/**
 * Calculates total quiz duration in minutes
 * @param {number} questionCount - Number of questions
 * @param {number} secondsPerQuestion - Seconds allocated per question (default 60)
 * @returns {number} Total minutes
 */
export const calculateQuizDuration = (questionCount, secondsPerQuestion = 60) => {
  return Math.ceil((questionCount * secondsPerQuestion) / 60);
};
