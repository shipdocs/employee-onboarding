import React from 'react';
import { CheckCircle, Clock, Play, AlertTriangle, Eye } from 'lucide-react';

/**
 * Get the appropriate icon for a phase status
 */
export const getPhaseStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-600" />;
    default:
      return <Play className="h-5 w-5 text-gray-400" />;
  }
};

/**
 * Get the appropriate CSS class for a phase status badge
 */
export const getPhaseStatusBadge = (status) => {
  switch (status) {
    case 'completed':
      return 'badge badge-success';
    case 'in_progress':
      return 'badge badge-info';
    default:
      return 'badge badge-secondary';
  }
};

/**
 * Check if a phase is available based on previous phase completion
 */
export const isPhaseAvailable = (phaseNumber, progressData) => {
  if (phaseNumber === 1) return true;
  // Extract phases array from progress data
  const phases = progressData?.phases || [];
  const previousPhase = phases.find(p => p.phase_number === phaseNumber - 1);
  return previousPhase?.status === 'completed';
};

/**
 * Calculate days until due date
 */
export const getDaysUntilDue = (dueDate) => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get quiz status for a specific phase
 */
export const getQuizStatus = (phaseNumber, quizHistory) => {
  if (!quizHistory) return null;

  // Find the most recent quiz result for this phase
  const phaseQuizzes = quizHistory.filter(quiz => quiz.phase === phaseNumber);
  if (phaseQuizzes.length === 0) return null;

  // Sort by completion date (most recent first)
  const sortedQuizzes = phaseQuizzes.sort((a, b) =>
    new Date(b.completedAt) - new Date(a.completedAt)
  );

  return sortedQuizzes[0];
};

/**
 * Get quiz status badge component
 */
export const getQuizStatusBadge = (phase, phaseStatus, quizHistory) => {
  if (phaseStatus !== 'completed') return null;

  const quizResult = getQuizStatus(phase.phase_number, quizHistory);
  if (!quizResult) {
    return (
      <span className="maritime-badge maritime-badge-warning">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Quiz Required
      </span>
    );
  }

  // Handle review status
  if (quizResult.review_status === 'pending_review') {
    return (
      <span className="maritime-badge maritime-badge-info">
        <Eye className="h-3 w-3 mr-1" />
        Awaiting Review ({quizResult.score}%)
      </span>
    );
  }

  if (quizResult.review_status === 'approved' && quizResult.passed) {
    return (
      <span className="maritime-badge maritime-badge-success">
        <CheckCircle className="h-3 w-3 mr-1" />
        Quiz Approved ({quizResult.score}%)
      </span>
    );
  }

  if (quizResult.review_status === 'rejected' || !quizResult.passed) {
    return (
      <span className="maritime-badge maritime-badge-error">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Quiz Failed ({quizResult.score}%) - Retake Required
      </span>
    );
  }

  // Fallback for legacy data without review_status
  if (quizResult.passed) {
    return (
      <span className="maritime-badge maritime-badge-success">
        <CheckCircle className="h-3 w-3 mr-1" />
        Quiz Passed ({quizResult.score}%)
      </span>
    );
  } else {
    return (
      <span className="maritime-badge maritime-badge-error">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Quiz Failed ({quizResult.score}%) - Retake Required
      </span>
    );
  }
};

/**
 * Get quiz circle display data
 */
export const getQuizCircleData = (quizResult) => {
  if (!quizResult) {
    return {
      color: 'text-gray-300',
      icon: '?',
      fillOpacity: '0.1'
    };
  }

  // Handle different review statuses
  if (quizResult.review_status === 'pending_review') {
    return {
      color: 'text-blue-500',
      icon: '⏳',
      fillOpacity: '0.1'
    };
  } else if (quizResult.review_status === 'approved' && quizResult.passed) {
    return {
      color: 'text-maritime-light-green',
      icon: '✓',
      fillOpacity: '0.1'
    };
  } else if (quizResult.review_status === 'rejected' || !quizResult.passed) {
    return {
      color: 'text-orange-600',
      icon: '✗',
      fillOpacity: '0.1'
    };
  } else {
    // Fallback for legacy data
    return {
      color: quizResult.passed ? 'text-maritime-light-green' : 'text-orange-600',
      icon: quizResult.passed ? '✓' : '✗',
      fillOpacity: '0.1'
    };
  }
};
