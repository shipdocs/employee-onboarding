import React from 'react';
import { Ship } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LoadingSpinner = ({ size = 'default', message }) => {
  const { t } = useTranslation('common');
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const containerClasses = {
    small: 'p-2',
    default: 'p-8',
    large: 'p-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
      <div className="relative">
        <Ship className={`${sizeClasses[size]} text-blue-600 animate-pulse`} />
        <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`}></div>
      </div>
      {(message || !message) && (
        <p className="mt-4 text-sm text-gray-600 animate-pulse">
          {message || t('loading.default')}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
