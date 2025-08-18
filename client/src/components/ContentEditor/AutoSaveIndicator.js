import React from 'react';
import { useTranslation } from 'react-i18next';
import './AutoSaveIndicator.css';

const AutoSaveIndicator = ({ saveStatus, lastSaved, hasUnsavedChanges }) => {
  const { t } = useTranslation('common');
  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return t('auto_save.saving');
      case 'error':
        return t('auto_save.save_failed');
      case 'saved':
        if (hasUnsavedChanges) {
          return t('auto_save.unsaved_changes');
        }
        return lastSaved ? t('auto_save.saved_time_ago', { time: getTimeAgo(lastSaved) }) : t('auto_save.saved');
      default:
        return '';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor(diff / 1000);

    if (minutes > 0) {
      return `${minutes}m ago`;
    } else if (seconds > 30) {
      return `${seconds}s ago`;
    } else {
      return t('auto_save.just_now');
    }
  };

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <svg className="saving-spinner" width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
        );
      case 'saved':
        if (hasUnsavedChanges) {
          return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
          );
        }
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`auto-save-indicator ${saveStatus}`}>
      <span className="save-icon">
        {getStatusIcon()}
      </span>
      <span className="save-text">
        {getStatusText()}
      </span>
    </div>
  );
};

export default AutoSaveIndicator;
