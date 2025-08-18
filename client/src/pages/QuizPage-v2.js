import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';

// Components
import QuizHeader from '../components/quiz/QuizHeader';
import QuizProgressBar from '../components/quiz/QuizProgressBar';
import QuizStartScreen from '../components/quiz/QuizStartScreen';
import QuizQuestion from '../components/quiz/QuizQuestion';
import QuizNavigation from '../components/quiz/QuizNavigation';
import QuizResults from '../components/quiz/QuizResults';
import LoadingSpinner from '../components/LoadingSpinner';
import NetworkStatus from '../components/NetworkStatus';

// Hooks
import { useQuizState } from '../hooks/useQuizState';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Services & Utils
import { api } from '../services/api';
import { shouldAutoAdvance } from '../utils/quiz/validation';

/**
 * Refactored QuizPage Component
 * Now uses extracted components for better maintainability
 */
const QuizPage = () => {
  const { phase } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isOffline } = useNetworkStatus();

  // State management using custom hook
  const {
    currentQuestionIndex,
    answers,
    timeRemaining,
    quizStarted,
    quizCompleted,
    showResults,
    uploadedFiles,
    quizSessionId,
    startQuiz,
    updateAnswer,
    updateUploadedFile,
    goToNext,
    goToPrevious,
    completeQuiz,
    resetQuiz,
    decrementTimer,
    restoreStateFromStorage
  } = useQuizState(phase);

  // Additional UI state
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [translatedQuiz, setTranslatedQuiz] = useState(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState(null);

  // Available languages
  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' }
  ];

  // Fetch quiz data
  const { data: quizData, isLoading, error } = useQuery(
    ['quiz', phase, user?.id],
    () => api.getQuiz(phase),
    {
      enabled: !!user?.id && !!phase,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000 // 10 minutes
    }
  );

  // Check quiz history
  const { data: quizHistory } = useQuery(
    ['quizHistory', phase, user?.id],
    () => api.getQuizHistory(user.id, phase),
    {
      enabled: !!user?.id && !!phase
    }
  );

  // Submit quiz mutation
  const submitQuizMutation = useMutation(
    (data) => api.submitQuiz(data),
    {
      onSuccess: (result) => {
        completeQuiz();
        if (result.passed) {
          toast.success('Quiz submitted successfully!');
        } else {
          toast.error(`Quiz not passed. You scored ${result.score}/${result.totalQuestions}`);
        }
      },
      onError: (error) => {
        // console.error('Quiz submission error:', error);
        if (isOffline) {
          // Store for later submission
          localStorage.setItem(`pending_quiz_${phase}`, JSON.stringify({
            answers,
            quizSessionId,
            phase,
            timestamp: new Date().toISOString()
          }));
          toast('Quiz saved offline. Will submit when connection is restored.', { icon: 'ℹ️' });
          completeQuiz();
        } else {
          toast.error('Failed to submit quiz. Please try again.');
        }
      }
    }
  );

  // Timer effect
  useEffect(() => {
    if (!quizStarted || quizCompleted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, timeRemaining, decrementTimer]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && quizStarted && !quizCompleted) {
      handleSubmit();
    }
  }, [timeRemaining, quizStarted, quizCompleted]);

  // Restore session on mount
  useEffect(() => {
    const restored = restoreStateFromStorage();
    if (restored) {
      toast('Restored your previous quiz session', { icon: 'ℹ️' });
    }
  }, [restoreStateFromStorage]);

  // Auto-advance for certain question types
  useEffect(() => {
    if (!quizData?.questions || quizCompleted) return;

    const currentQuestion = quizData.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion?.id];

    if (currentAnswer !== undefined && shouldAutoAdvance(currentQuestion?.type)) {
      const timeout = setTimeout(() => {
        if (currentQuestionIndex < quizData.questions.length - 1) {
          goToNext();
        }
      }, 1500);

      setAutoAdvanceTimeout(timeout);
      return () => clearTimeout(timeout);
    }
  }, [answers, currentQuestionIndex, quizData, goToNext, quizCompleted]);

  // Handle language change
  const handleLanguageChange = async (newLanguage) => {
    if (!quizData || newLanguage === language) return;

    setTranslationLoading(true);
    setShowLanguageDropdown(false);

    try {
      const translated = await api.translateQuiz(quizData, newLanguage);
      setTranslatedQuiz(translated);
      toast.success(`Quiz translated to ${newLanguage.toUpperCase()}`);
    } catch (error) {
      // console.error('Translation error:', error);
      toast.error('Failed to translate quiz');
    } finally {
      setTranslationLoading(false);
    }
  };

  // Handle quiz submission
  const handleSubmit = async () => {
    const submissionData = {
      userId: user.id,
      phase: parseInt(phase),
      answers,
      quizSessionId,
      completedAt: new Date().toISOString()
    };

    submitQuizMutation.mutate(submissionData);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading quiz..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Quiz</h2>
          <p className="text-gray-700 mb-6">{error.message}</p>
          <button
            onClick={() => navigate('/crew-dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Use translated quiz if available
  const displayQuiz = translatedQuiz || quizData;
  const currentQuestion = displayQuiz?.questions?.[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Network Status */}
        <NetworkStatus />

        {/* Quiz Header */}
        {quizStarted && !showResults && (
          <QuizHeader
            timeRemaining={timeRemaining}
            showLanguageDropdown={showLanguageDropdown}
            onToggleLanguage={() => setShowLanguageDropdown(!showLanguageDropdown)}
            currentLanguage={language}
            availableLanguages={availableLanguages}
            onLanguageChange={handleLanguageChange}
            isOffline={isOffline}
            translationLoading={translationLoading}
          />
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          {!quizStarted && !showResults ? (
            // Start Screen
            <QuizStartScreen
              quizData={displayQuiz}
              onStartQuiz={() => startQuiz(displayQuiz.questions.length)}
              previousAttempt={quizHistory?.lastAttempt}
              isRetrying={quizHistory?.attempts > 0}
            />
          ) : showResults ? (
            // Results Screen
            <QuizResults
              passed={submitQuizMutation.data?.passed}
              score={submitQuizMutation.data?.score}
              totalQuestions={displayQuiz?.questions?.length}
              onRetry={resetQuiz}
              userRole={user?.role}
            />
          ) : (
            // Quiz in Progress
            <>
              <QuizProgressBar
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={displayQuiz?.questions?.length || 0}
              />

              <QuizQuestion
                question={currentQuestion}
                answer={answers[currentQuestion?.id]}
                onAnswerChange={updateAnswer}
                uploadedFile={uploadedFiles[currentQuestion?.id]}
                onFileUpload={updateUploadedFile}
                isOffline={isOffline}
              />

              <QuizNavigation
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={displayQuiz?.questions?.length || 0}
                currentQuestion={currentQuestion}
                currentAnswer={answers[currentQuestion?.id]}
                uploadedFiles={uploadedFiles}
                onPrevious={goToPrevious}
                onNext={goToNext}
                onSubmit={handleSubmit}
                isSubmitting={submitQuizMutation.isLoading}
                offlineMode={isOffline}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
