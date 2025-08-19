/**
 * @file CrewDashboard.js
 * @brief Main dashboard interface for crew members in the Maritime Onboarding System
 *
 * @details This component serves as the primary interface for crew members to access
 * and manage their onboarding training progress. It provides a comprehensive overview
 * of training status, quick access to training phases, quiz results, and personal
 * profile information. The dashboard is optimized for maritime environments with
 * responsive design and offline capabilities.
 *
 * **Key Features for Crew Members:**
 * - **Training Progress Overview**: Visual progress tracking across all training phases
 * - **Quick Access Navigation**: Direct links to current training activities
 * - **Phase Management**: Sequential training phase completion tracking
 * - **Quiz Integration**: Access to assessments and results viewing
 * - **Profile Management**: Personal information and vessel assignment details
 * - **Certificate Access**: Download and view completed training certificates
 * - **Mobile Optimization**: Touch-friendly interface for shipboard use
 *
 * **Dashboard Components:**
 * - **Welcome Header**: Personalized greeting with overall progress
 * - **Quick Stats**: Key metrics and current training status
 * - **Training Phases**: Detailed phase-by-phase progress tracking
 * - **Next Steps**: Guidance for continuing training progression
 * - **Completion Message**: Congratulations and certificate information
 *
 * **User Experience Features:**
 * - Responsive design for various screen sizes
 * - Multilingual support (English/Dutch)
 * - Real-time progress updates
 * - Intuitive navigation and clear visual hierarchy
 * - Error handling with user-friendly messages
 * - Loading states for better perceived performance
 *
 * **Training Workflow Integration:**
 * - Phase 1: Basic safety and orientation training
 * - Phase 2: Advanced procedures and documentation
 * - Phase 3: Final assessment and certification
 * - Automatic progression based on completion criteria
 *
 * **Technical Implementation:**
 * - React hooks for state management
 * - Custom hooks for data fetching and caching
 * - Component composition for maintainability
 * - Performance optimization with lazy loading
 * - Error boundaries for graceful failure handling
 *
 * @author Maritime Onboarding System
 * @version 1.0
 * @since 2024
 *
 * @see TrainingPage For detailed training phase interfaces
 * @see QuizPage For assessment and quiz functionality
 * @see ProfilePage For personal information management
 * @see useCrewDashboard For data fetching and state management
 */

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
 * @brief Main dashboard component for crew members
 *
 * @details Provides a comprehensive overview of training progress, quick access to
 * training activities, and personalized guidance for crew members. The component
 * orchestrates multiple sub-components to create a cohesive user experience.
 *
 * **Component Architecture:**
 * - Modular design with focused sub-components
 * - Custom hooks for data management
 * - Responsive layout with mobile optimization
 * - Error handling and loading states
 * - Internationalization support
 *
 * **Data Management:**
 * - Real-time training progress tracking
 * - Quiz history and results
 * - Personal profile information
 * - Training statistics and metrics
 * - Certificate status and availability
 *
 * **User Interface:**
 * - Clean, maritime-themed design
 * - Intuitive navigation and clear visual hierarchy
 * - Progress indicators and status badges
 * - Touch-friendly controls for mobile devices
 * - Accessibility features for inclusive design
 *
 * @returns {JSX.Element} Rendered crew dashboard with training overview and navigation
 *
 * @example
 * // Basic usage in routing
 * <Route path="/crew/dashboard" element={<CrewDashboard />} />
 *
 * @example
 * // Component renders different states based on training progress
 * // - Loading state while fetching data
 * // - Error state if data loading fails
 * // - Complete dashboard with all training information
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
