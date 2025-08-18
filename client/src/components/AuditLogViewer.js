import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  User,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,

  RefreshCw,
  Eye,
  Settings,
  Users,
  FileText,
  Lock
} from 'lucide-react';
import adminService from '../services/adminService';
import toast from 'react-hot-toast';

const AuditLogViewer = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
    user_id: '',
    action: '',
    resource_type: '',
    from_date: '',
    to_date: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const {
    data: auditData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['audit-logs', filters],
    () => adminService.getAuditLogs(filters),
    {
      keepPreviousData: true,
      retry: 2,
      retryDelay: 1000,
      onError: (error) => {
        toast.error(t('admin:dashboard.sections.audit.failed'));
        console.error('Audit log error:', error);
      }
    }
  );

  const auditLogs = auditData?.data || [];
  const pagination = auditData?.pagination || {};

  // Action type icons and colors
  const getActionIcon = (action) => {
    switch (action) {
      case 'admin_login':
      case 'manager_login':
        return <Lock className="w-4 h-4" />;
      case 'view_managers':
      case 'create_manager':
      case 'update_manager':
        return <Users className="w-4 h-4" />;
      case 'view_system_stats':
      case 'view_audit_log':
        return <Eye className="w-4 h-4" />;
      case 'create_template':
      case 'update_template':
        return <FileText className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    if (action.includes('login')) return 'text-green-600 bg-green-100';
    if (action.includes('create')) return 'text-blue-600 bg-blue-100';
    if (action.includes('update')) return 'text-yellow-600 bg-yellow-100';
    if (action.includes('delete')) return 'text-red-600 bg-red-100';
    if (action.includes('view')) return 'text-gray-600 bg-gray-100';
    return 'text-purple-600 bg-purple-100';
  };

  const formatAction = (action) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatResourceType = (resourceType) => {
    return resourceType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 25,
      user_id: '',
      action: '',
      resource_type: '',
      from_date: '',
      to_date: ''
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">{t('admin:dashboard.sections.audit.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {t('admin:dashboard.sections.audit.failed')}
            </h3>
            <div className="mt-2">
              <button
                onClick={() => refetch()}
                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
              >
                {t('admin:dashboard.sections.audit.tryAgain')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t('admin:dashboard.sections.audit.title')}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {t('admin:dashboard.sections.audit.description')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-touch-target ${
                showFilters ? 'bg-gray-100' : ''
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('admin:dashboard.sections.audit.filters')}</span>
              <span className="sm:hidden">Filter</span>
            </button>
            <button
              onClick={() => refetch()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-touch-target"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('admin:dashboard.sections.audit.refresh')}</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:dashboard.sections.audit.action')}
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">{t('admin:dashboard.sections.audit.allActions')}</option>
                <option value="admin_login">{t('admin:dashboard.sections.audit.actions.adminLogin')}</option>
                <option value="manager_login">{t('admin:dashboard.sections.audit.actions.managerLogin')}</option>
                <option value="create_manager">{t('admin:dashboard.sections.audit.actions.userCreated')}</option>
                <option value="update_manager">{t('admin:dashboard.sections.audit.actions.userUpdated')}</option>
                <option value="view_managers">View Managers</option>
                <option value="view_system_stats">View Stats</option>
                <option value="create_template">Create Template</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:dashboard.sections.audit.resourceType')}
              </label>
              <select
                value={filters.resource_type}
                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">{t('admin:dashboard.sections.audit.allActions')}</option>
                <option value="authentication">Authentication</option>
                <option value="manager_management">Manager Management</option>
                <option value="system_administration">System Administration</option>
                <option value="template_management">Template Management</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:dashboard.sections.audit.fromDate')}
              </label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:dashboard.sections.audit.toDate')}
              </label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div className="flex items-end sm:col-span-2 md:col-span-1">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-touch-target"
              >
                <span className="hidden sm:inline">{t('admin:dashboard.sections.audit.clearFilters')}</span>
                <span className="sm:hidden">Clear</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Entries */}
      <div className="divide-y divide-gray-200">
        {auditLogs.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin:dashboard.sections.audit.noLogs')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('admin:dashboard.sections.audit.noLogsDescription')}
            </p>
          </div>
        ) : (
          auditLogs.map((log) => (
            <div key={log.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 p-2 rounded-full ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                      <span className="text-sm font-medium text-gray-900">
                        {formatAction(log.action)}
                      </span>
                      <span className="hidden sm:inline text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">
                        {formatResourceType(log.resource_type || log.resourceType)}
                      </span>
                      {(log.resource_id || log.resourceId) && (
                        <>
                          <span className="hidden sm:inline text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">
                            ID: {log.resource_id || log.resourceId}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-1 space-y-1 sm:space-y-0">
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-500 truncate">
                          {log.user ? `${log.user.first_name || log.user.firstName || ''} ${log.user.last_name || log.user.lastName || ''} (${log.user.email})` : 'Unknown User'}
                        </span>
                      </div>
                      {(log.ip_address || log.ipAddress) && (
                        <>
                          <span className="hidden sm:inline text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">
                            {log.ip_address || log.ipAddress}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 ml-11 sm:ml-0">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">
                    {new Date(log.created_at || log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-2 ml-11">
                  <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800 p-2 rounded bg-gray-50 hover:bg-gray-100 min-touch-target">
                      {t('admin:dashboard.sections.audit.viewDetails')}
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-40 scrollbar-thin">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('admin:dashboard.sections.audit.previous')}
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('admin:dashboard.sections.audit.next')}
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t('admin:dashboard.sections.audit.showing')}{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                {t('admin:dashboard.sections.audit.to')}{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                {t('admin:dashboard.sections.audit.of')}{' '}
                <span className="font-medium">{pagination.total}</span> {t('admin:dashboard.sections.audit.results')}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {t('admin:dashboard.sections.audit.page', { page: pagination.page, totalPages: pagination.totalPages })}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
