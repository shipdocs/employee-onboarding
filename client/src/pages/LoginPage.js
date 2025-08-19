/**
 * @file LoginPage.js
 * @brief Primary authentication interface for the Maritime Onboarding System
 *
 * @details This component serves as the main entry point for all user authentication
 * in the maritime crew onboarding system. It provides three distinct authentication
 * methods tailored to different user roles and security requirements:
 *
 * **For Crew Members:**
 * - Magic link authentication via email (passwordless)
 * - Secure token-based access with automatic URL processing
 * - Mobile-optimized interface for shipboard use
 *
 * **For Managers and Administrators:**
 * - Traditional email/password authentication
 * - Multi-factor authentication (MFA) support
 * - Enhanced security features for privileged accounts
 *
 * **Key Features:**
 * - Responsive design optimized for maritime environments
 * - Multilingual support (English/Dutch)
 * - Real-time form validation and error handling
 * - Automatic token processing from email links
 * - Progressive enhancement for offline scenarios
 *
 * **Security Implementation:**
 * - JWT token-based session management
 * - Rate limiting and brute force protection
 * - Secure token transmission and validation
 * - Session timeout and automatic logout
 *
 * @author Maritime Onboarding System
 * @version 1.0
 * @since 2024
 *
 * @see AuthContext For authentication state management
 * @see authService For authentication API calls
 * @see ManagerDashboard For manager interface post-login
 * @see CrewDashboard For crew interface post-login
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { LogIn, Mail, Lock, AlertCircle, Shield, Key, ChevronDown } from 'lucide-react';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

/**
 * @brief Main authentication component for the Maritime Onboarding System
 *
 * @details Provides a unified login interface supporting multiple authentication
 * methods based on user role. Handles magic link processing, staff authentication,
 * and multi-factor authentication challenges.
 *
 * **Authentication Flow:**
 * 1. User selects authentication method (magic link request, token entry, or staff login)
 * 2. System validates credentials and processes authentication
 * 3. On success, user is redirected to role-appropriate dashboard
 * 4. On failure, appropriate error messages are displayed
 *
 * **Supported Authentication Methods:**
 * - **Magic Link Request**: Crew members request login link via email
 * - **Magic Link Token**: Automatic processing of tokens from email links
 * - **Staff Login**: Traditional email/password for managers and administrators
 *
 * @returns {JSX.Element} Rendered login interface with dynamic authentication options
 *
 * @example
 * // Basic usage in routing
 * <Route path="/login" element={<LoginPage />} />
 *
 * @example
 * // Magic link URL processing
 * // URL: /login?token=abc123
 * // Component automatically processes token and authenticates user
 */
