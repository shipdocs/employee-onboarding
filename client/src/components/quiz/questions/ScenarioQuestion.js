import React from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

/**
 * ScenarioQuestion Component
 * Renders a scenario-based multiple choice question
 */
const ScenarioQuestion = ({ question, answer, onAnswerChange, isOffline }) => {
  const handleChange = (optionIndex) => {
    onAnswerChange(question.id, optionIndex);
  };

  return (
    <div className="space-y-6">
      {/* Question/Scenario Title */}
      <h2 className="text-xl font-semibold text-gray-900">
        {question.question}
      </h2>

      {/* Scenario Description */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-yellow-800 mb-2">Scenario</h3>
            <p className="text-sm text-yellow-700 whitespace-pre-line">
              {question.scenario}
            </p>
          </div>
        </div>
      </div>

      {/* Context Information */}
      {question.context && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-1">Additional Context</h4>
              <p className="text-sm text-blue-700">{question.context}</p>
            </div>
          </div>
        </div>
      )}

      {/* Response Options */}
      <div className="space-y-3">
        <h3 className="text-base font-medium text-gray-700">What would you do?</h3>
        {question.options.map((option, index) => (
          <label
            key={index}
            className={`
              flex items-start p-4 rounded-lg border-2 cursor-pointer
              transition-all duration-200 hover:shadow-md
              ${answer === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <input
              type="radio"
              name={`scenario-${question.id}`}
              value={index}
              checked={answer === index}
              onChange={() => handleChange(index)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              aria-label={`Option ${index + 1}`}
            />
            <div className="ml-3 flex-1">
              <span className={`
                block text-sm
                ${answer === index ? 'text-blue-900 font-medium' : 'text-gray-700'}
              `}>
                {option}
              </span>
              {answer === index && question.optionFeedback?.[index] && (
                <p className="mt-2 text-xs text-blue-700 italic">
                  {question.optionFeedback[index]}
                </p>
              )}
            </div>
            {answer === index && (
              <CheckCircle className="h-5 w-5 text-blue-600 ml-2 flex-shrink-0" />
            )}
          </label>
        ))}
      </div>

      {/* Safety Note */}
      {question.safetyNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 mb-1">Safety Note</h4>
              <p className="text-sm text-red-700">{question.safetyNote}</p>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && answer !== undefined && answer !== null && (
        <div className="text-center text-sm text-gray-600 flex items-center justify-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Answer saved locally
        </div>
      )}
    </div>
  );
};

export default ScenarioQuestion;
