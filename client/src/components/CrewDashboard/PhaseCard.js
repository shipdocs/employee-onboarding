import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  getPhaseStatusIcon,
  getPhaseStatusBadge,
  isPhaseAvailable,
  getDaysUntilDue,
  getQuizStatus,
  getQuizStatusBadge,
  getQuizCircleData
} from '../../utils/dashboardHelpers';

const PhaseCard = ({ phase, progress, quizHistory }) => {
  const { t } = useTranslation(['dashboard', 'common']);

  // For now, we'll use a default due date since it's not in the database
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const daysUntilDue = getDaysUntilDue(defaultDueDate);
  const isOverdue = daysUntilDue < 0;
  const isAvailable = isPhaseAvailable(phase.phase_number, progress);
  const quizResult = getQuizStatus(phase.phase_number, quizHistory);

  const renderProgressCircle = (percentage, colorClass) => (
    <svg className="w-12 h-12 sm:w-16 sm:h-16 transform -rotate-90" viewBox="0 0 36 36">
      <path
        className="text-gray-200"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <path
        className={colorClass}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${percentage}, 100`}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>
  );

  const renderQuizCircle = () => {
    const circleData = getQuizCircleData(quizResult);

    return (
      <>
        <svg className="w-12 h-12 sm:w-16 sm:h-16" viewBox="0 0 36 36">
          <circle
            className={circleData.color}
            stroke="currentColor"
            strokeWidth="3"
            fill="currentColor"
            fillOpacity={circleData.fillOpacity}
            cx="18"
            cy="18"
            r="15.9155"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg sm:text-xl font-bold ${circleData.color}`}>
            {circleData.icon}
          </span>
        </div>
      </>
    );
  };

  const renderActionButton = () => {
    if (!isAvailable) {
      return (
        <button disabled className="maritime-btn maritime-btn-secondary opacity-50 text-sm px-3 py-2 touch-target">
          <span className="hidden sm:inline">{t('common:buttons.locked')}</span>
          <span className="sm:hidden">Locked</span>
        </button>
      );
    }

    if (phase.status === 'completed') {
      // Phase training is complete, check quiz status
      if (!quizResult) {
        // No quiz taken yet - need to take quiz
        return (
          <Link
            to={`/crew/quiz/${phase.phase_number}`}
            className="maritime-btn maritime-btn-primary text-sm px-3 py-2 touch-target"
          >
            <span className="hidden sm:inline">Take Quiz</span>
            <span className="sm:hidden">Quiz</span>
          </Link>
        );
      } else {
        // Quiz has been taken - always show "View Results" to maintain assessment integrity
        return (
          <Link
            to={`/crew/quiz/${phase.phase_number}`}
            className={`maritime-btn text-sm px-3 py-2 touch-target ${
              quizResult.passed ? 'maritime-btn-success' : 'maritime-btn-outline'
            }`}
          >
            <span className="hidden sm:inline">View Results</span>
            <span className="sm:hidden">Results</span>
          </Link>
        );
      }
    } else if (phase.status === 'in_progress') {
      // Phase training in progress
      return (
        <Link
          to={`/crew/training/${phase.phase_number}`}
          className="maritime-btn maritime-btn-primary text-sm px-3 py-2 touch-target"
        >
          <span className="hidden sm:inline">{t('common:buttons.continue')}</span>
          <span className="sm:hidden">Continue</span>
        </Link>
      );
    } else {
      // Phase not started
      return (
        <Link
          to={`/crew/training/${phase.phase_number}`}
          className="maritime-btn maritime-btn-outline text-sm px-3 py-2 touch-target"
        >
          <span className="hidden sm:inline">{t('common:buttons.start')}</span>
          <span className="sm:hidden">Start</span>
        </Link>
      );
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isAvailable ? 'border-gray-200 hover:border-blue-300' : 'border-gray-100 bg-gray-50'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start space-x-3 mb-3">
            {getPhaseStatusIcon(phase.status)}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {phase.title || `Phase ${phase.phase_number}`}
              </h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {phase.description || 'Training phase description'}
              </p>
            </div>
          </div>

          {/* Mobile-optimized status badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3 lg:mb-0">
            <span className={getPhaseStatusBadge(phase.status)}>
              {t(`common:status.${phase.status.replace('_', '_')}`)}
            </span>
            <span className="text-sm text-gray-500">
              {/* TODO: Calculate completed/total items from training sessions */}
              Items: 0/0 completed
            </span>
            {getQuizStatusBadge(phase, phase.status, quizHistory)}
            {isOverdue && phase.status !== 'completed' && (
              <span className="flex items-center text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {t('dashboard:crew.completion.overdue_by_days', { days: Math.abs(daysUntilDue) })}
              </span>
            )}
            {!isOverdue && phase.status !== 'completed' && (
              <span className="text-sm text-gray-500">
                {t('dashboard:crew.completion.due_in_days', { days: daysUntilDue })}
              </span>
            )}
          </div>
        </div>

        {/* Progress and Action Section */}
        <div className="flex items-center justify-between lg:justify-end gap-3 lg:gap-3">
          {/* Progress Circle with Steps Label */}
          <div className="text-center flex-shrink-0">
            <div className="text-xs text-gray-500 mb-1">Steps</div>
            <div className="relative w-12 h-12 sm:w-16 sm:h-16">
              {renderProgressCircle(
                phase.progressPercentage || 0,
                phase.status === 'completed' ? 'text-maritime-light-green' : 'text-maritime-teal'
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-semibold">
                  {phase.progressPercentage || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Quiz Status Display */}
          {phase.status === 'completed' && (
            <div className="text-center flex-shrink-0">
              <div className="text-xs text-gray-500 mb-1">Quiz</div>
              <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                {renderQuizCircle()}
              </div>
            </div>
          )}

          {/* Action Button */}
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
};

PhaseCard.propTypes = {
  phase: PropTypes.shape({
    phase_number: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    progressPercentage: PropTypes.number
  }).isRequired,
  progress: PropTypes.shape({
    phases: PropTypes.array
  }),
  quizHistory: PropTypes.array
};

export default PhaseCard;
