import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCrewDashboard } from '../hooks/useCrewDashboard';
import LoadingSpinner from '../components/LoadingSpinner';
import WelcomeHeader from '../components/CrewDashboard/WelcomeHeader';
import QuickStats from '../components/CrewDashboard/QuickStats';
import TrainingPhases from '../components/CrewDashboard/TrainingPhases';
import NextSteps from '../components/CrewDashboard/NextSteps';
import CompletionMessage from '../components/CrewDashboard/CompletionMessage';

/**
 * CrewDashboard - Main dashboard component for crew members
 * Refactored to use smaller, focused sub-components and custom hooks
 */
const CrewDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');

  // Use custom hook for all data fetching
  const {
    progress,
    stats,
    profile,
    quizHistory,
    isLoading,
    error
  } = useCrewDashboard();

  if (isLoading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <div className="burando-card">
        <div className="burando-card-body">
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">Failed to load dashboard data</p>
            <p className="text-gray-600 text-sm">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header with Progress Bar */}
      <WelcomeHeader
        user={user}
        profile={profile}
        stats={stats}
      />

      {/* Quick Stats Cards */}
      <QuickStats
        stats={stats}
        progress={progress}
        profile={profile}
        quizHistory={quizHistory}
      />

      {/* Training Phases List */}
      <TrainingPhases
        progress={progress}
        quizHistory={quizHistory}
      />

      {/* Next Steps (shown when not completed) */}
      <NextSteps completedPhases={stats?.completedPhases} />

      {/* Completion Message (shown when all phases completed) */}
      <CompletionMessage completedPhases={stats?.completedPhases} />
    </div>
  );
};

export default CrewDashboard;
