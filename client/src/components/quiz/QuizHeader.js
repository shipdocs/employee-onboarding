import React from 'react';
import { Clock, Globe, WifiOff, ChevronDown } from 'lucide-react';
import { formatTime, getTimerColor } from '../../utils/quiz/timeUtils';

/**
 * QuizHeader Component
 * Displays quiz timer, language selector, and offline indicator
 */
const QuizHeader = ({
  timeRemaining,
  showLanguageDropdown,
  onToggleLanguage,
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  isOffline,
  translationLoading
}) => {
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center">
        {/* Timer Display */}
        <div className="flex items-center space-x-2">
          <Clock className={`h-5 w-5 ${getTimerColor(timeRemaining)}`} />
          <span className={`font-semibold text-lg ${getTimerColor(timeRemaining)}`}>
            {formatTime(timeRemaining)}
          </span>
          {timeRemaining <= 60 && (
            <span className="text-red-600 text-sm animate-pulse">
              Time running out!
            </span>
          )}
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-4">
          {/* Offline Indicator */}
          {isOffline && (
            <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg">
              <WifiOff className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Offline Mode</span>
            </div>
          )}

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={onToggleLanguage}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-target"
              disabled={translationLoading}
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">
                {currentLanguage.toUpperCase()}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Dropdown */}
            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => onLanguageChange(lang.code)}
                    className={`
                      w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg
                      ${currentLanguage === lang.code ? 'bg-blue-50 text-blue-600' : ''}
                    `}
                    disabled={currentLanguage === lang.code || translationLoading}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}

            {/* Translation Loading Indicator */}
            {translationLoading && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Translating...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout Adjustment */}
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

export default QuizHeader;
