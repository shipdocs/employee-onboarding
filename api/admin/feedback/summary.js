/**
 * Admin Feedback Summary API
 * Provides aggregated user feedback analytics
 */

const db = require('../../../lib/database-direct');
const { authenticateRequest } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      timeRange = '24h',
      context,
      type
    } = req.query;

    // Calculate time range
    const timeRangeMs = parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs).toISOString();

    // Get feedback summary
    const summary = await getFeedbackSummary(startTime, { context, type });

    // Get feedback trends
    const trends = await getFeedbackTrends(startTime);

    // Get context analysis
    const contextAnalysis = await getContextAnalysis(startTime);

    // Get recent feedback
    const recentFeedback = await getRecentFeedback(startTime, 10);

    // Get feedback alerts
    const alerts = await getFeedbackAlerts(startTime);

    res.json({
      summary: {
        totalResponses: summary.totalResponses,
        averageRating: summary.averageRating,
        satisfactionScore: summary.satisfactionScore,
        responseRate: summary.responseRate,
        sentimentDistribution: summary.sentimentDistribution,
        topIssues: summary.topIssues,
        improvementAreas: summary.improvementAreas
      },
      trends,
      contextAnalysis,
      recentFeedback,
      alerts,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (_error) {
    // console.error('Error in feedback summary API:', _error);
    res.status(500).json({
      error: 'Internal server error',
      message: _error.message
    });
  }
}

/**
 * Get feedback summary statistics
 */
async function getFeedbackSummary(startTime, filters = {}) {
  try {
    // Build base query
    let query = supabase
      .from('user_feedback')
      .select('*')
      .gte('submitted_at', startTime);

    // Apply filters
    if (filters.context) {
      query = query.eq('context', filters.context);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { data: feedback, error } = await query;

    if (error) {
      throw error;
    }

    const totalResponses = feedback.length;

    // Calculate average rating
    const ratedFeedback = feedback.filter(f => f.rating !== null);
    const averageRating = ratedFeedback.length > 0
      ? ratedFeedback.reduce((sum, f) => sum + f.rating, 0) / ratedFeedback.length
      : 0;

    // Calculate satisfaction score (percentage of positive feedback)
    const positiveFeedback = feedback.filter(f =>
      f.type === 'positive' || f.rating >= 4
    ).length;
    const satisfactionScore = totalResponses > 0
      ? (positiveFeedback / totalResponses) * 100
      : 0;

    // Sentiment distribution
    const sentimentDistribution = feedback.reduce((acc, f) => {
      let sentiment = 'neutral';
      if (f.type === 'positive' || f.rating >= 4) {
        sentiment = 'positive';
      } else if (f.type === 'negative' || f.rating <= 2) {
        sentiment = 'negative';
      }
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    // Analyze comments for top issues
    const topIssues = analyzeComments(feedback.filter(f => f.comment));

    // Calculate response rate (estimate based on active users)
    const responseRate = await calculateResponseRate(startTime, totalResponses);

    // Identify improvement areas
    const improvementAreas = identifyImprovementAreas(feedback);

    return {
      totalResponses,
      averageRating: Math.round(averageRating * 10) / 10,
      satisfactionScore: Math.round(satisfactionScore * 10) / 10,
      responseRate,
      sentimentDistribution,
      topIssues,
      improvementAreas
    };

  } catch (_error) {
    // console.error('Error getting feedback summary:', _error);
    return {};
  }
}

/**
 * Get feedback trends over time
 */
async function getFeedbackTrends(startTime) {
  try {
    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .select('submitted_at, rating, type')
      .gte('submitted_at', startTime)
      .order('submitted_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Group by time periods (daily for longer ranges, hourly for shorter)
    const timeRange = Date.now() - new Date(startTime).getTime();
    const isLongRange = timeRange > 7 * 24 * 60 * 60 * 1000; // More than 7 days

    const trends = feedback.reduce((acc, f) => {
      const date = new Date(f.submitted_at);
      const key = isLongRange
        ? date.toISOString().split('T')[0] // Daily
        : date.toISOString().split(':')[0] + ':00'; // Hourly

      if (!acc[key]) {
        acc[key] = {
          timestamp: key,
          totalFeedback: 0,
          averageRating: 0,
          ratingSum: 0,
          ratingCount: 0,
          positive: 0,
          negative: 0,
          neutral: 0
        };
      }

      acc[key].totalFeedback++;

      if (f.rating) {
        acc[key].ratingSum += f.rating;
        acc[key].ratingCount++;
      }

      // Categorize sentiment
      if (f.type === 'positive' || f.rating >= 4) {
        acc[key].positive++;
      } else if (f.type === 'negative' || f.rating <= 2) {
        acc[key].negative++;
      } else {
        acc[key].neutral++;
      }

      return acc;
    }, {});

    // Calculate averages
    Object.values(trends).forEach(trend => {
      trend.averageRating = trend.ratingCount > 0
        ? trend.ratingSum / trend.ratingCount
        : 0;
    });

    return Object.values(trends);

  } catch (_error) {
    // console.error('Error getting feedback trends:', _error);
    return [];
  }
}

/**
 * Get context-specific analysis
 */
async function getContextAnalysis(startTime) {
  try {
    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .select('context, rating, type, comment')
      .gte('submitted_at', startTime);

    if (error) {
      throw error;
    }

    // Group by context
    const contextAnalysis = feedback.reduce((acc, f) => {
      const context = f.context;
      if (!acc[context]) {
        acc[context] = {
          totalFeedback: 0,
          averageRating: 0,
          ratingSum: 0,
          ratingCount: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          commonIssues: []
        };
      }

      acc[context].totalFeedback++;

      if (f.rating) {
        acc[context].ratingSum += f.rating;
        acc[context].ratingCount++;
      }

      // Categorize sentiment
      if (f.type === 'positive' || f.rating >= 4) {
        acc[context].positive++;
      } else if (f.type === 'negative' || f.rating <= 2) {
        acc[context].negative++;
      } else {
        acc[context].neutral++;
      }

      return acc;
    }, {});

    // Calculate averages and satisfaction scores
    Object.keys(contextAnalysis).forEach(context => {
      const data = contextAnalysis[context];
      data.averageRating = data.ratingCount > 0
        ? data.ratingSum / data.ratingCount
        : 0;
      data.satisfactionScore = data.totalFeedback > 0
        ? (data.positive / data.totalFeedback) * 100
        : 0;
    });

    return contextAnalysis;

  } catch (_error) {
    // console.error('Error getting context analysis:', _error);
    return {};
  }
}

/**
 * Get recent feedback
 */
async function getRecentFeedback(startTime, limit = 10) {
  try {
    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .select(`
        id,
        type,
        rating,
        comment,
        context,
        submitted_at,
        user_role,
        user_position,
        vessel_assignment
      `)
      .gte('submitted_at', startTime)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return feedback.map(f => ({
      id: f.id,
      type: f.type,
      rating: f.rating,
      comment: f.comment ? f.comment.substring(0, 200) + (f.comment.length > 200 ? '...' : '') : null,
      context: f.context,
      submitted_at: f.submitted_at,
      userContext: {
        role: f.user_role,
        position: f.user_position,
        vessel: f.vessel_assignment
      }
    }));

  } catch (_error) {
    // console.error('Error getting recent feedback:', _error);
    return [];
  }
}

/**
 * Get feedback alerts
 */
async function getFeedbackAlerts(startTime) {
  try {
    const { data: alerts, error } = await supabase
      .from('feedback_alerts')
      .select('*')
      .gte('created_at', startTime)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      context: alert.context,
      severity: alert.severity,
      description: alert.description,
      metadata: alert.metadata,
      created_at: alert.created_at
    }));

  } catch (_error) {
    // console.error('Error getting feedback alerts:', _error);
    return [];
  }
}

/**
 * Analyze comments for common issues
 */
function analyzeComments(feedbackWithComments) {
  const keywords = {
    'slow': ['slow', 'loading', 'performance', 'lag'],
    'confusing': ['confusing', 'unclear', 'difficult', 'hard'],
    'error': ['error', 'bug', 'broken', 'crash', 'fail'],
    'navigation': ['navigation', 'menu', 'find', 'lost'],
    'mobile': ['mobile', 'phone', 'touch', 'screen'],
    'offline': ['offline', 'connection', 'internet', 'sync']
  };

  const issueCounts = {};

  feedbackWithComments.forEach(feedback => {
    const comment = feedback.comment.toLowerCase();
    Object.entries(keywords).forEach(([issue, words]) => {
      if (words.some(word => comment.includes(word))) {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      }
    });
  });

  return Object.entries(issueCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));
}

/**
 * Calculate response rate
 */
async function calculateResponseRate(startTime, totalResponses) {
  try {
    // Get unique active users in the time period
    const { data: activeUsers, error } = await supabase
      .from('performance_metrics')
      .select('user_id')
      .gte('recorded_at', startTime);

    if (error) {
      throw error;
    }

    const uniqueUsers = new Set(activeUsers.map(u => u.user_id)).size;
    return uniqueUsers > 0 ? (totalResponses / uniqueUsers) * 100 : 0;

  } catch (_error) {
    // console.error('Error calculating response rate:', _error);
    return 0;
  }
}

/**
 * Identify improvement areas
 */
function identifyImprovementAreas(feedback) {
  const areas = [];

  // Low rating contexts
  const contextRatings = feedback.reduce((acc, f) => {
    if (f.rating && f.context) {
      if (!acc[f.context]) {
        acc[f.context] = { sum: 0, count: 0 };
      }
      acc[f.context].sum += f.rating;
      acc[f.context].count++;
    }
    return acc;
  }, {});

  Object.entries(contextRatings).forEach(([context, data]) => {
    const avgRating = data.sum / data.count;
    if (avgRating < 3.5) {
      areas.push({
        area: context,
        priority: avgRating < 2.5 ? 'high' : 'medium',
        averageRating: avgRating,
        feedbackCount: data.count
      });
    }
  });

  return areas.sort((a, b) => a.averageRating - b.averageRating);
}

/**
 * Parse time range string to milliseconds
 */
function parseTimeRange(timeRange) {
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  return timeRanges[timeRange] || timeRanges['24h'];
}

async function authenticatedHandler(req, res) {
  // Verify admin authentication with proper blacklist checking
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return handler(req, res);
}

module.exports = adminRateLimit(authenticatedHandler);
