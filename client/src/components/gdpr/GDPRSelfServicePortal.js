/**
 * GDPR Self-Service Portal
 * Allows users to exercise their GDPR rights without admin intervention
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  Download,
  Trash2,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  User,
  Calendar,
  Database,
  Lock,
  Unlock,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

const GDPRSelfServicePortal = () => {
  const { t } = useTranslation(['gdpr', 'common']);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const queryClient = useQueryClient();

  // Fetch user's GDPR requests
  const { data: gdprRequests, isLoading, refetch } = useQuery(
    ['gdpr-requests', user?.id],
    () => fetch('/api/gdpr/my-requests', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json()),
    {
      enabled: !!user?.id,
      refetchInterval: 30000
    }
  );

  // Request data export
  const exportDataMutation = useMutation(
    (exportType) => fetch('/api/gdpr/request-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ exportType })
    }).then(res => res.json()),
    {
      onSuccess: () => {
        toast.success(t('gdpr:export.requestSuccess'));
        refetch();
      },
      onError: (error) => {
        toast.error(t('gdpr:export.requestError'));
        console.error('Export request error:', error);
      }
    }
  );

  // Request data deletion
  const deleteDataMutation = useMutation(
    () => fetch('/api/gdpr/request-deletion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ confirmationText: deleteConfirmationText })
    }).then(res => res.json()),
    {
      onSuccess: () => {
        toast.success(t('gdpr:deletion.requestSuccess'));
        setShowDeleteConfirmation(false);
        setDeleteConfirmationText('');
        refetch();
      },
      onError: (error) => {
        toast.error(t('gdpr:deletion.requestError'));
        console.error('Deletion request error:', error);
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

  const handleDownload = (requestId, fileName) => {
    fetch(`/api/gdpr/download/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `my-data-export-${requestId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch(error => {
      toast.error(t('gdpr:download.error'));
      console.error('Download error:', error);
    });
  };

  const tabs = [
    { id: 'overview', name: t('gdpr:tabs.overview'), icon: Info },
    { id: 'export', name: t('gdpr:tabs.export'), icon: Download },
    { id: 'deletion', name: t('gdpr:tabs.deletion'), icon: Trash2 },
    { id: 'requests', name: t('gdpr:tabs.requests'), icon: FileText }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('gdpr:title')}
            </h1>
            <p className="text-gray-600">
              {t('gdpr:subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Eye className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t('gdpr:overview.dataAccess.title')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('gdpr:overview.dataAccess.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Download className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t('gdpr:overview.dataPortability.title')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('gdpr:overview.dataPortability.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Trash2 className="w-6 h-6 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t('gdpr:overview.dataErasure.title')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('gdpr:overview.dataErasure.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-6 h-6 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t('gdpr:overview.contact.title')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('gdpr:overview.contact.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t('gdpr:overview.yourData.title')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('gdpr:overview.yourData.email')}:</span>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('gdpr:overview.yourData.name')}:</span>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('gdpr:overview.yourData.role')}:</span>
                    <p className="font-medium">{user?.role}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('gdpr:overview.yourData.joined')}:</span>
                    <p className="font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      {t('gdpr:export.info.title')}
                    </h3>
                    <p className="text-blue-800 text-sm">
                      {t('gdpr:export.info.description')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <User className="w-6 h-6 text-gray-600" />
                    <h3 className="font-semibold">{t('gdpr:export.types.personal.title')}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('gdpr:export.types.personal.description')}
                  </p>
                  <button
                    onClick={() => exportDataMutation.mutate('personal')}
                    disabled={exportDataMutation.isLoading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportDataMutation.isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{t('common:loading')}</span>
                      </div>
                    ) : (
                      t('gdpr:export.types.personal.button')
                    )}
                  </button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Database className="w-6 h-6 text-gray-600" />
                    <h3 className="font-semibold">{t('gdpr:export.types.complete.title')}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('gdpr:export.types.complete.description')}
                  </p>
                  <button
                    onClick={() => exportDataMutation.mutate('complete')}
                    disabled={exportDataMutation.isLoading}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportDataMutation.isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{t('common:loading')}</span>
                      </div>
                    ) : (
                      t('gdpr:export.types.complete.button')
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deletion Tab */}
          {activeTab === 'deletion' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900">
                      {t('gdpr:deletion.warning.title')}
                    </h3>
                    <p className="text-red-800 text-sm">
                      {t('gdpr:deletion.warning.description')}
                    </p>
                  </div>
                </div>
              </div>

              {!showDeleteConfirmation ? (
                <div className="text-center">
                  <button
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 font-semibold"
                  >
                    {t('gdpr:deletion.initiateButton')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">
                      {t('gdpr:deletion.confirmation.title')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('gdpr:deletion.confirmation.instruction')}
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder={t('gdpr:deletion.confirmation.placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setShowDeleteConfirmation(false);
                        setDeleteConfirmationText('');
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      {t('common:cancel')}
                    </button>
                    <button
                      onClick={() => deleteDataMutation.mutate()}
                      disabled={deleteConfirmationText !== 'DELETE MY DATA' || deleteDataMutation.isLoading}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteDataMutation.isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>{t('common:processing')}</span>
                        </div>
                      ) : (
                        t('gdpr:deletion.confirmButton')
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {gdprRequests?.requests?.length > 0 ? (
                <div className="space-y-3">
                  {gdprRequests.requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(request.status)}
                          <div>
                            <h3 className="font-semibold">
                              {t(`gdpr:requests.types.${request.type}`)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {t('gdpr:requests.requested')}: {new Date(request.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {t(`gdpr:requests.status.${request.status}`)}
                          </span>
                          {request.status === 'completed' && request.type === 'export' && (
                            <button
                              onClick={() => handleDownload(request.id, request.fileName)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('gdpr:requests.empty.title')}
                  </h3>
                  <p className="text-gray-600">
                    {t('gdpr:requests.empty.description')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GDPRSelfServicePortal;
