import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom hook for managing quiz state with localStorage persistence
 */
export const useQuizState = (phase) => {
  // Core quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [quizSessionId, setQuizSessionId] = useState(null);

  // Storage key for this specific quiz
  const storageKey = `quiz_session_phase_${phase}`;

  /**
   * Save current state to localStorage
   */
  const saveStateToStorage = useCallback(() => {
    if (!quizStarted || quizCompleted) return;

    const stateToSave = {
      currentQuestionIndex,
      answers,
      timeRemaining,
      quizStarted,
      uploadedFiles,
      quizSessionId,
      lastSaved: new Date().toISOString()
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      // console.error('Failed to save quiz state:', error);
    }
  }, [
    currentQuestionIndex,
    answers,
    timeRemaining,
    quizStarted,
    uploadedFiles,
    quizSessionId,
    quizCompleted,
    storageKey
  ]);

  /**
   * Restore state from localStorage
   */
  const restoreStateFromStorage = useCallback(() => {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (!savedState) return false;

      const parsedState = JSON.parse(savedState);

      // Check if saved state is less than 24 hours old
      const lastSaved = new Date(parsedState.lastSaved);
      const hoursSinceLastSave = (new Date() - lastSaved) / (1000 * 60 * 60);

      if (hoursSinceLastSave > 24) {
        localStorage.removeItem(storageKey);
        return false;
      }

      // Restore state
      setCurrentQuestionIndex(parsedState.currentQuestionIndex || 0);
      setAnswers(parsedState.answers || {});
      setTimeRemaining(parsedState.timeRemaining || 0);
      setQuizStarted(parsedState.quizStarted || false);
      setUploadedFiles(parsedState.uploadedFiles || {});
      setQuizSessionId(parsedState.quizSessionId);

      return true;
    } catch (error) {
      // console.error('Failed to restore quiz state:', error);
      return false;
    }
  }, [storageKey]);

  /**
   * Clear saved state
   */
  const clearSavedState = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  /**
   * Initialize quiz
   */
  const startQuiz = useCallback((totalQuestions) => {
    const sessionId = uuidv4();
    setQuizSessionId(sessionId);
    setQuizStarted(true);
    setTimeRemaining(totalQuestions * 60); // 1 minute per question
    setCurrentQuestionIndex(0);
    setAnswers({});
    setUploadedFiles({});
    setQuizCompleted(false);
    setShowResults(false);
  }, []);

  /**
   * Update answer for current question
   */
  const updateAnswer = useCallback((questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  /**
   * Update uploaded file for a question
   */
  const updateUploadedFile = useCallback((questionId, file) => {
    setUploadedFiles(prev => ({
      ...prev,
      [questionId]: file
    }));
  }, []);

  /**
   * Navigate to next question
   */
  const goToNext = useCallback(() => {
    setCurrentQuestionIndex(prev => prev + 1);
  }, []);

  /**
   * Navigate to previous question
   */
  const goToPrevious = useCallback(() => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Complete the quiz
   */
  const completeQuiz = useCallback(() => {
    setQuizCompleted(true);
    setShowResults(true);
    clearSavedState();
  }, [clearSavedState]);

  /**
   * Reset quiz for retry
   */
  const resetQuiz = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeRemaining(0);
    setQuizStarted(false);
    setQuizCompleted(false);
    setShowResults(false);
    setUploadedFiles({});
    setQuizSessionId(null);
    clearSavedState();
  }, [clearSavedState]);

  /**
   * Update timer
   */
  const decrementTimer = useCallback(() => {
    setTimeRemaining(prev => Math.max(0, prev - 1));
  }, []);

  // Auto-save state when it changes
  useEffect(() => {
    if (quizStarted && !quizCompleted) {
      saveStateToStorage();
    }
  }, [quizStarted, quizCompleted, saveStateToStorage]);

  return {
    // State
    currentQuestionIndex,
    answers,
    timeRemaining,
    quizStarted,
    quizCompleted,
    showResults,
    uploadedFiles,
    quizSessionId,

    // Actions
    startQuiz,
    updateAnswer,
    updateUploadedFile,
    goToNext,
    goToPrevious,
    completeQuiz,
    resetQuiz,
    decrementTimer,
    restoreStateFromStorage,
    clearSavedState
  };
};
