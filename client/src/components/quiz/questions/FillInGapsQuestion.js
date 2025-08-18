import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * FillInGapsQuestion Component
 * Renders a fill-in-the-blanks question with text inputs
 */
const FillInGapsQuestion = ({ question, answer, onAnswerChange, isOffline }) => {
  const [inputs, setInputs] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(null);

  // Initialize inputs from answer or empty array
  useEffect(() => {
    if (Array.isArray(answer) && answer.length > 0) {
      setInputs(answer);
    } else if (question.template) {
      // Count the number of gaps (___) in the template
      const gapCount = (question.template.match(/___/g) || []).length;
      setInputs(new Array(gapCount).fill(''));
    }
  }, [question.template, answer]);

  const handleInputChange = (index, value) => {
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
    onAnswerChange(question.id, newInputs);
  };

  const renderTemplateWithInputs = () => {
    if (!question.template) return null;

    let inputIndex = 0;
    const parts = question.template.split('___');

    return parts.map((part, partIndex) => (
      <React.Fragment key={partIndex}>
        <span className="text-gray-800">{part}</span>
        {partIndex < parts.length - 1 && (
          <input
            type="text"
            value={inputs[inputIndex] || ''}
            onChange={(e) => handleInputChange(inputIndex, e.target.value)}
            onFocus={() => setFocusedIndex(inputIndex)}
            onBlur={() => setFocusedIndex(null)}
            className={`
              inline-block mx-1 px-3 py-1 min-w-[100px] max-w-[200px]
              border-b-2 bg-transparent text-center font-medium
              transition-all duration-200
              ${focusedIndex === inputIndex
                ? 'border-blue-500 text-blue-700'
                : inputs[inputIndex]?.trim()
                  ? 'border-green-500 text-green-700'
                  : 'border-gray-300 text-gray-700'
              }
              focus:outline-none focus:bg-blue-50
              placeholder-gray-400
            `}
            placeholder={question.placeholders?.[inputIndex++] || '...'}
            aria-label={`Fill in blank ${inputIndex}`}
          />
        )}
      </React.Fragment>
    ));
  };

  const allFieldsFilled = inputs.every(input => input && input.trim() !== '');
  const filledCount = inputs.filter(input => input && input.trim() !== '').length;
  const totalCount = inputs.length;

  return (
    <div className="space-y-6">
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

      {/* Fill in the Gaps Template */}
      <div className="bg-gray-50 rounded-lg p-6 text-lg leading-relaxed">
        {renderTemplateWithInputs()}
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {allFieldsFilled ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                All fields completed
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {filledCount} of {totalCount} fields filled
              </span>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(filledCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Hints */}
      {question.hints && question.hints.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Hints:</p>
          <ul className="space-y-1">
            {question.hints.map((hint, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && allFieldsFilled && (
        <div className="text-center text-sm text-gray-600 flex items-center justify-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Answers saved locally
        </div>
      )}

      {/* Mobile Styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          input {
            min-width: 80px;
            max-width: 150px;
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
};

export default FillInGapsQuestion;
