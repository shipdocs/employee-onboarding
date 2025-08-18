/**
 * Compliance Reports Management Interface
 * Admin interface for generating, viewing, and exporting compliance reports
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  Shield,
  Users,
  Database
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const ComplianceReportsManager = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch compliance reports
  const {
    data: reportsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['compliance-reports'],
    () => adminService.getComplianceReports(),
    {
      refetchInterval: 60000, // Refresh every minute
      onError: (error) => {
        toast.error('Failed to fetch compliance reports');
        console.error('Compliance reports error:', error);
      }
    }
  );

  // Generate report mutation
  const generateReportMutation = useMutation(
    (reportData) => adminService.generateComplianceReport(reportData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('compliance-reports');
        setShowGenerateModal(false);
        toast.success('Compliance report generation started');
      },
      onError: (error) => {
        toast.error('Failed to generate compliance report');
        console.error('Generate report error:', error);
      }
    }
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'generating':
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
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'gdpr_compliance':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'security_audit':
        return <Shield className="w-5 h-5 text-red-600" />;
      case 'user_activity':
        return <Users className="w-5 h-5 text-green-600" />;
      case 'data_retention':
        return <Database className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredReports = (reportsData?.reports || []).filter(report => {
    const matchesSearch = report.report_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.report_type === filterType;
    const matchesPeriod = filterPeriod === 'all' || 
                         (filterPeriod === 'recent' && new Date(report.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    return matchesSearch && matchesType && matchesPeriod;
  });

  const handleDownloadReport = (reportId, fileName) => {
    adminService.downloadComplianceReport(reportId)
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `compliance-report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        toast.error('Failed to download report');
        console.error('Download error:', error);
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading compliance reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-red-800">Error Loading Compliance Reports</h3>
        </div>
        <p className="mt-2 text-red-700">Failed to load compliance reports. Please try again.</p>
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
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Compliance Reports Management
          </h2>
          <p className="text-gray-600 mt-1">
            Generate, view, and export compliance reports for regulatory requirements
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
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reportsData?.stats?.total || 0}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-green-600">{reportsData?.stats?.thisMonth || 0}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Generating</p>
              <p className="text-2xl font-bold text-yellow-600">{reportsData?.stats?.generating || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Compliance Score</p>
              <p className="text-2xl font-bold text-purple-600">{reportsData?.stats?.complianceScore || '95%'}</p>
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
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="gdpr_compliance">GDPR Compliance</option>
              <option value="security_audit">Security Audit</option>
              <option value="user_activity">User Activity</option>
              <option value="data_retention">Data Retention</option>
            </select>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="recent">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getReportTypeIcon(report.report_type)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                        <div className="text-sm text-gray-500">ID: {report.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {report.report_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(report.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.period_start && report.period_end ? 
                      `${new Date(report.period_start).toLocaleDateString()} - ${new Date(report.period_end).toLocaleDateString()}` :
                      'All time'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {report.status === 'completed' && (
                        <button
                          onClick={() => handleDownloadReport(report.id, report.file_name)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
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

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No compliance reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' || filterPeriod !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by generating your first compliance report.'
              }
            </p>
            {!searchTerm && filterType === 'all' && filterPeriod === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <GenerateReportModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={(reportData) => generateReportMutation.mutate(reportData)}
        />
      )}
    </div>
  );
};

// Generate Report Modal Component
const GenerateReportModal = ({ isOpen, onClose, onGenerate }) => {
  const [formData, setFormData] = useState({
    reportType: 'gdpr_compliance',
    title: '',
    periodStart: '',
    periodEnd: '',
    includeUserData: true,
    includeSecurityEvents: true,
    includeAuditLogs: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Report title is required');
      return;
    }
    onGenerate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Generate Compliance Report
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={formData.reportType}
              onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="gdpr_compliance">GDPR Compliance</option>
              <option value="security_audit">Security Audit</option>
              <option value="user_activity">User Activity</option>
              <option value="data_retention">Data Retention</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Monthly GDPR Compliance Report"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period Start
              </label>
              <input
                type="date"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period End
              </label>
              <input
                type="date"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Include Data
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.includeUserData}
                  onChange={(e) => setFormData({ ...formData, includeUserData: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">User Data</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.includeSecurityEvents}
                  onChange={(e) => setFormData({ ...formData, includeSecurityEvents: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">Security Events</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.includeAuditLogs}
                  onChange={(e) => setFormData({ ...formData, includeAuditLogs: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">Audit Logs</span>
              </label>
            </div>
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
              Generate Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplianceReportsManager;
