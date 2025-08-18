import api from './apiClient';

// Authentication service for all auth-related operations
export const authService = {
  magicLogin: async (token) => {
    const response = await api.post('/auth/magic-login', { token });
    return response.data;
  },

  managerLogin: async (email, password) => {
    const response = await api.post('/auth/manager-login', { email, password });
    return response.data;
  },

  adminLogin: async (email, password, mfaToken = null) => {
    const response = await api.post('/auth/login-with-mfa', {
      email,
      password,
      mfaToken
    });
    return response.data;
  },

  // Staff login for both admin and manager roles with MFA support
  staffLogin: async (email, password, mfaToken = null) => {
    const response = await api.post('/auth/login-with-mfa', {
      email,
      password,
      mfaToken
    });
    return response.data;
  },

  devLogin: async (email) => {
    const response = await api.post('/auth/dev-login', { email });
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  requestMagicLink: async (email) => {
    const response = await api.post('/auth/request-magic-link', { email });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  // MFA related methods
  setupMFA: async () => {
    const response = await api.post('/auth/mfa/setup');
    return response.data;
  },

  enableMFA: async (token) => {
    const response = await api.post('/auth/mfa/enable', { token });
    return response.data;
  },

  getMFAStatus: async () => {
    const response = await api.get('/auth/mfa/status');
    return response.data;
  },

  getBackupCodes: async () => {
    const response = await api.get('/auth/mfa/backup-codes');
    return response.data;
  }
};

export default authService;