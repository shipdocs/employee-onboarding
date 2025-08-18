import React, { useState, useEffect } from 'react';
import { Download, Trash2, FileText, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const PrivacyTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accessReportStatus, setAccessReportStatus] = useState(null);
  const [dataExportStatus, setDataExportStatus] = useState(null);
  const [deletionConfirm, setDeletionConfirm] = useState('');
  const [showDeletionForm, setShowDeletionForm] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      checkExistingRequests();
    }
  }, [user]);

  const checkExistingRequests = async () => {
    try {
      const { data: exports } = await supabase
        .from('data_exports')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (exports && exports.length > 0) {
        setDataExportStatus(exports[0]);
      }
    } catch (error) {
      console.error('Error checking requests:', error);
    }
  };

  const requestAccessReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/privacy/user-access-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `access-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setAccessReportStatus('completed');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate access report');
      }
    } catch (error) {
      console.error('Error requesting access report:', error);
      setError(error.message);
      setAccessReportStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const requestDataExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/privacy/user-data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setDataExportStatus(result);
        checkExistingRequests();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request data export');
      }
    } catch (error) {
      console.error('Error requesting data export:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadDataExport = async (exportId) => {
    try {
      const response = await fetch(`/api/privacy/user-data-export/${exportId}/download`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download data export');
      }
    } catch (error) {
      console.error('Error downloading data export:', error);
      setError(error.message);
    }
  };

  const requestAccountDeletion = async () => {
    if (deletionConfirm !== 'DELETE MY ACCOUNT') {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/privacy/delete-user-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmation: deletionConfirm })
      });

      if (response.ok) {
        window.location.href = '/account-deleted';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Privacy & Data Rights</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Access Report */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" />
            <h3 className="text-lg font-medium">Access Report</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Download a comprehensive report of all personal data we have about you.
          </p>
          <button
            onClick={requestAccessReport}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Download Access Report'}
          </button>
          {accessReportStatus === 'completed' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-700">
                Access report downloaded successfully.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5" />
            <h3 className="text-lg font-medium">Data Export</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Request a complete export of your data in machine-readable format.
          </p>

          {dataExportStatus ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-medium">Export Status: {dataExportStatus.status}</p>
                <p className="text-sm text-gray-600">
                  Requested: {new Date(dataExportStatus.created_at).toLocaleDateString()}
                </p>
                {dataExportStatus.status === 'completed' && (
                  <button
                    onClick={() => downloadDataExport(dataExportStatus.id)}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Download Export
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={requestDataExport}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Request Data Export'}
            </button>
          )}
        </div>
      </div>

      {/* Account Deletion */}
      <div className="bg-white shadow rounded-lg border-l-4 border-red-400">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-medium text-red-600">Delete Account</h3>
          </div>

          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Warning</h3>
                <div className="mt-2 text-sm text-red-700">
                  This action cannot be undone. All your data will be permanently deleted.
                </div>
              </div>
            </div>
          </div>

          {!showDeletionForm ? (
            <button
              onClick={() => setShowDeletionForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "DELETE MY ACCOUNT" to confirm:
                </label>
                <input
                  type="text"
                  value={deletionConfirm}
                  onChange={(e) => setDeletionConfirm(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={requestAccountDeletion}
                  disabled={deletionConfirm !== 'DELETE MY ACCOUNT' || loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Confirm Deletion'}
                </button>
                <button
                  onClick={() => {
                    setShowDeletionForm(false);
                    setDeletionConfirm('');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyTab;
