import React from 'react';
import { Trophy } from 'lucide-react';
import PropTypes from 'prop-types';

const CompletionMessage = ({ completedPhases }) => {
  if (completedPhases !== 3) {
    return null;
  }

  return (
    <div className="maritime-card">
      <div className="maritime-card-body">
        <div className="bg-gradient-to-r from-maritime-light-green/20 to-maritime-bright-teal/20 border border-maritime-light-green/30 rounded-lg p-6 text-center">
          <Trophy className="h-12 w-12 text-maritime-light-green mx-auto mb-4" />
          <h3 className="maritime-heading-2 text-maritime-navy mb-2">
            Congratulations! 🎉
          </h3>
          <p className="text-maritime-teal">
            You have successfully completed all phases of the onboarding training program.
            Your completion certificate has been generated and sent to HR.
          </p>
        </div>
      </div>
    </div>
  );
};

CompletionMessage.propTypes = {
  completedPhases: PropTypes.number
};

CompletionMessage.defaultProps = {
  completedPhases: 0
};

export default CompletionMessage;
