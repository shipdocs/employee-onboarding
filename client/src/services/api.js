// This file now acts as a backward compatibility layer
// It re-exports all services from their new modular files
// Components should gradually migrate to importing directly from the service files

import apiClient from './apiClient';
import authService from './authService';
import adminService from './adminService';
import managerService from './managerService';
import crewService from './crewService';
import trainingService from './trainingService';
import contentService from './contentService';

// Re-export token utilities from apiClient for backward compatibility
import { isTokenExpired, getTokenExpirationTime, isTokenExpiringSoon } from './apiClient';

// Import services that don't have their own files yet
// These will be migrated in future iterations
const baseURL = process.env.REACT_APP_API_URL || '/api';

// Phase translation service
const phaseTranslationService = {
  getTranslations: async (phase, language = 'en') => {
    const response = await apiClient.get(`/translations/phase/${phase}?lang=${language}`);
    return response.data;
  },

  getAllTranslations: async (language = 'en') => {
    const response = await apiClient.get(`/translations/phases?lang=${language}`);
    return response.data;
  }
};

// Quiz translation service
const quizTranslationService = {
  getTranslations: async (phase, language = 'en') => {
    const response = await apiClient.get(`/translations/quiz/${phase}?lang=${language}`);
    return response.data;
  },

  getAllTranslations: async (language = 'en') => {
    const response = await apiClient.get(`/translations/quizzes?lang=${language}`);
    return response.data;
  }
};

// Translation service
const translationService = {
  getAll: async (language = 'en') => {
    const response = await apiClient.get(`/translations/all?lang=${language}`);
    return response.data;
  },

  getByKey: async (key, language = 'en') => {
    const response = await apiClient.get(`/translations/key/${key}?lang=${language}`);
    return response.data;
  },

  update: async (translations) => {
    const response = await apiClient.put('/translations', translations);
    return response.data;
  }
};

// Template service
const templateService = {
  getTemplates: async () => {
    const response = await apiClient.get('/templates');
    return response.data;
  },

  getTemplate: async (id) => {
    const response = await apiClient.get(`/templates/${id}`);
    return response.data;
  },

  createTemplate: async (templateData) => {
    const response = await apiClient.post('/templates', templateData);
    return response.data;
  },

  updateTemplate: async (id, templateData) => {
    const response = await apiClient.put(`/templates/${id}`, templateData);
    return response.data;
  },

  deleteTemplate: async (id) => {
    const response = await apiClient.delete(`/templates/${id}`);
    return response.data;
  },

  generateCertificate: async (templateId, data) => {
    const response = await apiClient.post(`/pdf/generate-from-template/${templateId}`, data, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Workflow service
const workflowService = {
  getWorkflows: async () => {
    const response = await apiClient.get('/workflows');
    return response.data;
  },

  getWorkflow: async (id) => {
    const response = await apiClient.get(`/workflows/${id}`);
    return response.data;
  },

  createWorkflow: async (workflowData) => {
    const response = await apiClient.post('/workflows', workflowData);
    return response.data;
  },

  updateWorkflow: async (id, workflowData) => {
    const response = await apiClient.put(`/workflows/${id}`, workflowData);
    return response.data;
  },

  deleteWorkflow: async (id) => {
    const response = await apiClient.delete(`/workflows/${id}`);
    return response.data;
  },

  getWorkflowStatus: async (id) => {
    const response = await apiClient.get(`/workflows/${id}/status`);
    return response.data;
  }
};

// Upload service
const uploadService = {
  uploadFile: async (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await apiClient.post('/upload/profile-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  uploadDocument: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('document', file);
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    const response = await apiClient.post('/upload/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Re-export the axios instance as 'api' for backward compatibility
const api = apiClient;

// Export all services
export {
  api,
  apiClient,
  authService,
  adminService,
  managerService,
  crewService,
  trainingService,
  contentService,
  phaseTranslationService,
  quizTranslationService,
  translationService,
  templateService,
  workflowService,
  uploadService,
  baseURL,
  isTokenExpired,
  getTokenExpirationTime,
  isTokenExpiringSoon
};

// Default export for backward compatibility
export default {
  api,
  authService,
  adminService,
  managerService,
  crewService,
  trainingService,
  contentService,
  phaseTranslationService,
  quizTranslationService,
  translationService,
  templateService,
  workflowService,
  uploadService
};
