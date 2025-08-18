import React from 'react';
import { CheckCircle, XCircle, Home, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeedbackWidget from '../feedback/FeedbackWidget';

/**
 * QuizResults Component
 * Displays quiz completion results and next actions
 */
const QuizResults = ({
  passed,
  score,
  totalQuestions,
  onRetry,
  userRole = 'crew'
}) => {
  const navigate = useNavigate();
  const percentage = Math.round((score / totalQuestions) * 100);

  const handleNavigateHome = () => {
    const dashboardPath = userRole === 'crew' ? '/crew-dashboard' : '/dashboard';
    navigate(dashboardPath);
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Result Icon */}
      <div className="mb-6">
        {passed ? (
          <CheckCircle className="h-24 w-24 text-green-500 mx-auto animate-scale-in" />
        ) : (
          <XCircle className="h-24 w-24 text-red-500 mx-auto animate-scale-in" />
        )}
      </div>

      {/* Result Message */}
      <h1 className="text-3xl font-bold mb-4">
        {passed ? 'Congratulations!' : 'Quiz Not Passed'}
      </h1>

      {/* Score Display */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <p className="text-lg text-gray-700 mb-2">Your Score:</p>
        <p className="text-4xl font-bold text-gray-900">
          {score}/{totalQuestions}
        </p>
        <p className="text-lg text-gray-600 mt-2">
          ({percentage}%)
        </p>
        <p className="text-sm text-gray-500 mt-4">
          {passed
            ? 'You have successfully passed the quiz!'
            : 'A score of 70% or higher is required to pass.'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <button
          onClick={handleNavigateHome}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors touch-target"
        >
          <Home className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>

        {!passed && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors touch-target"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Retry Quiz
          </button>
        )}
      </div>

      {/* Feedback Widget */}
      <div className="mt-8">
        <FeedbackWidget
          context="quiz_completion"
          metadata={{
            passed,
            score,
            percentage,
            totalQuestions
          }}
        />
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        
        @media (max-width: 640px) {
          .touch-target {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
};

export default QuizResults;
