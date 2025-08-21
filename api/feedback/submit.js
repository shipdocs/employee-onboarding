/**
 * Feedback Submission API
 * Handles user feedback collection with maritime context
 */

const db = require('../../lib/database');
const { requireAuth } = require('../../lib/auth');
const { performanceMonitor } = require('../../lib/performanceMonitoring');
const { apiRateLimit } = require('../../lib/rateLimit');
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user.userId;
    const {
      type,
      value,
      rating,
      comment,
      context,
      timestamp,
      sessionId,
      userAgent,
      connectionStatus,
      pageUrl,
      referrer
    } = req.body;

    // Validate required fields
    if (!type || !context) {
      return res.status(400).json({
        error: 'Missing required fields: type and context are required'
      });
    }

    // Validate feedback type
    const validTypes = ['positive', 'negative', 'neutral', 'rating', 'detailed'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid feedback type. Must be one of: ' + validTypes.join(', ')
      });
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    // Get client IP and additional metadata
    const ipAddress = req.headers['x-forwarded-for'] ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     null;

    // Get user details for context
    const userResult = await db.query('SELECT id, email, first_name, last_name, role, position, vessel_assignment FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    const userError = !user;

    if (userError) {
      // console.error('Error fetching user details:', userError);
      // Continue anyway - feedback is more important than user details
    }

    // Prepare feedback data
    const feedbackData = {
      user_id: userId,
      type,
      value,
      rating,
      comment: comment ? comment.substring(0, 1000) : null, // Limit comment length
      context,
      session_id: sessionId,
      user_agent: userAgent,
      connection_status: connectionStatus,
      page_url: pageUrl,
      referrer,
      ip_address: ipAddress,
      submitted_at: timestamp || new Date().toISOString(),

      // Maritime-specific context
      user_role: user?.role,
      user_position: user?.position,
      vessel_assignment: user?.vessel_assignment,

      // Additional metadata
      browser_language: req.headers['accept-language']?.split(',')[0],
      timezone: req.headers['timezone'] || null
    };

    // Insert feedback into database
    const { data: insertedFeedback, error: insertError } = await supabase
      .from('user_feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (insertError) {
      // console.error('Error inserting feedback:', insertError);
      return res.status(500).json({
        error: 'Failed to save feedback',
        details: insertError.message
      });
    }

    // Record performance metric for feedback submission
    performanceMonitor.recordMetric('feedback_submitted', 1, 'count', {
      type,
      context,
      rating: rating?.toString() || 'none',
      hasComment: comment ? 'yes' : 'no',
      connectionStatus,
      userRole: user?.role || 'unknown'
    });

    // Process feedback for immediate insights
    await processFeedbackInsights(insertedFeedback);

    // Send response
    res.json({
      message: 'Feedback submitted successfully',
      feedbackId: insertedFeedback.id,
      timestamp: insertedFeedback.submitted_at
    });

    // Log successful submission

  } catch (error) {
    // console.error('Error in feedback submission:', error);

    // Record error metric
    performanceMonitor.recordMetric('feedback_submissionerror', 1, 'count', {
      error: error.message,
      context: req.body?.context || 'unknown'
    });

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Process feedback for immediate insights and alerts
 */
async function processFeedbackInsights(feedback) {
  try {
    // Check for negative feedback patterns
    if (feedback.type === 'negative' || (feedback.rating && feedback.rating <= 2)) {
      await checkNegativeFeedbackPattern(feedback);
    }

    // Update context-specific metrics
    await updateContextMetrics(feedback);

    // Check for urgent issues
    if (feedback.comment && containsUrgentKeywords(feedback.comment)) {
      await flagUrgentFeedback(feedback);
    }

  } catch (error) {
    // console.error('Error processing feedback insights:', error);
    // Don't fail the main request if insights processing fails
  }
}

/**
 * Check for patterns of negative feedback
 */
async function checkNegativeFeedbackPattern(feedback) {
  try {
    // Get recent negative feedback for the same context
    const { data: recentNegative, error } = await supabase
      .from('user_feedback')
      .select('id, submitted_at, user_id')
      .eq('context', feedback.context)
      .in('type', ['negative'])
      .gte('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('submitted_at', { ascending: false });

    if (error) {
      // console.error('Error checking negative feedback pattern:', error);
      return;
    }

    // If we have 3+ negative feedback items in 24 hours for the same context
    if (recentNegative && recentNegative.length >= 3) {
      await createFeedbackAlert({
        type: 'negative_pattern',
        context: feedback.context,
        severity: 'medium',
        description: `Multiple negative feedback items (${recentNegative.length}) in 24 hours for context: ${feedback.context}`,
        metadata: {
          count: recentNegative.length,
          timeframe: '24h',
          latest_feedback_id: feedback.id
        }
      });
    }

  } catch (error) {
    // console.error('Error in negative feedback pattern check:', error);
  }
}

/**
 * Update context-specific metrics
 */
async function updateContextMetrics(feedback) {
  try {
    // Calculate average rating for this context
    const { data: contextFeedback, error } = await supabase
      .from('user_feedback')
      .select('rating')
      .eq('context', feedback.context)
      .not('rating', 'is', null)
      .gte('submitted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (error) {
      // console.error('Error fetching context metrics:', error);
      return;
    }

    if (contextFeedback && contextFeedback.length > 0) {
      const averageRating = contextFeedback.reduce((sum, f) => sum + f.rating, 0) / contextFeedback.length;

      // Record metric
      performanceMonitor.recordMetric('feedback_context_rating', averageRating, 'rating', {
        context: feedback.context,
        sampleSize: contextFeedback.length.toString()
      });

      // Alert if average rating drops below threshold
      if (averageRating < 3.0 && contextFeedback.length >= 5) {
        await createFeedbackAlert({
          type: 'low_satisfaction',
          context: feedback.context,
          severity: 'high',
          description: `Low average satisfaction (${averageRating.toFixed(2)}/5.0) for context: ${feedback.context}`,
          metadata: {
            averageRating,
            sampleSize: contextFeedback.length,
            timeframe: '7d'
          }
        });
      }
    }

  } catch (error) {
    // console.error('Error updating context metrics:', error);
  }
}

/**
 * Check if comment contains urgent keywords
 */
function containsUrgentKeywords(comment) {
  const urgentKeywords = [
    'broken', 'error', 'crash', 'bug', 'urgent', 'critical', 'emergency',
    'not working', 'failed', 'stuck', 'frozen', 'slow', 'timeout',
    'security', 'data loss', 'corrupted', 'missing'
  ];

  const lowerComment = comment.toLowerCase();
  return urgentKeywords.some(keyword => lowerComment.includes(keyword));
}

/**
 * Flag urgent feedback for immediate attention
 */
async function flagUrgentFeedback(feedback) {
  try {
    await createFeedbackAlert({
      type: 'urgent_issue',
      context: feedback.context,
      severity: 'critical',
      description: `Urgent issue reported in feedback: ${feedback.comment?.substring(0, 100)}...`,
      metadata: {
        feedback_id: feedback.id,
        user_id: feedback.user_id,
        full_comment: feedback.comment
      }
    });

  } catch (error) {
    // console.error('Error flagging urgent feedback:', error);
  }
}

/**
 * Create feedback alert
 */
async function createFeedbackAlert(alertData) {
  try {
    const { error } = await supabase
      .from('feedback_alerts')
      .insert([{
        ...alertData,
        created_at: new Date().toISOString(),
        resolved: false
      }]);

    if (error) {
      // console.error('Error creating feedback alert:', error);
    }

  } catch (error) {
    // console.error('Error in createFeedbackAlert:', error);
  }
}

module.exports = apiRateLimit(requireAuth(handler));
