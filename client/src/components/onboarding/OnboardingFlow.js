import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import WelcomeAboardScreen from './WelcomeAboardScreen';
import RoleSetupWizard from './RoleSetupWizard';
import TrainingOverview from './TrainingOverview';

const OnboardingFlow = () => {
  const { onboardingStep } = useAuth(); // Fallback for basic onboarding
  const { currentStep, isLoading } = useOnboarding();

  // Use enhanced currentStep if available, fallback to basic onboardingStep
  const step = currentStep !== undefined ? currentStep : onboardingStep;

  // console.log('🎯 OnboardingFlow - Current step:', step, 'Enhanced step:', currentStep, 'Basic step:', onboardingStep);

  // Show loading if enhanced onboarding is still loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-maritime-deep-blue via-maritime-navy to-maritime-dark-blue flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maritime-light-green mx-auto mb-4"></div>
          <p>Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  // Render the appropriate onboarding step
  switch (step) {
    case 0:
      return <WelcomeAboardScreen />;
    case 1:
      return <RoleSetupWizard />;
    case 2:
      return <TrainingOverview />;
    default:
      // Fallback - should not happen
      return <WelcomeAboardScreen />;
  }
};

export default OnboardingFlow;
