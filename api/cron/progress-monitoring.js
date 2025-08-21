// Vercel Cron Job: /api/cron/progress-monitoring.js - Monitor training progress and generate reports
const db = require('../../lib/database');
module.exports = async function handler(req, res) {;
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    let monitoringStats = {
      totalUsers: 0,
      activeUsers: 0,
      completedUsers: 0,
      overdueUsers: 0,
      pendingQuizReviews: 0,
      weeklyCompletions: 0,
      monthlyCompletions: 0,
      alerts: []
    };

    // 1. Get overall user statistics

    const allUsersResult = await db.query('SELECT id, status, created_at FROM users WHERE role = $1', ['crew']);
    const allUsers = allUsersResult.rows;
    const usersError = false;

    if (usersError) {
      throw usersError;
    }

    monitoringStats.totalUsers = allUsers.length;
    monitoringStats.activeUsers = allUsers.filter(u => u.status === 'active').length;
    monitoringStats.completedUsers = allUsers.filter(u => u.status === 'completed').length;

    // 2. Check for overdue training sessions

    const { data: overdueSessions, error: overdueError } = await supabase
      .from('training_sessions')
      .select(`
        user_id,
        phase,
        due_date,
        users!inner (
          first_name,
          last_name,
          email
        )
      `)
      .neq('status', 'completed')
      .lt('due_date', today)
      .eq('users.status', 'active');

    if (overdueError) {
      throw overdueError;
    }

    monitoringStats.overdueUsers = overdueSessions.length;

    // Generate alerts for severely overdue sessions (more than 7 days)
    const severelyOverdue = overdueSessions.filter(session => {
      const dueDate = new Date(session.due_date);
      const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      return daysPastDue > 7;
    });

    if (severelyOverdue.length > 0) {
      monitoringStats.alerts.push({
        type: 'severely_overdue',
        count: severelyOverdue.length,
        message: `${severelyOverdue.length} users have training more than 7 days overdue`,
        users: severelyOverdue.map(s => ({
          name: `${s.users.first_name} ${s.users.last_name}`,
          email: s.users.email,
          phase: s.phase,
          dueDate: s.due_date
        }))
      });
    }

    // 3. Check pending quiz reviews

    const { data: pendingQuizzes, error: quizError } = await supabase
      .from('quiz_results')
      .select(`
        id,
        phase,
        completed_at,
        users!inner (
          first_name,
          last_name,
          email
        )
      `)
      .eq('review_status', 'pending_review');

    if (quizError) {
      throw quizError;
    }

    monitoringStats.pendingQuizReviews = pendingQuizzes.length;

    // Generate alerts for old pending reviews (more than 3 days)
    const oldPendingQuizzes = pendingQuizzes.filter(quiz => {
      const completedDate = new Date(quiz.completed_at);
      const daysWaiting = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24));
      return daysWaiting > 3;
    });

    if (oldPendingQuizzes.length > 0) {
      monitoringStats.alerts.push({
        type: 'old_pending_reviews',
        count: oldPendingQuizzes.length,
        message: `${oldPendingQuizzes.length} quiz reviews have been pending for more than 3 days`,
        quizzes: oldPendingQuizzes.map(q => ({
          name: `${q.users.first_name} ${q.users.last_name}`,
          email: q.users.email,
          phase: q.phase,
          completedAt: q.completed_at
        }))
      });
    }

    // 4. Calculate completion rates

    // Weekly completions
    const { data: weeklyCompletions, error: weeklyError } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('status', 'completed')
      .gte('completed_at', oneWeekAgo);

    if (!weeklyError) {
      monitoringStats.weeklyCompletions = weeklyCompletions.length;
    }

    // Monthly completions
    const { data: monthlyCompletions, error: monthlyError } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('status', 'completed')
      .gte('completed_at', oneMonthAgo);

    if (!monthlyError) {
      monitoringStats.monthlyCompletions = monthlyCompletions.length;
    }

    // 5. Check system health indicators

    // Check for users stuck in training (no progress in 14 days)
    const { data: stuckUsers, error: stuckError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        last_login_at,
        training_sessions!inner (
          phase,
          status,
          started_at
        )
      `)
      .eq('status', 'active')
      .eq('training_sessions.status', 'in_progress')
      .lt('training_sessions.started_at', new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString());

    if (!stuckError && stuckUsers.length > 0) {
      monitoringStats.alerts.push({
        type: 'stuck_users',
        count: stuckUsers.length,
        message: `${stuckUsers.length} users appear to be stuck in training with no progress for 14+ days`,
        users: stuckUsers.map(u => ({
          name: `${u.first_name} ${u.last_name}`,
          email: u.email,
          lastLogin: u.last_login_at
        }))
      });
    }

    // 6. Generate weekly summary report (Mondays)
    if (now.getDay() === 1) {

      try {
        // Send weekly report to HR
        const weeklyReport = {
          period: `${oneWeekAgo} to ${today}`,
          stats: monitoringStats,
          recommendations: generateRecommendations(monitoringStats)
        };

        const response = await fetch(`${process.env.BASE_URL}/api/email/send-weekly-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${generateServiceToken()}`
          },
          body: JSON.stringify(weeklyReport)
        });

        if (response.ok) {

        } else {
          // console.error('❌ Failed to send weekly report');
        }
      } catch (error) {
        // console.error('❌ Error sending weekly report:', error.message);
      }
    }

    // 7. Send critical alerts immediately
    if (monitoringStats.alerts.length > 0) {

      for (const alert of monitoringStats.alerts) {
        if (alert.type === 'severely_overdue' || alert.type === 'old_pending_reviews') {
          try {
            const response = await fetch(`${process.env.BASE_URL}/api/email/send-alert`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${generateServiceToken()}`
              },
              body: JSON.stringify(alert)
            });

            if (response.ok) {

            } else {
              // console.error(`❌ Failed to send ${alert.type} alert`);
            }
          } catch (error) {
            // console.error(`❌ Error sending ${alert.type} alert:`, error.message);
          }
        }
      }
    }

    // 8. Log monitoring data
    const { error: logError } = await supabase
      .from('email_notifications')
      .insert({
        user_id: null,
        email_type: 'system_monitoring',
        subject: 'Daily Progress Monitoring Completed',
        status: 'sent',
        created_at: now.toISOString()
      });

    if (logError) {
      // console.error('❌ Error logging monitoring stats:', logError.message);
    }

    res.json({
      success: true,
      monitoringStats,
      timestamp: now.toISOString()
    });

  } catch (error) {
    // console.error('❌ Progress monitoring job failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Generate recommendations based on monitoring stats
function generateRecommendations(stats) {
  const recommendations = [];

  if (stats.overdueUsers > 0) {
    recommendations.push({
      priority: 'high',
      category: 'overdue_training',
      message: `${stats.overdueUsers} users have overdue training. Consider sending additional reminders or providing support.`
    });
  }

  if (stats.pendingQuizReviews > 5) {
    recommendations.push({
      priority: 'medium',
      category: 'quiz_reviews',
      message: `${stats.pendingQuizReviews} quiz reviews are pending. Consider assigning additional reviewers or setting review deadlines.`
    });
  }

  const completionRate = stats.totalUsers > 0 ? (stats.completedUsers / stats.totalUsers) * 100 : 0;
  if (completionRate < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'completion_rate',
      message: `Overall completion rate is ${completionRate.toFixed(1)}%. Consider reviewing training content or providing additional support.`
    });
  }

  if (stats.weeklyCompletions === 0) {
    recommendations.push({
      priority: 'high',
      category: 'no_progress',
      message: 'No training completions this week. Investigate potential system issues or user engagement problems.'
    });
  }

  return recommendations;
}

// Generate service token for internal API calls
function generateServiceToken() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      userId: 'system',
      role: 'service',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}
