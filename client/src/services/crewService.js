import api from './apiClient';

// Crew service for crew member operations
export const crewService = {
  // Profile management
  getProfile: async () => {
    const response = await api.get('/crew/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/crew/profile', profileData);
    return response.data;
  },

  // Training progress
  getTrainingProgress: async () => {
    const response = await api.get('/crew/training/progress');
    return response.data;
  },

  getPhaseProgress: async (phase) => {
    const response = await api.get(`/crew/training/phase/${phase}`);
    return response.data;
  },

  startPhase: async (phase) => {
    const response = await api.post(`/crew/training/phase/${phase}/start`);
    return response.data;
  },

  getPhaseDetails: async (phase) => {
    const response = await api.get(`/crew/training/phase/${phase}/details`);
    return response.data;
  },

  getAllTrainingPhases: async () => {
    const response = await api.get('/crew/training/phases');
    return response.data;
  },

  completeTrainingItem: async (itemId, data) => {
    const response = await api.post(`/crew/training/item/${itemId}/complete`, data);
    return response.data;
  },

  getPhase: async (phase) => {
    const response = await api.get(`/crew/training/phase/${phase}`);
    return response.data;
  },

  completeItem: async (phase, itemNumber) => {
    const response = await api.post(`/crew/training/phase/${phase}/item/${itemNumber}/complete`);
    return response.data;
  },

  uncompleteItem: async (phase, itemNumber) => {
    const response = await api.post(`/crew/training/phase/${phase}/item/${itemNumber}/uncomplete`);
    return response.data;
  },

  getQuiz: async (phase) => {
    const response = await api.get(`/crew/quiz/phase/${phase}`);
    return response.data;
  },

  submitQuiz: async (phase, submissionData) => {
    const response = await api.post(`/crew/quiz/phase/${phase}/submit`, submissionData);
    return response.data;
  },

  getQuizHistory: async () => {
    const response = await api.get('/crew/quiz/history');
    return response.data;
  },

  completePhase: async (phase) => {
    const response = await api.post(`/crew/training/phase/${phase}/complete`);
    return response.data;
  },

  getCertificates: async () => {
    const response = await api.get('/crew/certificates');
    return response.data;
  },

  updateLanguagePreference: async (language) => {
    const response = await api.post('/crew/update-language', { language });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/crew/stats');
    return response.data;
  },

  // Onboarding
  getOnboardingProgress: async () => {
    const response = await api.get('/crew/onboarding/progress');
    return response.data;
  },

  getOnboardingAnalytics: async () => {
    const response = await api.get('/crew/onboarding/analytics');
    return response.data;
  },

  // Forms
  completeForm: async (formData) => {
    const response = await api.post('/crew/forms/complete', formData);
    return response.data;
  },

  // Process completion
  completeProcess: async (processData) => {
    const response = await api.post('/crew/process/complete', processData);
    return response.data;
  },

  // Session management
  createSession: async (userId, phase) => {
    const response = await api.post('/crew/sessions', { userId, phase });
    return response.data;
  },

  updateSession: async (sessionId, data) => {
    const response = await api.put(`/crew/sessions/${sessionId}`, data);
    return response.data;
  },

  getSession: async (sessionId) => {
    const response = await api.get(`/crew/sessions/${sessionId}`);
    return response.data;
  }
};

export default crewService;
