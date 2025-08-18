/**
 * Enhanced Feedback Widget for Maritime Training
 * Contextual feedback collection with maritime-specific triggers
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  X,
  Send,
  Anchor,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const FeedbackWidget = ({
  context = 'general',
  trigger = 'manual',
  onFeedbackSubmitted,
  className = ''
}) => {
  const { t } = useTranslation(['feedback', 'common']);
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Auto-trigger feedback based on context
  useEffect(() => {
    if (trigger === 'auto') {
      const shouldTrigger = checkAutoTriggerConditions();
      if (shouldTrigger) {
        setTimeout(() => setIsOpen(true), 2000); // Delay to avoid interrupting user flow
      }
    }
  }, [trigger, context]);

  const checkAutoTriggerConditions = () => {
    // Check if user has been on page for sufficient time
    const sessionTime = Date.now() - (window.sessionStartTime || Date.now());

    // Different triggers for different contexts
    switch (context) {
      case 'training_completion':
        return sessionTime > 300000; // 5 minutes
      case 'quiz_completion':
        return true; // Always trigger after quiz
      case 'error_recovery':
        return sessionTime > 60000; // 1 minute after error
      case 'offline_mode':
        return sessionTime > 180000; // 3 minutes in offline mode
      default:
        return sessionTime > 600000; // 10 minutes for general
    }
  };

  const handleQuickFeedback = async (type, value) => {
    setFeedbackType(type);

    const feedbackData = {
      type,
      value,
      context,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      sessionId: getSessionId(),
      userAgent: navigator.userAgent,
      connectionStatus: navigator.onLine ? 'online' : 'offline'
    };

    await submitFeedback(feedbackData);

    // Show maritime-themed success message
    const messages = {
      'positive': '⚓ Thank you! Your feedback helps us navigate better!',
      'negative': '🚢 Thanks for the feedback. We\'ll chart a better course!',
      'rating': `⭐ ${value} stars received! Fair winds and following seas!`
    };

    toast.success(messages[type] || 'Feedback received!');
    setHasSubmitted(true);

    if (onFeedbackSubmitted) {
      onFeedbackSubmitted(feedbackData);
    }
  };

  const handleDetailedFeedback = async () => {
    if (!rating && !comment.trim()) {
      toast.error(t('feedback:validation.rating_or_comment_required'));
      return;
    }

    setIsSubmitting(true);

    const feedbackData = {
      type: 'detailed',
      rating,
      comment: comment.trim(),
      context,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      sessionId: getSessionId(),
      userAgent: navigator.userAgent,
      connectionStatus: navigator.onLine ? 'online' : 'offline',
      pageUrl: window.location.href,
      referrer: document.referrer
    };

    try {
      await submitFeedback(feedbackData);
      toast.success('⚓ Detailed feedback submitted! Thank you for helping us improve!');
      setIsOpen(false);
      setHasSubmitted(true);

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedbackData);
      }
    } catch (error) {
      toast.error(t('feedback:errors.submission_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFeedback = async (feedbackData) => {
    try {
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      return await response.json();
    } catch (error) {
      // console.error('Feedback submission error:', error);

      // Store feedback locally if submission fails (for offline scenarios)
      const offlineFeedback = JSON.parse(localStorage.getItem('offlineFeedback') || '[]');
      offlineFeedback.push(feedbackData);
      localStorage.setItem('offlineFeedback', JSON.stringify(offlineFeedback));

      throw error;
    }
  };

  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('feedbackSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('feedbackSessionId', sessionId);
    }
    return sessionId;
  };

  const getContextIcon = () => {
    switch (context) {
      case 'training_completion':
        return <Anchor className="w-4 h-4" />;
      case 'offline_mode':
        return <WifiOff className="w-4 h-4" />;
      case 'quiz_completion':
        return <Clock className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getContextTitle = () => {
    switch (context) {
      case 'training_completion':
        return t('feedback:contexts.training_completion');
      case 'quiz_completion':
        return t('feedback:contexts.quiz_completion');
      case 'offline_mode':
        return t('feedback:contexts.offline_mode');
      case 'error_recovery':
        return t('feedback:contexts.error_recovery');
      default:
        return t('feedback:contexts.general');
    }
  };

  if (hasSubmitted && trigger === 'auto') {
    return null; // Don't show again in the same session
  }

  return (
    <div className={`feedback-widget ${className}`}>
      {/* Quick Feedback Buttons (always visible) */}
      {!isOpen && !hasSubmitted && (
        <div className="flex items-center space-x-2 p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <span className="text-white/80 text-sm hidden sm:inline">
            {t('feedback:quick.how_was_experience')}
          </span>

          {/* Quick positive feedback */}
          <button
            onClick={() => handleQuickFeedback('positive', 'good')}
            className="text-2xl hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
            title={t('feedback:quick.good_experience')}
          >
            😊
          </button>

          {/* Quick neutral feedback */}
          <button
            onClick={() => handleQuickFeedback('neutral', 'okay')}
            className="text-2xl hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
            title={t('feedback:quick.okay_experience')}
          >
            😐
          </button>

          {/* Quick negative feedback */}
          <button
            onClick={() => handleQuickFeedback('negative', 'poor')}
            className="text-2xl hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
            title={t('feedback:quick.poor_experience')}
          >
            😞
          </button>

          {/* Detailed feedback button */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
            title={t('feedback:detailed.open_detailed')}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Detailed Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                {getContextIcon()}
                <h3 className="text-lg font-semibold text-gray-900">
                  {getContextTitle()}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('feedback:detailed.rate_experience')}
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 rounded transition-colors ${
                        star <= rating
                          ? 'text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('feedback:detailed.additional_comments')}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('feedback:detailed.comment_placeholder')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {comment.length}/500 {t('feedback:detailed.characters')}
                </div>
              </div>

              {/* Context Information */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    {navigator.onLine ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span>{navigator.onLine ? 'Online' : 'Offline'}</span>
                  </span>
                  <span>{t('feedback:detailed.context')}: {context}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handleDetailedFeedback}
                disabled={isSubmitting || (!rating && !comment.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('feedback:detailed.submitting')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('feedback:detailed.submit')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
