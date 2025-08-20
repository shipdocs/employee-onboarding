import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useTranslation } from 'react-i18next';
import { Ship, Anchor, Users, BookOpen, ArrowRight } from 'lucide-react';

const WelcomeAboardScreen = () => {
  const { user, nextOnboardingStep } = useAuth();
  const { nextStep, trackEvent } = useOnboarding();
  const { t } = useTranslation(['onboarding', 'common']);

  // Track when user views welcome screen (with fallback)
  useEffect(() => {
    if (trackEvent && user?.id) {
      trackEvent('step_start', {
        step_name: 'welcome_aboard',
        user_role: user?.role,
        vessel_assignment: user?.vessel_assignment
      });
    }
  }, [trackEvent, user?.id, user?.role, user?.vessel_assignment]);

  const handleContinue = async () => {
    // Track analytics if available
    if (trackEvent && user?.id) {
      await trackEvent('step_complete', {
        step_name: 'welcome_aboard',
        action: 'continue_clicked'
      });
    }

    // Use enhanced onboarding if available, fallback to basic
    if (nextStep) {
      await nextStep();
    } else {
      nextOnboardingStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maritime-navy via-maritime-teal to-maritime-bright-teal flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Welcome Card */}
        <div className="glass-card-elevated p-8 sm:p-12 text-center">
          {/* Maritime Welcome Animation */}
          <div className="relative mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-maritime-bright-teal to-maritime-teal rounded-full mb-6 shadow-2xl animate-pulse">
              <Ship className="h-16 w-16 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-maritime-light-green rounded-full flex items-center justify-center animate-bounce">
              <Anchor className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Welcome Message */}
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 drop-shadow-xl">
            🚢 Welcome Aboard!
          </h1>

          <div className="text-white/90 text-lg sm:text-xl mb-8 space-y-2">
            <p className="font-semibold">
              Hi {user?.firstName}, you're joining the crew as a <span className="text-maritime-light-green font-bold">{user?.role}</span>
            </p>
            <p>
              Let's get you started with your maritime safety training
            </p>
          </div>

          {/* Training Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="glass-card p-4 text-center">
              <BookOpen className="h-8 w-8 text-maritime-bright-teal mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">Safety Training</h3>
              <p className="text-white/70 text-xs">Essential maritime safety protocols</p>
            </div>

            <div className="glass-card p-4 text-center">
              <Users className="h-8 w-8 text-maritime-bright-teal mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">Team Integration</h3>
              <p className="text-white/70 text-xs">Meet your crew and responsibilities</p>
            </div>

            <div className="glass-card p-4 text-center">
              <Ship className="h-8 w-8 text-maritime-bright-teal mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">Vessel Operations</h3>
              <p className="text-white/70 text-xs">Ship-specific procedures and equipment</p>
            </div>
          </div>

          {/* Training Timeline */}
          <div className="glass-card p-6 mb-8 text-left">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Your Training Journey</h3>
            <div className="space-y-3">
              <div className="flex items-center text-white/90">
                <div className="w-3 h-3 bg-maritime-bright-teal rounded-full mr-3"></div>
                <span className="text-sm"><strong>Phase 1:</strong> Safety Fundamentals (2 hours)</span>
              </div>
              <div className="flex items-center text-white/90">
                <div className="w-3 h-3 bg-maritime-teal rounded-full mr-3"></div>
                <span className="text-sm"><strong>Phase 2:</strong> Emergency Procedures (2 hours)</span>
              </div>
              <div className="flex items-center text-white/90">
                <div className="w-3 h-3 bg-maritime-navy rounded-full mr-3"></div>
                <span className="text-sm"><strong>Phase 3:</strong> Operational Training (2 hours)</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-maritime-bright-teal/20 rounded-lg">
              <p className="text-white/90 text-sm text-center">
                <strong>Total Time:</strong> 4-6 hours over 2 weeks
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-maritime-light-green to-maritime-bright-teal text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-maritime-bright-teal/50 focus:ring-offset-2 shadow-xl min-h-[56px] touch-manipulation"
          >
            <div className="flex items-center justify-center">
              <span>Start Your Training Journey</span>
              <ArrowRight className="h-6 w-6 ml-3" />
            </div>
          </button>

          {/* Maritime Context */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              🌊 Designed for maritime professionals by maritime experts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeAboardScreen;
