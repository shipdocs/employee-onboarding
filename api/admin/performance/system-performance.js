/**
 * Maritime-Specific Performance Metrics API
 * Provides performance environment performance analytics
 */

const db = require('../../../lib/database-direct');
const { requireAdmin } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      timeRange = '24h',
      location,
      vessel
    } = req.query;

    // Calculate time range
    const timeRangeMs = parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs).toISOString();

    // Get performance-specific metrics
    const performanceMetrics = await getMaritimeMetrics(startTime, { location, vessel });

    // Get training performance by location
    const trainingPerformance = await getTrainingPerformanceByLocation(startTime);

    // Get connection quality analysis
    const connectionAnalysis = await getConnectionQualityAnalysis(startTime);

    // Get device usage patterns
    const devicePatterns = await getDeviceUsagePatterns(startTime);

    // Get vessel-specific insights
    const vesselInsights = await getVesselSpecificInsights(startTime);

    res.json({
      metrics: {
        performanceScore: calculateMaritimePerformanceScore(performanceMetrics),
        totalUsers: performanceMetrics.totalUsers,
        usersAtSea: performanceMetrics.locationDistribution?.at_sea || 0,
        usersInPort: performanceMetrics.locationDistribution?.in_port || 0,
        usersOnshore: performanceMetrics.locationDistribution?.onshore || 0,
        connectionQuality: performanceMetrics.connectionQuality,
        locationDistribution: performanceMetrics.locationDistribution,
        averageBandwidth: performanceMetrics.averageBandwidth,
        averageLatency: performanceMetrics.averageLatency,
        offlineTime: performanceMetrics.totalOfflineTime
      },
      trainingPerformance,
      connectionAnalysis,
      devicePatterns,
      vesselInsights,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (_error) {
    // console.error('Error in performance performance metrics API:', _error);
    res.status(500).json({
      error: 'Internal server error',
      message: _error.message
    });
  }
}

/**
 * Get performance-specific performance metrics
 */
async function getMaritimeMetrics(startTime, filters = {}) {
  try {
    // Build base query
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .gte('recorded_at', startTime);

    // Apply filters
    if (filters.location) {
      query = query.eq('location', filters.location);
    }
    if (filters.vessel) {
      query = query.eq('vessel_assignment', filters.vessel);
    }

    const { data: metrics, error } = await query;

    if (error) {
      throw error;
    }

    // Analyze metrics
    const totalUsers = new Set(metrics.map(m => m.user_id)).size;

    // Location distribution
    const locationDistribution = metrics.reduce((acc, m) => {
      if (m.location) {
        acc[m.location] = (acc[m.location] || 0) + 1;
      }
      return acc;
    }, {});

    // Connection quality distribution
    const connectionQuality = metrics.reduce((acc, m) => {
      if (m.connection_quality) {
        acc[m.connection_quality] = (acc[m.connection_quality] || 0) + 1;
      }
      return acc;
    }, {});

    // Bandwidth metrics
    const bandwidthMetrics = metrics.filter(m => m.metric_name === 'connection_bandwidth');
    const averageBandwidth = bandwidthMetrics.length > 0
      ? bandwidthMetrics.reduce((sum, m) => sum + m.metric_value, 0) / bandwidthMetrics.length
      : 0;

    // Latency metrics
    const latencyMetrics = metrics.filter(m => m.metric_name === 'connection_rtt');
    const averageLatency = latencyMetrics.length > 0
      ? latencyMetrics.reduce((sum, m) => sum + m.metric_value, 0) / latencyMetrics.length
      : 0;

    // Offline time
    const offlineMetrics = metrics.filter(m => m.metric_name === 'offline_time');
    const totalOfflineTime = offlineMetrics.reduce((sum, m) => sum + m.metric_value, 0);

    return {
      totalUsers,
      locationDistribution,
      connectionQuality,
      averageBandwidth,
      averageLatency,
      totalOfflineTime,
      rawMetrics: metrics
    };

  } catch (_error) {
    // console.error('Error getting performance metrics:', _error);
    return {};
  }
}

/**
 * Get training performance by location
 */
async function getTrainingPerformanceByLocation(startTime) {
  try {
    const { data: trainingMetrics, error } = await supabase
      .from('performance_training_metrics')
      .select('*')
      .gte('start_time', startTime);

    if (error) {
      throw error;
    }

    // Group by location
    const locationPerformance = trainingMetrics.reduce((acc, metric) => {
      const location = metric.location || 'unknown';
      if (!acc[location]) {
        acc[location] = {
          totalSessions: 0,
          completedSessions: 0,
          averageCompletionRate: 0,
          averageRetryCount: 0,
          totalOfflineTime: 0,
          averageSessionDuration: 0
        };
      }

      acc[location].totalSessions++;
      if (metric.completion_rate === 100) {
        acc[location].completedSessions++;
      }
      acc[location].averageCompletionRate += metric.completion_rate;
      acc[location].averageRetryCount += metric.retry_count;
      acc[location].totalOfflineTime += metric.offline_time_ms;

      if (metric.end_time) {
        const duration = new Date(metric.end_time) - new Date(metric.start_time);
        acc[location].averageSessionDuration += duration;
      }

      return acc;
    }, {});

    // Calculate averages
    Object.keys(locationPerformance).forEach(location => {
      const data = locationPerformance[location];
      data.averageCompletionRate = data.averageCompletionRate / data.totalSessions;
      data.averageRetryCount = data.averageRetryCount / data.totalSessions;
      data.averageSessionDuration = data.averageSessionDuration / data.totalSessions;
      data.completionRate = (data.completedSessions / data.totalSessions) * 100;
    });

    return locationPerformance;

  } catch (_error) {
    // console.error('Error getting training performance by location:', _error);
    return {};
  }
}

/**
 * Get connection quality analysis
 */
async function getConnectionQualityAnalysis(startTime) {
  try {
    const { data: connectionMetrics, error } = await supabase
      .from('performance_metrics')
      .select('connection_quality, location, metric_value, recorded_at')
      .in('metric_name', ['connection_bandwidth', 'connection_rtt'])
      .gte('recorded_at', startTime)
      .not('connection_quality', 'is', null);

    if (error) {
      throw error;
    }

    // Analyze connection patterns
    const analysis = {
      qualityByLocation: {},
      qualityTrends: {},
      performanceImpact: {}
    };

    // Group by location and quality
    connectionMetrics.forEach(metric => {
      const location = metric.location || 'unknown';
      const quality = metric.connection_quality;

      if (!analysis.qualityByLocation[location]) {
        analysis.qualityByLocation[location] = {};
      }
      if (!analysis.qualityByLocation[location][quality]) {
        analysis.qualityByLocation[location][quality] = 0;
      }
      analysis.qualityByLocation[location][quality]++;
    });

    return analysis;

  } catch (_error) {
    // console.error('Error getting connection quality analysis:', _error);
    return {};
  }
}

/**
 * Get device usage patterns
 */
async function getDeviceUsagePatterns(startTime) {
  try {
    const { data: deviceMetrics, error } = await supabase
      .from('performance_metrics')
      .select('device_type, location, connection_quality, user_id')
      .gte('recorded_at', startTime)
      .not('device_type', 'is', null);

    if (error) {
      throw error;
    }

    // Analyze device patterns
    const patterns = {
      devicesByLocation: {},
      devicesByConnectionQuality: {},
      uniqueUsersByDevice: {}
    };

    deviceMetrics.forEach(metric => {
      const device = metric.device_type;
      const location = metric.location || 'unknown';
      const quality = metric.connection_quality || 'unknown';

      // Devices by location
      if (!patterns.devicesByLocation[location]) {
        patterns.devicesByLocation[location] = {};
      }
      patterns.devicesByLocation[location][device] = (patterns.devicesByLocation[location][device] || 0) + 1;

      // Devices by connection quality
      if (!patterns.devicesByConnectionQuality[quality]) {
        patterns.devicesByConnectionQuality[quality] = {};
      }
      patterns.devicesByConnectionQuality[quality][device] = (patterns.devicesByConnectionQuality[quality][device] || 0) + 1;

      // Unique users by device
      if (!patterns.uniqueUsersByDevice[device]) {
        patterns.uniqueUsersByDevice[device] = new Set();
      }
      patterns.uniqueUsersByDevice[device].add(metric.user_id);
    });

    // Convert sets to counts
    Object.keys(patterns.uniqueUsersByDevice).forEach(device => {
      patterns.uniqueUsersByDevice[device] = patterns.uniqueUsersByDevice[device].size;
    });

    return patterns;

  } catch (_error) {
    // console.error('Error getting device usage patterns:', _error);
    return {};
  }
}

/**
 * Get vessel-specific insights
 */
async function getVesselSpecificInsights(startTime) {
  try {
    const { data: vesselMetrics, error } = await supabase
      .from('performance_metrics')
      .select('vessel_assignment, metric_name, metric_value, connection_quality, location')
      .gte('recorded_at', startTime)
      .not('vessel_assignment', 'is', null);

    if (error) {
      throw error;
    }

    // Group by vessel
    const vesselInsights = vesselMetrics.reduce((acc, metric) => {
      const vessel = metric.vessel_assignment;
      if (!acc[vessel]) {
        acc[vessel] = {
          totalMetrics: 0,
          connectionQuality: {},
          locations: {},
          performanceMetrics: {}
        };
      }

      acc[vessel].totalMetrics++;

      // Connection quality distribution
      if (metric.connection_quality) {
        acc[vessel].connectionQuality[metric.connection_quality] =
          (acc[vessel].connectionQuality[metric.connection_quality] || 0) + 1;
      }

      // Location distribution
      if (metric.location) {
        acc[vessel].locations[metric.location] =
          (acc[vessel].locations[metric.location] || 0) + 1;
      }

      // Performance metrics
      if (!acc[vessel].performanceMetrics[metric.metric_name]) {
        acc[vessel].performanceMetrics[metric.metric_name] = [];
      }
      acc[vessel].performanceMetrics[metric.metric_name].push(metric.metric_value);

      return acc;
    }, {});

    // Calculate averages for each vessel
    Object.keys(vesselInsights).forEach(vessel => {
      const data = vesselInsights[vessel];
      Object.keys(data.performanceMetrics).forEach(metricName => {
        const values = data.performanceMetrics[metricName];
        data.performanceMetrics[metricName] = {
          average: values.reduce((sum, v) => sum + v, 0) / values.length,
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });
    });

    return vesselInsights;

  } catch (_error) {
    // console.error('Error getting vessel-specific insights:', _error);
    return {};
  }
}

/**
 * Calculate performance performance score
 */
function calculateMaritimePerformanceScore(metrics) {
  let score = 100;

  // Connection quality impact
  const connectionQuality = metrics.connectionQuality || {};
  const totalConnections = Object.values(connectionQuality).reduce((sum, count) => sum + count, 0);

  if (totalConnections > 0) {
    const excellentRatio = (connectionQuality.excellent || 0) / totalConnections;
    const goodRatio = (connectionQuality.good || 0) / totalConnections;
    const poorRatio = (connectionQuality.poor || 0) / totalConnections;
    const offlineRatio = (connectionQuality.offline || 0) / totalConnections;

    score = score * (excellentRatio * 1.0 + goodRatio * 0.8 + poorRatio * 0.4 + offlineRatio * 0.1);
  }

  // Bandwidth impact
  if (metrics.averageBandwidth < 1) score *= 0.7;
  else if (metrics.averageBandwidth < 5) score *= 0.9;

  // Latency impact
  if (metrics.averageLatency > 500) score *= 0.6;
  else if (metrics.averageLatency > 200) score *= 0.8;

  return Math.round(Math.max(0, Math.min(100, score)));
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

module.exports = adminRateLimit(requireAdmin(handler));
