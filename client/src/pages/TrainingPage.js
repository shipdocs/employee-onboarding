import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  BookOpen,
  CheckCircle,
  Clock,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Target,
  AlertCircle,
  FileText,
  Users,
  Shield,
  Award,
  ChevronRight,
  ChevronLeft,
  PartyPopper,
  Trophy,
  Star
} from 'lucide-react';
import trainingService from '../services/trainingService';
import crewService from '../services/crewService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MediaAttachments from '../components/MediaAttachments';
import { TrainingContentRenderer } from '../components/SafeHTMLRenderer';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const TrainingPage = () => {
  const { t } = useTranslation(['training', 'common']);
  const { phase } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState(new Set());
  const [timeSpent, setTimeSpent] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [autoNavigateCountdown, setAutoNavigateCountdown] = useState(null);

  // Helper function to validate phase parameter appropriately
  const isValidPhase = (phase) => {
    // Accept string or number
    if (!phase) return false;

    // Convert to string for consistent handling
    const phaseStr = String(phase);

    // Check if it represents a valid integer (allows leading zeros)
    // Reject decimals, letters, and other invalid characters
    if (!/^\d+$/.test(phaseStr)) return false;

    // Convert to number and check range
    const num = parseInt(phaseStr, 10);
    return Number.isInteger(num) && num >= 1 && num <= 3;
  };

  // Helper function to get item identifier consistently
  const getItemId = (item) => {
    return item?.itemNumber ?? item?.number;
  };

  // Fetch phase details and progress with fallback
  const { data: phaseData, isLoading, error } = useQuery(
    ['crew-training-phase', phase],
    async () => {
      // Validate phase parameter before making API calls
      if (!isValidPhase(phase)) {
        throw new Error(`Invalid phase parameter: ${phase}. Must be 1, 2, or 3.`);
      }

      try {
        return await crewService.getPhaseDetails(phase);
      } catch (error) {
        // console.warn('Crew API failed, falling back to training API:', error);
        // Fallback to training API if crew API fails
        const fallbackData = await trainingService.getPhase(phase);
        // Transform the response to match expected structure
        return {
          ...fallbackData,
          items: Array.isArray(fallbackData?.items)
            ? fallbackData.items.map(item => ({
                ...item,
                itemNumber: item.number,
                content: null // No content available from training API
              }))
            : [] // Safe fallback for non-array items
        };
      }
    },
    {
      enabled: isValidPhase(phase) // Only run query when phase is valid
    }
  );

  // Helper function to get the correct total item count
  const getTotalItemCount = useCallback(() => {
    return phaseData?.progress?.totalItems ?? phaseData?.items?.length ?? 0;
  }, [phaseData?.progress?.totalItems, phaseData?.items?.length]);

  // Fetch quiz history to check if quiz is already completed
  const { data: quizHistory } = useQuery(
    'quiz-history',
    () => trainingService.getQuizHistory(),
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  // Debug quiz history
  useEffect(() => {
    if (quizHistory) {
      // console.log('Quiz History Debug:', {
      //   allResults: quizHistory,
      //   currentPhase: parseInt(phase, 10),
      //   hasResultForCurrentPhase: quizHistory.some(result => result.phase === parseInt(phase, 10)),
      //   resultForCurrentPhase: quizHistory.find(result => result.phase === parseInt(phase, 10))
      // });
    }
  }, [quizHistory, phase]);

  // Mark item as completed mutation
  const completeItemMutation = useMutation(
    ({ phase, itemNumber }) => trainingService.completeItem(phase, itemNumber),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['training-phase', phase]);
        queryClient.invalidateQueries('training-progress');
        // Don't show toast here for auto-complete, it's handled in handleNextItem
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to complete item');
      }
    }
  );

  // Mark item as uncompleted mutation
  const uncompleteItemMutation = useMutation(
    ({ phase, itemNumber }) => trainingService.uncompleteItem(phase, itemNumber),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['training-phase', phase]);
        queryClient.invalidateQueries('training-progress');
        toast.success('Training item marked as incomplete');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to uncomplete item');
      }
    }
  );

  // Timer effect for tracking time spent
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setTimeSpent(time => time + 1);
      }, 1000);
    } else if (!isActive && timeSpent !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeSpent]);

  // Auto-start timer when component mounts
  useEffect(() => {
    setIsActive(true);
    return () => setIsActive(false);
  }, []);

  // Utility function for defensive validation of completed items
  const validateCompletedItems = useCallback((completedItemsData) => {
    try {
      // Defensive programming: ensure completedItems is an array
      const completedItemsArray = Array.isArray(completedItemsData)
        ? completedItemsData
        : [];

      // Additional validation: ensure each item has a number property
      const validCompletedItems = completedItemsArray.filter(item =>
        item && typeof item === 'object' && (item.number || item.itemNumber)
      );

      return validCompletedItems.map(item => item.number ?? item.itemNumber);
    } catch (error) {
      // console.error('Error validating completed items:', error);
      // console.error('Data structure:', {
      //   completedItems: completedItemsData,
      //   type: typeof completedItemsData,
      //   isArray: Array.isArray(completedItemsData)
      // });
      return [];
    }
  }, []);

  // Load completed items from phase data
  useEffect(() => {
    try {
      if (phaseData?.completedItems && phaseData?.items) {
        const validCompletedNumbers = validateCompletedItems(phaseData.completedItems);
        const newCompletedItems = new Set(validCompletedNumbers);
        const previouslyCompletedCount = completedItems.size;
        const newCompletedCount = newCompletedItems.size;
        const totalItems = getTotalItemCount();

      // Only trigger celebration if we actually went from incomplete to complete
      const wasComplete = previouslyCompletedCount === totalItems;
      const isNowComplete = newCompletedCount === totalItems;
      const justCompleted = !wasComplete && isNowComplete && previouslyCompletedCount > 0;

      setCompletedItems(newCompletedItems);

      // Check if quiz has already been taken for this phase
      const hasQuizResult = quizHistory?.some(result => result.phase === parseInt(phase, 10));

      // Show celebration only when phase is genuinely just completed (not on initial load)
      if (justCompleted) {
        setShowCompletionCelebration(true);
        setIsActive(false); // Stop timer
        toast.success('🎉 Congratulations! All training items completed!');

        // Only start auto-navigation countdown if quiz hasn't been taken yet
        if (!hasQuizResult) {
          setAutoNavigateCountdown(10);
        }
      }

      // console.log('Training Progress Debug:', {
      //   previouslyCompletedCount,
      //   newCompletedCount,
      //   totalItems,
      //   wasComplete,
      //   isNowComplete,
      //   justCompleted,
      //   hasQuizResult
      // });
    }
    } catch (error) {
      // console.error('Error processing completed items:', error);
      // console.error('Phase data structure:', {
      //   completedItems: phaseData?.completedItems,
      //   completedItemsType: typeof phaseData?.completedItems,
      //   isArray: Array.isArray(phaseData?.completedItems),
      //   items: phaseData?.items?.length || 0
      // });

      // Set empty completed items as fallback
      setCompletedItems(new Set());
    }
  }, [phaseData?.completedItems, phaseData?.items, quizHistory, phase, completedItems.size, getTotalItemCount, validateCompletedItems]);

  // Auto-advance to first incomplete item when loading partially completed training
  useEffect(() => {
    try {
      if (phaseData?.items && phaseData?.completedItems) {
        const validCompletedNumbers = validateCompletedItems(phaseData.completedItems);
        const completedNumbers = new Set(validCompletedNumbers);

      // Find the first incomplete item
      const firstIncompleteIndex = phaseData.items.findIndex(
        item => !completedNumbers.has(getItemId(item))
      );

      // If we found an incomplete item and it's not the first one, jump to it
      if (firstIncompleteIndex > 0) {
        // console.log(`📚 Resuming training at item ${firstIncompleteIndex + 1} (first incomplete)`);
        setCurrentItemIndex(firstIncompleteIndex);
        toast(`Resuming at Step ${firstIncompleteIndex + 1}`, { duration: 3000 });
      } else if (firstIncompleteIndex === -1 && getTotalItemCount() > 0) {
        // All items are completed, show the last item
        const lastIndex = getTotalItemCount() - 1;
        // console.log(`✅ All items completed, showing last item`);
        setCurrentItemIndex(lastIndex);
      }
      // Note: if firstIncompleteIndex === 0, we're already at the right position
    }
    } catch (error) {
      // console.error('Error in auto-advance logic:', error);
      // console.error('Phase data structure:', {
      //   completedItems: phaseData?.completedItems,
      //   completedItemsType: typeof phaseData?.completedItems,
      //   isArray: Array.isArray(phaseData?.completedItems),
      //   items: phaseData?.items?.length || 0
      // });

      // Fallback: start at first item
      setCurrentItemIndex(0);
    }
  }, [phaseData, getTotalItemCount, validateCompletedItems]);

  // Auto-navigation countdown effect
  useEffect(() => {
    let interval = null;
    if (autoNavigateCountdown !== null && autoNavigateCountdown > 0) {
      interval = setInterval(() => {
        setAutoNavigateCountdown(prev => prev - 1);
      }, 1000);
    } else if (autoNavigateCountdown === 0) {
      navigate(`/crew/quiz/${phase}`);
    }
    return () => clearInterval(interval);
  }, [autoNavigateCountdown, navigate, phase]);

  // Handle invalid phase parameter
  if (!isValidPhase(phase)) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('training:ui.invalid_phase_title', 'Invalid Training Phase')}</h2>
        <p className="text-gray-600 mb-4">{t('training:ui.invalid_phase_message', 'The training phase must be 1, 2, or 3.')}</p>
        <Link to="/crew/dashboard" className="btn btn-primary">
          {t('training:ui.return_to_dashboard')}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message={t('training:ui.loading_content')} />;
  }

  // Handle API errors or missing data
  if (error || !phaseData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {error ? t('training:ui.failed_to_load_title', 'Failed to Load Training Data') : t('training:ui.not_found_title')}
        </h2>
        <p className="text-gray-600 mb-4">
          {error ? t('training:ui.failed_to_load_message', 'There was an error loading the training content. Please try again.') : t('training:ui.not_found_message')}
        </p>
        <Link to="/crew/dashboard" className="btn btn-primary">
          {t('training:ui.return_to_dashboard')}
        </Link>
      </div>
    );
  }

  const currentItem = phaseData?.items?.[currentItemIndex];
  const currentItemId = getItemId(currentItem);
  const isCurrentItemCompleted = completedItems.has(currentItemId);

  const handleCompleteItem = () => {
    if (currentItem && !isCurrentItemCompleted && currentItemId != null) {
      completeItemMutation.mutate({
        phase: parseInt(phase, 10),
        itemNumber: currentItemId
      });
      setCompletedItems(prev => new Set([...prev, currentItemId]));
    }
  };

  const handleUncompleteItem = () => {
    if (currentItem && isCurrentItemCompleted && currentItemId != null) {
      uncompleteItemMutation.mutate({
        phase: parseInt(phase, 10),
        itemNumber: currentItemId
      });
      setCompletedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentItemId);
        return newSet;
      });
    }
  };

  const handleNextItem = () => {
    // Auto-complete current item when moving to next
    if (currentItem && !isCurrentItemCompleted && currentItemId != null) {
      completeItemMutation.mutate({
        phase: parseInt(phase, 10),
        itemNumber: currentItemId
      });
      setCompletedItems(prev => new Set([...prev, currentItemId]));

      // Show brief feedback
      toast.success(`✅ "${currentItem.title}" marked as complete!`, {
        duration: 2000,
        position: 'bottom-right'
      });
    }

    // Navigate to next item
    if (currentItemIndex < getTotalItemCount() - 1) {
      setCurrentItemIndex(prev => prev + 1);
    }
  };

  const handlePrevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'orientation': return <Users className="h-5 w-5" />;
      case 'emergency': return <AlertCircle className="h-5 w-5" />;
      case 'safety': return <Shield className="h-5 w-5" />;
      case 'documentation': return <FileText className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'orientation': return 'bg-blue-100 text-blue-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'safety': return 'bg-green-100 text-green-800';
      case 'documentation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Completion Celebration Modal */}
      {showCompletionCelebration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center space-x-3 mb-6">
              <Trophy className="h-12 w-12 text-yellow-500 animate-bounce" />
              <Star className="h-10 w-10 text-yellow-400 animate-pulse" />
              <PartyPopper className="h-12 w-12 text-green-600 animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 {t('training:ui.outstanding_achievement')} 🎉
            </h2>

            <p className="text-gray-700 mb-6">
              {t('training:ui.phase_completion_message', { count: phaseData?.items?.length, title: phaseData?.title })}
              <br /><br />
              {t('training:ui.dedication_message')}
              {(() => {
                const hasQuizResult = quizHistory && quizHistory.some(result => result.phase === parseInt(phase, 10));
                return hasQuizResult
                  ? ` ${t('training:ui.view_quiz_results_message')}`
                  : ` ${t('training:ui.test_knowledge')}`;
              })()}
            </p>

            <div className="space-y-3">
              {(() => {
                // Only check quiz history if it's loaded
                const hasQuizResult = quizHistory && quizHistory.some(result => result.phase === parseInt(phase, 10));
                // Default to "Take Quiz Now" unless we're sure there's a result
                if (hasQuizResult) {
                  return (
                    <Link
                      to={`/crew/quiz/${phase}`}
                      className="w-full btn btn-outline text-lg py-3 flex items-center justify-center space-x-2"
                      onClick={() => setShowCompletionCelebration(false)}
                    >
                      <Award className="h-5 w-5" />
                      <span>View Quiz Results</span>
                    </Link>
                  );
                } else {
                  return (
                    <Link
                      to={`/crew/quiz/${phase}`}
                      className="w-full btn btn-success text-lg py-3 flex items-center justify-center space-x-2"
                      onClick={() => setShowCompletionCelebration(false)}
                    >
                      <Award className="h-5 w-5" />
                      <span>Take Quiz Now</span>
                    </Link>
                  );
                }
              })()}

              <button
                onClick={() => setShowCompletionCelebration(false)}
                className="w-full btn btn-outline"
              >
                Continue Reviewing
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <button
            onClick={() => navigate('/crew/dashboard')}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors self-start"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('training:ui.back_to_dashboard')}
          </button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {phaseData.title}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mt-1">{phaseData.description}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-white rounded-xl px-4 sm:px-6 py-3 shadow-lg border self-start sm:self-auto">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-gray-500" />
            <span className="font-mono text-lg font-semibold">{formatTime(timeSpent)}</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors touch-target"
            >
              {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setTimeSpent(0)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors touch-target"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Target className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">
              {t('training:ui.training_progress')}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {t('common:progress.completed_items', { completed: completedItems.size, total: getTotalItemCount() })}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(completedItems.size / getTotalItemCount()) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>{t('common:general.item')} {currentItemIndex + 1} of {getTotalItemCount()}</span>
          <span>{Math.round((completedItems.size / getTotalItemCount()) * 100)}% {t('common:status.completed')}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 lg:gap-8 gap-4 sm:gap-6">
        {/* Training Content */}
        <div className="order-1 lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Item Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={'p-3 rounded-lg bg-white bg-opacity-20'}>
                    {getCategoryIcon(currentItem?.category)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {currentItemId != null ? currentItemId : 'N/A'}. {currentItem?.title}
                    </h2>
                    <p className="text-blue-100 mt-1">
                      {currentItem?.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(currentItem?.category)}`}>
                    {currentItem?.category}
                  </span>
                  {isCurrentItemCompleted && (
                    <div className="bg-green-500 p-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-8">
              {currentItem?.content ? (
                <div className="space-y-8">
                  {/* Overview */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                      {t('training:ui.overview')}
                    </h3>
                    <TrainingContentRenderer
                      content={currentItem.content.overview}
                      fallback="Training content overview not available"
                    />
                  </div>

                  {/* Learning Objectives */}
                  {currentItem.content.objectives && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <Target className="h-5 w-5 mr-2 text-green-600" />
                        {t('training:ui.learning_objectives')}
                      </h3>
                      <ul className="space-y-3">
                        {currentItem.content.objectives.map((objective, index) => (
                          <li key={index} className="flex items-start space-x-3">
                            <div className="bg-green-100 p-1 rounded-full mt-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="text-gray-700">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Points */}
                  {currentItem.content.keyPoints && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                        {t('training:ui.key_points')}
                      </h3>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                        <ul className="space-y-3">
                          {currentItem.content.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <div className="bg-orange-500 w-2 h-2 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-800">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Procedures */}
                  {currentItem.content.procedures && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-purple-600" />
                        {t('training:ui.procedures')}
                      </h3>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                        <ol className="space-y-4">
                          {currentItem.content.procedures.map((procedure, index) => (
                            <li key={index} className="flex items-start space-x-4">
                              <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                {index + 1}
                              </div>
                              <span className="text-gray-800 pt-1">{procedure}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Emergency Types (for emergency modules) */}
                  {currentItem.content.emergencyTypes && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-red-600" />
                        {t('training:ui.emergency_response_types')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentItem.content.emergencyTypes.map((emergency, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-800 text-sm">{emergency}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('training:ui.training_content')}
                  </h3>
                  <p className="text-gray-600">
                    {t('training:ui.training_content_placeholder', { title: currentItem?.title })}
                  </p>
                </div>
              )}

              {/* Media Attachments */}
              {Array.isArray(phaseData?.mediaFiles) && phaseData.mediaFiles.length > 0 && (
                <MediaAttachments
                  mediaFiles={phaseData.mediaFiles}
                  title={t('training:ui.resources')}
                />
              )}

              {/* Completion Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                {/* Auto-Complete Info Banner */}
                {!isCurrentItemCompleted && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">✨ {t('training:ui.streamlined_flow_title')}</h4>
                        <p className="text-blue-800 text-sm">
                          {t('training:ui.auto_complete_message')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {isCurrentItemCompleted ? (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-6 w-6" />
                          <span className="font-semibold">{t('common:status.completed')}</span>
                        </div>
                        <button
                          onClick={handleUncompleteItem}
                          disabled={uncompleteItemMutation.isLoading}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm"
                        >
                          {uncompleteItemMutation.isLoading ? (
                            <LoadingSpinner size="small" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          <span>{t('training:ui.mark_incomplete')}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleCompleteItem}
                        disabled={completeItemMutation.isLoading}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
                      >
                        {completeItemMutation.isLoading ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                        <span>{t('training:ui.mark_complete_now')}</span>
                      </button>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handlePrevItem}
                      disabled={currentItemIndex === 0}
                      className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      {t('common:buttons.previous')}
                    </button>

                    {currentItemIndex === getTotalItemCount() - 1 ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">{t('training:ui.last_training_item')}</p>
                        {(() => {
                          const hasQuizResult = quizHistory?.some(result => result.phase === parseInt(phase, 10));
                          if (hasQuizResult) {
                            return (
                              <Link
                                to={`/crew/quiz/${phase}`}
                                className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 font-semibold transition-all duration-200"
                              >
                                <Award className="h-5 w-5 mr-2" />
                                {t('common:buttons.view_results')}
                              </Link>
                            );
                          } else {
                            return (
                              <Link
                                to={`/crew/quiz/${phase}`}
                                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-semibold transition-all duration-200"
                              >
                                <Award className="h-5 w-5 mr-2" />
                                {t('common:buttons.take_quiz')}
                              </Link>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <button
                        onClick={handleNextItem}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold"
                      >
                        {!isCurrentItemCompleted && (
                          <span className="text-xs bg-blue-500 px-2 py-1 rounded-full mr-2">
                            ✓ Complete &
                          </span>
                        )}
                        {t('common:buttons.next')}
                        <ChevronRight className="h-5 w-5 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="order-2 lg:col-span-1">
          <div className="space-y-6">
            {/* Phase Overview */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('training:ui.phase_overview')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('training:ui.time_limit')}</span>
                  <span className="font-semibold">{phaseData.timeLimit}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('training:ui.total_items')}</span>
                  <span className="font-semibold">{getTotalItemCount()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('training:ui.completed')}</span>
                  <span className="font-semibold text-green-600">{completedItems.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('training:ui.remaining')}</span>
                  <span className="font-semibold text-orange-600">{getTotalItemCount() - completedItems.size}</span>
                </div>
              </div>
            </div>

            {/* Training Items List */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('crew.training_items')}</h3>
              <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto scrollbar-thin">
                {phaseData?.items?.map((item, index) => {
                  const itemId = getItemId(item) ?? `item-${index}`;
                  return (
                  <button
                    key={itemId}
                    onClick={() => setCurrentItemIndex(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      index === currentItemIndex
                        ? 'bg-blue-100 border-2 border-blue-300'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          completedItems.has(itemId)
                            ? 'bg-green-500 text-white'
                            : index === currentItemIndex
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {completedItems.has(itemId) ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            itemId?.toString().replace('item-', '') || index + 1
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {item.category}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('training:ui.quick_actions')}</h3>
              <div className="space-y-3">
                {(() => {
                  const hasQuizResult = quizHistory?.some(result => result.phase === parseInt(phase, 10));
                  if (hasQuizResult) {
                    return (
                      <Link
                        to={`/crew/quiz/${phase}`}
                        className="w-full btn btn-outline flex items-center justify-center"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        {t('common:buttons.view_results')}
                      </Link>
                    );
                  } else {
                    return (
                      <Link
                        to={`/crew/quiz/${phase}`}
                        className="w-full btn btn-outline flex items-center justify-center"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        {t('common:buttons.take_quiz')}
                      </Link>
                    );
                  }
                })()}
                <Link
                  to="/crew/dashboard"
                  className="w-full btn btn-secondary flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('training:ui.back_to_dashboard')}
                </Link>
              </div>
            </div>

            {/* Phase Completion */}
            {completedItems.size === getTotalItemCount() && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 shadow-lg">
                <div className="text-center">
                  <div className="flex justify-center space-x-2 mb-4">
                    <Trophy className="h-8 w-8 text-yellow-500 animate-bounce" />
                    <Star className="h-6 w-6 text-yellow-400 animate-pulse" />
                    <PartyPopper className="h-8 w-8 text-green-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    🎉 {t('training:ui.excellent_work')} 🎉
                  </h3>
                  {(() => {
                    const hasQuizResult = quizHistory?.some(result => result.phase === parseInt(phase, 10));
                    if (hasQuizResult) {
                      return (
                        <p className="text-green-800 mb-4">
                          You've successfully completed all <strong>{getTotalItemCount()}</strong> training items in this phase.
                          <br />
                          You can review your quiz results or continue studying the materials.
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-green-800 mb-4">
                          You've successfully completed all <strong>{getTotalItemCount()}</strong> training items in this phase.
                          <br />
                          Time to test your knowledge with the final quiz!
                        </p>
                      );
                    }
                  })()}

                  {autoNavigateCountdown !== null && (
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4">
                      <p className="text-blue-800 text-sm mb-2">
                        🚀 {t('training:ui.auto_navigate_message')}
                      </p>
                      <div className="text-2xl font-bold text-blue-900 mb-2">
                        {autoNavigateCountdown} seconds
                      </div>
                      <button
                        onClick={() => setAutoNavigateCountdown(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        {t('training:ui.cancel_auto_nav')}
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(() => {
                      const hasQuizResult = quizHistory?.some(result => result.phase === parseInt(phase, 10));
                      if (hasQuizResult) {
                        return (
                          <Link
                            to={`/crew/quiz/${phase}`}
                            className="btn btn-outline w-full text-lg py-3 flex items-center justify-center space-x-2"
                          >
                            <Award className="h-5 w-5" />
                            <span>{t('common:buttons.view_results')}</span>
                          </Link>
                        );
                      } else {
                        return (
                          <Link
                            to={`/crew/quiz/${phase}`}
                            className="btn btn-success w-full text-lg py-3 flex items-center justify-center space-x-2"
                          >
                            <Award className="h-5 w-5" />
                            <span>{t('training:ui.take_final_quiz')}</span>
                          </Link>
                        );
                      }
                    })()}

                    {autoNavigateCountdown === null && !quizHistory?.some(result => result.phase === parseInt(phase, 10)) && (
                      <button
                        onClick={() => setAutoNavigateCountdown(10)}
                        className="w-full text-green-600 hover:text-green-800 text-sm underline"
                      >
                        Auto-navigate to quiz in 10 seconds
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
