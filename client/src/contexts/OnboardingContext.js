// Enhanced Onboarding Context for Phase 3.2
// Provides database-backed onboarding state management with analytics

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import onboardingService from '../services/onboardingService';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load onboarding progress from database
  const loadProgress = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    // Only load onboarding progress for crew members
    if (user.role !== 'crew') {
      setProgress(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let progressData = await onboardingService.getProgress(user.id);

      // If no progress exists and user is crew, initialize it
      if (!progressData && user.role === 'crew') {
        progressData = await onboardingService.initializeProgress(user.id);
      }

      setProgress(progressData);
    } catch (err) {
      // console.error('Error loading onboarding progress:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  // Load progress when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadProgress();
    } else {
      setProgress(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, loadProgress]);

  // Check if user needs onboarding
  const needsOnboarding = useCallback(() => {
    if (!user || user.role !== 'crew') return false;
    if (!progress) return true;
    return !progress.is_completed;
  }, [user, progress]);

  // Get current step
  const getCurrentStep = useCallback(() => {
    return progress?.current_step || 0;
  }, [progress]);

  // Advance to next step
  const nextStep = useCallback(async (stepData = {}) => {
    if (!user?.id) return false;

    try {
      // If we have progress data, try enhanced update
      if (progress) {
        const newStep = progress.current_step + 1;
        const updatedProgress = await onboardingService.updateStep(user.id, newStep, stepData);

        if (updatedProgress) {
          setProgress(updatedProgress);
          return true;
        }
      }

      // Fallback: If enhanced update fails or no progress, just return true
      // The basic onboarding flow will handle this
      // console.warn('Enhanced onboarding step failed, using fallback');
      return true;
    } catch (err) {
      // console.warn('Error advancing onboarding step (using fallback):', err.message);
      // Don't set error state - let the basic flow handle it
      return true;
    }
  }, [user?.id, progress]);

  // Go to specific step
  const goToStep = useCallback(async (stepNumber, stepData = {}) => {
    if (!user?.id || !progress) return false;

    try {
      const updatedProgress = await onboardingService.updateStep(user.id, stepNumber, stepData);

      if (updatedProgress) {
        setProgress(updatedProgress);
        return true;
      }
      return false;
    } catch (err) {
      // console.error('Error going to onboarding step:', err);
      setError(err.message);
      return false;
    }
  }, [user?.id, progress]);

  // Save role selection
  const saveRoleSelection = useCallback(async (roleFocus, preferences = {}) => {
    if (!user?.id) return false;

    try {
      const updatedProgress = await onboardingService.saveRoleSelection(user.id, roleFocus, preferences);

      if (updatedProgress) {
        setProgress(updatedProgress);
        return true;
      }
      return false;
    } catch (err) {
      // console.error('Error saving role selection:', err);
      setError(err.message);
      return false;
    }
  }, [user?.id]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return false;

    try {
      // Try enhanced completion if we have progress
      if (progress) {
        const completedProgress = await onboardingService.completeOnboarding(user.id);

        if (completedProgress) {
          setProgress(completedProgress);
          localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
          return true;
        }
      }

      // Fallback: Just mark as completed in localStorage
      // console.warn('Enhanced onboarding completion failed, using fallback');
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      return true;
    } catch (err) {
      // console.warn('Error completing onboarding (using fallback):', err.message);
      // Fallback: Just mark as completed in localStorage
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      return true;
    }
  }, [user?.id, progress]);

  // Skip onboarding (for testing or special cases)
  const skipOnboarding = useCallback(async () => {
    return await completeOnboarding();
  }, [completeOnboarding]);

  // Track custom events
  const trackEvent = useCallback(async (eventType, eventData = {}) => {
    if (!user?.id || !isAuthenticated) {
      // console.warn('Skipping analytics tracking - user not authenticated');
      return;
    }

    try {
      await onboardingService.trackEvent(
        user.id,
        eventType,
        progress?.current_step,
        eventData
      );
    } catch (err) {
      // console.warn('Analytics tracking failed (non-critical):', err.message);
      // Don't set error state for analytics failures
    }
  }, [user?.id, isAuthenticated, progress?.current_step]);

  // Get role-specific content
  const getRoleContent = useCallback(() => {
    if (!progress?.selected_role_focus) return null;

    const roleContent = {
      'schipper': {
        welcomeMessage: 'Welkom aan boord, Schipper! Uw leiderschap en navigatie expertise is cruciaal voor onze binnenvaart operaties.',
        trainingFocus: 'Leiderschap, Navigatie, en Wettelijke Verantwoordelijkheden',
        estimatedDuration: '8-10 uur',
        priority: 'Leiderschap & Navigatie'
      },
      'stuurman': {
        welcomeMessage: 'Welkom aan boord, Stuurman! Uw navigatie ondersteuning houdt onze operaties veilig en efficiënt.',
        trainingFocus: 'Navigatie Ondersteuning, Communicatie, en Operationele Procedures',
        estimatedDuration: '6-8 uur',
        priority: 'Navigatie & Operaties'
      },
      'matroos': {
        welcomeMessage: 'Welkom aan boord, Matroos! Uw ervaring en mentoring vaardigheden zijn waardevol voor ons team.',
        trainingFocus: 'Geavanceerde Dekoperaties, Lading Behandeling, en Mentoring',
        estimatedDuration: '5-7 uur',
        priority: 'Dekoperaties & Mentoring'
      },
      'deksman': {
        welcomeMessage: 'Welkom aan boord, Deksman! Uw bijdrage aan ons team is gewaardeerd en belangrijk.',
        trainingFocus: 'Basis Dekoperaties, Veiligheid, en Teamwerk',
        estimatedDuration: '4-5 uur',
        priority: 'Basis Dekoperaties'
      }
    };

    return roleContent[progress.selected_role_focus] || roleContent.deksman;
  }, [progress?.selected_role_focus]);

  // Get completion percentage
  const getCompletionPercentage = useCallback(() => {
    if (!progress) return 0;
    if (progress.is_completed) return 100;

    const totalSteps = 3; // Welcome, Role Setup, Training Overview
    return Math.round((progress.completed_steps.length / totalSteps) * 100);
  }, [progress]);

  const value = {
    // State
    progress,
    isLoading,
    error,

    // Computed values
    needsOnboarding: needsOnboarding(),
    currentStep: getCurrentStep(),
    completionPercentage: getCompletionPercentage(),
    roleContent: getRoleContent(),

    // Actions
    nextStep,
    goToStep,
    saveRoleSelection,
    completeOnboarding,
    skipOnboarding,
    trackEvent,

    // Utilities
    refreshProgress: loadProgress,
    clearError: () => setError(null)
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;
