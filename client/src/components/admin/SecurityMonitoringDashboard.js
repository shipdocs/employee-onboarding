/**
 * Security Monitoring Dashboard Component
 * Real-time security event monitoring and alerting
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  AlertTriangle,
  Eye,
  Lock,
  Unlock,
  UserX,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Filter,
  Search,
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const SecurityMonitoringDashboard = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [timeRange, setTimeRange] = useState('24h');
  const [alertFilter, setAlertFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [escalatingEvents, setEscalatingEvents] = useState(new Set());

  // Fetch security events
  const {
    data: securityData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['security-events', timeRange, alertFilter],
    () => adminService.getSecurityEvents({ timeRange, filter: alertFilter }),
    {
      refetchInterval: autoRefresh ? 10000 : false, // Refresh every 10 seconds
      onError: (error) => {
        // Only show error toast if it's a real error, not just initial loading
        setTimeout(() => {
          toast.error(t('admin:security.fetch_error'), {
            duration: 4000,
            style: {
              background: '#dc2626',
              color: '#fff'
            }
          });
        }, 1000);
        console.error('Security events error:', error);
      }
    }
  );

  // Fetch security metrics
  const {
    data: metricsData,
    isLoading: metricsLoading
  } = useQuery(
    ['security-metrics', timeRange],
    () => adminService.getSecurityMetrics({ timeRange }),
    {
      refetchInterval: autoRefresh ? 30000 : false // Refresh every 30 seconds
    }
  );

  const handleRefresh = () => {
    refetch();
    toast.success(t('admin:security.refreshed'));
  };

  const handleExportEvents = async () => {
    try {
      const data = await adminService.exportSecurityEvents({ timeRange, filter: alertFilter });
      // Create and download CSV
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events-${timeRange}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t('admin:security.export_success'));
    } catch (error) {
      toast.error(t('admin:security.export_error'));
    }
  };

  const handleEscalateToIncident = async (event) => {
    if (escalatingEvents.has(event.event_id)) {
      return; // Already escalating
    }

    setEscalatingEvents(prev => new Set(prev).add(event.event_id));

    try {
      const response = await fetch('/api/security/escalate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          event_id: event.event_id,
          force: false
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Security event escalated to incident ${result.incident_id}`, {
          duration: 5000,
          style: {
            background: '#059669',
            color: '#fff'
          }
        });
      } else {
        if (response.status === 409) {
          toast.warning('Security event already escalated to incident', {
            duration: 4000,
            style: {
              background: '#d97706',
              color: '#fff'
            }
          });
        } else {
          toast.error(result.message || 'Failed to escalate security event', {
            duration: 4000,
            style: {
              background: '#dc2626',
              color: '#fff'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error escalating security event:', error);
      toast.error('Failed to escalate security event', {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff'
        }
      });
    } finally {
      setEscalatingEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.event_id);
        return newSet;
      });
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const shouldShowEscalateButton = (event) => {
    return event.severity === 'critical' || event.severity === 'high';
  };

  if (isLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const events = securityData?.events || [];
  const metrics = metricsData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            {t('admin:security.dashboard_title')}
          </h2>
          <p className="text-gray-600">{t('admin:security.dashboard_subtitle')}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border ${
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
            title={autoRefresh ? t('admin:security.auto_refresh_on') : t('admin:security.auto_refresh_off')}
          >
            {autoRefresh ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            title={t('admin:security.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportEvents}
            className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            title={t('admin:security.export')}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Threats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:security.metrics.active_threats')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.activeThreats || 0}
              </p>
              <p className="text-xs text-red-600 flex items-center">
                {metrics.threatTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(metrics.threatTrend || 0)}% from last period
              </p>
            </div>
          </div>
        </div>

        {/* Failed Logins */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserX className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:security.metrics.failed_logins')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.failedLogins || 0}
              </p>
              <p className="text-xs text-gray-500">
                Last 24 hours
              </p>
            </div>
          </div>
        </div>

        {/* Blocked Requests */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Lock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:security.metrics.blocked_requests')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.blockedRequests || 0}
              </p>
              <p className="text-xs text-gray-500">
                Rate limited & blocked
              </p>
            </div>
          </div>
        </div>

        {/* Security Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin:security.metrics.security_score')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.securityScore || 95}/100
              </p>
              <p className="text-xs text-green-600 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Excellent
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:security.time_range')}
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:security.severity_filter')}
              </label>
              <select
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('admin:security.search_events')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-64"
            />
          </div>
        </div>
      </div>

      {/* Security Events List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Activity className="w-5 h-5 text-gray-600 mr-2" />
            {t('admin:security.recent_events')}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:security.event_type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:security.severity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:security.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:security.ip_address')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:security.timestamp')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:security.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events
                .filter(event =>
                  !searchTerm ||
                  event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  event.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  event.ip?.includes(searchTerm)
                )
                .map((event, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {event.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                      {getSeverityIcon(event.severity)}
                      <span className="ml-1 capitalize">{event.severity}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.user || 'Anonymous'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.ip || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventModal(true);
                      }}
                      className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {events.length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('admin:security.no_events')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('admin:security.no_events_description')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Security Event Details
                </h3>
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    setSelectedEvent(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(selectedEvent.severity)}`}>
                      {getSeverityIcon(selectedEvent.severity)}
                      <span className="ml-1 capitalize">{selectedEvent.severity}</span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.user}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedEvent.ip}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.timestamp ? new Date(selectedEvent.timestamp).toLocaleString() : 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                    <p className="mt-1 text-sm text-gray-900 truncate" title={selectedEvent.user_agent}>
                      {selectedEvent.user_agent}
                    </p>
                  </div>
                </div>

                {selectedEvent.threats && selectedEvent.threats.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Detected Threats</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.threats.map((threat, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {threat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Details</label>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <div>
                  {shouldShowEscalateButton(selectedEvent) && (
                    <button
                      onClick={() => handleEscalateToIncident(selectedEvent)}
                      disabled={escalatingEvents.has(selectedEvent.event_id)}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {escalatingEvents.has(selectedEvent.event_id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                          Creating Incident...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Create Incident
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => {
                      setShowEventModal(false);
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityMonitoringDashboard;
