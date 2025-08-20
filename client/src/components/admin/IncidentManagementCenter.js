/**
 * Incident Management Center Interface
 * Admin interface for incident tracking, resolution, and external notification management
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  Bell,
  Users,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ExternalLink,
  Shield,
  Zap
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const IncidentManagementCenter = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const queryClient = useQueryClient();

  // Fetch incidents
  const {
    data: incidentsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['incidents'],
    () => adminService.getIncidents(),
    {
      refetchInterval: 30000,
      onError: (error) => {
        toast.error('Failed to fetch incidents');
        console.error('Incidents error:', error);
      }
    }
  );

  // Acknowledge incident mutation
  const acknowledgeIncidentMutation = useMutation(
    ({ incidentId, notes }) => adminService.acknowledgeIncident(incidentId, notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('incidents');
        toast.success('Incident acknowledged successfully');
      },
      onError: (error) => {
        toast.error('Failed to acknowledge incident');
        console.error('Acknowledge incident error:', error);
      }
    }
  );

  // Resolve incident mutation
  const resolveIncidentMutation = useMutation(
    ({ incidentId, resolution }) => adminService.resolveIncident(incidentId, resolution),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('incidents');
        toast.success('Incident resolved successfully');
      },
      onError: (error) => {
        toast.error('Failed to resolve incident');
        console.error('Resolve incident error:', error);
      }
    }
  );

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
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
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'acknowledged':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'investigating':
        return <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  const filteredIncidents = (incidentsData?.incidents || []).filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-red-600" />
            Incident Management Center
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor, track, and resolve security and operational incidents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{incidentsData?.stats?.total || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Incidents</p>
              <p className="text-2xl font-bold text-red-600">{incidentsData?.stats?.open || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{incidentsData?.stats?.critical || 0}</p>
            </div>
            <Zap className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold text-blue-600">{incidentsData?.stats?.avgResolution || '2.4h'}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="detected">Detected</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Incident
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detected
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{incident.title}</div>
                      <div className="text-sm text-gray-500">{incident.incident_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(incident.severity)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(incident.status)}
                      <span className="text-sm text-gray-900">{incident.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{incident.affected_users?.length || 0} users</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(incident.detection_time).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {incident.status === 'detected' && (
                        <button
                          onClick={() => acknowledgeIncidentMutation.mutate({
                            incidentId: incident.id,
                            notes: 'Acknowledged by admin'
                          })}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Acknowledge incident"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      {['detected', 'acknowledged', 'investigating'].includes(incident.status) && (
                        <button
                          onClick={() => resolveIncidentMutation.mutate({
                            incidentId: incident.id,
                            resolution: 'Resolved by admin'
                          })}
                          className="text-green-600 hover:text-green-900"
                          title="Resolve incident"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredIncidents.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No incidents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterSeverity !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No incidents match your current filters.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          isOpen={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onAcknowledge={(notes) => {
            acknowledgeIncidentMutation.mutate({
              incidentId: selectedIncident.id,
              notes
            });
            setSelectedIncident(null);
          }}
          onResolve={(resolution) => {
            resolveIncidentMutation.mutate({
              incidentId: selectedIncident.id,
              resolution
            });
            setSelectedIncident(null);
          }}
        />
      )}
    </div>
  );
};

// Incident Detail Modal Component
const IncidentDetailModal = ({ incident, isOpen, onClose, onAcknowledge, onResolve }) => {
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Incident Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">{incident.title}</h4>
            <p className="text-sm text-gray-600">{incident.incident_id}</p>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-2">Description</h5>
            <p className="text-sm text-gray-700">{incident.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-1">Severity</h5>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${incident.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                {incident.severity}
              </span>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-1">Status</h5>
              <span className="text-sm text-gray-700">{incident.status}</span>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-2">Affected Systems</h5>
            <div className="flex flex-wrap gap-2">
              {incident.affected_systems?.map((system, index) => (
                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {system}
                </span>
              ))}
            </div>
          </div>

          {incident.status === 'detected' && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Acknowledge Incident</h5>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Add acknowledgment notes..."
              />
              <button
                onClick={() => onAcknowledge(notes)}
                className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Acknowledge
              </button>
            </div>
          )}

          {['detected', 'acknowledged', 'investigating'].includes(incident.status) && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Resolve Incident</h5>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Describe the resolution..."
              />
              <button
                onClick={() => onResolve(resolution)}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Resolve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentManagementCenter;
