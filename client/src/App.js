import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import authService from './services/authService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { migrateTokenStorage, getAuthToken } from './utils/tokenMigration';
import tokenService from './services/tokenService';
import './i18n'; // Initialize i18n
import './styles/burando-theme.css';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import CrewDashboard from './pages/CrewDashboard';
import TrainingPage from './pages/TrainingPage';
import QuizPage from './pages/QuizPage';
import ProfilePage from './pages/ProfilePage';
import PDFTemplateEditorPage from './pages/PDFTemplateEditorPage';
import TestPDFEditor from './pages/TestPDFEditor';

import ContentManagementPage from './pages/ContentManagementPage';
import GDPRPortalPage from './pages/GDPRPortalPage';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import { EnhancedErrorBoundary } from './components/common/EnhancedErrorBoundary';
import NetworkStatus from './components/NetworkStatus';
import SessionExpirationWarning from './components/SessionExpirationWarning';
import DevModeBar from './components/DevModeBar';
import HelpWidget from './components/help/HelpWidget';
import serviceWorkerService from './services/serviceWorkerService';
// import TranslationTest from './components/TranslationTest'; // Removed for production
// import AITranslationTest from './components/AITranslationTest'; // Removed for production
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import usePerformanceMonitoring from './hooks/usePerformanceMonitoring';

// Helper function to check if we're in local development
const isLocalDevelopment = () => {
  return process.env.NODE_ENV === 'development' &&
         (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.includes('local'));
};

// PRODUCTION SAFETY: Test components and routes are disabled in production builds
// To enable in development: Set NODE_ENV=development

function AppContent() {
  const { user, login, isLoading } = useAuth();
  const { needsOnboarding } = useOnboarding();

  // Initialize performance monitoring
  usePerformanceMonitoring();

  // Run token migration on app startup
  React.useEffect(() => {
    migrateTokenStorage();
  }, []);

  // Initialize service worker for offline functionality
  React.useEffect(() => {
    serviceWorkerService.init().then(success => {
      if (success) {
        // console.log('🌊 Maritime offline mode ready');
        // Preload critical content when user is authenticated
        if (user) {
          serviceWorkerService.preloadCriticalContent();
        }
      }
    });
  }, [user]);

  // Verify token on app load
  const { isLoading: isVerifying } = useQuery(
    'verify-token',
    authService.verifyToken,
    {
      enabled: !user && !!getAuthToken(),
      onSuccess: (data) => {
        const token = getAuthToken();
        if (token) {
          login(data.user, token);
        }
      },
      onError: () => {
        // Clear token from all storage locations
        localStorage.removeItem('token');
        tokenService.clearToken();
      },
      retry: false
    }
  );

  if (isLoading || isVerifying) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {/* Network status indicator */}
      <NetworkStatus />

      {/* Session expiration warning - only show when authenticated */}
      {user && <SessionExpirationWarning />}

      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={
                user.role === 'admin' ? '/admin' :
                user.role === 'manager' ? '/manager' : '/crew'
              } replace />
            ) : (
              <LoginPage />
            )
          }
        />

      {/* Protected routes */}
      {user ? (
        <>
          {/* Show onboarding flow for first-time crew members */}
          {needsOnboarding && user.role === 'crew' ? (
            <Route path="*" element={<OnboardingFlow />} />
          ) : (
            <Route path="/" element={<Layout />}>
              {/* Admin routes */}
              {user.role === 'admin' && (
                <>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/templates/new" element={<PDFTemplateEditorPage />} />
                  <Route path="/templates/edit/:templateId" element={<PDFTemplateEditorPage />} />
                  {process.env.NODE_ENV === 'development' && <Route path="/test-pdf-editor" element={<TestPDFEditor />} />}
                  <Route path="/content" element={<ContentManagementPage />} />

                </>
              )}

              {/* Manager routes */}
              {user.role === 'manager' && (
                <>
                  <Route path="/manager" element={<ManagerDashboard />} />
                  {/* Content management for managers with permission */}
                  {user.permissions?.includes('content_edit') && (
                    <>
                      <Route path="/content" element={<ContentManagementPage />} />

                    </>
                  )}
                </>
              )}

              {/* Crew routes */}
              {user.role === 'crew' && (
                <>
                  <Route path="/crew" element={<CrewDashboard />} />
                  <Route path="/crew/training/:phase" element={<TrainingPage />} />
                  <Route path="/crew/quiz/:phase" element={<QuizPage />} />
                  <Route path="/crew/profile" element={<ProfilePage />} />
                </>
              )}

              {/* Common routes */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/gdpr" element={<GDPRPortalPage />} />

              {/* Test routes for development */}
              {/* TranslationTest and AITranslationTest components removed during cleanup */}

              {/* Default redirects */}
              <Route
                path="/"
                element={
                  <Navigate
                    to={
                      user.role === 'admin' ? '/admin' :
                      user.role === 'manager' ? '/manager' : '/crew'
                    }
                    replace
                  />
                }
              />
            </Route>
          )}
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isLocalDevelopment() && <DevModeBar />}
      <EnhancedErrorBoundary context="help-widget">
        <HelpWidget />
      </EnhancedErrorBoundary>
    </>
  );
}

function App() {
  return (
    <EnhancedErrorBoundary context="application">
      <ThemeProvider>
        <AuthProvider>
          <OnboardingProvider>
            <LanguageProvider>
              <AppContent />
            </LanguageProvider>
          </OnboardingProvider>
        </AuthProvider>
      </ThemeProvider>
    </EnhancedErrorBoundary>
  );
}

export default App;
