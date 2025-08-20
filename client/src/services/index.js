// Central export for all services
// This file provides a single import point for all services

import apiClient from './apiClient';
import authService from './authService';
import adminService from './adminService';
import managerService from './managerService';
import crewService from './crewService';
import trainingService from './trainingService';
import contentService from './contentService';

export {
  apiClient,
  authService,
  adminService,
  managerService,
  crewService,
  trainingService,
  contentService
};

// Default export with all services
export default {
  apiClient,
  authService,
  adminService,
  managerService,
  crewService,
  trainingService,
  contentService
};
