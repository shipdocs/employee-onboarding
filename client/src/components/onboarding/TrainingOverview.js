import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useTranslation } from 'react-i18next';
import {
  Play,
  CheckCircle,
  Clock,
  Users,
  Award,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Ship,
  LifeBuoy
} from 'lucide-react';

const TrainingOverview = () => {
  const { user, completeOnboarding: basicCompleteOnboarding } = useAuth();
  const { completeOnboarding, trackEvent, progress, roleContent } = useOnboarding();
  const { t } = useTranslation(['onboarding', 'common']);

  // Track when user views training overview (with fallback)
  useEffect(() => {
    if (trackEvent && user?.id) {
      trackEvent('step_start', {
        step_name: 'training_overview',
        selected_role_focus: progress?.selected_role_focus,
        user_position: user?.position
      });
    }
  }, [trackEvent, user?.id, progress?.selected_role_focus, user?.position]);

  // Get the selected training focus from onboarding progress
  const trainingFocus = progress?.selected_role_focus || 'general';

  const trainingPhases = [
    {
      phase: 1,
      title: 'Safety Fundamentals',
      description: 'Essential maritime safety knowledge and emergency procedures',
      icon: LifeBuoy,
      duration: '2 hours',
      modules: [
        'Personal Safety Equipment',
        'Emergency Alarm Signals',
        'Muster Station Procedures',
        'Basic First Aid'
      ],
      status: 'ready'
    },
    {
      phase: 2,
      title: 'Emergency Procedures',
      description: 'Advanced emergency response and crisis management',
      icon: AlertTriangle,
      duration: '2 hours',
      modules: [
        'Fire Fighting Procedures',
        'Abandon Ship Procedures',
        'Man Overboard Response',
        'Emergency Communication'
      ],
      status: 'locked'
    },
    {
      phase: 3,
      title: 'Operational Training',
      description: 'Role-specific operational procedures and equipment',
      icon: Ship,
      duration: '2 hours',
      modules: [
        'Equipment Operation',
        'Standard Procedures',
        'Documentation Requirements',
        'Quality Assurance'
      ],
      status: 'locked'
    }
  ];

  const handleStartTraining = async () => {
    // Track analytics if available
    if (trackEvent && user?.id) {
      await trackEvent('flow_complete', {
        step_name: 'training_overview',
        action: 'start_training_clicked',
        selected_role_focus: trainingFocus,
        completion_method: 'normal_flow'
      });
    }

    // Use enhanced onboarding if available, fallback to basic
    if (completeOnboarding) {
      await completeOnboarding();
    } else {
      basicCompleteOnboarding();
    }
    // This will redirect to the crew dashboard where they can start training
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <Play className="h-5 w-5 text-burando-light-green" />;
      case 'locked':
        return <Clock className="h-5 w-5 text-white/50" />;
      default:
        return <CheckCircle className="h-5 w-5 text-burando-light-green" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ready':
        return 'Ready to Start';
      case 'locked':
        return 'Unlocks After Previous Phase';
      default:
        return 'Completed';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'ready':
        return 'text-white font-semibold';
      case 'locked':
        return 'text-white/50';
      default:
        return 'text-burando-light-green font-semibold';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-burando-navy via-burando-teal to-burando-bright-teal flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="glass-card-elevated p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              📚 Your Training Program
            </h2>
            <p className="text-white/90 text-lg mb-2">
              Welcome to your personalized maritime training journey
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-burando-bright-teal/20 rounded-full">
              <Award className="h-5 w-5 text-burando-light-green mr-2" />
              <span className="text-white font-medium">
                Focus: {trainingFocus.charAt(0).toUpperCase() + trainingFocus.slice(1).replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Training Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass-card p-4 text-center">
              <BookOpen className="h-8 w-8 text-burando-bright-teal mx-auto mb-2" />
              <h3 className="font-semibold text-white">3 Phases</h3>
              <p className="text-white/70 text-sm">Comprehensive training program</p>
            </div>

            <div className="glass-card p-4 text-center">
              <Clock className="h-8 w-8 text-burando-bright-teal mx-auto mb-2" />
              <h3 className="font-semibold text-white">6 Hours Total</h3>
              <p className="text-white/70 text-sm">Flexible self-paced learning</p>
            </div>

            <div className="glass-card p-4 text-center">
              <Users className="h-8 w-8 text-burando-bright-teal mx-auto mb-2" />
              <h3 className="font-semibold text-white">Expert Support</h3>
              <p className="text-white/70 text-sm">Maritime professionals available</p>
            </div>
          </div>

          {/* Training Phases */}
          <div className="space-y-6 mb-8">
            {trainingPhases.map((phase) => {
              const IconComponent = phase.icon;
              const isReady = phase.status === 'ready';

              return (
                <div
                  key={phase.phase}
                  className={`glass-card p-6 transition-all duration-300 ${
                    isReady ? 'ring-2 ring-burando-light-green' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-full ${
                      isReady
                        ? 'bg-burando-light-green'
                        : 'bg-white/20'
                    }`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white">
                          Phase {phase.phase}: {phase.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(phase.status)}
                          <span className={`text-sm font-semibold ${getStatusTextColor(phase.status)}`}>
                            {getStatusText(phase.status)}
                          </span>
                        </div>
                      </div>

                      <p className="text-white/80 mb-4">{phase.description}</p>

                      <div className="flex items-center text-white/70 text-sm mb-4">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Duration: {phase.duration}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {phase.modules.map((module, index) => (
                          <div key={index} className="flex items-center text-white/70 text-sm">
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

          {/* Important Information */}
          <div className="glass-card p-6 mb-8 bg-burando-bright-teal/20 border border-burando-light-green/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-burando-light-green" />
              Important Information
            </h3>
            <div className="space-y-2 text-white/90 text-sm">
              <p>• Training must be completed in sequence - each phase unlocks the next</p>
              <p>• You can pause and resume training at any time</p>
              <p>• All progress is automatically saved</p>
              <p>• Certificates are generated upon successful completion</p>
              <p>• Support is available 24/7 for maritime emergencies</p>
            </div>
          </div>

          {/* Start Training Button */}
          <div className="text-center">
            <button
              onClick={handleStartTraining}
              className="w-full sm:w-auto bg-gradient-to-r from-burando-light-green to-burando-bright-teal text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-burando-bright-teal/50 focus:ring-offset-2 shadow-xl min-h-[56px] touch-manipulation"
            >
              <div className="flex items-center justify-center">
                <Play className="h-6 w-6 mr-3" />
                <span>Start Phase 1: Safety Fundamentals</span>
                <ArrowRight className="h-6 w-6 ml-3" />
              </div>
            </button>

            <p className="text-white/60 text-sm mt-4">
              🎯 Ready to begin your maritime training journey
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingOverview;
