import { useQuery } from 'react-query';
import crewService from '../services/crewService';
import trainingService from '../services/trainingService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for CrewDashboard data fetching
 * Consolidates all dashboard queries and provides loading state
 */
export const useCrewDashboard = () => {
  const { user } = useAuth();

  // Fetch training progress
  const {
    data: progress,
    isLoading: progressLoading,
    error: progressError
  } = useQuery(
    'training-progress',
    crewService.getTrainingProgress
  );

  // Fetch training stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery(
    'training-stats',
    trainingService.getStats
  );

  // Fetch profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError
  } = useQuery(
    'crew-profile',
    crewService.getProfile
  );

  // Fetch quiz history for pass/fail status
  const {
    data: quizHistory,
    isLoading: quizHistoryLoading,
    error: quizHistoryError
  } = useQuery(
    'quiz-history',
    () => trainingService.getQuizHistory(),
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  const isLoading = progressLoading || statsLoading || profileLoading;
  const error = progressError || statsError || profileError || quizHistoryError;

  return {
    progress,
    stats,
    profile,
    quizHistory,
    isLoading,
    error,
    // Individual loading states for fine-grained control
    loadingStates: {
      progressLoading,
      statsLoading,
      profileLoading,
      quizHistoryLoading
    }
  };
};
