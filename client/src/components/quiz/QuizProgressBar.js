import React from 'react';
import { calculateProgress } from '../../utils/quiz/validation';

/**
 * QuizProgressBar Component
 * Displays visual progress through the quiz
 */
const QuizProgressBar = ({ currentQuestionIndex, totalQuestions }) => {
  const progress = calculateProgress(currentQuestionIndex, totalQuestions);

  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
        <span>{progress}% Complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
    </div>
  );
};

export default QuizProgressBar;
