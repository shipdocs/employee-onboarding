import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const SessionExpirationWarning = () => {
  const { t } = useTranslation(['common']);
  const { getTokenTimeRemaining, isTokenExpiringSoon, logout } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const updateTimeRemaining = () => {
      const remaining = getTokenTimeRemaining();
      setTimeRemaining(remaining);

      // Show warning if token is expiring soon and not dismissed
      const expiringSoon = isTokenExpiringSoon(10); // 10 minutes threshold
      setShowWarning(expiringSoon && !dismissed);
    };

    // Update immediately
    updateTimeRemaining();

    // Update every 30 seconds
    const interval = setInterval(updateTimeRemaining, 30000);

    return () => clearInterval(interval);
  }, [getTokenTimeRemaining, isTokenExpiringSoon, dismissed]);

  const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowWarning(false);
  };

  const handleRefreshSession = () => {
    // Redirect to login to get a fresh token
    window.location.href = '/login';
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!showWarning || timeRemaining <= 0) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / (1000 * 60));
  const isUrgent = minutes <= 2;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${isUrgent ? 'animate-pulse' : ''}`}>
      <div className={`rounded-lg shadow-lg border-l-4 p-4 ${
        isUrgent
          ? 'bg-red-50 border-red-500 text-red-800'
          : 'bg-yellow-50 border-yellow-500 text-yellow-800'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {isUrgent ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
          </div>

          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold">
              {isUrgent ? t('common:session.expiring_soon') : t('common:session.warning')}
            </h3>
            <p className="text-sm mt-1">
              {t('common:session.expires_in', { time: formatTimeRemaining(timeRemaining) })}
            </p>

            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleRefreshSession}
                className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium transition-colors ${
                  isUrgent
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('common:session.refresh_session')}
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                {t('common:session.logout')}
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 ml-2">
            <button
              onClick={handleDismiss}
              className={`rounded-md p-1 inline-flex items-center justify-center transition-colors ${
                isUrgent
                  ? 'text-red-400 hover:text-red-600 hover:bg-red-100'
                  : 'text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionExpirationWarning;
