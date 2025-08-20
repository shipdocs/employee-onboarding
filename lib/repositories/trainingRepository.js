// Training repository for training and quiz operations
const BaseRepository = require('./baseRepository');

class TrainingRepository extends BaseRepository {
  constructor() {
    super('training_progress');
  }

  // Get all quiz attempts with related data (avoiding N+1)
  async getQuizAttemptsWithDetails(filters = {}) {
    // Fetch quiz attempts with crew member and manager info in single query
    let query = this.supabase
      .from('quiz_attempts')
      .select(`
        *,
        crew_member:crew_members!quiz_attempts_crew_member_id_fkey (
          id,
          first_name,
          last_name,
          email,
          company_id
        ),
        reviewer:users!quiz_attempts_reviewed_by_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.phase) {
      query = query.eq('phase', filters.phase);
    }
    if (filters.crew_member_id) {
      query = query.eq('crew_member_id', filters.crew_member_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Get training progress for multiple crew members (batch operation)
  async getBatchProgress(crewMemberIds) {
    if (!crewMemberIds || crewMemberIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('training_progress')
      .select(`
        *,
        crew_member:crew_members!training_progress_crew_member_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .in('crew_member_id', crewMemberIds)
      .order('crew_member_id', { ascending: true })
      .order('phase_number', { ascending: true });

    if (error) throw error;

    // Group by crew member for easier consumption
    const grouped = {};
    data.forEach(progress => {
      if (!grouped[progress.crew_member_id]) {
        grouped[progress.crew_member_id] = {
          crew_member: progress.crew_member,
          phases: []
        };
      }
      grouped[progress.crew_member_id].phases.push(progress);
    });

    return Object.values(grouped);
  }

  // Get phase items with completion status for a crew member
  async getPhaseItemsWithStatus(phaseNumber, crewMemberId) {
    // Get phase items
    const { data: items, error: itemsError } = await this.supabase
      .from('training_items')
      .select('*')
      .eq('phase_number', phaseNumber)
      .order('item_number', { ascending: true });

    if (itemsError) throw itemsError;

    // Get completion status for all items at once
    const itemIds = items.map(i => i.id);
    const { data: completions, error: compError } = await this.supabase
      .from('training_item_completions')
      .select('training_item_id, completed_at, completed_by')
      .eq('crew_member_id', crewMemberId)
      .in('training_item_id', itemIds);

    if (compError) throw compError;

    // Map completion status to items
    const completionMap = {};
    completions.forEach(c => {
      completionMap[c.training_item_id] = c;
    });

    return items.map(item => ({
      ...item,
      is_completed: !!completionMap[item.id],
      completed_at: completionMap[item.id]?.completed_at,
      completed_by: completionMap[item.id]?.completed_by
    }));
  }

  // Update quiz attempt with review
  async reviewQuizAttempt(attemptId, reviewData) {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .update({
        ...reviewData,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get training statistics with optimized queries
  async getTrainingStatistics(companyId = null) {
    // Build base query
    let crewQuery = this.supabase
      .from('crew_members')
      .select('id', { count: 'exact' });

    if (companyId) {
      crewQuery = crewQuery.eq('company_id', companyId);
    }

    const { data: crews, count: totalCrew } = await crewQuery;

    if (!crews || crews.length === 0) {
      return {
        totalCrew: 0,
        completedTraining: 0,
        inProgress: 0,
        notStarted: 0,
        averageProgress: 0
      };
    }

    const crewIds = crews.map(c => c.id);

    // Get all progress records in one query
    const { data: progressRecords, error } = await this.supabase
      .from('training_progress')
      .select('crew_member_id, phase_number, completed_at')
      .in('crew_member_id', crewIds);

    if (error) throw error;

    // Calculate statistics
    const progressByCrewMap = {};
    progressRecords.forEach(record => {
      if (!progressByCrewMap[record.crew_member_id]) {
        progressByCrewMap[record.crew_member_id] = [];
      }
      progressByCrewMap[record.crew_member_id].push(record);
    });

    let completedTraining = 0;
    let inProgress = 0;
    let notStarted = 0;
    let totalProgress = 0;

    crewIds.forEach(crewId => {
      const crewProgress = progressByCrewMap[crewId] || [];
      const completedPhases = crewProgress.filter(p => p.completed_at).length;

      if (completedPhases === 3) {
        completedTraining++;
      } else if (completedPhases > 0) {
        inProgress++;
      } else {
        notStarted++;
      }

      totalProgress += (completedPhases / 3) * 100;
    });

    return {
      totalCrew,
      completedTraining,
      inProgress,
      notStarted,
      averageProgress: Math.round(totalProgress / (totalCrew || 1))
    };
  }
}

module.exports = new TrainingRepository();
