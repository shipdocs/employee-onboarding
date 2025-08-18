import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * MultipleChoiceQuestion Component
 * Renders a multiple choice question with radio buttons
 */
const MultipleChoiceQuestion = ({ question, answer, onAnswerChange, isOffline }) => {
  const handleChange = (optionIndex) => {
    onAnswerChange(question.id, optionIndex);
  };

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {question.question}
      </h2>

      {/* Answer Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <label
            key={index}
            className={`
              flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all
              touch-target hover:shadow-md
              ${answer === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={index}
              checked={answer === index}
              onChange={() => handleChange(index)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              aria-label={`Option ${index + 1}: ${option}`}
            />
            <span className="ml-3 flex-1 text-gray-700">
              {option}
            </span>
            {answer === index && (
              <CheckCircle className="h-5 w-5 text-blue-600 ml-2 flex-shrink-0" />
            )}
          </label>
        ))}
      </div>

      {/* Offline Indicator */}
      {isOffline && answer !== undefined && answer !== null && (
        <div className="mt-4 text-sm text-gray-600 flex items-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Answer saved locally
        </div>
      )}

      {/* Mobile Touch Target Styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          .touch-target {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
};

export default MultipleChoiceQuestion;
