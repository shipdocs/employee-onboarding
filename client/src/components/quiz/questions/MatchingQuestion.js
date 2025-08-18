import React, { useState, useEffect } from 'react';
import { Link2, Check, X } from 'lucide-react';

/**
 * MatchingQuestion Component
 * Renders a matching/pairing question with drag and drop
 */
const MatchingQuestion = ({ question, answer, onAnswerChange, isOffline }) => {
  const [matches, setMatches] = useState({});
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [hoveredRight, setHoveredRight] = useState(null);

  // Initialize matches from answer
  useEffect(() => {
    if (answer && typeof answer === 'object') {
      setMatches(answer);
    } else if (question.leftItems && question.rightItems) {
      // Initialize empty matches
      const initialMatches = {};
      question.leftItems.forEach((_, index) => {
        initialMatches[index] = null;
      });
      setMatches(initialMatches);
    }
  }, [question.leftItems, question.rightItems, answer]);

  const handleLeftClick = (index) => {
    if (selectedLeft === index) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(index);
    }
  };

  const handleRightClick = (rightIndex) => {
    if (selectedLeft === null) return;

    const newMatches = { ...matches };

    // Remove any existing match to this right item
    Object.keys(newMatches).forEach(key => {
      if (newMatches[key] === rightIndex) {
        newMatches[key] = null;
      }
    });

    // Create new match
    newMatches[selectedLeft] = rightIndex;

    setMatches(newMatches);
    onAnswerChange(question.id, newMatches);
    setSelectedLeft(null);
  };

  const removeMatch = (leftIndex) => {
    const newMatches = { ...matches };
    newMatches[leftIndex] = null;
    setMatches(newMatches);
    onAnswerChange(question.id, newMatches);
  };

  const getMatchedLeftIndex = (rightIndex) => {
    return Object.keys(matches).find(key => matches[key] === rightIndex);
  };

  const allMatched = question.leftItems?.every((_, index) => matches[index] !== null);
  const matchCount = Object.values(matches).filter(v => v !== null).length;

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <h2 className="text-xl font-semibold text-gray-900">
        {question.question}
      </h2>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-800">
          {question.instructions || 'Click an item on the left, then click its match on the right.'}
        </p>
      </div>

      {/* Matching Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {question.leftTitle || 'Items'}
          </h3>
          {question.leftItems?.map((item, index) => (
            <button
              key={index}
              onClick={() => handleLeftClick(index)}
              className={`
                w-full p-3 rounded-lg text-left transition-all
                flex items-center justify-between group
                ${selectedLeft === index
                  ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
                  : matches[index] !== null
                    ? 'bg-green-50 border-2 border-green-300'
                    : 'bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <span className="flex-1 text-sm text-gray-700">{item}</span>
              {matches[index] !== null ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMatch(index);
                  }}
                  className="ml-2 p-1 rounded hover:bg-red-100 transition-colors"
                  aria-label="Remove match"
                >
                  <X className="h-4 w-4 text-red-500" />
                </button>
              ) : (
                <Link2 className={`
                  h-4 w-4 ml-2
                  ${selectedLeft === index ? 'text-blue-600' : 'text-gray-400'}
                `} />
              )}
            </button>
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {question.rightTitle || 'Matches'}
          </h3>
          {question.rightItems?.map((item, index) => {
            const matchedLeftIndex = getMatchedLeftIndex(index);
            const isMatched = matchedLeftIndex !== undefined;

            return (
              <button
                key={index}
                onClick={() => handleRightClick(index)}
                onMouseEnter={() => setHoveredRight(index)}
                onMouseLeave={() => setHoveredRight(null)}
                disabled={selectedLeft === null}
                className={`
                  w-full p-3 rounded-lg text-left transition-all
                  flex items-center justify-between
                  ${isMatched
                    ? 'bg-green-50 border-2 border-green-300'
                    : selectedLeft !== null
                      ? 'bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      : 'bg-gray-50 border-2 border-gray-200 cursor-not-allowed'
                  }
                  ${hoveredRight === index && selectedLeft !== null ? 'shadow-md' : ''}
                `}
              >
                <span className="flex-1 text-sm text-gray-700">{item}</span>
                {isMatched && (
                  <Check className="h-4 w-4 text-green-600 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Connection Lines (Visual Aid) */}
      {Object.keys(matches).some(key => matches[key] !== null) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Matches:</h4>
          <div className="space-y-1 text-sm text-gray-600">
            {Object.keys(matches).map(leftIndex => {
              const rightIndex = matches[leftIndex];
              if (rightIndex === null) return null;

              return (
                <div key={leftIndex} className="flex items-center">
                  <span className="font-medium">{question.leftItems[leftIndex]}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{question.rightItems[rightIndex]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {matchCount} of {question.leftItems?.length || 0} items matched
        </span>
        {allMatched && (
          <span className="text-sm text-green-600 font-medium flex items-center">
            <Check className="h-4 w-4 mr-1" />
            All items matched
          </span>
        )}
      </div>

      {/* Offline Indicator */}
      {isOffline && allMatched && (
        <div className="text-center text-sm text-gray-600 flex items-center justify-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Matches saved locally
        </div>
      )}
    </div>
  );
};

export default MatchingQuestion;
