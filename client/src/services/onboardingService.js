// Enhanced Onboarding Service for Phase 3.2
// Handles database persistence, analytics, and cross-device synchronization

import errorHandler from './errorHandlingService';

// API endpoints for onboarding
const API_BASE = '/api/crew/onboarding';
const ANALYTICS_ENDPOINT = `${API_BASE}/analytics`;
const PROGRESS_ENDPOINT = `${API_BASE}/progress`;

class OnboardingService {
  constructor() {
    this.sessionId = this.generateSessionId();
  }

  generateSessionId() {
    return `onb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get user's onboarding progress from API
  async getProgress(userId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // console.warn('No authentication token found - using fallback');
        return null;
      }

      // console.log('🔍 Fetching onboarding progress for user:', userId);

      const response = await fetch(PROGRESS_ENDPOINT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        // console.warn('Progress API failed:', response.status, errorText);

        // Show user-friendly error message
        const error = new Error(errorText);
        error.response = { status: response.status, data: { error: errorText } };
        errorHandler.showError(error, 'onboarding');

        return null;
      }

      const data = await response.json();
      // console.log('✅ Progress fetched:', data.progress);
      return data.progress;
    } catch (error) {
      // console.warn('Error in getProgress (using fallback):', error.message);
      return null;
    }
  }

  // Initialize onboarding progress for a user
  async initializeProgress(userId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // console.error('No authentication token found');
        return null;
      }

      const response = await fetch(PROGRESS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_step: 0,
          completed_steps: [],
          custom_preferences: {
            started: new Date().toISOString(),
            session_id: this.sessionId
          }
        })
      });

      if (!response.ok) {
        // console.error('Error initializing onboarding progress:', response.statusText);
        return null;
      }

      const data = await response.json();

      // Track analytics
      await this.trackEvent(userId, 'step_start', 0, {
        session_id: this.sessionId,
        initialization: true
      });

      return data.progress;
    } catch (error) {
      // console.error('Error in initializeProgress:', error);
      return null;
    }
  }

  // Update current step and track progress
  async updateStep(userId, newStep, stepData = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // console.error('No authentication token found');
        return null;
      }

      const progress = await this.getProgress(userId);
      if (!progress) {
        // console.error('No progress found for user:', userId);
        return null;
      }

      // Check if we're trying to go beyond the maximum step (3)
      // If so, complete the onboarding instead
      if (newStep > 3) {
        // console.log('🎯 Reached end of onboarding, completing...');
        return await this.completeOnboarding(userId);
      }

      const now = new Date().toISOString();

      // Get existing timestamps from custom_preferences
      const existingTimestamps = progress.custom_preferences?.step_timestamps || {};
      const updatedTimestamps = {
        ...existingTimestamps,
        [`step_${newStep}_started`]: now
      };

      // Mark previous step as completed if moving forward
      let updatedCompletedSteps = [...progress.completed_steps];
      if (newStep > progress.current_step && !updatedCompletedSteps.includes(progress.current_step)) {
        updatedCompletedSteps.push(progress.current_step);
        updatedTimestamps[`step_${progress.current_step}_completed`] = now;
      }

      const updatePayload = {
        current_step: newStep,
        completed_steps: updatedCompletedSteps,
        custom_preferences: {
          ...progress.custom_preferences,
          step_timestamps: updatedTimestamps,
          last_updated: now,
          ...stepData
        }
      };

      // console.log('📤 Updating progress with payload:', updatePayload);

      const response = await fetch(PROGRESS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        // console.error('Error updating onboarding step:', response.status);
        return null;
      }

      const data = await response.json();

      // Track analytics
      await this.trackEvent(userId, 'step_complete', progress.current_step, {
        session_id: this.sessionId,
        step_data: stepData,
        next_step: newStep
      });

      await this.trackEvent(userId, 'step_start', newStep, {
        session_id: this.sessionId,
        previous_step: progress.current_step
      });

      return data.progress;
    } catch (error) {
      // console.error('Error in updateStep:', error);
      return null;
    }
  }

  // Save role selection and preferences
  async saveRoleSelection(userId, roleFocus, preferences = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // console.error('No authentication token found');
        return null;
      }

      const progress = await this.getProgress(userId);
      if (!progress) {
        // console.error('No progress found for user:', userId);
        return null;
      }

      const response = await fetch(PROGRESS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selected_role_focus: roleFocus,
          custom_preferences: {
            ...progress.custom_preferences,
            role_focus: roleFocus,
            role_preferences: preferences,
            role_selected_at: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        // console.error('Error saving role selection:', response.statusText);
        return null;
      }

      const data = await response.json();

      // Track analytics
      await this.trackEvent(userId, 'role_select', progress.current_step, {
        session_id: this.sessionId,
        role_focus: roleFocus,
        preferences: preferences
      });

      return data.progress;
    } catch (error) {
      // console.error('Error in saveRoleSelection:', error);
      return null;
    }
  }

  // Complete onboarding flow
  async completeOnboarding(userId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // console.error('No authentication token found');
        return null;
      }

      const progress = await this.getProgress(userId);
      if (!progress) {
        // console.error('No progress found for user:', userId);
        return null;
      }

      const now = new Date().toISOString();
      const finalCompletedSteps = [...new Set([...progress.completed_steps, progress.current_step])];

      const response = await fetch(PROGRESS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_completed: true,
          completed_steps: finalCompletedSteps,
          custom_preferences: {
            ...progress.custom_preferences,
            step_timestamps: {
              ...progress.custom_preferences.step_timestamps,
              [`step_${progress.current_step}_completed`]: now,
              flow_completed: now
            }
          }
        })
      });

      if (!response.ok) {
        // console.error('Error completing onboarding:', response.statusText);
        return null;
      }

      const data = await response.json();

      // Track analytics
      await this.trackEvent(userId, 'flow_complete', progress.current_step, {
        session_id: this.sessionId,
        total_steps_completed: finalCompletedSteps.length,
        selected_role_focus: progress.selected_role_focus,
        completion_time: now
      });

      return data.progress;
    } catch (error) {
      // console.error('Error in completeOnboarding:', error);
      return null;
    }
  }

  // Track analytics events
  async trackEvent(userId, eventType, stepNumber = null, eventData = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // console.warn('No authentication token found for analytics - skipping tracking');
        return;
      }

      if (!userId) {
        // console.warn('No user ID provided for analytics - skipping tracking');
        return;
      }

      // console.log('📊 Analytics tracking:', eventType, stepNumber, eventData);

      const response = await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: eventType,
          step_number: stepNumber,
          event_data: eventData,
          session_id: this.sessionId
        })
      });

      if (!response.ok) {
        // console.warn('Analytics tracking failed:', response.status);
        // Don't throw error - analytics failure shouldn't break the flow
      } else {
        // console.log('✅ Analytics tracked successfully:', eventType, stepNumber);
      }
    } catch (error) {
      // console.warn('Analytics tracking error (non-critical):', error.message);
      // Don't throw error - analytics failure shouldn't break the flow
    }
  }

  // Check if user needs onboarding
  async needsOnboarding(userId) {
    try {
      const progress = await this.getProgress(userId);

      // If no progress record exists, user needs onboarding
      if (!progress) {
        return true;
      }

      // If onboarding is not completed, user needs to continue
      return !progress.is_completed;
    } catch (error) {
      // console.error('Error checking onboarding needs:', error);
      return true; // Default to needing onboarding on error
    }
  }

  // Debug function to reset onboarding completely
  resetOnboardingForUser(userId) {
    // console.log('🔄 Resetting onboarding for user:', userId);
    localStorage.removeItem(`onboarding_completed_${userId}`);
    localStorage.removeItem(`training_focus_${userId}`);
    // console.log('✅ LocalStorage cleared for user:', userId);
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();
export default onboardingService;
