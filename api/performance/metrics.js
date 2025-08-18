/**
 * Performance Metrics API
 * Handles collection and retrieval of performance metrics
 */

const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  try {
    const userId = req.user.userId;

    if (req.method === 'POST') {
      // Record a new performance metric
      const {
        name,
        value,
        unit,
        timestamp,
        tags,
        sessionId,
        connectionQuality,
        deviceType,
        location,
        vesselAssignment
      } = req.body;

      // Validate required fields
      if (!name || value === undefined || !unit) {
        return res.status(400).json({
          error: 'Missing required fields: name, value, and unit are required'
        });
      }

      // Validate metric value
      if (typeof value !== 'number' || isNaN(value)) {
        return res.status(400).json({
          error: 'Metric value must be a valid number'
        });
      }

      // Prepare metric data
      const metricData = {
        metric_name: name,
        metric_value: value,
        metric_unit: unit,
        tags: tags || {},
        user_id: userId,
        session_id: sessionId,
        recorded_at: timestamp || new Date().toISOString(),
        connection_quality: connectionQuality,
        device_type: deviceType,
        location: location,
        vessel_assignment: vesselAssignment
      };

      // Insert metric into database
      const { data: insertedMetric, error: insertError } = await supabase
        .from('performance_metrics')
        .insert([metricData])
        .select()
        .single();

      if (insertError) {
        // console.error('Error inserting performance metric:', insertError);
        return res.status(500).json({
          error: 'Failed to save performance metric',
          details: insertError.message
        });
      }

      // Check for performance alerts
      await checkPerformanceThresholds(insertedMetric);

      res.json({
        message: 'Performance metric recorded successfully',
        metricId: insertedMetric.id,
        timestamp: insertedMetric.recorded_at
      });

    } else if (req.method === 'GET') {
      // Retrieve performance metrics
      const {
        timeRange = '24h',
        metric,
        limit = 1000,
        offset = 0
      } = req.query;

      // Calculate time range
      const timeRangeMs = parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs).toISOString();

      // Build query
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_at', startTime)
        .order('recorded_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter by specific metric if provided
      if (metric) {
        query = query.eq('metric_name', metric);
      }

      const { data: metrics, error: fetchError } = await query;

      if (fetchError) {
        // console.error('Error fetching performance metrics:', fetchError);
        return res.status(500).json({
          error: 'Failed to fetch performance metrics',
          details: fetchError.message
        });
      }

      // Calculate aggregated statistics
      const stats = calculateMetricStats(metrics);

      res.json({
        metrics,
        stats,
        timeRange,
        totalCount: metrics.length
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (_error) {
    // console.error('Error in performance metrics API:', _error);
    res.status(500).json({
      error: 'Internal server error',
      message: _error.message
    });
  }
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

/**
 * Calculate aggregated statistics for metrics
 */
function calculateMetricStats(metrics) {
  if (!metrics || metrics.length === 0) {
    return {};
  }

  // Group metrics by name
  const metricGroups = metrics.reduce((groups, metric) => {
    const name = metric.metric_name;
    if (!groups[name]) {
      groups[name] = [];
    }
    groups[name].push(metric.metric_value);
    return groups;
  }, {});

  // Calculate stats for each metric
  const stats = {};
  Object.entries(metricGroups).forEach(([name, values]) => {
    const sortedValues = values.sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    stats[name] = {
      count,
      min: sortedValues[0],
      max: sortedValues[count - 1],
      average: sum / count,
      median: count % 2 === 0
        ? (sortedValues[count / 2 - 1] + sortedValues[count / 2]) / 2
        : sortedValues[Math.floor(count / 2)],
      p95: sortedValues[Math.floor(count * 0.95)],
      p99: sortedValues[Math.floor(count * 0.99)]
    };
  });

  return stats;
}

/**
 * Check performance thresholds and create alerts if needed
 */
async function checkPerformanceThresholds(metric) {
  try {
    // Define performance thresholds
    const thresholds = {
      'page_load_time': { critical: 5000, high: 3000, medium: 2000 },
      'api_response_time': { critical: 3000, high: 2000, medium: 1000 },
      'largest_contentful_paint': { critical: 4000, high: 2500, medium: 1500 },
      'cumulative_layout_shift': { critical: 0.25, high: 0.1, medium: 0.05 },
      'memory_usage': { critical: 90, high: 80, medium: 70 }
    };

    const threshold = thresholds[metric.metric_name];
    if (!threshold) return; // No threshold defined for this metric

    let severity = null;
    if (metric.metric_value >= threshold.critical) {
      severity = 'critical';
    } else if (metric.metric_value >= threshold.high) {
      severity = 'high';
    } else if (metric.metric_value >= threshold.medium) {
      severity = 'medium';
    }

    if (severity) {
      // Create performance alert
      const alertData = {
        metric_name: metric.metric_name,
        threshold_value: threshold[severity],
        current_value: metric.metric_value,
        severity,
        alert_type: 'threshold_exceeded',
        description: `${metric.metric_name} exceeded ${severity} threshold: ${metric.metric_value} ${metric.metric_unit}`,
        context_tags: {
          user_id: metric.user_id,
          session_id: metric.session_id,
          location: metric.location,
          device_type: metric.device_type,
          connection_quality: metric.connection_quality
        }
      };

      const { error: alertError } = await supabase
        .from('performance_alerts')
        .insert([alertData]);

      if (alertError) {
        // Skip logging schema cache errors in development
        if (alertError.code === 'PGRST204' && process.env.NODE_ENV === 'development') {
          // Schema cache issue - will resolve automatically
          return;
        }
        // console.error('Error creating performance alert:', alertError);
      }
    }

  } catch (_error) {
    // console.error('Error checking performance thresholds:', _error);
  }
}

module.exports = apiRateLimit(requireAuth(handler));
