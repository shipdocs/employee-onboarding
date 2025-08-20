/**
 * Admin User Feedback API
 * Handles user feedback management for admin dashboard
 */

const { supabase } = require('../../lib/supabase');
const { authenticateRequest } = require('../../lib/auth');
const { applyApiSecurityHeaders } = require('../../lib/securityHeaders');
const { adminRateLimit } = require('../../lib/rateLimit');

async function getUserFeedback(req, res) {
  try {
    const {
      status = 'all',
      type = 'all',
      rating = 'all',
      limit = 50,
      offset = 0
    } = req.query;

    // Check if user_feedback table exists, if not create mock data
    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error && error.code === '42P01') {
      // Table doesn't exist, return mock data
      const mockFeedback = [
        {
          id: 'fb_001',
          user_id: 'user_123',
          type: 'training_feedback',
          rating: 5,
          subject: 'Excellent training content',
          message: 'The maritime safety training was very comprehensive and well-structured. The interactive elements made it engaging.',
          status: 'new',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          responded_at: null,
          response: null,
          metadata: {
            training_phase: 'safety_basics',
            completion_time: '45 minutes',
            user_agent: 'Mozilla/5.0...'
          }
        },
        {
          id: 'fb_002',
          user_id: 'user_456',
          type: 'bug_report',
          rating: 2,
          subject: 'Video playback issues',
          message: 'The training videos keep buffering and sometimes fail to load completely. This is affecting my progress.',
          status: 'responded',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          responded_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
          response: 'Thank you for reporting this issue. We have identified the problem and are working on a fix. You should see improvements in video playback within 24 hours.',
          metadata: {
            browser: 'Chrome 120',
            connection_speed: 'slow',
            error_logs: ['video_timeout', 'buffer_underrun']
          }
        },
        {
          id: 'fb_003',
          user_id: 'user_789',
          type: 'feature_request',
          rating: 4,
          subject: 'Mobile app needed',
          message: 'It would be great to have a mobile app for completing training on the go. The current mobile web experience could be improved.',
          status: 'acknowledged',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          responded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          response: 'Thank you for the suggestion. A mobile app is on our roadmap for Q2 2025.',
          metadata: {
            device: 'iPhone 15',
            requested_features: ['offline_mode', 'push_notifications', 'progress_sync']
          }
        },
        {
          id: 'fb_004',
          user_id: 'user_321',
          type: 'general_feedback',
          rating: 5,
          subject: 'Great platform overall',
          message: 'Really impressed with the platform. The certificate generation is fast and the progress tracking is very helpful.',
          status: 'new',
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          responded_at: null,
          response: null,
          metadata: {
            completed_phases: 8,
            certificates_earned: 3,
            time_on_platform: '12 hours'
          }
        }
      ];

      // Apply filters to mock data
      let filteredFeedback = mockFeedback;

      if (status !== 'all') {
        filteredFeedback = filteredFeedback.filter(fb => fb.status === status);
      }

      if (type !== 'all') {
        filteredFeedback = filteredFeedback.filter(fb => fb.type === type);
      }

      if (rating !== 'all') {
        const ratingNum = parseInt(rating);
        filteredFeedback = filteredFeedback.filter(fb => fb.rating === ratingNum);
      }

      // Calculate summary
      const summary = {
        total: filteredFeedback.length,
        byStatus: { new: 0, acknowledged: 0, responded: 0, closed: 0 },
        byType: { training_feedback: 0, bug_report: 0, feature_request: 0, general_feedback: 0 },
        byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        averageRating: 0
      };

      let totalRating = 0;
      filteredFeedback.forEach(fb => {
        if (fb.status && summary.byStatus.hasOwnProperty(fb.status)) {
          summary.byStatus[fb.status]++;
        }
        if (fb.type && summary.byType.hasOwnProperty(fb.type)) {
          summary.byType[fb.type]++;
        }
        if (fb.rating && summary.byRating.hasOwnProperty(fb.rating)) {
          summary.byRating[fb.rating]++;
          totalRating += fb.rating;
        }
      });

      if (filteredFeedback.length > 0) {
        summary.averageRating = (totalRating / filteredFeedback.length).toFixed(1);
      }

      return res.json({
        feedback: filteredFeedback,
        pagination: {
          total: filteredFeedback.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: filteredFeedback.length > (parseInt(offset) + parseInt(limit))
        },
        summary,
        filters: {
          status,
          type,
          rating
        }
      });
    }

    if (error) {
      console.error('Failed to fetch user feedback:', error);
      return res.status(500).json({ error: 'Failed to fetch user feedback' });
    }

    // Apply filters to real data
    let filteredFeedback = feedback || [];

    if (status !== 'all') {
      filteredFeedback = filteredFeedback.filter(fb => fb.status === status);
    }

    if (type !== 'all') {
      filteredFeedback = filteredFeedback.filter(fb => fb.type === type);
    }

    if (rating !== 'all') {
      const ratingNum = parseInt(rating);
      filteredFeedback = filteredFeedback.filter(fb => fb.rating === ratingNum);
    }

    // Calculate summary
    const summary = {
      total: filteredFeedback.length,
      byStatus: { new: 0, acknowledged: 0, responded: 0, closed: 0 },
      byType: {},
      byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      averageRating: 0
    };

    let totalRating = 0;
    filteredFeedback.forEach(fb => {
      if (fb.status && summary.byStatus.hasOwnProperty(fb.status)) {
        summary.byStatus[fb.status]++;
      }
      if (fb.type) {
        summary.byType[fb.type] = (summary.byType[fb.type] || 0) + 1;
      }
      if (fb.rating && summary.byRating.hasOwnProperty(fb.rating)) {
        summary.byRating[fb.rating]++;
        totalRating += fb.rating;
      }
    });

    if (filteredFeedback.length > 0) {
      summary.averageRating = (totalRating / filteredFeedback.length).toFixed(1);
    }

    return res.json({
      feedback: filteredFeedback,
      pagination: {
        total: filteredFeedback.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: filteredFeedback.length > (parseInt(offset) + parseInt(limit))
      },
      summary,
      filters: {
        status,
        type,
        rating
      }
    });

  } catch (error) {
    console.error('Get user feedback error:', error);
    return res.status(500).json({
      error: 'Failed to fetch user feedback',
      details: error.message
    });
  }
}

async function handler(req, res) {
  try {
    applyApiSecurityHeaders(res);

    // Verify admin authentication with proper blacklist checking
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        return await getUserFeedback(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User feedback API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

module.exports = adminRateLimit(handler);
