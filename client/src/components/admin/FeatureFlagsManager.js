/**
 * Feature Flags Management Interface
 * Admin interface for managing feature flags with real-time toggles and analytics
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Flag,
  ToggleLeft,
  ToggleRight,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const FeatureFlagsManager = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);
  const queryClient = useQueryClient();

  // Fetch feature flags
  const {
    data: flagsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['feature-flags'],
    () => adminService.getFeatureFlags(),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      onError: (error) => {
        toast.error('Failed to fetch feature flags');
        console.error('Feature flags error:', error);
      }
    }
  );

  // Toggle feature flag mutation
  const toggleFlagMutation = useMutation(
    ({ flagId, enabled }) => adminService.toggleFeatureFlag(flagId, enabled),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('feature-flags');
        toast.success(`Feature flag ${variables.enabled ? 'enabled' : 'disabled'} successfully`);
      },
      onError: (error) => {
        toast.error('Failed to toggle feature flag');
        console.error('Toggle flag error:', error);
      }
    }
  );

  // Create feature flag mutation
  const createFlagMutation = useMutation(
    (flagData) => adminService.createFeatureFlag(flagData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('feature-flags');
        setShowCreateModal(false);
        toast.success('Feature flag created successfully');
      },
      onError: (error) => {
        toast.error('Failed to create feature flag');
        console.error('Create flag error:', error);
      }
    }
  );

  // Delete feature flag mutation
  const deleteFlagMutation = useMutation(
    (flagId) => adminService.deleteFeatureFlag(flagId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('feature-flags');
        toast.success('Feature flag deleted successfully');
      },
      onError: (error) => {
        toast.error('Failed to delete feature flag');
        console.error('Delete flag error:', error);
      }
    }
  );

  const handleToggleFlag = (flagId, currentStatus) => {
    toggleFlagMutation.mutate({ flagId, enabled: !currentStatus });
  };

  const handleDeleteFlag = (flagId, flagName) => {
    if (window.confirm(`Are you sure you want to delete the feature flag "${flagName}"? This action cannot be undone.`)) {
      deleteFlagMutation.mutate(flagId);
    }
  };

  const filteredFlags = (flagsData?.flags || []).filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flag.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'enabled' && flag.enabled) ||
                         (filterStatus === 'disabled' && !flag.enabled);
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (enabled) => {
    return enabled ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <Clock className="w-4 h-4 text-gray-400" />
    );
  };

  const getUsageColor = (usageCount) => {
    if (usageCount > 1000) return 'text-green-600';
    if (usageCount > 100) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading feature flags...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-red-800">Error Loading Feature Flags</h3>
        </div>
        <p className="mt-2 text-red-700">Failed to load feature flags. Please try again.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Flag className="w-6 h-6 mr-2 text-blue-600" />
            Feature Flags Management
          </h2>
          <p className="text-gray-600 mt-1">
            Control feature rollouts and manage system capabilities in real-time
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Flag
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Flags</p>
              <p className="text-2xl font-bold text-gray-900">{flagsData?.stats?.total || 0}</p>
            </div>
            <Flag className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enabled</p>
              <p className="text-2xl font-bold text-green-600">{flagsData?.stats?.enabled || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disabled</p>
              <p className="text-2xl font-bold text-gray-600">{flagsData?.stats?.disabled || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-purple-600">{flagsData?.stats?.totalUsage || 0}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
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
                placeholder="Search feature flags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Feature Flags Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Environment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFlags.map((flag) => (
                <tr key={flag.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{flag.name}</div>
                      <div className="text-sm text-gray-500">{flag.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(flag.enabled)}
                      <button
                        onClick={() => handleToggleFlag(flag.id, flag.enabled)}
                        disabled={toggleFlagMutation.isLoading}
                        className="flex items-center gap-1 hover:opacity-75"
                      >
                        {flag.enabled ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm font-medium ${getUsageColor(flag.usage_count)}`}>
                        {flag.usage_count || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {flag.environment || 'production'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(flag.updated_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingFlag(flag)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFlag(flag.id, flag.name)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteFlagMutation.isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredFlags.length === 0 && (
          <div className="text-center py-12">
            <Flag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feature flags found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first feature flag.'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Feature Flag
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingFlag) && (
        <FeatureFlagModal
          flag={editingFlag}
          isOpen={showCreateModal || !!editingFlag}
          onClose={() => {
            setShowCreateModal(false);
            setEditingFlag(null);
          }}
          onSave={(flagData) => {
            if (editingFlag) {
              // Update existing flag
              toggleFlagMutation.mutate({
                flagId: editingFlag.id,
                enabled: flagData.enabled,
                description: flagData.description
              });
            } else {
              // Create new flag
              createFlagMutation.mutate(flagData);
            }
          }}
        />
      )}
    </div>
  );
};

// Feature Flag Modal Component
const FeatureFlagModal = ({ flag, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: flag?.name || '',
    description: flag?.description || '',
    enabled: flag?.enabled || false,
    environment: flag?.environment || 'production'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Flag name is required');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {flag ? 'Edit Feature Flag' : 'Create Feature Flag'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flag Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!!flag} // Can't edit name of existing flag
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="e.g., new_dashboard_ui"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Describe what this feature flag controls..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <select
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
              Enable this feature flag
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {flag ? 'Update' : 'Create'} Flag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeatureFlagsManager;
