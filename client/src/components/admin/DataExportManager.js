/**
 * Data Export/GDPR Management Interface
 * Admin interface for managing GDPR data export requests and deletion jobs
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Shield,
  Database,
  HardDrive
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const DataExportManager = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [activeTab, setActiveTab] = useState('exports');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedExport, setSelectedExport] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch data exports
  const {
    data: exportsData,
    isLoading: exportsLoading,
    error: exportsError,
    refetch: refetchExports
  } = useQuery(
    ['data-exports'],
    () => adminService.getDataExports(),
    {
      refetchInterval: 30000,
      onError: (error) => {
        toast.error('Failed to fetch data exports');
        console.error('Data exports error:', error);
      }
    }
  );

  // Fetch deletion jobs
  const {
    data: deletionData,
    isLoading: deletionLoading,
    error: deletionError,
    refetch: refetchDeletions
  } = useQuery(
    ['data-deletions'],
    () => adminService.getDataDeletions(),
    {
      refetchInterval: 30000,
      onError: (error) => {
        toast.error('Failed to fetch deletion jobs');
        console.error('Data deletions error:', error);
      }
    }
  );

  // Create export mutation
  const createExportMutation = useMutation(
    (exportData) => adminService.createDataExport(exportData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('data-exports');
        toast.success('Data export request created successfully');
      },
      onError: (error) => {
        toast.error('Failed to create data export request');
        console.error('Create export error:', error);
      }
    }
  );

  // Create deletion job mutation
  const createDeletionMutation = useMutation(
    (deletionData) => adminService.createDataDeletion(deletionData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('data-deletions');
        toast.success('Data deletion job created successfully');
      },
      onError: (error) => {
        toast.error('Failed to create data deletion job');
        console.error('Create deletion error:', error);
      }
    }
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExports = (exportsData?.exports || []).filter(item => {
    const matchesSearch = item.export_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredDeletions = (deletionData?.deletions || []).filter(item => {
    const matchesSearch = item.deletion_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleDownloadExport = (exportId, fileName) => {
    // This would trigger a download of the export file
    adminService.downloadDataExport(exportId)
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `export-${exportId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        toast.error('Failed to download export file');
        console.error('Download error:', error);
      });
  };

  const handleViewExport = (exportItem) => {
    setSelectedExport(exportItem);
    setShowViewModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-600" />
            Data Export & GDPR Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage GDPR data export requests and user data deletion jobs
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              refetchExports();
              refetchDeletions();
            }}
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
              <p className="text-sm text-gray-600">Total Exports</p>
              <p className="text-2xl font-bold text-gray-900">{exportsData?.stats?.total || 0}</p>
            </div>
            <Download className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Exports</p>
              <p className="text-2xl font-bold text-yellow-600">{exportsData?.stats?.pending || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Deletions</p>
              <p className="text-2xl font-bold text-gray-900">{deletionData?.stats?.total || 0}</p>
            </div>
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Data Processed</p>
              <p className="text-2xl font-bold text-purple-600">{exportsData?.stats?.totalSize || '0 MB'}</p>
            </div>
            <Database className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('exports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'exports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Data Exports
          </button>
          <button
            onClick={() => setActiveTab('deletions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deletions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            Data Deletions
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by type or user email..."
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
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'exports' && (
        <ExportsTable
          exports={filteredExports}
          isLoading={exportsLoading}
          error={exportsError}
          onDownload={handleDownloadExport}
          onView={handleViewExport}
          getStatusIcon={getStatusIcon}
          getStatusColor={getStatusColor}
        />
      )}

      {activeTab === 'deletions' && (
        <DeletionsTable
          deletions={filteredDeletions}
          isLoading={deletionLoading}
          error={deletionError}
          getStatusIcon={getStatusIcon}
          getStatusColor={getStatusColor}
        />
      )}

      {/* View Export Modal */}
      {showViewModal && selectedExport && (
        <ExportViewModal
          export={selectedExport}
          onClose={() => {
            setShowViewModal(false);
            setSelectedExport(null);
          }}
        />
      )}
    </div>
  );
};

// Exports Table Component
const ExportsTable = ({ exports, isLoading, error, onDownload, onView, getStatusIcon, getStatusColor }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading data exports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-red-800">Error Loading Data Exports</h3>
        </div>
        <p className="mt-2 text-red-700">Failed to load data exports. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Export Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exports.map((exportItem) => (
              <tr key={exportItem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{exportItem.export_type}</div>
                      <div className="text-sm text-gray-500">ID: {exportItem.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">{exportItem.user_email || 'System'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(exportItem.status)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exportItem.status)}`}>
                      {exportItem.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {exportItem.file_size ? `${(exportItem.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(exportItem.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {exportItem.status === 'completed' && exportItem.file_path && (
                      <button
                        onClick={() => onDownload(exportItem.id, exportItem.file_path)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Download export file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onView(exportItem)}
                      className="text-gray-600 hover:text-gray-900"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {exports.length === 0 && (
        <div className="text-center py-12">
          <Download className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data exports found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No data export requests match your current filters.
          </p>
        </div>
      )}
    </div>
  );
};

// Deletions Table Component (similar structure)
const DeletionsTable = ({ deletions, isLoading, error, getStatusIcon, getStatusColor }) => {
  // Similar implementation to ExportsTable but for deletion jobs
  // ... (implementation would be similar with deletion-specific fields)
  return <div>Deletions table implementation...</div>;
};

// Export View Modal Component
const ExportViewModal = ({ export: exportItem, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Export Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Export Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Export ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{exportItem.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Export Type</label>
                <p className="mt-1 text-sm text-gray-900">{exportItem.export_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User Email</label>
                <p className="mt-1 text-sm text-gray-900">{exportItem.user_email || 'System'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  exportItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                  exportItem.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  exportItem.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {exportItem.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">File Size</label>
                <p className="mt-1 text-sm text-gray-900">
                  {exportItem.file_size ? `${(exportItem.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(exportItem.created_at).toLocaleString()}
                </p>
              </div>
              {exportItem.completed_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(exportItem.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
              {exportItem.file_path && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">File Path</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{exportItem.file_path}</p>
                </div>
              )}
            </div>

            {exportItem.error_message && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Error Message</label>
                <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{exportItem.error_message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            {exportItem.status === 'completed' && exportItem.file_path && (
              <button
                onClick={() => {
                  // Trigger download
                  window.open(`/api/admin/data-exports/${exportItem.id}/download`, '_blank');
                }}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExportManager;
