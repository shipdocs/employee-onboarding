import React from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const NextSteps = ({ completedPhases }) => {
  const { t } = useTranslation('dashboard');

  if (completedPhases >= 3) {
    return null;
  }

  const getNextStepMessage = () => {
    if (completedPhases === 0) {
      return t('crew.next_steps.phase1_next');
    } else if (completedPhases === 1) {
      return t('crew.next_steps.phase2_next');
    } else {
      return t('crew.next_steps.phase3_next');
    }
  };

  return (
    <div className="maritime-card">
      <div className="maritime-card-header">
        <h2 className="maritime-heading-2 text-maritime-navy">Next Steps</h2>
      </div>
      <div className="maritime-card-body">
        <div className="bg-gradient-to-r from-maritime-bright-teal/10 to-maritime-light-green/10 border border-maritime-bright-teal/20 rounded-lg p-4">
          <div className="flex items-start">
            <BookOpen className="h-5 w-5 text-maritime-teal mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-maritime-navy mb-1">
                {t('crew.next_steps.continue_training')}
              </h3>
              <p className="text-maritime-teal text-sm">
                {getNextStepMessage()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

NextSteps.propTypes = {
  completedPhases: PropTypes.number
};

NextSteps.defaultProps = {
  completedPhases: 0
};

export default NextSteps;
