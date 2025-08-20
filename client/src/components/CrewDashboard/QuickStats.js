import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Trophy, Clock } from 'lucide-react';
import PropTypes from 'prop-types';
import { getQuizStatus } from '../../utils/dashboardHelpers';

const QuickStats = ({ stats, progress, profile, quizHistory }) => {
  const navigate = useNavigate();

  const handleCurrentTrainingClick = () => {
    // Navigate to current training phase
    const phases = progress?.phases || [];
    const currentPhase = phases.find(p => p.status === 'in_progress') || phases.find(p => p.status === 'not_started');
    if (currentPhase) {
      navigate(`/crew/training/${currentPhase.phase_number}`);
    }
  };

  const handleQuizResultsClick = () => {
    // Navigate to quiz history or current quiz
    const phases = progress?.phases || [];
    const currentPhase = phases.find(p => p.status === 'completed' && !getQuizStatus(p.phase_number, quizHistory));
    if (currentPhase) {
      navigate(`/crew/quiz/${currentPhase.phase_number}`);
    } else {
      // Show quiz history or navigate to profile
      navigate('/crew/profile');
    }
  };

  const getCurrentTrainingText = () => {
    // Check if user has completed everything
    if (stats?.isCompleted || stats?.completedPhases === 3) {
      return 'Completed';
    }

    const phases = progress?.phases || [];
    const currentPhase = phases.find(p => p.status === 'in_progress') || phases.find(p => p.status === 'not_started');
    return `Phase ${currentPhase?.phase_number || 1}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <div
        className="maritime-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={handleCurrentTrainingClick}
      >
        <div className="maritime-card-body">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-maritime-teal" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Training</p>
              <p className="text-2xl font-bold text-maritime-navy">
                {getCurrentTrainingText()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="maritime-card">
        <div className="maritime-card-body">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-maritime-light-green" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Items Completed</p>
              <p className="text-2xl font-bold text-maritime-navy">
                {stats?.completedItems || 0}/{stats?.totalItems || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="maritime-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={handleQuizResultsClick}
      >
        <div className="maritime-card-body">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-maritime-bright-teal" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Quiz Results</p>
              <p className="text-2xl font-bold text-maritime-navy">
                {stats?.quizStats?.completed || 0}/3
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="maritime-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={() => navigate('/crew/profile')}
      >
        <div className="maritime-card-body">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-maritime-teal-light" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Profile</p>
              <p className="text-lg font-bold text-maritime-navy capitalize">
                {profile?.status || 'Active'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

QuickStats.propTypes = {
  stats: PropTypes.shape({
    isCompleted: PropTypes.bool,
    completedPhases: PropTypes.number,
    completedItems: PropTypes.number,
    totalItems: PropTypes.number,
    quizStats: PropTypes.shape({
      completed: PropTypes.number
    })
  }),
  progress: PropTypes.shape({
    phases: PropTypes.array
  }),
  profile: PropTypes.shape({
    status: PropTypes.string
  }),
  quizHistory: PropTypes.array
};

export default QuickStats;
