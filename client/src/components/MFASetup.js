import React, { useState, useEffect } from 'react';
import {
  Shield,
  Smartphone,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isEnabled } from '../services/featureFlags';
import tokenService from '../services/tokenService';

/**
 * MFA Setup Component
 *
 * Guides users through the multi-factor authentication setup process
 * with step-by-step instructions and user-friendly interface.
 */
const MFASetup = ({
  userId,
  onComplete,
  onCancel,
  className = ''
}) => {
  const { t } = useTranslation('common');
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedItems, setCopiedItems] = useState(new Set());
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false);

  // Check if MFA is enabled
  const mfaEnabled = isEnabled('MFA_ENABLED');
  const backupCodesEnabled = isEnabled('MFA_BACKUP_CODES');

  useEffect(() => {
    if (mfaEnabled && currentStep === 1) {
      initiateMFASetup();
    }
  }, [mfaEnabled, userId]);

  /**
   * Initiate MFA setup by calling the setup API
   */
  const initiateMFASetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenService.getToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup MFA');
      }

      setSetupData(data.data);
      setCurrentStep(2);
    } catch (err) {
      console.error('MFA setup error:', err);
      setError(err.message || 'Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify the TOTP code and enable MFA
   */
  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/enable', {
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setCurrentStep(4); // Move to success step
    } catch (err) {
      console.error('MFA verification error:', err);
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text, itemId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set([...prev, itemId]));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /**
   * Download backup codes as text file
   */
  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

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
      ...setupData.backupCodes.map((code, index) => `${index + 1}. ${code}`)
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

    setBackupCodesDownloaded(true);
  };

  /**
   * Complete the setup process
   */
  const completeSetup = () => {
    if (onComplete) {
      onComplete(true);
    }
  };

  if (!mfaEnabled) {
    return (
      <div className="glass-card p-6 max-w-md mx-auto">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step
                  ? 'bg-burando-teal text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }
              `}>
                {currentStep > step ? <Check className="h-4 w-4" /> : step}
              </div>
              {step < 4 && (
                <div className={`
                  w-16 h-1 mx-2
                  ${currentStep > step ? 'bg-burando-teal' : 'bg-gray-200 dark:bg-gray-700'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span>Start</span>
          <span>Setup</span>
          <span>Verify</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="glass-card p-6">
        {/* Step 1: Introduction */}
        {currentStep === 1 && (
          <div className="text-center">
            <Shield className="h-16 w-16 text-burando-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Set Up Multi-Factor Authentication
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add an extra layer of security to your account. MFA helps protect your account
              even if your password is compromised.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                <div className="text-left">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    You'll need an authenticator app
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Download Google Authenticator, Authy, or similar app on your phone before continuing.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={initiateMFASetup}
                disabled={loading}
                className="glass-button px-6 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Get Started
              </button>
            </div>
          </div>
        )}

        {/* Step 2: QR Code and Manual Entry */}
        {currentStep === 2 && setupData && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
              Scan QR Code
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* QR Code */}
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <img
                    src={setupData.qrCode}
                    alt="MFA QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              {/* Manual Entry */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Can't scan? Enter manually:
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Name:
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                        {setupData.serviceName}
                      </code>
                      <button
                        onClick={() => copyToClipboard(setupData.serviceName, 'serviceName')}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {copiedItems.has('serviceName') ?
                          <Check className="h-4 w-4 text-green-600" /> :
                          <Copy className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Secret Key:
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm break-all">
                        {setupData.manualEntryKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(setupData.manualEntryKey, 'secretKey')}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {copiedItems.has('secretKey') ?
                          <Check className="h-4 w-4 text-green-600" /> :
                          <Copy className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="glass-button px-6 py-2 rounded-lg text-white font-medium flex items-center"
              >
                Next: Verify
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verification */}
        {currentStep === 3 && (
          <div className="text-center">
            <Smartphone className="h-16 w-16 text-burando-teal mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Verify Your Setup
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Enter the 6-digit code from your authenticator app to complete setup.
            </p>

            <div className="max-w-xs mx-auto mb-6">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                  setError('');
                }}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-burando-teal focus:border-transparent"
                maxLength={6}
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <button
                onClick={verifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                className="glass-button px-6 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Verify & Enable
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success and Backup Codes */}
        {currentStep === 4 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              MFA Successfully Enabled!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your account is now protected with multi-factor authentication.
            </p>

            {/* Backup Codes Section */}
            {backupCodesEnabled && setupData?.backupCodes && setupData.backupCodes.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Save Your Backup Codes
                  </h3>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                  Store these codes in a secure location. You can use them to access your account if you lose your phone.
                </p>

                <div className="flex gap-2 justify-center mb-4">
                  <button
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                    className="flex items-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors"
                  >
                    {showBackupCodes ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showBackupCodes ? 'Hide' : 'Show'} Codes
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>

                {showBackupCodes && (
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    {setupData.backupCodes.map((code, index) => (
                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border">
                        <code className="text-sm font-mono">{code}</code>
                        <button
                          onClick={() => copyToClipboard(code, `backup-${index}`)}
                          className="ml-2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {copiedItems.has(`backup-${index}`) ?
                            <Check className="h-3 w-3 text-green-600" /> :
                            <Copy className="h-3 w-3" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={completeSetup}
              className="glass-button px-8 py-3 rounded-lg text-white font-medium text-lg"
            >
              Complete Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASetup;
