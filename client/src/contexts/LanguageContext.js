import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Available languages
  const languages = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'nl', name: 'Nederlands', flag: 'NL' }
  ];

  // Change language function
  const changeLanguage = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);

      // Store preference in localStorage
      localStorage.setItem('i18nextLng', languageCode);

      // Update user preference in backend if user is logged in
      if (user && user.role === 'crew') {
        try {
          // Use the profile update endpoint
          const response = await fetch('/api/crew/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ preferredLanguage: languageCode })
          });

          if (!response.ok) {
            throw new Error('Failed to update language preference');
          }
        } catch (error) {
          // console.error('Error updating language preference:', error);
          // Don't show error toast as the language change still worked locally
        }
      }
    } catch (error) {
      // console.error('Error changing language:', error);
      toast.error('Error changing language');
    }
  };

  // Initialize language from user preference or browser detection
  useEffect(() => {
    const initializeLanguage = async () => {
      let preferredLanguage = 'en'; // default

      // 1. Check if user has a saved preference
      if (user && user.preferredLanguage) {
        preferredLanguage = user.preferredLanguage;
      } else {
        // 2. Check localStorage
        const savedLanguage = localStorage.getItem('i18nextLng');
        if (savedLanguage && languages.some(lang => lang.code === savedLanguage)) {
          preferredLanguage = savedLanguage;
        } else {
          // 3. Detect from browser
          const browserLanguage = navigator.language.split('-')[0];
          if (languages.some(lang => lang.code === browserLanguage)) {
            preferredLanguage = browserLanguage;
          }
        }
      }

      if (preferredLanguage !== currentLanguage) {
        await changeLanguage(preferredLanguage);
      }
    };

    initializeLanguage();
  }, [user]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const value = {
    currentLanguage,
    languages,
    changeLanguage,
    isRTL: false // Neither English nor Dutch are RTL languages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
