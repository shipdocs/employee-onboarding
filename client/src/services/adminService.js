import api from './apiClient';

// Admin service for admin-specific operations
export const adminService = {
  // System statistics
  getSystemStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Manager management
  getManagers: async () => {
    const response = await api.get('/admin/managers');
    return response.data;
  },

  getManager: async (id) => {
    const response = await api.get(`/admin/managers/${id}`);
    return response.data;
  },

  createManager: async (managerData) => {
    const response = await api.post('/admin/managers', managerData);
    return response.data;
  },

  updateManager: async (id, managerData) => {
    const response = await api.patch(`/admin/managers/${id}`, managerData);
    return response.data;
  },

  deleteManager: async (id) => {
    const response = await api.delete(`/admin/managers/${id}`);
    return response.data;
  },

  sendManagerWelcomeEmail: async (managerId) => {
    const response = await api.post(`/admin/managers/${managerId}/resend-welcome-email`);
    return response.data;
  },

  sendManagerMagicLink: async (managerId) => {
    const response = await api.post(`/admin/managers/${managerId}/send-magic-link`);
    return response.data;
  },

  // System settings
  getSystemSettings: async () => {
    const response = await api.get('/admin/system-settings');
    return response.data;
  },

  updateSystemSettings: async (settings) => {
    const response = await api.put('/admin/system-settings', settings);
    return response.data;
  },

  updateSystemSetting: async (category, key, value) => {
    const response = await api.put('/admin/system-settings', { category, key, value });
    return response.data;
  },

  resetSystemSettings: async (options = {}) => {
    const response = await api.post('/admin/system-settings/reset', options);
    return response.data;
  },

  testIntegration: async (integrationType, settings) => {
    const response = await api.post('/admin/test-integration', {
      type: integrationType,
      settings
    });
    return response.data;
  },

  // Audit logs
  getAuditLogs: async (filters = {}) => {
    const response = await api.get('/admin/audit-log', { params: filters });
    return response.data;
  },

  // Alias for compatibility
  getAuditLog: async (filters = {}) => {
    return adminService.getAuditLogs(filters);
  },

  // Feature flags
  getFeatureFlags: async () => {
    const response = await api.get('/admin/feature-flags');
    return response.data;
  },

  updateFeatureFlag: async (flagKey, enabled) => {
    const response = await api.put('/admin/feature-flags', { key: flagKey, enabled });
    return response.data;
  },

  toggleFeatureFlag: async (flagId, enabled) => {
    const response = await api.put('/admin/feature-flags', { id: flagId, enabled });
    return response.data;
  },

  createFeatureFlag: async (flagData) => {
    const response = await api.post('/admin/feature-flags', flagData);
    return response.data;
  },

  deleteFeatureFlag: async (flagId) => {
    const response = await api.delete(`/admin/feature-flags/${flagId}`);
    return response.data;
  },

  // Security
  getSecurityMetrics: async () => {
    const response = await api.get('/admin/security/metrics');
    return response.data;
  },

  getSecurityEvents: async (filters = {}) => {
    const response = await api.get('/admin/security/events', { params: filters });
    return response.data;
  },

  getSecurityAlerts: async () => {
    const response = await api.get('/admin/security/alerts');
    return response.data;
  },

  acknowledgeSecurityAlert: async (alertId) => {
    const response = await api.post(`/admin/security/alerts/${alertId}`, { action: 'acknowledge' });
    return response.data;
  },

  // Performance metrics
  getPerformanceMetrics: async () => {
    const response = await api.get('/admin/performance/metrics');
    return response.data;
  },

  getMaritimeMetrics: async () => {
    const response = await api.get('/admin/performance/maritime');
    return response.data;
  },

  // Compliance and data management
  getComplianceReports: async () => {
    const response = await api.get('/admin/compliance-reports');
    return response.data;
  },

  downloadComplianceReport: async (id) => {
    const response = await api.get(`/admin/compliance-reports/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  generateComplianceReport: async (reportData) => {
    const response = await api.post('/admin/compliance-reports', reportData);
    return response.data;
  },

  // Data exports and GDPR management
  getDataExports: async () => {
    const response = await api.get('/admin/data-exports');
    return response.data;
  },

  exportUserData: async (userId) => {
    const response = await api.post('/admin/data-exports', { userId });
    return response.data;
  },

  createDataExport: async (exportData) => {
    const response = await api.post('/admin/data-exports', exportData);
    return response.data;
  },

  downloadDataExport: async (exportId) => {
    const response = await api.get(`/admin/data-exports/${exportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getDataDeletions: async () => {
    const response = await api.get('/admin/data-deletions');
    return response.data;
  },

  deleteUserData: async (userId) => {
    const response = await api.delete('/admin/data-deletions', { data: { userId } });
    return response.data;
  },

  createDataDeletion: async (deletionData) => {
    const response = await api.post('/admin/data-deletions', deletionData);
    return response.data;
  },

  // Incidents
  getIncidents: async () => {
    const response = await api.get('/admin/incidents');
    return response.data;
  },

  acknowledgeIncident: async (id) => {
    const response = await api.post(`/admin/incidents/${id}/acknowledge`);
    return response.data;
  },

  resolveIncident: async (id, resolution) => {
    const response = await api.post(`/admin/incidents/${id}/resolve`, { resolution });
    return response.data;
  },

  // User feedback
  getUserFeedback: async () => {
    const response = await api.get('/admin/user-feedback');
    return response.data;
  },

  respondToFeedback: async (id, responseText) => {
    const response = await api.post(`/admin/user-feedback/${id}/respond`, { response: responseText });
    return response.data;
  },

  // Testing and integration
  testNotifications: async (notificationType) => {
    const response = await api.post('/admin/test-notifications', { type: notificationType });
    return response.data;
  },

  // Feedback summary
  getFeedbackSummary: async (params = {}) => {
    const response = await api.get('/admin/feedback/summary', { params });
    return response.data;
  },

  // Vercel Firewall management
  getVercelFirewallStatus: async () => {
    const response = await api.get('/admin/vercel-firewall');
    return response.data;
  },

  executeFirewallAction: async (action, data = {}) => {
    const response = await api.post('/admin/vercel-firewall', { action, ...data });
    return response.data;
  }
};

export default adminService;
