import api from './apiClient';

// Manager service for manager-specific operations
export const managerService = {
  // Crew management
  createCrewMember: async (crewData) => {
    const response = await api.post('/manager/crew', crewData);
    return response.data;
  },

  getCrewMembers: async () => {
    const response = await api.get('/manager/crew');
    return response.data;
  },

  getCrewMember: async (id) => {
    const response = await api.get(`/manager/crew/${id}`);
    return response.data;
  },

  updateCrewMember: async (id, crewData) => {
    const response = await api.put(`/manager/crew/${id}`, crewData);
    return response.data;
  },

  deleteCrewMember: async (id, forceDelete = false) => {
    const response = await api.delete(`/manager/crew/${id}${forceDelete ? '?forceDelete=true' : ''}`);
    return response.data;
  },

  bulkAction: async (action, userIds) => {
    const response = await api.post('/manager/crew/bulk-action', { action, userIds });
    return response.data;
  },

  updateCrewStatus: async (id, status) => {
    const response = await api.patch(`/manager/crew/${id}/status`, { status });
    return response.data;
  },

  sendOnboardingStart: async (crewId) => {
    const response = await api.post(`/manager/crew/${crewId}/send-onboarding-start`);
    return response.data;
  },

  sendMagicLink: async (crewId) => {
    const response = await api.post(`/manager/crew/${crewId}/send-magic-link`);
    return response.data;
  },

  sendCompletionEmail: async (crewId, comments = '') => {
    const response = await api.post(`/manager/crew/${crewId}/resend-completion-email`, { comments });
    return response.data;
  },

  resendCompletionEmail: async (id, comments = '') => {
    const response = await api.post(`/manager/crew/${id}/resend-completion-email`, { comments });
    return response.data;
  },

  sendSafetyPDF: async (crewId) => {
    const response = await api.post(`/manager/crew/${crewId}/send-safety-pdf`);
    return response.data;
  },

  // Dashboard and statistics
  getDashboardStats: async () => {
    const response = await api.get('/manager/dashboard/stats');
    return response.data;
  },

  getOnboardingOverview: async () => {
    const response = await api.get('/manager/onboarding/overview');
    return response.data;
  },

  // Quiz reviews
  getPendingQuizReviews: async () => {
    const response = await api.get('/manager/quiz-reviews/pending');
    return response.data;
  },

  approveQuizReview: async (id, data) => {
    const response = await api.post(`/manager/quiz-reviews/${id}/approve`, data);
    return response.data;
  },

  reviewQuiz: async (quizId, reviewData) => {
    const response = await api.post(`/manager/quiz-reviews/${quizId}/approve`, reviewData);
    return response.data;
  },

  // Onboarding reviews
  getOnboardingReviews: async () => {
    const response = await api.get('/manager/onboarding-reviews');
    return response.data;
  },

  approveOnboardingReview: async (userId, data) => {
    const response = await api.post(`/manager/onboarding-reviews/${userId}/approve`, data);
    return response.data;
  },

  approveOnboarding: async (userId) => {
    const response = await api.post(`/manager/onboarding-reviews/${userId}/approve`);
    return response.data;
  },

  // Certificates
  getCertificates: async (params = {}) => {
    const { page, limit, certificate_type, user_id, from_date, to_date, sort_by, sort_order } = params;
    const queryParams = new URLSearchParams();

    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (certificate_type) queryParams.append('certificate_type', certificate_type);
    if (user_id) queryParams.append('user_id', user_id);
    if (from_date) queryParams.append('from_date', from_date);
    if (to_date) queryParams.append('to_date', to_date);
    if (sort_by) queryParams.append('sort_by', sort_by);
    if (sort_order) queryParams.append('sort_order', sort_order);

    const url = `/manager/certificates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  getCertificate: async (id) => {
    const response = await api.get(`/manager/certificates/${id}`);
    return response.data;
  },

  updateCertificate: async (id, data) => {
    const response = await api.put(`/manager/certificates/${id}`, data);
    return response.data;
  },

  deleteCertificate: async (id) => {
    const response = await api.delete(`/manager/certificates/${id}`);
    return response.data;
  },

  regenerateCertificate: async (data) => {
    const response = await api.post('/manager/certificates/regenerate', data);
    return response.data;
  }
};

export default managerService;
