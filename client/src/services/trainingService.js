import api from './apiClient';

// Training service for training and quiz operations
export const trainingService = {
  // Phase management
  getPhase: async (phase) => {
    const response = await api.get(`/training/phase/${phase}`);
    return response.data;
  },

  getPhaseTranslations: async (phase) => {
    const response = await api.get(`/training/phase/${phase}/translations`);
    return response.data;
  },

  // Training items
  completeTrainingItem: async (phase, itemNumber) => {
    const response = await api.post(`/training/phase/${phase}/item/${itemNumber}/complete`);
    return response.data;
  },

  uncompleteTrainingItem: async (phase, itemNumber) => {
    const response = await api.post(`/training/phase/${phase}/item/${itemNumber}/uncomplete`);
    return response.data;
  },

  // Quiz operations
  getQuiz: async (phase) => {
    const response = await api.get(`/training/quiz/${phase}`);
    return response.data;
  },

  submitQuiz: async (phase, answers) => {
    const response = await api.post(`/training/quiz/${phase}/submit`, { answers });
    return response.data;
  },

  getQuizTranslations: async (phase) => {
    const response = await api.get(`/training/quiz/${phase}/translations`);
    return response.data;
  },

  translateQuiz: async (phase, language) => {
    const response = await api.post(`/training/quiz/${phase}/translate`, { language });
    return response.data;
  },

  // Quiz history and questions
  getQuizHistory: async () => {
    const response = await api.get('/training/quiz-history');
    return response.data;
  },

  getQuizQuestions: async () => {
    const response = await api.get('/training/quiz-questions');
    return response.data;
  },

  // Training statistics
  getTrainingStats: async () => {
    const response = await api.get('/training/stats');
    return response.data;
  },

  // Upload training proof
  uploadTrainingProof: async (itemId, formData) => {
    const response = await api.post(`/upload/training-proof/${itemId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export default trainingService;