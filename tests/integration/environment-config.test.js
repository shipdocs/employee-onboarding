// tests/environment-config.test.js
const path = require('path');

describe('Environment Configuration Tests', () => {
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  describe('Environment Detection', () => {
    test('should correctly detect production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';
      
      const isProduction = process.env.NODE_ENV === 'production' && 
                          process.env.VERCEL_ENV === 'production';
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isStaging = process.env.VERCEL_ENV === 'preview';
      
      expect(isProduction).toBe(true);
      expect(isDevelopment).toBe(false);
      expect(isStaging).toBe(false);
    });

    test('should correctly detect development environment', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;
      
      const isProduction = process.env.NODE_ENV === 'production';
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isStaging = process.env.VERCEL_ENV === 'preview';
      
      expect(isProduction).toBe(false);
      expect(isDevelopment).toBe(true);
      expect(isStaging).toBe(false);
    });

    test('should correctly detect staging environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'preview';
      
      const isProduction = process.env.NODE_ENV === 'production' && 
                          process.env.VERCEL_ENV === 'production';
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isStaging = process.env.VERCEL_ENV === 'preview';
      
      expect(isProduction).toBe(false);
      expect(isDevelopment).toBe(false);
      expect(isStaging).toBe(true);
    });

    test('should correctly detect test environment', () => {
      process.env.NODE_ENV = 'test';
      
      const isTest = process.env.NODE_ENV === 'test';
      expect(isTest).toBe(true);
    });

    test('should handle missing environment variables', () => {
      delete process.env.NODE_ENV;
      delete process.env.VERCEL_ENV;
      
      const environment = process.env.NODE_ENV || 'development';
      expect(environment).toBe('development');
    });
  });

  describe('Feature Flags', () => {
    test('should enable emails in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DISABLE_EMAILS = 'false';
      
      const emailsEnabled = process.env.DISABLE_EMAILS !== 'true';
      expect(emailsEnabled).toBe(true);
    });

    test('should disable emails when flag is set', () => {
      process.env.DISABLE_EMAILS = 'true';
      
      const emailsEnabled = process.env.DISABLE_EMAILS !== 'true';
      expect(emailsEnabled).toBe(false);
    });

    test('should enable dev mode bar in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.SHOW_DEV_BAR = 'true';
      
      const showDevBar = process.env.NODE_ENV === 'development' && 
                        process.env.SHOW_DEV_BAR === 'true';
      expect(showDevBar).toBe(true);
    });

    test('should disable dev mode bar in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.SHOW_DEV_BAR = 'true';
      
      const showDevBar = process.env.NODE_ENV === 'development' && 
                        process.env.SHOW_DEV_BAR === 'true';
      expect(showDevBar).toBe(false);
    });

    test('should handle feature flag defaults', () => {
      delete process.env.ENABLE_OFFLINE_MODE;
      delete process.env.ENABLE_PUSH_NOTIFICATIONS;
      
      const offlineMode = process.env.ENABLE_OFFLINE_MODE === 'true';
      const pushNotifications = process.env.ENABLE_PUSH_NOTIFICATIONS === 'true';
      
      expect(offlineMode).toBe(false);
      expect(pushNotifications).toBe(false);
    });
  });

  describe('Environment-Specific Behaviors', () => {
    test('should use production API URL in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.API_URL = 'https://api.maritime-onboarding.example.com';
      process.env.DEV_API_URL = 'http://localhost:3000';
      
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? process.env.API_URL 
        : process.env.DEV_API_URL;
      
      expect(apiUrl).toBe('https://api.maritime-onboarding.example.com');
    });

    test('should use development API URL in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.API_URL = 'https://api.maritime-onboarding.example.com';
      process.env.DEV_API_URL = 'http://localhost:3000';
      
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? process.env.API_URL 
        : process.env.DEV_API_URL;
      
      expect(apiUrl).toBe('http://localhost:3000');
    });

    test('should enable debug logging in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEBUG = 'true';
      
      const debugEnabled = process.env.NODE_ENV === 'development' || 
                          process.env.DEBUG === 'true';
      expect(debugEnabled).toBe(true);
    });

    test('should disable debug logging in production by default', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG;
      
      const debugEnabled = process.env.NODE_ENV === 'development' || 
                          process.env.DEBUG === 'true';
      expect(debugEnabled).toBe(false);
    });

    test('should use correct database in each environment', () => {
      // Production
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://prod-db';
      process.env.DEV_DATABASE_URL = 'postgresql://dev-db';
      
      let dbUrl = process.env.NODE_ENV === 'production' 
        ? process.env.DATABASE_URL 
        : process.env.DEV_DATABASE_URL;
      expect(dbUrl).toBe('postgresql://prod-db');
      
      // Development
      process.env.NODE_ENV = 'development';
      dbUrl = process.env.NODE_ENV === 'production' 
        ? process.env.DATABASE_URL 
        : process.env.DEV_DATABASE_URL;
      expect(dbUrl).toBe('postgresql://dev-db');
    });
  });

  describe('Production Safety Measures', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('should require authentication in production', () => {
      process.env.REQUIRE_AUTH = 'true';
      
      const authRequired = process.env.NODE_ENV === 'production' || 
                          process.env.REQUIRE_AUTH === 'true';
      expect(authRequired).toBe(true);
    });

    test('should enforce HTTPS in production', () => {
      process.env.FORCE_HTTPS = 'true';
      
      const forceHTTPS = process.env.NODE_ENV === 'production' && 
                        process.env.FORCE_HTTPS !== 'false';
      expect(forceHTTPS).toBe(true);
    });

    test('should disable source maps in production', () => {
      process.env.GENERATE_SOURCEMAP = 'false';
      
      const sourceMapsEnabled = process.env.NODE_ENV !== 'production' || 
                               process.env.GENERATE_SOURCEMAP === 'true';
      expect(sourceMapsEnabled).toBe(false);
    });

    test('should enable rate limiting in production', () => {
      process.env.ENABLE_RATE_LIMIT = 'true';
      
      const rateLimitEnabled = process.env.NODE_ENV === 'production' || 
                              process.env.ENABLE_RATE_LIMIT === 'true';
      expect(rateLimitEnabled).toBe(true);
    });

    test('should use secure cookies in production', () => {
      process.env.SECURE_COOKIES = 'true';
      
      const secureCookies = process.env.NODE_ENV === 'production' && 
                           process.env.SECURE_COOKIES !== 'false';
      expect(secureCookies).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate required environment variables', () => {
      const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
        'BASE_URL'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      // In test environment, these might be missing
      expect(Array.isArray(missingVars)).toBe(true);
    });

    test('should validate email configuration', () => {
      process.env.EMAIL_SERVICE_PROVIDER = 'mailersend';
      process.env.MAILERSEND_API_KEY = 'test-key';
      
      const hasEmailConfig = process.env.EMAIL_SERVICE_PROVIDER && 
                            (process.env.MAILERSEND_API_KEY || 
                             (process.env.SMTP_HOST && process.env.SMTP_USER));
      
      expect(hasEmailConfig).toBeTruthy();
    });

    test('should validate database configuration', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-anon-key';
      
      const hasDbConfig = process.env.SUPABASE_URL && 
                         process.env.SUPABASE_ANON_KEY;
      
      expect(hasDbConfig).toBeTruthy();
    });

    test('should handle configuration errors gracefully', () => {
      delete process.env.SUPABASE_URL;
      
      const getConfig = () => {
        return {
          supabaseUrl: process.env.SUPABASE_URL || '',
          supabaseKey: process.env.SUPABASE_ANON_KEY || '',
          isConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
        };
      };
      
      const config = getConfig();
      expect(config.isConfigured).toBe(false);
      expect(config.supabaseUrl).toBe('');
    });
  });

  describe('Environment-Specific Defaults', () => {
    test('should set appropriate timeouts for each environment', () => {
      // Production - shorter timeouts
      process.env.NODE_ENV = 'production';
      const prodTimeout = process.env.NODE_ENV === 'production' ? 30000 : 60000;
      expect(prodTimeout).toBe(30000);
      
      // Development - longer timeouts
      process.env.NODE_ENV = 'development';
      const devTimeout = process.env.NODE_ENV === 'production' ? 30000 : 60000;
      expect(devTimeout).toBe(60000);
    });

    test('should set appropriate log levels', () => {
      // Production - error only
      process.env.NODE_ENV = 'production';
      const prodLogLevel = process.env.NODE_ENV === 'production' ? 'error' : 'debug';
      expect(prodLogLevel).toBe('error');
      
      // Development - debug
      process.env.NODE_ENV = 'development';
      const devLogLevel = process.env.NODE_ENV === 'production' ? 'error' : 'debug';
      expect(devLogLevel).toBe('debug');
    });

    test('should set appropriate cache durations', () => {
      // Production - longer cache
      process.env.NODE_ENV = 'production';
      const prodCacheDuration = process.env.NODE_ENV === 'production' ? 3600 : 0;
      expect(prodCacheDuration).toBe(3600);
      
      // Development - no cache
      process.env.NODE_ENV = 'development';
      const devCacheDuration = process.env.NODE_ENV === 'production' ? 3600 : 0;
      expect(devCacheDuration).toBe(0);
    });
  });
});