// Crew repository for crew member operations
const BaseRepository = require('./baseRepository');

class CrewRepository extends BaseRepository {
  constructor() {
    super('crew_members');
  }

  // Get crew member with training progress
  async getWithProgress(crewId) {
    const crew = await this.findById(crewId);
    if (!crew) return null;

    // Get training progress
    const { data: progress, error } = await this.supabase
      .from('training_progress')
      .select('*')
      .eq('crew_member_id', crewId)
      .order('phase_number', { ascending: true });

    if (error) {
      console.error('Error fetching progress:', error);
    }

    return {
      ...crew,
      training_progress: progress || []
    };
  }

  // Get crew members by manager
  async getByManagerId(managerId, options = {}) {
    return this.findAll({ manager_id: managerId }, {
      ...options,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending !== undefined ? options.ascending : false
    });
  }

  // Get crew members with completion status
  async getWithCompletionStatus(filters = {}) {
    const crews = await this.findAll(filters);

    // Get completion status for all crew members
    const crewIds = crews.map(c => c.id);
    const { data: completions, error } = await this.supabase
      .from('training_progress')
      .select('crew_member_id, phase_number, completed_at')
      .in('crew_member_id', crewIds);

    if (error) {
      console.error('Error fetching completions:', error);
    }

    // Calculate completion percentage for each crew member
    return crews.map(crew => {
      const crewProgress = completions?.filter(c => c.crew_member_id === crew.id) || [];
      const totalPhases = 3; // Assuming 3 phases
      const completedPhases = crewProgress.filter(p => p.completed_at).length;

      return {
        ...crew,
        completion_percentage: Math.round((completedPhases / totalPhases) * 100),
        completed_phases: completedPhases,
        total_phases: totalPhases
      };
    });
  }

  // Update onboarding status
  async updateOnboardingStatus(crewId, status) {
    return this.update(crewId, {
      onboarding_status: status,
      status_updated_at: new Date().toISOString()
    });
  }

  // Get crew statistics
  async getStatistics(filters = {}) {
    const crews = await this.getWithCompletionStatus(filters);

    return {
      total: crews.length,
      completed: crews.filter(c => c.completion_percentage === 100).length,
      in_progress: crews.filter(c => c.completion_percentage > 0 && c.completion_percentage < 100).length,
      not_started: crews.filter(c => c.completion_percentage === 0).length,
      average_completion: Math.round(
        crews.reduce((sum, c) => sum + c.completion_percentage, 0) / (crews.length || 1)
      )
    };
  }
}

module.exports = new CrewRepository();
