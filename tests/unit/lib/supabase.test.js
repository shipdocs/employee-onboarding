/**
 * Unit Tests for Supabase Client Configuration
 * Tests the Supabase client setup and configuration
 */

describe('Supabase Client Configuration', () => {
  let originalEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    
    // Mock environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-anon-key';
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
    
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when SUPABASE_URL is missing', () => {
      delete process.env.SUPABASE_URL;
      
      expect(() => {
        require('../../../lib/supabase.js');
      }).toThrow('Missing Supabase environment variables');
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      expect(() => {
        require('../../../lib/supabase.js');
      }).toThrow('Missing Supabase environment variables');
    });

    it('should not throw error when all required variables are present', () => {
      expect(() => {
        require('../../../lib/supabase.js');
      }).not.toThrow();
    });
  });

  describe('Client Configuration', () => {
    it('should create server-side client with correct configuration', () => {
      const { supabase } = require('../../../lib/supabase.js');
      
      expect(supabase).toBeDefined();
      expect(supabase.supabaseUrl).toBe('https://test.supabase.co');
      expect(supabase.supabaseKey).toBe('test-service-key');
    });

    it('should create client-side client with correct configuration', () => {
      const { supabaseClient } = require('../../../lib/supabase.js');
      
      expect(supabaseClient).toBeDefined();
      expect(supabaseClient.supabaseUrl).toBe('https://test.supabase.co');
      expect(supabaseClient.supabaseKey).toBe('test-public-anon-key');
    });

    it('should use SUPABASE_ANON_KEY as fallback for client', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      jest.resetModules();
      const { supabaseClient } = require('../../../lib/supabase.js');
      
      expect(supabaseClient.supabaseKey).toBe('test-anon-key');
    });
  });

  describe('Auth Configuration', () => {
    it('should configure server client with no auto-refresh', () => {
      const { supabase } = require('../../../lib/supabase.js');
      
      // Check auth configuration (this depends on Supabase client internals)
      expect(supabase.auth.autoRefreshToken).toBe(false);
    });

    it('should configure client with auto-refresh enabled', () => {
      const { supabaseClient } = require('../../../lib/supabase.js');
      
      // Check auth configuration
      expect(supabaseClient.auth.autoRefreshToken).toBe(true);
    });
  });
});
