import api from './apiClient';

// Content service for content management operations
export const contentService = {
  // Quizzes
  getQuizzes: async () => {
    const response = await api.get('/content/quizzes');
    return response.data;
  },

  getQuiz: async (id) => {
    const response = await api.get(`/content/quizzes/${id}`);
    return response.data;
  },

  // Training phases
  getTrainingPhases: async () => {
    const response = await api.get('/content/training/phases');
    return response.data;
  },

  getSimplePhases: async () => {
    const response = await api.get('/content/training/phases-simple');
    return response.data;
  },

  getPhaseById: async (id) => {
    const response = await api.get(`/content/training/phases/${id}`);
    return response.data;
  },

  getTrainingPhase: async (id) => {
    const response = await api.get(`/content/training/phases/${id}`);
    return response.data;
  },

  createTrainingPhase: async (phaseData) => {
    const response = await api.post('/content/training/phases', phaseData);
    return response.data;
  },

  updateTrainingPhase: async (id, phaseData) => {
    const response = await api.put(`/content/training/phases/${id}`, phaseData);
    return response.data;
  },

  deleteTrainingPhase: async (id) => {
    const response = await api.delete(`/content/training/phases/${id}`);
    return response.data;
  },

  loadInitialData: async () => {
    const response = await api.post('/content/training/load-initial-data');
    return response.data;
  },

  // Phase Status Management
  updatePhaseStatus: async (id, status, notes = '') => {
    const response = await api.put(`/content/training/phases/${id}`, {
      status,
      approval_notes: notes
    });
    return response.data;
  },

  // Content validation
  validateContent: async (content) => {
    const response = await api.post('/content/validate', content);
    return response.data;
  },

  // Migration
  migrateTrainingData: async () => {
    const response = await api.post('/content/migrate-training-data');
    return response.data;
  },

  checkMigration: async () => {
    const response = await api.get('/content/check-migration');
    return response.data;
  },

  // Media Management
  uploadMedia: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await api.post('/content/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  deleteMedia: async (mediaId) => {
    const response = await api.delete(`/content/media/${mediaId}`);
    return response.data;
  },

  // Upload content media
  uploadContentImage: async (formData) => {
    const response = await api.post('/upload/content-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  uploadContentVideo: async (formData) => {
    const response = await api.post('/upload/content-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Content Analytics
  getContentAnalytics: async (timeRange = '30d') => {
    const response = await api.get(`/content/analytics?range=${timeRange}`);
    return response.data;
  },

  getPhaseUsageStats: async (phaseId) => {
    const response = await api.get(`/content/analytics/phases/${phaseId}/usage`);
    return response.data;
  },

  // Content Search
  searchContent: async (query, filters = {}) => {
    const params = new URLSearchParams({
      q: query,
      ...filters
    });
    const response = await api.get(`/content/search?${params}`);
    return response.data;
  },

  // Content Templates
  getContentTemplates: async () => {
    const response = await api.get('/content/templates');
    return response.data;
  },

  createContentTemplate: async (templateData) => {
    const response = await api.post('/content/templates', templateData);
    return response.data;
  },

  // Content Import/Export
  exportContent: async (phaseIds = []) => {
    const params = phaseIds.length > 0 ? `?phases=${phaseIds.join(',')}` : '';
    const response = await api.get(`/content/export${params}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  importContent: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/content/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Content Versioning
  getVersionHistory: async (phaseId) => {
    const response = await api.get(`/content/training/phases/${phaseId}/versions`);
    return response.data;
  },

  restoreVersion: async (phaseId, versionId) => {
    const response = await api.post(`/content/training/phases/${phaseId}/versions/${versionId}/restore`);
    return response.data;
  },

  compareVersions: async (phaseId, version1, version2) => {
    const response = await api.get(`/content/training/phases/${phaseId}/versions/compare?v1=${version1}&v2=${version2}`);
    return response.data;
  },

  // Content Approval Workflow
  submitForApproval: async (phaseId, notes = '') => {
    const response = await api.post(`/content/training/phases/${phaseId}/submit-approval`, { notes });
    return response.data;
  },

  approveContent: async (phaseId, notes = '') => {
    const response = await api.post(`/content/training/phases/${phaseId}/approve`, { notes });
    return response.data;
  },

  rejectContent: async (phaseId, notes) => {
    const response = await api.post(`/content/training/phases/${phaseId}/reject`, { notes });
    return response.data;
  },

  // Content Scheduling
  schedulePublication: async (phaseId, publishDate) => {
    const response = await api.post(`/content/training/phases/${phaseId}/schedule`, {
      publish_date: publishDate
    });
    return response.data;
  },

  cancelScheduledPublication: async (phaseId) => {
    const response = await api.delete(`/content/training/phases/${phaseId}/schedule`);
    return response.data;
  },

  // Content Collaboration
  getCollaborators: async (phaseId) => {
    const response = await api.get(`/content/training/phases/${phaseId}/collaborators`);
    return response.data;
  },

  addCollaborator: async (phaseId, userId, role = 'editor') => {
    const response = await api.post(`/content/training/phases/${phaseId}/collaborators`, {
      user_id: userId,
      role
    });
    return response.data;
  },

  removeCollaborator: async (phaseId, userId) => {
    const response = await api.delete(`/content/training/phases/${phaseId}/collaborators/${userId}`);
    return response.data;
  },

  // Content Comments
  getComments: async (phaseId) => {
    const response = await api.get(`/content/training/phases/${phaseId}/comments`);
    return response.data;
  },

  addComment: async (phaseId, comment, parentId = null) => {
    const response = await api.post(`/content/training/phases/${phaseId}/comments`, {
      comment,
      parent_id: parentId
    });
    return response.data;
  },

  updateComment: async (phaseId, commentId, comment) => {
    const response = await api.put(`/content/training/phases/${phaseId}/comments/${commentId}`, {
      comment
    });
    return response.data;
  },

  deleteComment: async (phaseId, commentId) => {
    const response = await api.delete(`/content/training/phases/${phaseId}/comments/${commentId}`);
    return response.data;
  },

  // Content Performance
  getContentPerformance: async (phaseId, timeRange = '30d') => {
    const response = await api.get(`/content/analytics/phases/${phaseId}/performance?range=${timeRange}`);
    return response.data;
  },

  getEngagementMetrics: async (phaseId) => {
    const response = await api.get(`/content/analytics/phases/${phaseId}/engagement`);
    return response.data;
  },

  // Content Recommendations
  getContentRecommendations: async (phaseId) => {
    const response = await api.get(`/content/training/phases/${phaseId}/recommendations`);
    return response.data;
  },

  getContentSuggestions: async (query) => {
    const response = await api.get(`/content/suggestions?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};

export default contentService;
