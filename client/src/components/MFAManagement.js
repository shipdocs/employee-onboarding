import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Settings,
  Key,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MFASetup from './MFASetup';
import { isEnabled } from '../services/featureFlags';
import tokenService from '../services/tokenService';

/**
 * MFA Management Component
 *
 * Provides a comprehensive interface for managing MFA settings,
 * including setup, status display, and backup code management.
 */
const MFAManagement = ({
  userId,
  className = '',
  onStatusChange
}) => {
  const { t } = useTranslation('common');
  const [mfaStatus, setMfaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [regeneratingCodes, setRegeneratingCodes] = useState(false);

  // Check feature flags
  const mfaEnabled = isEnabled('MFA_ENABLED');
  const backupCodesEnabled = isEnabled('MFA_BACKUP_CODES');

  useEffect(() => {
    if (mfaEnabled && userId) {
      fetchMFAStatus();
    }
  }, [mfaEnabled, userId]);

  /**
   * Fetch current MFA status
   */
  const fetchMFAStatus = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/status', {
        headers: {
          'Authorization': `Bearer ${tokenService.getToken()}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMfaStatus(data.data);
        if (onStatusChange) {
          onStatusChange(data.data);
        }
      } else {
        setError(data.error || 'Failed to fetch MFA status');
      }
    } catch (err) {
      console.error('MFA status error:', err);
      setError('Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle MFA setup completion
   */
  const handleSetupComplete = (success) => {
    setShowSetup(false);
    if (success) {
      fetchMFAStatus(); // Refresh status
    }
  };

  /**
   * Regenerate backup codes
   */
  const regenerateBackupCodes = async () => {
    const verificationCode = prompt('Enter your current TOTP code to regenerate backup codes:');
    if (!verificationCode) return;

    setRegeneratingCodes(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenService.getToken()}`
        },
        body: JSON.stringify({
          verificationToken: verificationCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Download new backup codes
        downloadBackupCodes(data.data.backupCodes);
        fetchMFAStatus(); // Refresh status
        alert('New backup codes generated and downloaded successfully!');
      } else {
        setError(data.error || 'Failed to regenerate backup codes');
      }
    } catch (err) {
      console.error('Backup codes regeneration error:', err);
      setError('Failed to regenerate backup codes');
    } finally {
      setRegeneratingCodes(false);
    }
  };

  /**
   * Download backup codes as text file
   */
  const downloadBackupCodes = (codes) => {
    const content = [
      'Burando Maritime Services - MFA Backup Codes',
      '===========================================',
      '',
      'IMPORTANT: Store these codes in a secure location.',
      'Each code can only be used once.',
      '',
      'Generated on: ' + new Date().toLocaleString(),
      '',
      'Backup Codes:',
      ...codes.map((code, index) => `${index + 1}. ${code}`)
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `burando-mfa-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!mfaEnabled) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="text-center">
          <ShieldX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            MFA Not Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Multi-factor authentication is currently not enabled on this system.
          </p>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <MFASetup
        userId={userId}
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
        className={className}
      />
    );
  }

  if (loading) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-burando-teal mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading MFA status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchMFAStatus}
            className="glass-button px-4 py-2 rounded-lg text-white font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* MFA Status Card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            {mfaStatus?.enabled ? (
              <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
            ) : (
              <Shield className="h-8 w-8 text-gray-400 mr-3" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Multi-Factor Authentication
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {mfaStatus?.enabled
                  ? 'Your account is protected with MFA'
                  : 'Add an extra layer of security to your account'
                }
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            mfaStatus?.enabled
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {mfaStatus?.enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {/* Status Details */}
        {mfaStatus?.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
              <span className="text-gray-700 dark:text-gray-300">TOTP Enabled</span>
            </div>
            {backupCodesEnabled && (
              <div className="flex items-center text-sm">
                <Key className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">
                  {mfaStatus.backupCodesCount} Backup Codes
                </span>
              </div>
            )}
            {mfaStatus.lastUsedAt && (
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">
                  Last used: {new Date(mfaStatus.lastUsedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Requirements Notice */}
        {mfaStatus?.required && !mfaStatus?.enabled && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  MFA Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your account role requires multi-factor authentication. Please set it up to continue using your account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {mfaStatus?.recommendations && (
          <div className="space-y-2 mb-4">
            {mfaStatus.recommendations.shouldSetup && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Recommended:</strong> Set up MFA to secure your account
                </p>
              </div>
            )}
            {mfaStatus.recommendations.shouldRegenerateBackupCodes && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Action needed:</strong> You have few backup codes remaining. Consider regenerating them.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!mfaStatus?.configured ? (
            <button
              onClick={() => setShowSetup(true)}
              className="glass-button px-4 py-2 rounded-lg text-white font-medium flex items-center"
            >
              <Shield className="h-4 w-4 mr-2" />
              Set Up MFA
            </button>
          ) : (
            <>
              {backupCodesEnabled && (
                <button
                  onClick={regenerateBackupCodes}
                  disabled={regeneratingCodes}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center disabled:opacity-50"
                >
                  {regeneratingCodes ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Regenerate Backup Codes
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Setup Instructions (if not configured) */}
      {!mfaStatus?.configured && (
        <div className="glass-card p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            What is Multi-Factor Authentication?
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            MFA adds an extra layer of security by requiring a second form of verification
            in addition to your password. This helps protect your account even if your password is compromised.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-burando-teal/10 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-burando-teal font-semibold text-sm">1</span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Install an App
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download Google Authenticator, Authy, or similar app on your phone
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-burando-teal/10 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-burando-teal font-semibold text-sm">2</span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Scan QR Code
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use your app to scan the QR code we'll provide
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-burando-teal/10 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-burando-teal font-semibold text-sm">3</span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Verify Setup
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the 6-digit code from your app to complete setup
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-burando-teal/10 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-burando-teal font-semibold text-sm">4</span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Save Backup Codes
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Store backup codes securely for account recovery
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MFAManagement;
