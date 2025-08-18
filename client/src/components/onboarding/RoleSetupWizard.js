import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useTranslation } from 'react-i18next';
import {
  Compass,
  Anchor,
  HardHat,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Award
} from 'lucide-react';

const RoleSetupWizard = () => {
  const { user, nextOnboardingStep } = useAuth();
  const { nextStep, saveRoleSelection, trackEvent, progress } = useOnboarding();
  const { t } = useTranslation(['onboarding', 'common']);
  const [selectedFocus, setSelectedFocus] = useState(progress?.selected_role_focus || null);

  // Track when user views role setup (with fallback)
  useEffect(() => {
    if (trackEvent && user?.id) {
      trackEvent('step_start', {
        step_name: 'role_setup',
        user_position: user?.position,
        vessel_assignment: user?.vessel_assignment
      });
    }
  }, [trackEvent, user?.id, user?.position, user?.vessel_assignment]);

  // Role-specific training focuses for European Inland Waterways
  const trainingFocuses = {
    'schipper': {
      icon: Compass,
      title: 'Schipper/Kapitein',
      description: 'Leiding, navigatie en volledige verantwoordelijkheid voor het schip',
      modules: [
        'Rijnvaart Navigatie & Verkeerswetten',
        'Leiderschap & Crisismanagement',
        'Lading Planning & Stabiliteit',
        'Wettelijke Verantwoordelijkheden'
      ],
      duration: '8 uur',
      priority: 'Leiderschap & Navigatie'
    },
    'stuurman': {
      icon: Anchor,
      title: 'Stuurman',
      description: 'Navigatie ondersteuning en operationele taken',
      modules: [
        'Navigatie Ondersteuning',
        'Communicatie Systemen (VHF/AIS)',
        'Sluizen & Bruggen Operaties',
        'Wachtdienst Procedures'
      ],
      duration: '6 uur',
      priority: 'Navigatie & Operaties'
    },
    'matroos': {
      icon: HardHat,
      title: 'Matroos',
      description: 'Ervaren dekwerkzaamheden en specialistische taken',
      modules: [
        'Geavanceerde Dekwerkzaamheden',
        'Lading Behandeling & Veiligheid',
        'Onderhoud & Reparaties',
        'Mentoring Nieuwe Bemanningsleden'
      ],
      duration: '5 uur',
      priority: 'Dekoperaties & Mentoring'
    },
    'deksman': {
      icon: Users,
      title: 'Deksman',
      description: 'Basis dekwerkzaamheden en algemene ondersteuning',
      modules: [
        'Basis Dekwerkzaamheden',
        'Veiligheid & Persoonlijke Bescherming',
        'Basis Onderhoud & Schoonmaak',
        'Teamwerk & Communicatie'
      ],
      duration: '4 uur',
      priority: 'Basis Dekoperaties'
    }
  };

  const handleContinue = async () => {
    if (selectedFocus) {
      // Enhanced onboarding with database persistence
      if (saveRoleSelection && user?.id) {
        const rolePreferences = {
          selected_at: new Date().toISOString(),
          user_position: user?.position,
          vessel_assignment: user?.vessel_assignment,
          training_modules: trainingFocuses[selectedFocus]?.modules || []
        };

        await saveRoleSelection(selectedFocus, rolePreferences);

        // Track analytics if available
        if (trackEvent) {
          await trackEvent('role_select', {
            step_name: 'role_setup',
            selected_role: selectedFocus,
            role_details: trainingFocuses[selectedFocus],
            user_position: user?.position
          });
        }
      }

      // Store in localStorage for backward compatibility
      localStorage.setItem(`training_focus_${user.id}`, selectedFocus);

      // Use enhanced onboarding if available, fallback to basic
      if (nextStep) {
        await nextStep();
      } else {
        nextOnboardingStep();
      }
    }
  };

  const handleBack = () => {
    // Go back to previous onboarding step
    // This would need to be implemented in AuthContext
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-burando-navy via-burando-teal to-burando-bright-teal flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="glass-card-elevated p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              🎯 Customize Your Training
            </h2>
            <p className="text-white/90 text-lg">
              Select your primary role focus to personalize your training experience
            </p>
          </div>

          {/* Role Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Object.entries(trainingFocuses).map(([key, focus]) => {
              const IconComponent = focus.icon;
              const isSelected = selectedFocus === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedFocus(key)}
                  className={`glass-card p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                    isSelected
                      ? 'ring-4 ring-burando-light-green bg-burando-bright-teal/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-full ${
                      isSelected
                        ? 'bg-burando-light-green'
                        : 'bg-burando-bright-teal'
                    }`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white">{focus.title}</h3>
                        {isSelected && (
                          <CheckCircle className="h-6 w-6 text-burando-light-green" />
                        )}
                      </div>

                      <p className="text-white/80 text-sm mb-4">{focus.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-white/70 text-sm">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Duration: {focus.duration}</span>
                        </div>
                        <div className="flex items-center text-white/70 text-sm">
                          <Award className="h-4 w-4 mr-2" />
                          <span>Focus: {focus.priority}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-white/90 text-sm font-medium">Training Modules:</p>
                        {focus.modules.map((module, index) => (
                          <div key={index} className="flex items-center text-white/70 text-xs">
                            <div className="w-1.5 h-1.5 bg-burando-bright-teal rounded-full mr-2"></div>
                            <span>{module}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Focus Summary */}
          {selectedFocus && (
            <div className="glass-card p-6 mb-8 bg-burando-bright-teal/20 border border-burando-light-green/30">
              <h3 className="text-lg font-bold text-white mb-2">
                ✅ Selected: {trainingFocuses[selectedFocus].title}
              </h3>
              <p className="text-white/90 text-sm">
                Your training will be customized for {trainingFocuses[selectedFocus].description.toLowerCase()}
                with emphasis on {trainingFocuses[selectedFocus].priority.toLowerCase()}.
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <button
              onClick={handleBack}
              className="flex items-center justify-center px-6 py-3 text-white/80 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300 min-h-[48px] touch-manipulation"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>Back</span>
            </button>

            <button
              onClick={handleContinue}
              disabled={!selectedFocus}
              className={`flex items-center justify-center px-8 py-3 rounded-lg font-semibold transition-all duration-300 min-h-[48px] touch-manipulation ${
                selectedFocus
                  ? 'bg-gradient-to-r from-burando-light-green to-burando-bright-teal text-white hover:shadow-lg transform hover:scale-[1.02]'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span>Continue to Training Overview</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              💡 Don't worry - you can access training for all roles later
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSetupWizard;
