import React from 'react';
import { Ship, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const WelcomeHeader = ({ user, profile, stats }) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="bg-gradient-to-r from-maritime-navy to-maritime-teal rounded-lg text-white p-4 sm:p-6 shadow-maritime-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            {t('crew.welcome', { name: user?.firstName })}
          </h1>
          <p className="text-maritime-light-green mb-4">
            {t('crew.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
            <div className="flex items-center">
              <Ship className="h-4 w-4 mr-2" />
              {t('crew.vessel')}: {profile?.vesselAssignment}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {t('crew.position')}: {profile?.position}
            </div>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <div className="text-3xl font-bold">
            {stats?.overallProgress || 0}%
          </div>
          <div className="text-maritime-light-green">{t('crew.overall_progress')}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="maritime-progress">
          <div
            className="maritime-progress-bar"
            style={{ width: `${stats?.overallProgress || 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

WelcomeHeader.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string
  }),
  profile: PropTypes.shape({
    vesselAssignment: PropTypes.string,
    position: PropTypes.string
  }),
  stats: PropTypes.shape({
    overallProgress: PropTypes.number
  })
};

export default WelcomeHeader;
