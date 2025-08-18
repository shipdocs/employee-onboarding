// services/progress-tracking.js - Advanced progress tracking and analytics
const { workflowEngine } = require('./workflow-engine');
const { supabase } = require('./database');

class ProgressTrackingService {
  constructor() {
    this.workflowEngine = workflowEngine;
  }

  // ====== PROGRESS ANALYTICS ======

  async getUserProgressSummary(userId) {
    try {

      // Get all user's workflow instances
      const instances = await this.workflowEngine.getUserWorkflowInstances(userId);
      
      const summary = {
        total_workflows: instances.length,
        completed_workflows: instances.filter(i => i.status === 'completed').length,
        in_progress_workflows: instances.filter(i => i.status === 'in_progress').length,
        abandoned_workflows: instances.filter(i => i.status === 'abandoned').length,
        overall_completion_rate: 0,
        workflows: []
      };

      // Calculate detailed progress for each workflow
      for (const instance of instances) {
        const progress = await this.workflowEngine.getWorkflowProgress(instance.id);
        const workflow = await this.workflowEngine.getWorkflowBySlug(instance.workflow.slug);
        
        const totalItems = progress.length;
        const completedItems = progress.filter(p => p.status === 'completed').length;
        const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        // Calculate time spent
        const timeSpent = this.calculateTimeSpent(progress);
        const estimatedCompletion = this.estimateCompletionTime(instance, workflow, progress);

        summary.workflows.push({
          instance_id: instance.id,
          workflow: {
            name: instance.workflow.name,
            slug: instance.workflow.slug,
            type: instance.workflow.type
          },
          status: instance.status,
          current_phase: instance.current_phase,
          progress_percentage: progressPercentage,
          completed_items: completedItems,
          total_items: totalItems,
          time_spent_minutes: timeSpent,
          estimated_completion_minutes: estimatedCompletion,
          started_at: instance.started_at,
          completed_at: instance.completed_at,
          last_activity: this.getLastActivity(progress)
        });
      }

      // Calculate overall completion rate
      if (summary.total_workflows > 0) {
        summary.overall_completion_rate = Math.round(
          (summary.completed_workflows / summary.total_workflows) * 100
        );
      }

      return summary;

    } catch (error) {
      // console.error('❌ [PROGRESS] Error generating user progress summary:', error);
      throw error;
    }
  }