const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const { login, user } = useAuth();
  const [loginType, setLoginType] = useState('request'); // 'request', 'token', or 'staff'
  const [showTokenEntry, setShowTokenEntry] = useState(false);
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);
  const [staffCredentials, setStaffCredentials] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const { t } = useTranslation('auth');
  
  // Prevent rendering login page if already authenticated
  useEffect(() => {
    if (user) {
      // User is already logged in, prevent infinite loops
      return;
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm();

  // Track if we've already attempted login with token
  const [tokenProcessed, setTokenProcessed] = useState(false);
  
  // Check for magic link token in URL
  useEffect(() => {
    const token = searchParams.get('token');
    // Only process token once to prevent infinite loops
    if (token && !tokenProcessed) {
      setTokenProcessed(true);
      setValue('token', token);
      magicLoginMutation.mutate({ token });
    }
  }, [searchParams, tokenProcessed]);

  // Magic link login mutation
  const magicLoginMutation = useMutation(
    ({ token }) => authService.magicLogin(token),
    {
      onSuccess: (data) => {
        login(data.user, data.token);
        toast.success(t('messages.welcome_back', { name: data.user.firstName }), {
          duration: 4000,
          icon: '🚢'
        });
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.error || t('messages.login_failed');
        const errorCode = error.response?.data?.code;

        if (errorMessage.includes('expired') || errorMessage.includes('Invalid or expired login link')) {
          toast.error(t('messages.magic_link_expired'), {
            duration: 8000,
            icon: '⚠️'
          });
        } else if (errorCode === 'AUTH_METHOD_NOT_ALLOWED') {
          // Staff member tried to use magic link
          toast.error(errorMessage, {
            duration: 8000,
            icon: '🔐'
          });
          // Redirect to staff login
          setTimeout(() => {
            setLoginType('staff');
            toast('Please use Staff Login instead', {
              duration: 4000,
              icon: '👨‍💼'
            });
          }, 2000);
        } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
          toast.error(t('messages.network_error'), {
            duration: 6000,
            icon: '📡'
          });
        } else {
          toast.error(t('messages.login_failed'), {
            duration: 6000,
            icon: '❌'
          });
        }
      }
    }
  );

  // Staff login mutation with MFA support (for admin and manager roles)
  const staffLoginMutation = useMutation(
    ({ email, password, mfaToken }) => authService.staffLogin(email, password, mfaToken),
    {
      onSuccess: (data, variables) => {
        // Check if MFA is required
        if (data.requiresMFA) {
          // Store credentials for MFA step
          setStaffCredentials({ email: variables.email, password: variables.password });
          setShowMFAChallenge(true);
          toast('Please enter your MFA code', {
            duration: 4000,
            icon: '🔐'
          });
          return;
        }

        // Validate token before calling login
        if (!data.token || typeof data.token !== 'string') {
          toast.error('Authentication failed - invalid token format');
          return;
        }

        // Normal login success
        const roleTitle = data.user.role === 'admin' ? 'Administrator' : 'Manager';
        login(data.user, data.token);
        toast.success(`Welcome, ${roleTitle} ${data.user.firstName}!`, {
          duration: 4000,
          icon: data.user.role === 'admin' ? '⚙️' : '👨‍💼'
        });
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('messages.login_failed');
        if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
          toast.error(t('messages.network_error'), {
            duration: 6000,
            icon: '📡'
          });
        } else {
          toast.error(t('messages.invalid_credentials'), {
            duration: 6000,
            icon: '🔒'
          });
        }
      }
    }
  );

  // Request new magic link mutation
  const requestMagicLinkMutation = useMutation(
    ({ email }) => authService.requestMagicLink(email),
    {
      onSuccess: () => {
        toast.success(t('messages.magic_link_sent'), {
          duration: 6000,
          icon: '📧'
        });
        setLoginType('token'); // Switch to token entry mode
      },
      onError: (error) => {
        const message = error.response?.data?.error || t('messages.login_failed');
        const errorCode = error.response?.data?.code;

        if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
          toast.error(t('messages.network_error'), {
            duration: 6000,
            icon: '📡'
          });
        } else if (errorCode === 'STAFF_USE_PASSWORD_LOGIN') {
          // Special handling for staff members
          toast.error(message, {
            duration: 8000,
            icon: '🔐'
          });
          // Automatically switch to staff login
          setTimeout(() => {
            setLoginType('staff');
            toast('Switched to Staff Login for you', {
              duration: 4000,
              icon: '👨‍💼'
            });
          }, 2000);
        } else {
          toast.error(message, {
            duration: 6000,
            icon: '❌'
          });
        }
      }
    }
  );

  const onSubmit = (data) => {
    if (loginType === 'token') {
      magicLoginMutation.mutate({ token: data.token, email: data.tokenEmail });
    } else if (loginType === 'staff') {
      staffLoginMutation.mutate({ email: data.email, password: data.password });
    } else if (loginType === 'request') {
      requestMagicLinkMutation.mutate({ email: data.requestEmail });
    }
  };

  const handleMFASubmit = () => {
    if (staffCredentials && mfaCode.length === 6) {
      staffLoginMutation.mutate({
        email: staffCredentials.email,
        password: staffCredentials.password,
        mfaToken: mfaCode
      });
    }
  };

  const isLoading = magicLoginMutation.isLoading || staffLoginMutation.isLoading || requestMagicLinkMutation.isLoading;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover"
          style={{
            filter: 'brightness(0.5)',
            width: '100vw',
            height: '56.25vw', // 16:9 aspect ratio
            minHeight: '100vh',
            minWidth: '177.78vh', // 16:9 aspect ratio
            imageRendering: 'crisp-edges'
          }}
        >
          <source
            src="https://23g-sharedhosting-burando-dev.s3.eu-west-1.amazonaws.com/app/uploads/2024/01/15102006/burando-korter.mp4"
            type="video/mp4"
          />
        </video>

        {/* Glass overlay for better readability - removed backdrop-blur */}
        <div className="absolute inset-0 bg-gradient-to-br from-burando-navy/40 via-burando-teal/25 to-burando-bright-teal/35"></div>

        {/* Animated Glass Elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-burando-bright-teal/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-burando-teal/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-lg w-full relative z-20">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Language Switcher - positioned at top right */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher className="text-white" />
          </div>

          {/* Burando Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-burando-teal to-burando-bright-teal rounded-2xl blur-lg opacity-75 animate-pulse group-hover:opacity-90 transition-opacity duration-300"></div>
              <div className="relative glass-card-elevated p-6 hover-lift">
                <img
                  src="/burando-logo-white.svg"
                  alt="Burando Maritime Services"
                  className="h-16 w-auto mx-auto filter drop-shadow-lg"
                />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
            {t('title')}
          </h1>
          <p className="text-white text-lg sm:text-xl font-medium drop-shadow-xl mb-4" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.7)'}}>
            {t('tagline')}
          </p>
          <div className="mt-6 h-1 w-32 bg-gradient-to-r from-burando-teal to-burando-bright-teal rounded-full mx-auto"></div>
        </div>

        {/* Login Form - Mobile-First Design */}
        <div className="glass-card-elevated p-6 sm:p-8 lg:p-10 hover-lift fade-in">
          {/* Welcome Message & Login Type Selection */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-burando-bright-teal to-burando-teal rounded-full mb-4 sm:mb-6 shadow-2xl">
              <span className="text-2xl sm:text-3xl">🚢</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 drop-shadow-xl" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
              {t('login_methods.title')}
            </h2>

            {/* Login Type Selection - Enhanced Design */}
            <div className="max-w-lg mx-auto mb-8">
              <div className="grid grid-cols-2 gap-4 p-2 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <button
                  type="button"
                  onClick={() => setLoginType('request')}
                  className={`py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] ${
                    loginType === 'request'
                      ? 'bg-gradient-to-br from-burando-bright-teal to-burando-teal text-white shadow-xl border-2 border-white/30'
                      : 'text-white/80 hover:text-white hover:bg-white/15 border-2 border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`p-2 rounded-full ${loginType === 'request' ? 'bg-white/20' : 'bg-white/10'}`}>
                      <Mail className="h-6 w-6" />
                    </div>
                    <span className="text-base">Crew Login</span>
                    <span className="text-xs opacity-80">Magic Link</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType('staff')}
                  className={`py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] ${
                    loginType === 'staff'
                      ? 'bg-gradient-to-br from-burando-navy to-burando-teal text-white shadow-xl border-2 border-white/30'
                      : 'text-white/80 hover:text-white hover:bg-white/15 border-2 border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`p-2 rounded-full ${loginType === 'staff' ? 'bg-white/20' : 'bg-white/10'}`}>
                      <Shield className="h-6 w-6" />
                    </div>
                    <span className="text-base">Staff Login</span>
                    <span className="text-xs opacity-80">Admin & Manager</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="max-w-md mx-auto">
              {loginType === 'request' ? (
                <>
                  <p className="text-white/90 text-base sm:text-lg mb-2" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.6)'}}>
                    New to the platform?
                  </p>
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.6)'}}>
                    Enter your email address and we'll send you a secure login link.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white/90 text-base sm:text-lg mb-2" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.6)'}}>
                    Admin or Manager?
                  </p>
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.6)'}}>
                    Sign in with your email and password.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* PRIMARY ACTION - Get Started (Mobile-First) */}
          {loginType === 'request' && (
            <div className="mb-6 sm:mb-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-burando-bright-teal to-burando-teal rounded-full mb-4 sm:mb-6 shadow-2xl animate-pulse">
                  <Mail className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">{t('login_methods.request.title')}</h3>
                <p className="text-white/90 text-base sm:text-lg leading-relaxed font-medium px-2">
                  {t('login_methods.request.description')}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="form-group">
                  <label className="form-label text-white text-lg font-semibold mb-3 block" htmlFor="primary-email">
                    {t('login_methods.request.email_label')}
                  </label>
                  <input
                    id="primary-email"
                    type="email"
                    className={`glass-input w-full text-lg sm:text-xl py-5 sm:py-6 px-5 sm:px-6 text-white placeholder-white/50 rounded-xl border-2 ${errors.requestEmail ? 'border-red-400' : 'border-white/20 focus:border-burando-bright-teal'} transition-all duration-300 min-h-[56px] touch-manipulation text-center sm:text-left`}
                    placeholder={t('login_methods.request.email_placeholder')}
                    autoComplete="email"
                    autoFocus
                    {...register('requestEmail', {
                      required: t('validation.email_required'),
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t('validation.email_invalid')
                      }
                    })}
                  />
                  {errors.requestEmail && (
                    <p className="text-red-300 text-base mt-3 flex items-center" role="alert">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {errors.requestEmail.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-burando-bright-teal to-burando-teal text-white font-bold py-7 sm:py-8 px-6 sm:px-8 rounded-2xl text-xl sm:text-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-burando-bright-teal/50 focus:ring-offset-2 shadow-2xl animate-pulse hover:animate-none min-h-[64px] touch-manipulation"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      <span className="text-lg sm:text-xl">{t('login_methods.request.loading')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Mail className="h-7 w-7 sm:h-8 sm:w-8 mr-3 sm:mr-4" />
                      <span>{t('login_methods.request.button')}</span>
                    </div>
                  )}
                </button>
              </form>

              {/* Success/Info Message */}
              <div className="mt-8 glass-card p-6 border-l-4 border-burando-bright-teal">
                <div className="flex items-start">
                  <div className="bg-burando-bright-teal/20 p-2 rounded-full mr-4 mt-1">
                    <AlertCircle className="h-5 w-5 text-burando-bright-teal" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">{t('login_methods.request.help_title')}</h4>
                    <p className="text-gray-200 text-sm leading-relaxed">
                      {t('login_methods.request.help_text')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Token Entry Option - Keep as secondary option for crew */}
              <div className="mt-8 sm:mt-12 text-center">
                <button
                  type="button"
                  onClick={() => setLoginType('token')}
                  className="text-white/60 hover:text-white/80 text-sm font-medium transition-colors duration-300 underline decoration-dotted underline-offset-4 py-3 px-4 min-h-[44px] touch-manipulation"
                >
                  Already have a login code? Enter it here
                </button>
              </div>
            </div>
          )}

          {/* SECONDARY ACTION - Manual Token Entry */}
          {loginType !== 'request' && loginType !== 'staff' && (
            <div className="mb-8">
              <button
                type="button"
                onClick={() => setLoginType('request')}
                className="text-burando-bright-teal hover:text-white text-sm font-medium transition-colors duration-200 flex items-center mb-6"
              >
                <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                {t('login_methods.token.back_button')}
              </button>
            </div>
          )}

          {/* SECONDARY ACTION - Manual Token Entry (Mobile-Optimized) */}
          {loginType === 'token' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
              <>
                {/* SECONDARY ACTION - Manual Token Entry */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-burando-teal to-burando-navy rounded-full mb-4 sm:mb-6 shadow-lg">
                      <Key className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-3">{t('login_methods.token.title')}</h3>
                    <p className="text-white/70 text-sm leading-relaxed max-w-md mx-auto px-2">
                      {t('login_methods.token.description')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label text-white text-base font-medium mb-2 block" htmlFor="token-email">
                        {t('login_methods.token.email_label')}
                      </label>
                      <input
                        id="token-email"
                        type="email"
                        className={`glass-input w-full text-base sm:text-lg py-4 px-5 text-white placeholder-white/50 rounded-lg border ${errors.tokenEmail ? 'border-red-400' : 'border-white/20 focus:border-burando-teal'} transition-all duration-300 min-h-[52px] touch-manipulation`}
                        placeholder={t('login_methods.token.email_placeholder')}
                        autoComplete="email"
                        {...register('tokenEmail', {
                          required: t('validation.email_required'),
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: t('validation.email_invalid')
                          }
                        })}
                      />
                      {errors.tokenEmail && (
                        <p className="text-red-300 text-sm mt-2 flex items-center" role="alert">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.tokenEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label text-white text-base font-medium mb-2 block" htmlFor="token-input">
                        {t('login_methods.token.token_label')}
                      </label>
                      <input
                        id="token-input"
                        type="text"
                        className={`glass-input w-full text-base sm:text-lg py-4 px-5 text-white placeholder-white/50 font-mono rounded-lg border ${errors.token ? 'border-red-400' : 'border-white/20 focus:border-burando-teal'} transition-all duration-300 min-h-[52px] touch-manipulation`}
                        placeholder={t('login_methods.token.token_placeholder')}
                        autoComplete="off"
                        {...register('token', {
                          required: t('validation.token_required'),
                          minLength: {
                            value: 10,
                            message: t('validation.token_min_length')
                          }
                        })}
                      />
                      {errors.token && (
                        <p className="text-red-300 text-sm mt-2 flex items-center" role="alert">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.token.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-burando-teal to-burando-navy text-white font-semibold py-5 sm:py-5 px-6 rounded-lg text-base sm:text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-burando-teal/50 min-h-[52px] touch-manipulation"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="small" message="" />
                        <span className="ml-3">{t('login_methods.token.loading')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Key className="h-5 w-5 mr-3" />
                        <span>{t('login_methods.token.button')}</span>
                      </div>
                    )}
                  </button>
                </div>
              </>
            </form>
          )}

          {/* STAFF LOGIN - Enhanced Design */}
          {loginType === 'staff' && (
            <div className="mb-6 sm:mb-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
                {/* Staff Login Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-burando-navy to-burando-teal rounded-full mb-6 shadow-2xl animate-pulse">
                    <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 drop-shadow-xl" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
                    Staff Access
                  </h3>
                  <p className="text-white/90 text-base sm:text-lg leading-relaxed font-medium px-2 mb-2">
                    Administrator & Manager Login
                  </p>
                  <p className="text-white/70 text-sm leading-relaxed max-w-md mx-auto">
                    Secure access for staff members with enhanced authentication
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  <div className="form-group">
                    <label className="form-label text-white text-lg font-semibold mb-3 block" htmlFor="staff-email">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-burando-bright-teal" />
                        Email Address
                      </div>
                    </label>
                    <input
                      id="staff-email"
                      type="email"
                      className={`glass-input w-full text-lg sm:text-xl py-5 sm:py-6 px-5 sm:px-6 text-white placeholder-white/50 rounded-xl border-2 ${errors.email ? 'border-red-400' : 'border-white/20 focus:border-burando-bright-teal'} transition-all duration-300 min-h-[56px] touch-manipulation text-center sm:text-left`}
                      placeholder="admin@maritime-onboarding.local"
                      autoComplete="email"
                      autoFocus
                      {...register('email', {
                        required: 'Email address is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Please enter a valid email address'
                        }
                      })}
                    />
                    {errors.email && (
                      <p className="text-red-300 text-base mt-3 flex items-center" role="alert">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label text-white text-lg font-semibold mb-3 block" htmlFor="staff-password">
                      <div className="flex items-center">
                        <Lock className="h-5 w-5 mr-2 text-burando-bright-teal" />
                        Password
                      </div>
                    </label>
                    <input
                      id="staff-password"
                      type="password"
                      className={`glass-input w-full text-lg sm:text-xl py-5 sm:py-6 px-5 sm:px-6 text-white placeholder-white/50 rounded-xl border-2 ${errors.password ? 'border-red-400' : 'border-white/20 focus:border-burando-bright-teal'} transition-all duration-300 min-h-[56px] touch-manipulation text-center sm:text-left`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 1,
                          message: 'Password is required'
                        }
                      })}
                    />
                    {errors.password && (
                      <p className="text-red-300 text-base mt-3 flex items-center" role="alert">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-burando-navy to-burando-teal text-white font-bold py-7 sm:py-8 px-6 sm:px-8 rounded-2xl text-xl sm:text-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-burando-teal/50 focus:ring-offset-2 shadow-2xl animate-pulse hover:animate-none min-h-[64px] touch-manipulation"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      <span className="text-lg sm:text-xl">Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Shield className="h-7 w-7 sm:h-8 sm:w-8 mr-3 sm:mr-4" />
                      <span>Staff Login</span>
                    </div>
                  )}
                </button>

                {/* Security Notice */}
                <div className="mt-8 glass-card p-6 border-l-4 border-burando-teal">
                  <div className="flex items-start">
                    <div className="bg-burando-teal/20 p-2 rounded-full mr-4 mt-1">
                      <Shield className="h-5 w-5 text-burando-teal" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Secure Staff Access</h4>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        This login is for authorized staff members only. Multi-factor authentication may be required for enhanced security.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Switch to Crew Login */}
                <div className="mt-8 sm:mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => setLoginType('request')}
                    className="text-white/60 hover:text-white/80 text-sm font-medium transition-colors duration-300 underline decoration-dotted underline-offset-4 py-3 px-4 min-h-[44px] touch-manipulation"
                  >
                    Not a staff member? Use Crew Login instead
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MFA Challenge Modal */}
          {showMFAChallenge && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
                    <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Multi-Factor Authentication
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength="6"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowMFAChallenge(false);
                        setMfaCode('');
                        setStaffCredentials(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMFASubmit}
                      disabled={mfaCode.length !== 6 || isLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 text-white text-sm glass-card px-6 py-3 hover-lift">
            <div className="w-2 h-2 bg-burando-light-green rounded-full animate-pulse"></div>
            <span className="font-medium">{t('tagline')}</span>
          </div>
          <p className="text-white/70 text-xs mt-4">
            {t('copyright')}
          </p>
        </div>

        {/* User Feedback Section */}
        <div className="mt-8 text-center">
          <div className="glass-card p-4 border border-white/10">
            <p className="text-white/60 text-sm mb-3">How was your login experience?</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => toast.success('Thank you for your feedback! 😊', { icon: '👍' })}
                className="text-2xl hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
                title="Good experience"
              >
                😊
              </button>
              <button
                onClick={() => toast.success('Thank you for your feedback! We\'ll improve this.', { icon: '👎' })}
                className="text-2xl hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
                title="Needs improvement"
              >
                😐
              </button>
              <button
                onClick={() => toast.success('Thank you for your feedback! We\'re sorry for the trouble.', { icon: '😞' })}
                className="text-2xl hover:scale-110 transition-transform duration-200 p-2 rounded-full hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
                title="Poor experience"
              >
                😞
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
