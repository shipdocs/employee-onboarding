import React from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import PhaseCard from './PhaseCard';

const TrainingPhases = ({ progress, quizHistory }) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="burando-card">
      <div className="burando-card-header">
        <h2 className="burando-heading-2 text-burando-navy">{t('crew.training_phases.title')}</h2>
        <p className="burando-text-muted">{t('crew.training_phases.subtitle')}</p>
      </div>
      <div className="burando-card-body">
        <div className="space-y-4">
          {(progress?.phases || []).map((phase) => (
            <PhaseCard
              key={phase.phase_number}
              phase={phase}
              progress={progress}
              quizHistory={quizHistory}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

TrainingPhases.propTypes = {
  progress: PropTypes.shape({
    phases: PropTypes.arrayOf(PropTypes.shape({
      phase_number: PropTypes.number,
      status: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
      progressPercentage: PropTypes.number
    }))
  }),
  quizHistory: PropTypes.array
};

export default TrainingPhases;
