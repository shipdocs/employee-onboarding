/**
 * Unit Tests for Client API Service
 * Tests the client-side API communication layer
 */

// Mock axios to avoid actual HTTP requests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

const axios = require('axios');

describe('Client API Service', () => {
  // Mock API service implementation
  const createApiService = () => {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
    
    const apiClient = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Mock implementation of API methods
    return {
      // Authentication
      login: async (credentials) => {
        if (!credentials.email || !credentials.password) {
          throw new Error('Email and password are required');
        }
        return apiClient.post('/auth/login', credentials);
      },

      logout: async () => {
        return apiClient.post('/auth/logout');
      },

      // User management
      getProfile: async () => {
        return apiClient.get('/user/profile');
      },

      updateProfile: async (profileData) => {
        if (!profileData) {
          throw new Error('Profile data is required');
        }
        return apiClient.put('/user/profile', profileData);
      },

      // Crew management
      getCrewMembers: async () => {
        return apiClient.get('/crew');
      },

      createCrewMember: async (crewData) => {
        if (!crewData.email) {
          throw new Error('Email is required');
        }
        return apiClient.post('/crew', crewData);
      },

      updateCrewMember: async (id, crewData) => {
        if (!id) {
          throw new Error('Crew member ID is required');
        }
        return apiClient.put(`/crew/${id}`, crewData);
      },

      deleteCrewMember: async (id) => {
        if (!id) {
          throw new Error('Crew member ID is required');
        }
        return apiClient.delete(`/crew/${id}`);
      },

      // Training and quizzes
      getTrainingModules: async () => {
        return apiClient.get('/training/modules');
      },

      submitQuiz: async (quizId, answers) => {
        if (!quizId || !answers) {
          throw new Error('Quiz ID and answers are required');
        }
        return apiClient.post(`/training/quiz/${quizId}/submit`, { answers });
      },

      // File uploads
      uploadFile: async (file, type = 'document') => {
        if (!file) {
          throw new Error('File is required');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        return apiClient.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      },

      // Health check
      healthCheck: async () => {
        return apiClient.get('/health');
      }
    };
  };

  let apiService;
  let mockAxiosInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Create API service instance
    apiService = createApiService();
  });

  describe('Service Initialization', () => {
    it('should create axios instance with correct configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('Authentication Methods', () => {
    it('should login with valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = { data: { token: 'mock-token', user: { id: 1 } } };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      
      const result = await apiService.login(credentials);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toBe(mockResponse);
    });

    it('should reject login without email', async () => {
      const credentials = { password: 'password123' };
      
      await expect(apiService.login(credentials)).rejects.toThrow('Email and password are required');
    });

    it('should reject login without password', async () => {
      const credentials = { email: 'test@example.com' };
      
      await expect(apiService.login(credentials)).rejects.toThrow('Email and password are required');
    });

    it('should logout successfully', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      
      const result = await apiService.logout();
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout');
      expect(result).toBe(mockResponse);
    });
  });

  describe('User Profile Methods', () => {
    it('should get user profile', async () => {
      const mockProfile = { data: { id: 1, email: 'test@example.com' } };
      mockAxiosInstance.get.mockResolvedValue(mockProfile);
      
      const result = await apiService.getProfile();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/profile');
      expect(result).toBe(mockProfile);
    });

    it('should update user profile', async () => {
      const profileData = { firstName: 'John', lastName: 'Doe' };
      const mockResponse = { data: { success: true } };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      
      const result = await apiService.updateProfile(profileData);
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/user/profile', profileData);
      expect(result).toBe(mockResponse);
    });

    it('should reject profile update without data', async () => {
      await expect(apiService.updateProfile()).rejects.toThrow('Profile data is required');
    });
  });

  describe('Crew Management Methods', () => {
    it('should get crew members', async () => {
      const mockCrew = { data: [{ id: 1, name: 'John Doe' }] };
      mockAxiosInstance.get.mockResolvedValue(mockCrew);
      
      const result = await apiService.getCrewMembers();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/crew');
      expect(result).toBe(mockCrew);
    });

    it('should create crew member', async () => {
      const crewData = { email: 'crew@example.com', name: 'New Crew' };
      const mockResponse = { data: { id: 2, ...crewData } };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      
      const result = await apiService.createCrewMember(crewData);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/crew', crewData);
      expect(result).toBe(mockResponse);
    });

    it('should reject crew creation without email', async () => {
      const crewData = { name: 'New Crew' };
      
      await expect(apiService.createCrewMember(crewData)).rejects.toThrow('Email is required');
    });

    it('should update crew member', async () => {
      const id = 1;
      const crewData = { name: 'Updated Name' };
      const mockResponse = { data: { success: true } };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      
      const result = await apiService.updateCrewMember(id, crewData);
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/crew/1', crewData);
      expect(result).toBe(mockResponse);
    });

    it('should reject crew update without ID', async () => {
      const crewData = { name: 'Updated Name' };
      
      await expect(apiService.updateCrewMember(null, crewData)).rejects.toThrow('Crew member ID is required');
    });

    it('should delete crew member', async () => {
      const id = 1;
      const mockResponse = { data: { success: true } };
      
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);
      
      const result = await apiService.deleteCrewMember(id);
      
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/crew/1');
      expect(result).toBe(mockResponse);
    });

    it('should reject crew deletion without ID', async () => {
      await expect(apiService.deleteCrewMember()).rejects.toThrow('Crew member ID is required');
    });
  });

  describe('Training Methods', () => {
    it('should get training modules', async () => {
      const mockModules = { data: [{ id: 1, title: 'Safety Training' }] };
      mockAxiosInstance.get.mockResolvedValue(mockModules);
      
      const result = await apiService.getTrainingModules();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/training/modules');
      expect(result).toBe(mockModules);
    });

    it('should submit quiz answers', async () => {
      const quizId = 1;
      const answers = [{ questionId: 1, answer: 'A' }];
      const mockResponse = { data: { score: 85, passed: true } };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      
      const result = await apiService.submitQuiz(quizId, answers);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/training/quiz/1/submit', { answers });
      expect(result).toBe(mockResponse);
    });

    it('should reject quiz submission without quiz ID', async () => {
      const answers = [{ questionId: 1, answer: 'A' }];
      
      await expect(apiService.submitQuiz(null, answers)).rejects.toThrow('Quiz ID and answers are required');
    });

    it('should reject quiz submission without answers', async () => {
      const quizId = 1;
      
      await expect(apiService.submitQuiz(quizId, null)).rejects.toThrow('Quiz ID and answers are required');
    });
  });

  describe('File Upload Methods', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockResponse = { data: { fileId: 'abc123', url: '/files/abc123' } };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      
      const result = await apiService.uploadFile(mockFile);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/files/upload',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result).toBe(mockResponse);
    });

    it('should reject file upload without file', async () => {
      await expect(apiService.uploadFile()).rejects.toThrow('File is required');
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const mockResponse = { data: { status: 'healthy', timestamp: Date.now() } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      const result = await apiService.healthCheck();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toBe(mockResponse);
    });
  });
});
