import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MobileWarning = ({
  pageName = 'editor',
  requiresDesktop = true,
  minWidth = 768,
  showOnce = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslation('common');

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileDevice = window.innerWidth < minWidth;
      setIsMobile(isMobileDevice);

      // Check if warning was already dismissed for this page
      const dismissedKey = `mobile-warning-dismissed-${pageName}`;
      const wasDismissed = showOnce && localStorage.getItem(dismissedKey);

      setIsVisible(isMobileDevice && !wasDismissed);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [minWidth, pageName, showOnce]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (showOnce) {
      localStorage.setItem(`mobile-warning-dismissed-${pageName}`, 'true');
    }
  };

  const handleProceedAnyway = () => {
    setIsVisible(false);
    // Don't save to localStorage so it shows again next time
  };

  if (!isVisible || !isMobile) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
        {/* Warning Modal */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white">
                <AlertTriangle className="h-6 w-6 mr-3" />
                <h3 className="text-lg font-bold">
                  {t('mobile_warning.title', { default: 'Mobile Device Detected' })}
                </h3>
              </div>
              <button
                onClick={handleDismiss}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Icon Display */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="text-gray-400">
                <Smartphone className="h-12 w-12" />
                <p className="text-xs text-center mt-2">Mobile</p>
              </div>
              <div className="text-red-500">
                <X className="h-8 w-8 mx-auto" />
              </div>
              <div className="text-green-500">
                <Monitor className="h-12 w-12" />
                <p className="text-xs text-center mt-2">Desktop</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="text-center mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                {t('mobile_warning.subtitle', {
                  default: 'This page works best on desktop',
                  pageName
                })}
              </h4>
              <p className="text-gray-600 leading-relaxed">
                {requiresDesktop
                  ? t('mobile_warning.desktop_required', {
                      default: 'This editor requires a desktop computer with a larger screen for the best experience. Some features may not work properly on mobile devices.',
                      pageName
                    })
                  : t('mobile_warning.desktop_recommended', {
                      default: 'While this page works on mobile, we recommend using a desktop computer for the best experience.',
                      pageName
                    })
                }
              </p>
            </div>

            {/* Feature Limitations */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h5 className="font-medium text-gray-900 mb-2">
                {t('mobile_warning.limitations_title', { default: 'Mobile Limitations:' })}
              </h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('mobile_warning.limitation_1', { default: 'Limited drag & drop functionality' })}</li>
                <li>• {t('mobile_warning.limitation_2', { default: 'Smaller workspace area' })}</li>
                <li>• {t('mobile_warning.limitation_3', { default: 'Touch navigation challenges' })}</li>
                {requiresDesktop && (
                  <li>• {t('mobile_warning.limitation_4', { default: 'Some features may not work' })}</li>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!requiresDesktop && (
                <button
                  onClick={handleProceedAnyway}
                  className="flex-1 bg-amber-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                  {t('mobile_warning.proceed', { default: 'Continue Anyway' })}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                {t('mobile_warning.dismiss', { default: 'I Understand' })}
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center mt-4">
              {t('mobile_warning.help_text', {
                default: 'For the best experience, please use a computer with a screen width of at least 768px.'
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileWarning;
