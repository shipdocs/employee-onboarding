import React from 'react';
import { Clock, FileText, AlertCircle } from 'lucide-react';
import { calculateQuizDuration } from '../../utils/quiz/timeUtils';

/**
 * QuizStartScreen Component
 * Displays quiz information and start button
 */
const QuizStartScreen = ({
  quizData,
  onStartQuiz,
  previousAttempt = null,
  isRetrying = false
}) => {
  const duration = calculateQuizDuration(quizData?.questions?.length || 0);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
        Phase {quizData?.phase || 3} Quiz
      </h1>

      {/* Previous Attempt Warning */}
      {previousAttempt && !previousAttempt.passed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Previous Attempt
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                You scored {previousAttempt.score}/{previousAttempt.total_questions} on your last attempt.
                A score of 70% or higher is required to pass.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center mb-3">
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-blue-900">Questions</h3>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {quizData?.questions?.length || 0}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Multiple choice, scenarios, and more
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center mb-3">
            <Clock className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-green-900">Time Limit</h3>
          </div>
          <p className="text-2xl font-bold text-green-800">
            {duration} minutes
          </p>
          <p className="text-sm text-green-700 mt-1">
            Approximately 1 minute per question
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Answer all questions to the best of your ability
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            You can navigate between questions using Previous/Next buttons
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Some questions may auto-advance after answering
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            A score of 70% or higher is required to pass
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Your progress is saved automatically
          </li>
        </ul>
      </div>

      {/* Start Button */}
      <div className="text-center">
        <button
          onClick={onStartQuiz}
          className="px-8 py-4 bg-blue-600 text-white font-semibold text-lg rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all touch-target"
        >
          {isRetrying ? 'Retry Quiz' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizStartScreen;
