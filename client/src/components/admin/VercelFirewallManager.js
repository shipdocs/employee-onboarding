/**
 * Vercel Firewall Manager
 * Admin interface for real Vercel Firewall integration
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Ban,
  Play,
  Pause,
  Plus,
  Trash2
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const VercelFirewallManager = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [blockIPInput, setBlockIPInput] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const queryClient = useQueryClient();

  // Fetch firewall status
  const {
    data: firewallData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['vercel-firewall-status'],
    () => adminService.getVercelFirewallStatus(),
    {
      refetchInterval: 30000,
      onError: (error) => {
        console.error('Firewall status error:', error);
      }
    }
  );

  // Block IP mutation
  const blockIPMutation = useMutation(
    ({ ipAddress, reason }) => adminService.executeFirewallAction('block_ip', { ipAddress, reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vercel-firewall-status');
        toast.success('IP blocked successfully');
        setBlockIPInput('');
        setBlockReason('');
      },
      onError: (error) => {
        toast.error(`Failed to block IP: ${error.response?.data?.details || error.message}`);
      }
    }
  );

  // Unblock IP mutation
  const unblockIPMutation = useMutation(
    ({ ipAddress, reason }) => adminService.executeFirewallAction('unblock_ip', { ipAddress, reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vercel-firewall-status');
        toast.success('IP unblocked successfully');
      },
      onError: (error) => {
        toast.error(`Failed to unblock IP: ${error.response?.data?.details || error.message}`);
      }
    }
  );

  // Test connection mutation
  const testConnectionMutation = useMutation(
    () => adminService.executeFirewallAction('test_connection', {}),
    {
      onSuccess: (data) => {
        if (data.result.success) {
          toast.success('Vercel Firewall connection successful');
        } else {
          toast.error(`Connection failed: ${data.result.error}`);
        }
      },
      onError: (error) => {
        toast.error(`Connection test failed: ${error.response?.data?.details || error.message}`);
      }
    }
  );

  const handleBlockIP = () => {
    if (!blockIPInput.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    blockIPMutation.mutate({
      ipAddress: blockIPInput.trim(),
      reason: blockReason.trim() || 'Manual admin block'
    });
  };

  const handleUnblockIP = (ipAddress) => {
    unblockIPMutation.mutate({
      ipAddress,
      reason: 'Manual admin unblock'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading firewall status...</span>
      </div>
    );
  }

  const isEnabled = firewallData?.enabled;
  const hasConfiguration = firewallData?.configuration?.firewallEnabled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-600" />
            Vercel Firewall Management
          </h2>
          <p className="text-gray-600 mt-1">
            Real integration with Vercel Firewall API
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
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Settings className="w-4 h-4" />
            Test Connection
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Integration Status</p>
              <p className="text-lg font-bold text-gray-900">
                {isEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            {isEnabled ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Firewall Status</p>
              <p className="text-lg font-bold text-gray-900">
                {hasConfiguration ? 'Active' : 'Inactive'}
              </p>
            </div>
            <Shield className={`w-8 h-8 ${hasConfiguration ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Blocked IPs</p>
              <p className="text-lg font-bold text-red-600">
                {firewallData?.stats?.blockedIPs || 0}
              </p>
            </div>
            <Ban className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      {!isEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-yellow-800">Configuration Required</h3>
          </div>
          <p className="mt-2 text-yellow-700">
            Vercel Firewall integration is not configured. Please set the following environment variables:
          </p>
          <ul className="mt-2 text-yellow-700 list-disc list-inside">
            <li>VERCEL_ACCESS_TOKEN - Your Vercel access token</li>
            <li>VERCEL_PROJECT_ID - Your Vercel project ID</li>
            <li>VERCEL_TEAM_ID - Your Vercel team ID (optional)</li>
          </ul>
        </div>
      )}

      {/* Connection Test Results */}
      {firewallData?.connectionTest && (
        <div className={`border rounded-lg p-4 ${
          firewallData.connectionTest.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            {firewallData.connectionTest.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
            )}
            <h3 className={`text-lg font-medium ${
              firewallData.connectionTest.success ? 'text-green-800' : 'text-red-800'
            }`}>
              Connection Test {firewallData.connectionTest.success ? 'Passed' : 'Failed'}
            </h3>
          </div>
          {firewallData.connectionTest.details && (
            <div className="mt-2">
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(firewallData.connectionTest.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Manual IP Blocking */}
      {isEnabled && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Manual IP Management</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={blockIPInput}
                onChange={(e) => setBlockIPInput(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Suspicious activity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleBlockIP}
                disabled={blockIPMutation.isLoading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Block IP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked IPs List */}
      {isEnabled && firewallData?.blockedIPs && firewallData.blockedIPs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Currently Blocked IPs</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {firewallData.blockedIPs.map((blockedIP, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{blockedIP.ip}</p>
                  {blockedIP.notes && (
                    <p className="text-sm text-gray-600">{blockedIP.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleUnblockIP(blockedIP.ip)}
                  disabled={unblockIPMutation.isLoading}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Actions */}
      {firewallData?.stats?.recentActions && firewallData.stats.recentActions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Firewall Actions</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {firewallData.stats.recentActions.slice(0, 5).map((action, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{action.type}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(action.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    action.details?.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {action.details?.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {action.details && (
                  <div className="mt-2">
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(action.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VercelFirewallManager;
