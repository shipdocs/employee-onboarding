import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * YesNoQuestion Component
 * Renders a yes/no question with visual buttons
 */
const YesNoQuestion = ({ question, answer, onAnswerChange, isOffline }) => {
  const handleChange = (value) => {
    onAnswerChange(question.id, value);
  };

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <h2 className="text-xl font-semibold text-gray-900">
        {question.question}
      </h2>

      {/* Yes/No Buttons */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {/* Yes Button */}
        <button
          onClick={() => handleChange(true)}
          className={`
            relative flex flex-col items-center justify-center p-6 rounded-xl
            border-2 transition-all transform hover:scale-105 touch-target
            ${answer === true
              ? 'border-green-500 bg-green-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
            }
          `}
          aria-label="Answer Yes"
        >
          <div className={`
            rounded-full p-3 mb-3 transition-colors
            ${answer === true ? 'bg-green-500' : 'bg-gray-200'}
          `}>
            <Check className={`h-8 w-8 ${answer === true ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <span className={`
            text-lg font-semibold
            ${answer === true ? 'text-green-700' : 'text-gray-700'}
          `}>
            Yes
          </span>
          {answer === true && (
            <div className="absolute top-2 right-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </button>

        {/* No Button */}
        <button
          onClick={() => handleChange(false)}
          className={`
            relative flex flex-col items-center justify-center p-6 rounded-xl
            border-2 transition-all transform hover:scale-105 touch-target
            ${answer === false
              ? 'border-red-500 bg-red-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-md'
            }
          `}
          aria-label="Answer No"
        >
          <div className={`
            rounded-full p-3 mb-3 transition-colors
            ${answer === false ? 'bg-red-500' : 'bg-gray-200'}
          `}>
            <X className={`h-8 w-8 ${answer === false ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <span className={`
            text-lg font-semibold
            ${answer === false ? 'text-red-700' : 'text-gray-700'}
          `}>
            No
          </span>
          {answer === false && (
            <div className="absolute top-2 right-2">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </button>
      </div>

      {/* Additional Information */}
      {question.hint && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Hint:</strong> {question.hint}
          </p>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && answer !== undefined && answer !== null && (
        <div className="mt-4 text-center text-sm text-gray-600 flex items-center justify-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Answer saved locally
        </div>
      )}

      {/* Mobile Touch Target Styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          .touch-target {
            min-height: 60px;
          }
        }
      `}</style>
    </div>
  );
};

export default YesNoQuestion;
