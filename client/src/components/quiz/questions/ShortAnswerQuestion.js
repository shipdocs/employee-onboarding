import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * ShortAnswerQuestion Component
 * Renders a short answer text area question
 */
const ShortAnswerQuestion = ({ question, answer, onAnswerChange, isOffline }) => {
  const handleChange = (event) => {
    onAnswerChange(question.id, event.target.value);
  };

  const wordCount = answer ? answer.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
  const minWords = question.minWords || 10;
  const maxWords = question.maxWords || 100;

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <h2 className="text-xl font-semibold text-gray-900">
        {question.question}
      </h2>

      {/* Instructions */}
      {question.instructions && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-800">{question.instructions}</p>
        </div>
      )}

      {/* Answer Text Area */}
      <div className="relative">
        <textarea
          value={answer || ''}
          onChange={handleChange}
          placeholder={question.placeholder || 'Type your answer here...'}
          className={`
            w-full p-4 border-2 rounded-lg resize-none
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${answer?.trim() ? 'border-green-300' : 'border-gray-300'}
          `}
          rows={6}
          aria-label="Short answer input"
          style={{ fontSize: '16px' }} // Prevent zoom on iOS
        />

        {/* Character/Word Count */}
        <div className="absolute bottom-2 right-2 text-sm text-gray-500">
          <MessageSquare className="inline h-4 w-4 mr-1" />
          {wordCount} words
        </div>
      </div>

      {/* Word Count Indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className={`
          ${wordCount < minWords ? 'text-yellow-600' : 'text-green-600'}
        `}>
          {wordCount < minWords
            ? `Minimum ${minWords} words required (${minWords - wordCount} more needed)`
            : 'Word requirement met ✓'
          }
        </span>
        {maxWords && (
          <span className={`
            ${wordCount > maxWords ? 'text-red-600' : 'text-gray-600'}
          `}>
            Max: {maxWords} words
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`
            h-full rounded-full transition-all duration-300
            ${wordCount < minWords
              ? 'bg-yellow-500'
              : wordCount > maxWords
                ? 'bg-red-500'
                : 'bg-green-500'
            }
          `}
          style={{
            width: `${Math.min((wordCount / (maxWords || minWords * 2)) * 100, 100)}%`
          }}
        />
      </div>

      {/* Tips */}
      {question.tips && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Tips for your answer:</p>
          <ul className="space-y-1 text-sm text-gray-600">
            {question.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && answer?.trim() && (
        <div className="text-center text-sm text-gray-600 flex items-center justify-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Answer saved locally
        </div>
      )}
    </div>
  );
};

export default ShortAnswerQuestion;
