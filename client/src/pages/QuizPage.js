import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Camera,
  FileText,
  Award,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Save,
  Send,
  RotateCcw,
  Target,
  Image as ImageIcon,
  Check,
  X,
  GripVertical,
  Play,
  Languages,
  Globe,
  ChevronDown
} from 'lucide-react';
import trainingService from '../services/trainingService';
import { quizTranslationService } from '../services/api'; // quizTranslationService not yet migrated
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import FeedbackWidget from '../components/feedback/FeedbackWidget';
import { useLanguage } from '../contexts/LanguageContext';
import offlineStorage from '../services/offlineStorageService';
import { useNetworkStatus } from '../components/common/NetworkStatus';

// Note: Quiz data is now fetched from the backend API instead of being hardcoded

const QuizPage = () => {
  const { t } = useTranslation(['quiz', 'common']);
  const { currentLanguage, languages, changeLanguage } = useLanguage();
  const { phase } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [draggedItems, setDraggedItems] = useState({});
  const [quizSessionId, setQuizSessionId] = useState(() => {
    // Try to restore session from sessionStorage
    return sessionStorage.getItem(`quiz-session-${phase}`) || null;
  });
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState(null);

  // Translation state
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [translatedQuiz, setTranslatedQuiz] = useState(null);
  const [translationLoading, setTranslationLoading] = useState(false);

  // Offline state
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [pendingSubmission, setPendingSubmission] = useState(false);

  // Restore offline progress on component mount
  useEffect(() => {
    const restoreOfflineProgress = () => {
      const savedProgress = offlineStorage.getQuizProgress(phase);
      if (savedProgress) {
        // console.log('🔄 Restoring offline quiz progress for phase', phase);
        setAnswers(savedProgress.answers || {});
        setCurrentQuestionIndex(savedProgress.currentQuestion || 0);
        setQuizStarted(true);

        // Show restoration message
        toast.success(t('quiz:offline.progress_restored'), { duration: 4000 });
      }
    };

    if (phase) {
      restoreOfflineProgress();
    }
  }, [phase, t]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOfflineMode(false);
      if (pendingSubmission) {
        toast.success(t('quiz:offline.back_online_will_sync'));
      }
    };

    const handleOffline = () => {
      setOfflineMode(true);
      toast.warning(t('quiz:offline.now_offline'), { duration: 6000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSubmission, t]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLanguageDropdown && !event.target.closest('.language-dropdown')) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageDropdown]);

  // Fetch quiz data from backend with randomization
  const { data: quizData, isLoading: quizLoading, error: quizError } = useQuery(
    ['quiz', phase],
    () => trainingService.getQuiz(phase),
    {
      enabled: !!phase, // Always fetch when phase is available
      staleTime: 0, // Always refetch to get fresh session
      cacheTime: 0, // Don't cache quiz data to prevent session conflicts
      onSuccess: (data) => {
        if (data.quizSessionId) {
          setQuizSessionId(data.quizSessionId);
          // Persist session ID in sessionStorage
          sessionStorage.setItem(`quiz-session-${phase}`, data.quizSessionId);
        }
      },
      onError: (error) => {
        // console.error('Failed to load quiz:', error);
        // Clear any invalid stored session
        sessionStorage.removeItem(`quiz-session-${phase}`);
        setQuizSessionId(null);
      }
    }
  );

  // Check if quiz has already been completed
  const { data: quizHistory, isLoading: historyLoading } = useQuery(
    ['quiz-history'],
    () => trainingService.getQuizHistory(),
    {
      staleTime: 2 * 60 * 1000 // 2 minutes
    }
  );

  // Check if quiz is already completed
  const isQuizAlreadyCompleted = quizHistory?.some(result =>
    result.phase === parseInt(phase) && result.passed
  );

  // Fetch translated quiz content when language changes
  useEffect(() => {
    const fetchTranslatedQuiz = async () => {
      if (!phase) return;

      try {
        setTranslationLoading(true);
        const translated = await quizTranslationService.getQuizInLanguage(phase, currentLanguage);
        setTranslatedQuiz(translated);
      } catch (error) {
        // console.warn('Failed to fetch translated quiz:', error);
        // If translation fails, fall back to original quiz data
        setTranslatedQuiz(null);
      } finally {
        setTranslationLoading(false);
      }
    };

    fetchTranslatedQuiz();
  }, [phase, currentLanguage]);

  // Get quiz data for current phase - use translated data if available, otherwise original API response
  const currentQuiz = (() => {
    // If we have translated quiz data and it has content, use it
    if (translatedQuiz && translatedQuiz.questions && translatedQuiz.questions.length > 0) {
      return {
        title: `Phase ${phase} Safety Quiz`, // Keep original title for now
        description: `Complete this quiz to finish Phase ${phase} training`, // Keep original description
        timeLimit: quizData?.timeLimit || 30,
        passingScore: quizData?.passingScore || 70,
        questions: translatedQuiz.questions.map(question => ({
          id: question.question_index,
          question: question.question_text,
          type: question.quiz_metadata?.type || 'multiple_choice',
          options: question.answers.map(answer => answer.text),
          correctAnswer: question.answers.find(answer => answer.is_correct)?.answer_index || 0,
          explanation: question.answers.find(answer => answer.is_correct)?.explanation || '',
          timeLimit: question.quiz_metadata?.time_limit || null,
          points: question.quiz_metadata?.points || 10
        }))
      };
    }

    // Fallback to original quiz data
    return quizData ? {
      ...quizData,
      title: quizData.title || `Phase ${phase} Safety Quiz`,
      description: quizData.description || `Complete this quiz to finish Phase ${phase} training`,
      timeLimit: quizData.timeLimit || 30,
      passingScore: quizData.passingScore || 70
    } : null;
  })();
  const currentQuestion = currentQuiz?.questions?.[currentQuestionIndex];
  const totalQuestions = currentQuiz?.questions?.length || 0;

  // If quiz is already completed, show results immediately
  useEffect(() => {
    if (isQuizAlreadyCompleted && !showResults) {
      setShowResults(true);
      setQuizCompleted(true);
      setQuizStarted(true); // Set quiz as started to bypass start screen
    }
  }, [isQuizAlreadyCompleted, showResults]);

  // Quiz submission mutation
  const submitQuizMutation = useMutation(
    (submissionData) => trainingService.submitQuiz(phase, submissionData),
    {
      onSuccess: (data) => {
        setQuizCompleted(true);
        setShowResults(true);
        setTimeRemaining(0); // Stop the timer
        toast.success(t('quiz:results.submitted_successfully'));

        // Invalidate and refetch dashboard data to reflect quiz completion
        queryClient.invalidateQueries('training-progress');
        queryClient.invalidateQueries('training-stats');
        queryClient.invalidateQueries('quiz-history');

        // Also invalidate crew profile in case status changed
        queryClient.invalidateQueries('crew-profile');

        // Clear the quiz session from storage since it's now completed
        sessionStorage.removeItem(`quiz-session-${phase}`);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.error || error.message;

        // If session expired or not found, clear stored session
        if (errorMessage.includes('session') && (errorMessage.includes('expired') || errorMessage.includes('not found'))) {
          sessionStorage.removeItem(`quiz-session-${phase}`);
          setQuizSessionId(null);
          toast.error(t('quiz:errors.session_expired'));
        } else {
          toast.error(t('quiz:errors.submission_failed', { error: errorMessage }));
        }
      }
    }
  );

  // Debug logging (removed excessive console output)

  // Initialize timer when quiz starts
  useEffect(() => {
    if (quizStarted && timeRemaining === null && currentQuiz?.timeLimit) {
      setTimeRemaining(currentQuiz.timeLimit * 60); // Convert minutes to seconds
    }
  }, [quizStarted, currentQuiz?.timeLimit, timeRemaining]);

  // Timer countdown
  useEffect(() => {
    if (quizStarted && timeRemaining > 0 && !showResults && !quizCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizStarted, timeRemaining, showResults, quizCompleted]);

  // Cleanup auto-advance timeout on component unmount or question change
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeout) {
        clearTimeout(autoAdvanceTimeout);
      }
    };
  }, [autoAdvanceTimeout, currentQuestionIndex]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    toast.success(t('quiz:ui.quiz_started'));
  };

  // Helper function to determine if a question type should auto-advance
  const shouldAutoAdvance = (questionType) => {
    return ['multiple_choice', 'yes_no', 'scenario'].includes(questionType);
  };

  // Helper function to check if current question is answered
  const isCurrentQuestionAnswered = () => {
    const currentAnswer = answers[currentQuestion?.id];

    if (currentQuestion?.type === 'file_upload') {
      return uploadedFiles[currentQuestion.id] && currentAnswer;
    }

    if (currentQuestion?.type === 'drag_order') {
      return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    }

    if (currentQuestion?.type === 'matching') {
      // For matching questions, check if all items are matched (no null values)
      return Array.isArray(currentAnswer) &&
             currentAnswer.length > 0 &&
             currentAnswer.every(match => match !== null);
    }

    if (currentQuestion?.type === 'fill_in_gaps') {
      // For fill-in-gaps questions, check if all blanks are filled
      return Array.isArray(currentAnswer) &&
             currentAnswer.length > 0 &&
             currentAnswer.every(answer => answer && answer.trim() !== '');
    }

    return currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';
  };

  const handleAnswerChange = (questionId, answer) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer
    };

    setAnswers(newAnswers);

    // Save progress offline immediately
    if (quizSessionId) {
      offlineStorage.saveQuizProgress(phase, newAnswers, currentQuestionIndex, quizSessionId);
    }

    // Clear any existing auto-advance timeout
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
      setAutoAdvanceTimeout(null);
    }

    // Auto-advance for certain question types after a short delay
    if (currentQuestion && shouldAutoAdvance(currentQuestion.type) && currentQuestionIndex < totalQuestions - 1) {
      const timeout = setTimeout(() => {
        handleNextQuestion();
        setAutoAdvanceTimeout(null);
      }, 1500); // 1.5 second delay for user to see their selection

      setAutoAdvanceTimeout(timeout);
    }
  };

  const handleFileUpload = (questionId, file) => {
    setUploadedFiles(prev => ({
      ...prev,
      [questionId]: file
    }));
    handleAnswerChange(questionId, file.name);
  };

  // Clear uploaded file for a specific question
  const handleClearFile = (questionId) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[questionId];
      return newFiles;
    });
    handleAnswerChange(questionId, null);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    if (!quizSessionId) {
      toast.error(t('quiz:errors.session_not_found'));
      return;
    }

    // Convert answers to the format expected by the backend
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => {
      return {
        questionId: questionId,
        answer: answer
      };
    });

    const submissionData = {
      answers: formattedAnswers,
      quizSessionId: quizSessionId,
      phase: parseInt(phase),
      completedAt: Date.now()
    };

    // If offline, store for later submission
    if (offlineMode || !navigator.onLine) {
      const success = offlineStorage.markQuizCompleted(
        phase,
        formattedAnswers,
        null, // Score will be calculated when synced
        quizSessionId
      );

      if (success) {
        setPendingSubmission(true);
        setQuizCompleted(true);
        setShowResults(true);
        setTimeRemaining(0);

        // Clear offline progress since quiz is completed
        offlineStorage.removeItem(`quiz_progress_${phase}`);

        toast.success(t('quiz:offline.saved_will_sync'), { duration: 6000 });
      } else {
        toast.error(t('quiz:offline.save_failed'));
      }
      return;
    }

    // Online submission
    submitQuizMutation.mutate(submissionData);
  };

  // Show loading state while fetching quiz or history
  if (quizLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <div className="burando-card">
          <div className="burando-card-body text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-burando-teal mx-auto mb-4"></div>
            <h2 className="burando-heading-2 text-burando-navy mb-2">{t('common:loading.quiz')}</h2>
            <p className="burando-text-muted">{t('quiz:loading.preparing_quiz', { phase })}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if quiz failed to load
  if (quizError) {
    return (
      <div className="space-y-6">
        <div className="burando-card">
          <div className="burando-card-body text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="burando-heading-2 text-burando-navy mb-2">{t('common:quiz_errors.loading_failed')}</h2>
            <p className="burando-text-muted">
              {t('common:quiz_errors.failed_message', { phase })}
              {quizError?.response?.data?.error || quizError?.message || t('common:quiz_errors.unknown_error')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="burando-btn burando-btn-primary mt-4"
            >
              {t('common:quiz_errors.try_again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="space-y-6">
        <div className="burando-card">
          <div className="burando-card-body text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="burando-heading-2 text-burando-navy mb-2">{t('quiz:errors.not_found')}</h2>
            <p className="burando-text-muted">{t('quiz:errors.not_available', { phase })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Quiz Header */}
      <div className="burando-card">
        <div className="burando-card-header">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="burando-heading-1 text-burando-navy">{currentQuiz.title}</h1>
                  <p className="burando-text-muted">{currentQuiz.description}</p>
                </div>

                {/* Language Dropdown */}
                <div className="relative language-dropdown">
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 bg-burando-teal/10 hover:bg-burando-teal/20 border border-burando-teal/30 rounded-lg transition-colors"
                    disabled={translationLoading}
                  >
                    {translationLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-burando-teal border-t-transparent rounded-full"></div>
                        <span className="text-sm text-burando-teal">Loading...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 text-burando-teal" />
                        <span className="text-sm text-burando-teal font-medium">
                          {languages.find(lang => lang.code === currentLanguage)?.flag || 'EN'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-burando-teal" />
                      </>
                    )}
                  </button>

                  {showLanguageDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      {languages.map((language) => (
                        <button
                          key={language.code}
                          onClick={() => {
                            changeLanguage(language.code);
                            setShowLanguageDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-burando-teal/10 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                            currentLanguage === language.code
                              ? 'bg-burando-teal/10 text-burando-teal font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{language.name}</span>
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {language.flag}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 ml-4">
              {/* Offline Status Indicator */}
              {offlineMode && (
                <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-700">
                    {t('quiz:offline.mode_active')}
                  </span>
                </div>
              )}

              {/* Pending Sync Indicator */}
              {pendingSubmission && (
                <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    {t('quiz:offline.pending_sync')}
                  </span>
                </div>
              )}

              {/* Timer */}
              {quizStarted && timeRemaining !== null && !showResults && !quizCompleted && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-burando-teal/10 to-burando-bright-teal/10 border border-burando-teal/20 px-4 py-2 rounded-lg">
                  <Clock className="h-5 w-5 text-burando-teal" />
                  <span className={`font-mono text-lg font-semibold ${
                    timeRemaining < 300 ? 'text-red-600' : 'text-burando-navy'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Start Screen */}
      {!quizStarted && (
        <div className="burando-card">
          <div className="burando-card-body text-center py-12">
            <Target className="h-16 w-16 text-burando-teal mx-auto mb-6" />
            <h2 className="burando-heading-2 text-burando-navy mb-4">{t('navigation.ready_to_begin')}</h2>
            <div className="max-w-2xl mx-auto space-y-4 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-gradient-to-br from-burando-teal/10 to-burando-teal/5 border border-burando-teal/20 p-4 rounded-lg">
                  <Clock className="h-6 w-6 text-burando-teal mx-auto mb-2" />
                  <div className="font-semibold text-burando-navy">{t('navigation.time_limit_label')}</div>
                  <div className="text-burando-teal">{currentQuiz.timeLimit} minutes</div>
                </div>
                <div className="bg-gradient-to-br from-burando-bright-teal/10 to-burando-bright-teal/5 border border-burando-bright-teal/20 p-4 rounded-lg">
                  <FileText className="h-6 w-6 text-burando-bright-teal mx-auto mb-2" />
                  <div className="font-semibold text-burando-navy">{t('navigation.questions_label')}</div>
                  <div className="text-burando-bright-teal">{t('navigation.questions_count', { count: totalQuestions })}</div>
                </div>
                <div className="bg-gradient-to-br from-burando-light-green/10 to-burando-light-green/5 border border-burando-light-green/20 p-4 rounded-lg">
                  <Award className="h-6 w-6 text-burando-light-green mx-auto mb-2" />
                  <div className="font-semibold text-burando-navy">{t('navigation.passing_score_label')}</div>
                  <div className="text-burando-light-green">{currentQuiz.passingScore}%</div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-orange-900 mb-2">{t('quiz:ui.important_instructions')}</h3>
                <ul className="text-orange-800 text-sm space-y-1">
                  <li>• {t('quiz:ui.instruction_photos')}</li>
                  <li>• {t('quiz:ui.instruction_navigation')}</li>
                  <li>• {t('quiz:ui.instruction_files')}</li>
                  <li>• {t('quiz:ui.instruction_all_questions')}</li>
                  <li>• {t('quiz:ui.instruction_auto_save')}</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleStartQuiz}
              className="burando-btn burando-btn-primary burando-btn-lg text-lg px-8 py-3"
            >
              <Play className="h-5 w-5 mr-2" />
              {t('navigation.start_quiz')}
            </button>
          </div>
        </div>
      )}

      {/* Quiz Questions */}
      {quizStarted && !showResults && currentQuestion && (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="burando-card">
            <div className="burando-card-body py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-burando-navy">
                  {t('navigation.question_progress')} {currentQuestionIndex + 1} {t('common:general.of')} {totalQuestions}
                </span>
                <span className="text-sm text-burando-teal">
                  {currentQuestion.points || 1} points
                </span>
              </div>
              <div className="burando-progress">
                <div
                  className="burando-progress-bar transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="burando-card">
            <div className="burando-card-header">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="burando-badge burando-badge-info">
                      {currentQuestion.category ? String(currentQuestion.category).replace('_', ' ').toUpperCase() : 'GENERAL'}
                    </span>
                    {currentQuestion.required && (
                      <span className="burando-badge burando-badge-error">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <h2 className="burando-heading-2 text-burando-navy">
                    {currentQuestion.question}
                  </h2>
                </div>
              </div>
            </div>

            <div className="burando-card-body">
              {/* Render question based on type */}
              {currentQuestion.type === 'file_upload' && (
                <FileUploadQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  uploadedFile={uploadedFiles[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                  onFileUpload={(file) => handleFileUpload(currentQuestion.id, file)}
                  onClearFile={() => handleClearFile(currentQuestion.id)}
                  t={t}
                />
              )}

              {currentQuestion.type === 'multiple_choice' && (
                <MultipleChoiceQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              )}

              {currentQuestion.type === 'yes_no' && (
                <YesNoQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              )}

              {currentQuestion.type === 'fill_in_gaps' && (
                <FillInGapsQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              )}

              {currentQuestion.type === 'drag_order' && (
                <DragOrderQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              )}

              {currentQuestion.type === 'matching' && (
                <MatchingQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              )}

              {currentQuestion.type === 'short_answer' && (
                <ShortAnswerQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              )}

              {currentQuestion.type === 'scenario' && (
                <ScenarioQuestion
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              )}
            </div>
          </div>

          {/* Streamlined Navigation */}
          <div className="burando-card border-t-4 border-t-burando-teal">
            <div className="burando-card-body py-6">
              {/* Status Indicators */}
              <div className="flex items-center justify-center mb-6 space-x-4">
                {/* Auto-advance indicator */}
                {shouldAutoAdvance(currentQuestion?.type) && autoAdvanceTimeout && (
                  <div className="flex items-center space-x-2 text-sm text-burando-teal bg-burando-teal/10 px-4 py-2 rounded-full border border-burando-teal/20">
                    <div className="w-2 h-2 bg-burando-teal rounded-full animate-pulse"></div>
                    <span className="font-medium">{t('quiz:ui.auto_advance')}</span>
                  </div>
                )}

                {/* Answer status indicator */}
                {isCurrentQuestionAnswered() && !autoAdvanceTimeout && (
                  <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">{t('quiz:ui.question_answered')}</span>
                  </div>
                )}

                {/* Unanswered indicator */}
                {!isCurrentQuestionAnswered() && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>{t('quiz:ui.provide_answer')}</span>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Mobile Progress (top on mobile) */}
                <div className="flex items-center justify-center sm:hidden">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">{t('quiz:ui.question_progress')}</div>
                    <div className="text-lg font-semibold text-burando-navy">
                      {currentQuestionIndex + 1} {t('common:general.of')} {totalQuestions}
                    </div>
                  </div>
                </div>

                {/* Button Row */}
                <div className="flex items-center justify-between flex-1">
                  {/* Previous Button */}
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="burando-btn burando-btn-outline disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t('common:buttons.previous')}</span>
                    <span className="sm:hidden">Prev</span>
                  </button>

                  {/* Center: Progress and Save (desktop only) */}
                  <div className="hidden sm:flex items-center space-x-6">
                    {/* Progress indicator */}
                    <div className="text-center">
                      <div className="text-sm text-gray-500 mb-1">{t('quiz:ui.question_progress')}</div>
                      <div className="text-lg font-semibold text-burando-navy">
                        {currentQuestionIndex + 1} {t('common:general.of')} {totalQuestions}
                      </div>
                    </div>

                    {/* Save Progress */}
                    <button
                      onClick={() => {
                        toast.success(t('common:success.saved'));
                      }}
                      className="burando-btn burando-btn-outline burando-btn-sm touch-target"
                      title={t('quiz:ui.save_progress')}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('common:buttons.save')}
                    </button>
                  </div>

                  {/* Primary Action Button */}
                  {currentQuestionIndex === totalQuestions - 1 ? (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={!isCurrentQuestionAnswered()}
                      className="burando-btn burando-btn-success burando-btn-lg disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      <span className="hidden sm:inline">{t('navigation.submit_quiz')}</span>
                      <span className="sm:hidden">Submit</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // Clear auto-advance timeout if user manually clicks next
                        if (autoAdvanceTimeout) {
                          clearTimeout(autoAdvanceTimeout);
                          setAutoAdvanceTimeout(null);
                        }
                        handleNextQuestion();
                      }}
                      disabled={!isCurrentQuestionAnswered()}
                      className="burando-btn burando-btn-primary burando-btn-lg disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                    >
                      <span className="hidden sm:inline">{t('common:buttons.continue')}</span>
                      <span className="sm:hidden">Next</span>
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </button>
                  )}
                </div>

                {/* Mobile Save Button */}
                <div className="flex sm:hidden justify-center">
                  <button
                    onClick={() => {
                      toast.success(t('common:success.saved'));
                    }}
                    className="burando-btn burando-btn-outline burando-btn-sm touch-target"
                    title={t('quiz:ui.save_progress')}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t('common:buttons.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Quiz Results */}
      {showResults && (
        <div className="burando-card">
          <div className="burando-card-body text-center py-12">
            <CheckCircle className="h-16 w-16 text-burando-light-green mx-auto mb-6" />
            <h2 className="burando-heading-2 text-burando-navy mb-4">{t('quiz:ui.quiz_completed_title')}</h2>
            <p className="burando-text-muted mb-8">
              {t('quiz:ui.quiz_completed_message')}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => navigate(`/crew/training/${phase}`)}
                className="burando-btn burando-btn-primary"
              >
                {t('quiz:ui.return_to_training')}
              </button>
              <button
                onClick={() => navigate('/crew/dashboard')}
                className="burando-btn burando-btn-outline"
              >
                {t('quiz:ui.go_to_dashboard')}
              </button>
            </div>

            {/* Feedback Widget for Quiz Completion */}
            <div className="mt-8 flex justify-center">
              <FeedbackWidget
                context="quiz_completion"
                trigger="auto"
                onFeedbackSubmitted={(feedback) => {
                  // console.log('Quiz feedback submitted:', feedback);
                }}
                className="max-w-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Question Components

const FileUploadQuestion = ({ question, answer, uploadedFile, onAnswerChange, onFileUpload, onClearFile, t }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = React.useRef(null);

  // Reset local state when question changes
  useEffect(() => {
    // Always reset local state when question changes
    setPreview(null);
    setDragActive(false);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Only create preview if there's an uploaded file for THIS specific question
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(uploadedFile);
    }
  }, [question.id]); // Reset when question ID changes

  // Separate effect for handling file preview updates
  useEffect(() => {
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(uploadedFile);
    } else {
      setPreview(null);
    }
  }, [uploadedFile]); // Only when uploadedFile changes

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file type with safety check
    const acceptedTypes = question.acceptedFileTypes || ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, or WebP images.');
      return;
    }

    // Validate file size (convert MB to bytes) with safety check
    const maxSize = question.maxFileSize || 5; // Default to 5MB if not specified
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSize}MB.`);
      return;
    }

    // Use the parent component's file upload handler
    onFileUpload(file);
    onAnswerChange(file.name);

    toast.success(t('common:success.uploaded'));
  };

  const handleClearFile = () => {
    onClearFile();
    toast(t('quiz:file_upload.file_removed'));
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-gradient-to-r from-burando-bright-teal/10 to-burando-light-green/10 border border-burando-bright-teal/20 rounded-lg p-4">
        <h4 className="font-semibold text-burando-navy mb-2">📸 Photo Requirements:</h4>
        <div className="text-burando-teal text-sm whitespace-pre-line">
          {question.instructions}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${
          dragActive
            ? 'border-burando-bright-teal bg-burando-bright-teal/10'
            : uploadedFile
            ? 'border-burando-light-green bg-burando-light-green/10'
            : 'border-gray-300 hover:border-burando-teal'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={question.acceptedFileTypes?.join(',') || 'image/*'}
          onChange={handleChange}
        />

        {!uploadedFile ? (
          <div>
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Photo
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your photo here, or click to browse
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-outline"
            >
              <Camera className="h-4 w-4 mr-2" />
              Choose Photo
            </button>
          </div>
        ) : (
          <div>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-900 mb-2">
              Photo Uploaded Successfully
            </h3>
            <p className="text-green-700 mb-4">
              {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline min-touch-target"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Replace Photo
              </button>
              <button
                type="button"
                onClick={handleClearFile}
                className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Remove Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Preview:</h4>
          <img
            src={preview}
            alt="Upload preview"
            className="max-w-full h-auto max-h-64 mx-auto rounded-lg shadow-sm"
          />
        </div>
      )}

      {/* Validation Checklist */}
      {question.validation?.checklistItems && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">✅ Verification Checklist:</h4>
          <div className="space-y-1">
            {question.validation.checklistItems.map((item, index) => (
              <div key={index} className="flex items-center text-yellow-800 text-sm">
                <div className="w-4 h-4 border border-yellow-400 rounded mr-2"></div>
                {item}
              </div>
            ))}
          </div>
          <p className="text-yellow-700 text-xs mt-2">
            Your photo will be manually reviewed to ensure all items are visible.
          </p>
        </div>
      )}
    </div>
  );
};

const MultipleChoiceQuestion = ({ question, answer, onAnswerChange }) => {
  // Safety check for options array
  const options = question.options || [];

  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <label
          key={index}
          className={`flex items-start p-4 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200 touch-target mobile-quiz-button ${
            answer === index
              ? 'border-burando-teal bg-burando-teal/10 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name={question.id}
            value={index}
            checked={answer === index}
            onChange={() => onAnswerChange(index)}
            className="sr-only"
          />
          <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            answer === index ? 'border-burando-teal bg-burando-teal' : 'border-gray-300'
          }`}>
            {answer === index && (
              <CheckCircle className="w-3 h-3 text-white" />
            )}
          </div>
          <span className={`flex-1 text-base sm:text-sm leading-relaxed ${answer === index ? 'text-burando-navy font-medium' : 'text-gray-900'}`}>
            {option}
          </span>
          {answer === index && (
            <div className="ml-2 text-burando-teal">
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
        </label>
      ))}
    </div>
  );
};

const YesNoQuestion = ({ question, answer, onAnswerChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:space-x-4">
      <label
        className={`flex-1 flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 touch-target mobile-quiz-button ${
          answer === true
            ? 'border-green-500 bg-green-50 shadow-md sm:transform sm:scale-105'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <input
          type="radio"
          name={question.id}
          checked={answer === true}
          onChange={() => onAnswerChange(true)}
          className="sr-only"
        />
        <div className="text-center">
          <div className={`relative ${answer === true ? 'animate-pulse' : ''}`}>
            <Check className={`h-8 w-8 mx-auto mb-2 transition-all duration-200 ${
              answer === true ? 'text-green-600' : 'text-gray-400'
            }`} />
            {answer === true && (
              <div className="absolute -top-1 -right-1">
                <CheckCircle className="h-4 w-4 text-green-600 bg-white rounded-full" />
              </div>
            )}
          </div>
          <span className={`text-lg font-semibold transition-all duration-200 ${
            answer === true ? 'text-green-900' : 'text-gray-600'
          }`}>
            Yes
          </span>
        </div>
      </label>

      <label
        className={`flex-1 flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 touch-target mobile-quiz-button ${
          answer === false
            ? 'border-red-500 bg-red-50 shadow-md sm:transform sm:scale-105'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <input
          type="radio"
          name={question.id}
          checked={answer === false}
          onChange={() => onAnswerChange(false)}
          className="sr-only"
        />
        <div className="text-center">
          <div className={`relative ${answer === false ? 'animate-pulse' : ''}`}>
            <X className={`h-8 w-8 mx-auto mb-2 transition-all duration-200 ${
              answer === false ? 'text-red-600' : 'text-gray-400'
            }`} />
            {answer === false && (
              <div className="absolute -top-1 -right-1">
                <CheckCircle className="h-4 w-4 text-red-600 bg-white rounded-full" />
              </div>
            )}
          </div>
          <span className={`text-lg font-semibold transition-all duration-200 ${
            answer === false ? 'text-red-900' : 'text-gray-600'
          }`}>
            No
          </span>
        </div>
      </label>
    </div>
  );
};

const FillInGapsQuestion = ({ question, answer, onAnswerChange }) => {
  const [answers, setAnswers] = useState(answer || []);

  // Initialize answers array when component mounts or question changes
  useEffect(() => {
    const template = question.template || question.question || 'Please fill in the [BLANK].';

    // Support both [BLANK] and underscore patterns
    let blanksCount = 0;
    if (template.includes('[BLANK]')) {
      blanksCount = (template.match(/\[BLANK\]/g) || []).length;
    } else {
      // Count underscore patterns (5 or more underscores)
      blanksCount = (template.match(/_{5,}/g) || []).length;
    }

    if (!answer || answer.length !== blanksCount) {
      const initialAnswers = new Array(blanksCount).fill('');
      setAnswers(initialAnswers);
      onAnswerChange(initialAnswers);
    } else {
      setAnswers(answer);
    }
  }, [question.id, question.template, question.question, answer, onAnswerChange]);

  const handleInputChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
    onAnswerChange(newAnswers);
  };

  // Safety check for template with fallback and support both formats
  const template = question.template || question.question || 'Please fill in the [BLANK].';
  let blanks, blanksCount;

  if (template.includes('[BLANK]')) {
    blanks = template.split('[BLANK]');
    blanksCount = blanks.length - 1;
  } else {
    // Handle underscore patterns
    blanks = template.split(/_{5,}/);
    blanksCount = blanks.length - 1;
  }
  const filledCount = answers.filter(answer => answer && answer.trim() !== '').length;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm font-medium mb-2">
          📝 Instructions:
        </p>
        <p className="text-blue-700 text-sm">
          Fill in the blanks with the correct answers. Spelling and capitalization don't need to be exact.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
        <span className="text-sm font-medium text-gray-700">
          Progress: {filledCount} of {blanksCount} blanks filled
        </span>
        {filledCount === blanksCount && blanksCount > 0 && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">All blanks filled!</span>
          </div>
        )}
      </div>

      {/* Question with input fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-lg leading-relaxed">
          {blanks.map((text, index) => (
            <span key={index}>
              {text}
              {index < blanks.length - 1 && (
                <input
                  type="text"
                  value={answers[index] || ''}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  className="inline-block mx-2 px-3 py-2 border-2 border-gray-300 rounded-md min-w-[120px] text-base focus:border-burando-teal focus:ring-2 focus:ring-burando-teal/20 focus:outline-none transition-colors"
                  placeholder={`Enter answer ${index + 1}`}
                  autoComplete="off"
                />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Hints or examples if available */}
      {question.hints && question.hints.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">💡 Hints:</h4>
          <ul className="text-yellow-800 text-sm space-y-1">
            {question.hints.map((hint, index) => (
              <li key={index}>• {hint}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Status indicator */}
      {filledCount === blanksCount && blanksCount > 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 text-sm font-medium">
              ✅ Perfect! All blanks have been filled. You can continue or review your answers.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <p className="text-yellow-800 text-sm">
              Fill in {blanksCount - filledCount} more blank{blanksCount - filledCount !== 1 ? 's' : ''} to complete this question.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const ShortAnswerQuestion = ({ question, answer, onAnswerChange }) => {
  return (
    <div className="space-y-4">
      <textarea
        value={answer || ''}
        onChange={(e) => onAnswerChange(e.target.value)}
        className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
        placeholder="Type your answer here..."
        maxLength={question.maxLength}
      />

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          {(answer || '').length} / {question.maxLength} characters
        </span>
        <span>
          Be specific and include key terms related to the policy.
        </span>
      </div>

      {question.sampleAnswer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Hint:</h4>
          <p className="text-blue-800 text-sm">
            Your answer should cover the main policy points and use relevant terminology.
          </p>
        </div>
      )}
    </div>
  );
};

const ScenarioQuestion = ({ question, answer, onAnswerChange }) => {
  // Safety checks for scenario and options
  const scenario = question.scenario || 'No scenario provided.';
  const options = question.options || [];

  return (
    <div className="space-y-6">
      {/* Scenario Description */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2">📋 Scenario:</h4>
        <p className="text-yellow-800 leading-relaxed">
          {scenario}
        </p>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {options.map((option, index) => (
          <label
            key={index}
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              answer === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={index}
              checked={answer === index}
              onChange={() => onAnswerChange(index)}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded-full border-2 mr-3 mt-1 flex items-center justify-center flex-shrink-0 ${
              answer === index ? 'border-blue-500' : 'border-gray-300'
            }`}>
              {answer === index && (
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              )}
            </div>
            <span className="text-gray-900 leading-relaxed">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Fully functional drag-and-drop question component
const DragOrderQuestion = ({ question, answer, onAnswerChange }) => {
  // Safety check for items array
  const initialItems = question.items || [];
  const [items, setItems] = useState(answer || initialItems);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Initialize answer with default order on component mount
  useEffect(() => {
    if (!answer && initialItems.length > 0) {
      onAnswerChange(initialItems);
      setItems(initialItems);
    }
  }, [answer, initialItems, onAnswerChange]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];

    // Remove the dragged item
    newItems.splice(draggedIndex, 1);

    // Insert at new position
    newItems.splice(dropIndex, 0, draggedItem);

    setItems(newItems);
    onAnswerChange(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveItem = (fromIndex, direction) => {
    const newItems = [...items];
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= newItems.length) {
      return;
    }

    // Swap items
    [newItems[fromIndex], newItems[toIndex]] = [newItems[toIndex], newItems[fromIndex]];

    setItems(newItems);
    onAnswerChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-blue-800 text-sm font-medium mb-2">
          📋 Instructions:
        </p>
        <p className="text-blue-700 text-sm">
          Drag and drop the items below to arrange them in the correct order, or use the arrow buttons to move items up/down.
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${
              draggedIndex === index
                ? 'opacity-50 transform rotate-2'
                : dragOverIndex === index
                ? 'border-burando-teal bg-burando-teal/10 transform scale-105'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } cursor-move`}
          >
            <GripVertical className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
            <span className="flex-1 font-medium text-gray-900">{item}</span>

            {/* Position indicator */}
            <div className="flex items-center space-x-2 mr-3">
              <span className="text-sm font-semibold text-burando-teal bg-burando-teal/10 px-2 py-1 rounded">
                #{index + 1}
              </span>
            </div>

            {/* Move buttons for accessibility */}
            <div className="flex flex-col space-y-1">
              <button
                type="button"
                onClick={() => moveItem(index, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 'down')}
                disabled={index === items.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 text-sm font-medium">
            ✅ Order set! You can continue or adjust the order as needed.
          </p>
        </div>
      </div>
    </div>
  );
};

const MatchingQuestion = ({ question, answer, onAnswerChange }) => {
  // Safety checks for column arrays
  const leftColumn = question.leftColumn || [];
  const rightColumn = question.rightColumn || [];

  // Initialize matches state - array where index is left item, value is right item index
  const [matches, setMatches] = useState(answer || new Array(leftColumn.length).fill(null));
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  // Initialize answer with empty matches on component mount
  useEffect(() => {
    if (!answer && leftColumn.length > 0) {
      const initialMatches = new Array(leftColumn.length).fill(null);
      onAnswerChange(initialMatches);
      setMatches(initialMatches);
    }
  }, [answer, leftColumn.length, onAnswerChange]);

  // Handle drag start from left column
  const handleDragStart = (e, leftIndex) => {
    setDraggedItem({ type: 'left', index: leftIndex, item: leftColumn[leftIndex] });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  // Handle drag start from right column (for reordering)
  const handleRightDragStart = (e, rightIndex) => {
    setDraggedItem({ type: 'right', index: rightIndex, item: rightColumn[rightIndex] });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, targetType, targetIndex) => {
    e.preventDefault();
    setDragOverTarget({ type: targetType, index: targetIndex });
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTarget(null);
    }
  };

  // Handle drop on right column (create match)
  const handleDropOnRight = (e, rightIndex) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.type !== 'left') return;

    const newMatches = [...matches];
    newMatches[draggedItem.index] = rightIndex;

    setMatches(newMatches);
    onAnswerChange(newMatches);
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  // Handle drop on left column (remove match)
  const handleDropOnLeft = (e, leftIndex) => {
    e.preventDefault();

    if (!draggedItem) return;

    const newMatches = [...matches];

    if (draggedItem.type === 'right') {
      // Remove any existing match for this right item
      const matchIndex = newMatches.findIndex(match => match === draggedItem.index);
      if (matchIndex !== -1) {
        newMatches[matchIndex] = null;
      }
    } else if (draggedItem.type === 'left') {
      // Remove match for this left item
      newMatches[draggedItem.index] = null;
    }

    setMatches(newMatches);
    onAnswerChange(newMatches);
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  // Handle click-based matching for mobile/accessibility
  const handleLeftItemClick = (leftIndex) => {
    // If this item is already matched, remove the match
    if (matches[leftIndex] !== null) {
      const newMatches = [...matches];
      newMatches[leftIndex] = null;
      setMatches(newMatches);
      onAnswerChange(newMatches);
    }
  };

  const handleRightItemClick = (rightIndex) => {
    // Find the first unmatched left item and match it
    const unmatchedLeftIndex = matches.findIndex(match => match === null);
    if (unmatchedLeftIndex !== -1) {
      const newMatches = [...matches];
      newMatches[unmatchedLeftIndex] = rightIndex;
      setMatches(newMatches);
      onAnswerChange(newMatches);
    }
  };

  // Check if all items are matched
  const allMatched = matches.every(match => match !== null);
  const matchedCount = matches.filter(match => match !== null).length;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm font-medium mb-2">
          📋 Instructions:
        </p>
        <p className="text-blue-700 text-sm">
          Drag items from the left column to the right column to create matches, or click items to match them automatically.
          Drag matched items back to the left to remove matches.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
        <span className="text-sm font-medium text-gray-700">
          Progress: {matchedCount} of {leftColumn.length} matched
        </span>
        {allMatched && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">All items matched!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Items to Match */}
        <div className="space-y-3">
          <h4 className="font-semibold text-burando-navy text-lg border-b border-gray-200 pb-2">
            Equipment & Items
          </h4>
          {leftColumn.map((item, leftIndex) => {
            const isMatched = matches[leftIndex] !== null;
            const matchedRightIndex = matches[leftIndex];

            return (
              <div
                key={leftIndex}
                draggable
                onDragStart={(e) => handleDragStart(e, leftIndex)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, 'left', leftIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnLeft(e, leftIndex)}
                onClick={() => handleLeftItemClick(leftIndex)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  isMatched
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : dragOverTarget?.type === 'left' && dragOverTarget?.index === leftIndex
                    ? 'border-red-400 bg-red-50'
                    : 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:bg-blue-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item}</span>
                  <div className="flex items-center space-x-2">
                    {isMatched && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          → {rightColumn[matchedRightIndex]}
                        </span>
                      </>
                    )}
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column - Match Targets */}
        <div className="space-y-3">
          <h4 className="font-semibold text-burando-navy text-lg border-b border-gray-200 pb-2">
            Uses & Functions
          </h4>
          {rightColumn.map((item, rightIndex) => {
            const isUsed = matches.includes(rightIndex);
            const leftItemIndex = matches.findIndex(match => match === rightIndex);

            return (
              <div
                key={rightIndex}
                draggable={isUsed}
                onDragStart={(e) => isUsed && handleRightDragStart(e, rightIndex)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, 'right', rightIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnRight(e, rightIndex)}
                onClick={() => !isUsed && handleRightItemClick(rightIndex)}
                className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                  isUsed
                    ? 'bg-green-50 border-green-300 text-green-800 cursor-move'
                    : dragOverTarget?.type === 'right' && dragOverTarget?.index === rightIndex
                    ? 'border-burando-teal bg-burando-teal/10 transform scale-105'
                    : 'bg-orange-50 border-orange-200 hover:border-orange-300 hover:bg-orange-100 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item}</span>
                  <div className="flex items-center space-x-2">
                    {isUsed && (
                      <>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          ← {leftColumn[leftItemIndex]}
                        </span>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </>
                    )}
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status indicator */}
      {allMatched ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 text-sm font-medium">
              ✅ Perfect! All items have been matched. You can continue or adjust matches as needed.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <p className="text-yellow-800 text-sm">
              Match {leftColumn.length - matchedCount} more item{leftColumn.length - matchedCount !== 1 ? 's' : ''} to complete this question.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
