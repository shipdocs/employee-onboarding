import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher = ({ className = '' }) => {
  const { currentLanguage, languages, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = async (languageCode) => {
    await changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          className.includes('text-white')
            ? 'text-white hover:text-blue-100 hover:bg-white hover:bg-opacity-20'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLang.flag}</span>
        <span className="hidden md:inline">{currentLang.name}</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3 ${
                currentLanguage === language.code
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700'
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span>{language.name}</span>
              {currentLanguage === language.code && (
                <svg className="h-4 w-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
