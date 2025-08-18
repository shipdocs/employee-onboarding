import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enTraining from './locales/en/training.json';
import enQuiz from './locales/en/quiz.json';
import enAdmin from './locales/en/admin.json';
import enManager from './locales/en/manager.json';
import enCrew from './locales/en/crew.json';
import enForms from './locales/en/forms.json';
import enFlows from './locales/en/flows.json';
import enApi from './locales/en/api.json';
import enErrors from './locales/en/errors.json';
import enFeedback from './locales/en/feedback.json';
import enGdpr from './locales/en/gdpr.json';

import nlCommon from './locales/nl/common.json';
import nlAuth from './locales/nl/auth.json';
import nlDashboard from './locales/nl/dashboard.json';
import nlTraining from './locales/nl/training.json';
import nlQuiz from './locales/nl/quiz.json';
import nlAdmin from './locales/nl/admin.json';
import nlManager from './locales/nl/manager.json';
import nlCrew from './locales/nl/crew.json';
import nlForms from './locales/nl/forms.json';
import nlFlows from './locales/nl/flows.json';
import nlApi from './locales/nl/api.json';
import nlErrors from './locales/nl/errors.json';
import nlFeedback from './locales/nl/feedback.json';
import nlGdpr from './locales/nl/gdpr.json';

// Translation resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    training: enTraining,
    quiz: enQuiz,
    admin: enAdmin,
    manager: enManager,
    crew: enCrew,
    forms: enForms,
    flows: enFlows,
    api: enApi,
    errors: enErrors,
    feedback: enFeedback,
    gdpr: enGdpr
  },
  nl: {
    common: nlCommon,
    auth: nlAuth,
    dashboard: nlDashboard,
    training: nlTraining,
    quiz: nlQuiz,
    admin: nlAdmin,
    manager: nlManager,
    crew: nlCrew,
    forms: nlForms,
    flows: nlFlows,
    api: nlApi,
    errors: nlErrors,
    feedback: nlFeedback,
    gdpr: nlGdpr
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,

    // Default language
    fallbackLng: 'en',

    // Default namespace
    defaultNS: 'common',

    // Namespace separator
    nsSeparator: ':',

    // Key separator
    keySeparator: '.',

    // Language detection options
    detection: {
      // Order of language detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],

      // Cache user language
      caches: ['localStorage'],

      // localStorage key
      lookupLocalStorage: 'i18nextLng',

      // Only detect languages that we support
      checkWhitelist: true
    },

    // Supported languages
    supportedLngs: ['en', 'nl'],

    // Don't load a fallback
    nonExplicitSupportedLngs: false,

    // Interpolation options
    interpolation: {
      escapeValue: false // React already does escaping
    },

    // React options
    react: {
      // Wait for translation to be loaded before rendering
      useSuspense: false
    },

    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development'
  });

export default i18n;
