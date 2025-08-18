/**
 * Performance Dashboard Component
 * Maritime-specific performance monitoring and analytics
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Anchor,
  Wifi,
  WifiOff,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Ship,
  Gauge
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const PerformanceDashboard = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch performance metrics
  const {
    data: performanceData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['performance-metrics', timeRange],
    () => adminService.getPerformanceMetrics({ timeRange }),
    {
      refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
      retry: 2, // Limit retries to prevent infinite loading
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        // Only show error toast if it's a real error, not just initial loading
        setTimeout(() => {
          toast.error(t('admin:performance.fetch_error'), {
            duration: 4000,
            style: {
              background: '#dc2626',
              color: '#fff',
            }
          });
        }, 1000);
        console.error('Performance metrics error:', error);
      }
    }
  );

  // Fetch maritime-specific metrics
  const {
    data: maritimeData,
    isLoading: maritimeLoading
  } = useQuery(
    ['maritime-metrics', timeRange],
    () => adminService.getMaritimeMetrics({ timeRange }),
    {
      refetchInterval: autoRefresh ? 30000 : false,
      retry: 2, // Limit retries to prevent infinite loading
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        // console.error('Maritime metrics error:', error);
      }
    }
  );

  // Fetch user feedback summary
  const {
    data: feedbackData,
    isLoading: feedbackLoading
  } = useQuery(
    ['feedback-summary', timeRange],
    () => adminService.getFeedbackSummary({ timeRange }),
    {
      refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute
      retry: 2, // Limit retries to prevent infinite loading
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        // console.error('Feedback summary error:', error);
      }
    }
  );

  const handleExportData = async () => {
    try {
      const response = await adminService.exportPerformanceData({ timeRange });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(t('admin:performance.export_success'));
    } catch (error) {
      toast.error(t('admin:performance.export_error'));
    }
  };

  if (isLoading || maritimeLoading || feedbackLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">{t('admin:performance.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{t('admin:performance.error_loading')}</span>
        </div>
      </div>
    );
  }

  const metrics = performanceData?.metrics || {};
  const maritime = maritimeData?.metrics || {};
  const feedback = feedbackData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <span>{t('admin:performance.title')}</span>
          </h2>
          <p className="text-gray-600 mt-1">{t('admin:performance.subtitle')}</p>
        </div>

        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">{t('admin:performance.time_ranges.1h')}</option>
            <option value="24h">{t('admin:performance.time_ranges.24h')}</option>
            <option value="7d">{t('admin:performance.time_ranges.7d')}</option>
            <option value="30d">{t('admin:performance.time_ranges.30d')}</option>
          </select>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportData}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('admin:performance.export')}</span>
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Performance Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Gauge className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:performance.metrics.overall_score')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {maritime.performanceScore || 85}/100
              </p>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5% from last period
              </p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:performance.metrics.active_users')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.activeUsers || 0}
              </p>
              <p className="text-xs text-gray-500">
                {maritime.usersAtSea || 0} at sea, {maritime.usersInPort || 0} in port
              </p>
            </div>
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:performance.metrics.avg_response_time')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.avgResponseTime || 0}ms
              </p>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingDown className="w-3 h-3 mr-1" />
                -12ms from last period
              </p>
            </div>
          </div>
        </div>

        {/* User Satisfaction */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:performance.metrics.user_satisfaction')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {feedback.averageRating || 0}/5.0
              </p>
              <p className="text-xs text-gray-500">
                {feedback.totalResponses || 0} responses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Maritime-Specific Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Quality Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Wifi className="w-5 h-5 text-blue-600 mr-2" />
            {t('admin:performance.maritime.connection_quality')}
          </h3>

          <div className="space-y-3">
            {maritime.connectionQuality && Object.entries(maritime.connectionQuality).map(([quality, count]) => (
              <div key={quality} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {quality === 'offline' ? (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  ) : (
                    <Wifi className="w-4 h-4 text-green-500" />
                  )}
                  <span className="text-sm text-gray-700 capitalize">{quality}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(count / (maritime.totalUsers || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Ship className="w-5 h-5 text-blue-600 mr-2" />
            {t('admin:performance.maritime.location_distribution')}
          </h3>

          <div className="space-y-3">
            {maritime.locationDistribution && Object.entries(maritime.locationDistribution).map(([location, count]) => (
              <div key={location} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Anchor className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700 capitalize">{location.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(count / (maritime.totalUsers || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Alerts */}
      {metrics.alerts && metrics.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            {t('admin:performance.alerts.title')}
          </h3>

          <div className="space-y-3">
            {metrics.alerts.map((alert, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Feedback */}
      {feedback.recentFeedback && feedback.recentFeedback.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin:performance.feedback.recent_title')}
          </h3>

          <div className="space-y-3">
            {feedback.recentFeedback.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl">
                  {item.type === 'positive' ? '😊' :
                   item.type === 'negative' ? '😞' : '😐'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{item.context}</span>
                    {item.rating && (
                      <span className="text-sm text-yellow-600">
                        {'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}
                      </span>
                    )}
                  </div>
                  {item.comment && (
                    <p className="text-sm text-gray-600 mt-1">{item.comment}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
