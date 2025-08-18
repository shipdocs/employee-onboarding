import React from 'react';
import { ChevronLeft, ChevronRight, Send, AlertCircle } from 'lucide-react';
import { isQuestionAnswered } from '../../utils/quiz/validation';

/**
 * QuizNavigation Component
 * Handles navigation between questions and quiz submission
 */
const QuizNavigation = ({
  currentQuestionIndex,
  totalQuestions,
  currentQuestion,
  currentAnswer,
  uploadedFiles,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting,
  offlineMode
}) => {
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isAnswered = isQuestionAnswered(currentQuestion, currentAnswer, uploadedFiles);

  return (
    <div className="mt-8">
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className={`
            flex items-center px-4 py-2 rounded-lg font-medium transition-all touch-target
            ${isFirstQuestion
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
          aria-label="Previous question"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Question Counter (Mobile) */}
        <div className="sm:hidden text-center text-sm text-gray-600">
          {currentQuestionIndex + 1} / {totalQuestions}
        </div>

        {/* Next/Submit Button */}
        {!isLastQuestion ? (
          <button
            onClick={onNext}
            disabled={!isAnswered}
            className={`
              flex items-center px-4 py-2 rounded-lg font-medium transition-all touch-target
              ${isAnswered
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
            aria-label="Next question"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-5 w-5 ml-1" />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!isAnswered || isSubmitting}
            className={`
              flex items-center px-6 py-3 rounded-lg font-semibold transition-all touch-target
              ${isAnswered && !isSubmitting
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
            aria-label="Submit quiz"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                <span>Submit Quiz</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Answer Required Message */}
      {!isAnswered && currentQuestion && (
        <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>Please answer this question before proceeding</span>
        </div>
      )}

      {/* Offline Mode Warning */}
      {offlineMode && isLastQuestion && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Offline Mode:</strong> Your quiz will be submitted automatically when you reconnect to the internet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Touch Target Styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          .touch-target {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
};

export default QuizNavigation;
