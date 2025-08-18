import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for auto-saving content
 * @param {Object} data - The data to save
 * @param {Function} saveFunction - Function to call for saving
 * @param {number} delay - Delay in milliseconds before auto-saving (default: 30000ms = 30s)
 * @param {boolean} enabled - Whether auto-save is enabled
 * @returns {Object} - { saveStatus, forceSave, lastSaved }
 */
export const useAutoSave = (data, saveFunction, delay = 30000, enabled = true) => {
  const timeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const initialDataRef = useRef(null);
  const saveStatusRef = useRef('saved'); // 'saving', 'saved', 'error'

  // Initialize with the first data
  useEffect(() => {
    if (initialDataRef.current === null) {
      initialDataRef.current = JSON.stringify(data);
      lastSavedRef.current = Date.now();
    }
  }, []);

  const hasChanged = useCallback(() => {
    const currentData = JSON.stringify(data);
    return currentData !== initialDataRef.current;
  }, [data]);

  const performSave = useCallback(async () => {
    if (!hasChanged() || !enabled) {
      return;
    }

    try {
      saveStatusRef.current = 'saving';
      await saveFunction(data);
      saveStatusRef.current = 'saved';
      lastSavedRef.current = Date.now();
      initialDataRef.current = JSON.stringify(data);
    } catch (error) {
      // console.error('Auto-save failed:', error);
      saveStatusRef.current = 'error';
    }
  }, [data, saveFunction, hasChanged, enabled]);

  // Set up auto-save timer
  useEffect(() => {
    if (!enabled || !hasChanged()) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(performSave, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, performSave, hasChanged]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  return {
    saveStatus: saveStatusRef.current,
    forceSave,
    lastSaved: lastSavedRef.current,
    hasUnsavedChanges: hasChanged()
  };
};

export default useAutoSave;