  async getDetailedProgressAnalytics(instanceId) {
    try {

      const instance = await this.workflowEngine.getWorkflowInstance(instanceId);
      const progress = await this.workflowEngine.getWorkflowProgress(instanceId);
      const workflow = await this.workflowEngine.getWorkflowBySlug(instance.workflow.slug);

      // Group progress by phases
      const phaseProgress = {};
      workflow.workflow_phases.forEach(phase => {
        const phaseItems = progress.filter(p => p.phase_id === phase.id);
        const completedItems = phaseItems.filter(p => p.status === 'completed');
        
        phaseProgress[phase.phase_number] = {
          phase_id: phase.id,
          phase_name: phase.name,
          phase_type: phase.type,
          estimated_duration: phase.estimated_duration,
          total_items: phaseItems.length,
          completed_items: completedItems.length,
          completion_percentage: phaseItems.length > 0 
            ? Math.round((completedItems.length / phaseItems.length) * 100) 
            : 0,
          time_spent: this.calculateTimeSpent(phaseItems),
          status: this.getPhaseStatus(phase.phase_number, instance.current_phase, phaseItems),
          items: phaseItems.map(item => ({
            item_id: item.item_id,
            title: item.item?.title,
            type: item.item?.type,
            status: item.status,
            started_at: item.started_at,
            completed_at: item.completed_at,
            time_spent: this.calculateItemTimeSpent(item)
          }))
        };
      });

      // Calculate learning patterns
      const learningPatterns = this.analyzeLearningPatterns(progress);
      
      // Calculate efficiency metrics
      const efficiency = this.calculateEfficiencyMetrics(instance, workflow, progress);

      const analytics = {
        instance: {
          id: instance.id,
          workflow_name: instance.workflow.name,
          user_id: instance.user_id,
          status: instance.status,
          current_phase: instance.current_phase,
          started_at: instance.started_at,
          completed_at: instance.completed_at
        },
        overall_progress: {
          total_phases: workflow.workflow_phases.length,
          completed_phases: Object.values(phaseProgress).filter(p => p.status === 'completed').length,
          total_items: progress.length,
          completed_items: progress.filter(p => p.status === 'completed').length,
          overall_percentage: progress.length > 0 
            ? Math.round((progress.filter(p => p.status === 'completed').length / progress.length) * 100) 
            : 0,
          total_time_spent: this.calculateTimeSpent(progress)
        },
        phase_progress: phaseProgress,
        learning_patterns: learningPatterns,
        efficiency_metrics: efficiency,
        recommendations: this.generateRecommendations(instance, workflow, progress, learningPatterns)
      };

      .length} phases`);
      return analytics;

    } catch (error) {
      // console.error('❌ [ANALYTICS] Error generating detailed analytics:', error);
      throw error;
    }
  }

  // ====== PROGRESS MONITORING ======

  async getStuckUsers(thresholdDays = 7) {
    try {

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

      const { data: stuckInstances, error } = await supabase
        .from('workflow_instances')
        .select(`
          id, user_id, workflow_id, current_phase, status, started_at,
          workflow:workflows (name, slug),
          user:users (id, full_name, email, role)
        `)
        .eq('status', 'in_progress')
        .lt('updated_at', cutoffDate.toISOString());

      if (error) throw error;

      const stuckUsers = [];

      for (const instance of stuckInstances) {
        const progress = await this.workflowEngine.getWorkflowProgress(instance.id);
        const lastActivity = this.getLastActivity(progress);
        
        if (lastActivity && new Date(lastActivity) < cutoffDate) {
          const daysSinceActivity = Math.floor(
            (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
          );

          stuckUsers.push({
            user: instance.user,
            instance: {
              id: instance.id,
              workflow_name: instance.workflow.name,
              workflow_slug: instance.workflow.slug,
              current_phase: instance.current_phase,
              started_at: instance.started_at
            },
            days_since_activity: daysSinceActivity,
            last_activity: lastActivity,
            total_progress_percentage: progress.length > 0 
              ? Math.round((progress.filter(p => p.status === 'completed').length / progress.length) * 100)
              : 0
          });
        }
      }

      // Sort by days since activity (most stuck first)
      stuckUsers.sort((a, b) => b.days_since_activity - a.days_since_activity);

      return stuckUsers;

    } catch (error) {
      // console.error('❌ [MONITORING] Error finding stuck users:', error);
      throw error;
    }
  }

  async getProgressTrends(workflowSlug, days = 30) {
    try {

      const workflow = await this.workflowEngine.getWorkflowBySlug(workflowSlug);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowSlug}`);
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: instances, error } = await supabase
        .from('workflow_instances')
        .select('id, user_id, status, started_at, completed_at')
        .eq('workflow_id', workflow.id)
        .gte('started_at', startDate.toISOString());

      if (error) throw error;

      // Generate daily statistics
      const dailyStats = {};
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        dailyStats[dateKey] = {
          date: dateKey,
          new_starts: 0,
          completions: 0,
          active_users: 0,
          completion_rate: 0
        };
      }

      // Populate statistics
      instances.forEach(instance => {
        const startDate = instance.started_at.split('T')[0];
        if (dailyStats[startDate]) {
          dailyStats[startDate].new_starts++;
        }

        if (instance.completed_at) {
          const completionDate = instance.completed_at.split('T')[0];
          if (dailyStats[completionDate]) {
            dailyStats[completionDate].completions++;
          }
        }
      });

      // Calculate completion rates
      Object.keys(dailyStats).forEach(date => {
        const stats = dailyStats[date];
        if (stats.new_starts > 0) {
          stats.completion_rate = Math.round((stats.completions / stats.new_starts) * 100);
        }
      });

      const trends = {
        workflow: {
          name: workflow.name,
          slug: workflow.slug
        },
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          days: days
        },
        summary: {
          total_starts: instances.length,
          total_completions: instances.filter(i => i.status === 'completed').length,
          overall_completion_rate: instances.length > 0 
            ? Math.round((instances.filter(i => i.status === 'completed').length / instances.length) * 100)
            : 0
        },
        daily_stats: Object.values(dailyStats).reverse() // Oldest first
      };

      return trends;

    } catch (error) {
      // console.error('❌ [TRENDS] Error analyzing progress trends:', error);
      throw error;
    }
  }

  // ====== HELPER METHODS ======

  calculateTimeSpent(progressItems) {
    let totalMinutes = 0;
    
    progressItems.forEach(item => {
      if (item.started_at && item.completed_at) {
        const startTime = new Date(item.started_at);
        const endTime = new Date(item.completed_at);
        const minutes = Math.round((endTime - startTime) / (1000 * 60));
        totalMinutes += minutes;
      }
    });

    return totalMinutes;
  }

  calculateItemTimeSpent(item) {
    if (!item.started_at) return 0;
    
    const endTime = item.completed_at ? new Date(item.completed_at) : new Date();
    const startTime = new Date(item.started_at);
    
    return Math.round((endTime - startTime) / (1000 * 60));
  }

  getLastActivity(progressItems) {
    const activities = progressItems
      .map(item => item.completed_at || item.started_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a));
    
    return activities[0] || null;
  }

  getPhaseStatus(phaseNumber, currentPhase, phaseItems) {
    if (phaseNumber < currentPhase) {
      return 'completed';
    } else if (phaseNumber === currentPhase) {
      const completedItems = phaseItems.filter(p => p.status === 'completed').length;
      return completedItems > 0 ? 'in_progress' : 'current';
    } else {
      return 'pending';
    }
  }

  estimateCompletionTime(instance, workflow, progress) {
    // Simple estimation based on average time per item and remaining items
    const completedItems = progress.filter(p => p.status === 'completed');
    const remainingItems = progress.filter(p => p.status !== 'completed');
    
    if (completedItems.length === 0) {
      // Use workflow estimated duration if available
      const totalEstimated = workflow.workflow_phases.reduce(
        (sum, phase) => sum + (phase.estimated_duration || 30), 0
      );
      return totalEstimated;
    }
    
    const avgTimePerItem = this.calculateTimeSpent(completedItems) / completedItems.length;
    return Math.round(avgTimePerItem * remainingItems.length);
  }

  analyzeLearningPatterns(progress) {
    const patterns = {
      preferred_session_length: 0,
      most_active_time: null,
      completion_velocity: 0,
      struggle_areas: []
    };

    // Analyze session patterns
    const sessions = this.groupIntoSessions(progress);
    if (sessions.length > 0) {
      patterns.preferred_session_length = Math.round(
        sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length
      );
    }

    // Analyze completion velocity (items per day)
    const completedItems = progress.filter(p => p.status === 'completed');
    if (completedItems.length > 1) {
      const firstCompletion = new Date(completedItems[completedItems.length - 1].completed_at);
      const lastCompletion = new Date(completedItems[0].completed_at);
      const daysDiff = (lastCompletion - firstCompletion) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 0) {
        patterns.completion_velocity = Math.round((completedItems.length / daysDiff) * 100) / 100;
      }
    }

    return patterns;
  }

  groupIntoSessions(progress, maxGapMinutes = 60) {
    const sessions = [];
    let currentSession = null;

    const sortedProgress = progress
      .filter(p => p.started_at)
      .sort((a, b) => new Date(a.started_at) - new Date(b.started_at));

    sortedProgress.forEach(item => {
      const itemStart = new Date(item.started_at);
      
      if (!currentSession || 
          (itemStart - currentSession.end) > (maxGapMinutes * 60 * 1000)) {
        // Start new session
        currentSession = {
          start: itemStart,
          end: new Date(item.completed_at || item.started_at),
          items: [item],
          duration: 0
        };
        sessions.push(currentSession);
      } else {
        // Continue current session
        currentSession.end = new Date(item.completed_at || item.started_at);
        currentSession.items.push(item);
      }
      
      // Update session duration
      currentSession.duration = Math.round(
        (currentSession.end - currentSession.start) / (1000 * 60)
      );
    });

    return sessions;
  }

  calculateEfficiencyMetrics(instance, workflow, progress) {
    const totalEstimated = workflow.workflow_phases.reduce(
      (sum, phase) => sum + (phase.estimated_duration || 30), 0
    );
    const actualTime = this.calculateTimeSpent(progress);
    
    return {
      estimated_duration_minutes: totalEstimated,
      actual_duration_minutes: actualTime,
      efficiency_ratio: totalEstimated > 0 ? Math.round((totalEstimated / actualTime) * 100) / 100 : 0,
      time_variance_percentage: totalEstimated > 0 
        ? Math.round(((actualTime - totalEstimated) / totalEstimated) * 100) 
        : 0
    };
  }

  generateRecommendations(instance, workflow, progress, patterns) {
    const recommendations = [];
    
    // Check for stuck progress
    const lastActivity = this.getLastActivity(progress);
    if (lastActivity) {
      const daysSinceActivity = (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 3) {
        recommendations.push({
          type: 'attention',
          message: `No activity for ${Math.floor(daysSinceActivity)} days. Consider sending a reminder.`,
          priority: daysSinceActivity > 7 ? 'high' : 'medium'
        });
      }
    }

    // Check completion velocity
    if (patterns.completion_velocity < 0.5) {
      recommendations.push({
        type: 'engagement',
        message: 'Low completion velocity detected. Consider providing additional support.',
        priority: 'medium'
      });
    }

    // Check efficiency
    const completedItems = progress.filter(p => p.status === 'completed').length;
    const progressPercentage = progress.length > 0 ? (completedItems / progress.length) * 100 : 0;
    
    if (progressPercentage > 50 && progressPercentage < 80) {
      recommendations.push({
        type: 'motivation',
        message: 'User is making good progress. Encourage them to complete the workflow.',
        priority: 'low'
      });
    }

    return recommendations;
  }

  // ====== HEALTH CHECK ======

  async healthCheck() {
    try {
      const testUserId = 'test-user-id';
      await this.getUserProgressSummary(testUserId);
      return { healthy: true, service: 'progress-tracking' };
    } catch (error) {
      return { 
        healthy: false, 
        service: 'progress-tracking', 
        error: error.message 
      };
    }
  }
}

// Export singleton instance
const progressTrackingService = new ProgressTrackingService();

module.exports = {
  ProgressTrackingService,
  progressTrackingService
};