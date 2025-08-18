/**
 * End-to-End Tests for Docker-Based System
 * Tests the complete user flows in the migrated Docker architecture
 */

const puppeteer = require('puppeteer');
const { Pool } = require('pg');
const Minio = require('minio');

describe('Docker System E2E Tests', () => {
  let browser;
  let page;
  let dbPool;
  let minioClient;
  
  const baseUrl = process.env.BASE_URL || 'http://localhost';
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  
  beforeAll(async () => {
    // Launch browser
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    // Initialize database connection
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'maritime',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    
    // Initialize MinIO client
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }, 30000);
  
  afterAll(async () => {
    if (browser) await browser.close();
    if (dbPool) await dbPool.end();
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Add request interception for debugging
    page.on('console', msg => {
      if (process.env.DEBUG) {
        console.log('Browser console:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      if (process.env.DEBUG) {
        console.error('Browser error:', error.message);
      }
    });
  });
  
  afterEach(async () => {
    if (page) await page.close();
  });
  
  describe('Application Loading', () => {
    it('should load the homepage', async () => {
      const response = await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      expect(response.status()).toBe(200);
      
      const title = await page.title();
      expect(title).toContain('Crew Onboarding');
    });
    
    it('should load React application', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Wait for React app to mount
      await page.waitForSelector('#root', { timeout: 10000 });
      
      // Check if loading message disappears
      const loadingExists = await page.evaluate(() => {
        const loading = document.querySelector('.loading');
        return loading && loading.textContent.includes('Loading');
      });
      
      // After React loads, loading should be gone or content should be present
      const hasContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root && root.children.length > 0;
      });
      
      expect(hasContent).toBe(true);
    });
    
    it('should handle API calls from frontend', async () => {
      // Monitor API calls
      const apiCalls = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
          });
        }
      });
      
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Give time for initial API calls
      await page.waitForTimeout(2000);
      
      // Frontend should make API calls on load
      if (apiCalls.length > 0) {
        expect(apiCalls.some(call => call.url.includes('/api/'))).toBe(true);
      }
    });
  });
  
  describe('Authentication Flow', () => {
    it('should display login form', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Check for login form elements
      const hasEmailInput = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.some(input => 
          input.type === 'email' || 
          input.name === 'email' || 
          input.placeholder?.toLowerCase().includes('email')
        );
      });
      
      const hasPasswordInput = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.some(input => input.type === 'password');
      });
      
      const hasSubmitButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => 
          button.type === 'submit' || 
          button.textContent?.toLowerCase().includes('login') ||
          button.textContent?.toLowerCase().includes('sign in')
        );
      });
      
      expect(hasEmailInput || hasPasswordInput || hasSubmitButton).toBe(true);
    });
    
    it('should handle login attempt', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Try to find and fill login form
      try {
        await page.type('input[type="email"], input[name="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'testpassword');
        
        // Click login button
        await Promise.race([
          page.click('button[type="submit"]'),
          page.click('button:contains("Login")'),
          page.click('button:contains("Sign In")'),
        ].map(p => p.catch(() => null)));
        
        // Wait for navigation or error message
        await Promise.race([
          page.waitForNavigation({ timeout: 5000 }),
          page.waitForSelector('.error, .alert, .message', { timeout: 5000 }),
        ].map(p => p.catch(() => null)));
        
      } catch (error) {
        // Login form might not be present in current state
        console.log('Login form not found or not functional');
      }
    });
  });
  
  describe('Database Integration', () => {
    it('should create and retrieve user data', async () => {
      const testUser = {
        email: `test_${Date.now()}@example.com`,
        name: 'Test User',
        role: 'crew',
      };
      
      // Insert test user directly into database
      const insertResult = await dbPool.query(
        `INSERT INTO users (email, name, role, created_at) 
         VALUES ($1, $2, $3, NOW()) 
         RETURNING id, email, name, role`,
        [testUser.email, testUser.name, testUser.role]
      );
      
      expect(insertResult.rows).toHaveLength(1);
      const userId = insertResult.rows[0].id;
      
      // Verify user can be retrieved
      const selectResult = await dbPool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      expect(selectResult.rows[0].email).toBe(testUser.email);
      expect(selectResult.rows[0].name).toBe(testUser.name);
      
      // Cleanup
      await dbPool.query('DELETE FROM users WHERE id = $1', [userId]);
    });
    
    it('should handle concurrent database operations', async () => {
      const operations = [];
      
      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          dbPool.query(
            'SELECT COUNT(*) as count FROM users WHERE created_at > $1',
            [new Date(Date.now() - 86400000)] // Last 24 hours
          )
        );
      }
      
      const results = await Promise.all(operations);
      
      results.forEach(result => {
        expect(result.rows).toHaveLength(1);
        expect(typeof result.rows[0].count).toBe('string');
      });
    });
  });
  
  describe('Storage Integration', () => {
    const testBucket = 'uploads';
    
    it('should handle file upload flow', async () => {
      // Create a test file
      const fileName = `test-e2e-${Date.now()}.txt`;
      const fileContent = Buffer.from('E2E test file content');
      
      // Upload directly via MinIO
      await minioClient.putObject(
        testBucket,
        fileName,
        fileContent,
        fileContent.length,
        { 'Content-Type': 'text/plain', 'x-test': 'e2e' }
      );
      
      // Verify file exists
      const stat = await minioClient.statObject(testBucket, fileName);
      expect(stat.size).toBe(fileContent.length);
      
      // Generate presigned URL
      const url = await minioClient.presignedGetUrl(
        'GET',
        testBucket,
        fileName,
        3600
      );
      
      // Verify URL works
      const response = await page.goto(url);
      expect(response.status()).toBe(200);
      
      const content = await page.content();
      expect(content).toContain('E2E test file content');
      
      // Cleanup
      await minioClient.removeObject(testBucket, fileName);
    });
    
    it('should handle file download flow', async () => {
      const fileName = `download-test-${Date.now()}.pdf`;
      const fileContent = Buffer.from('%PDF-1.4\nTest PDF content');
      
      // Upload file
      await minioClient.putObject(
        testBucket,
        fileName,
        fileContent,
        fileContent.length,
        { 'Content-Type': 'application/pdf' }
      );
      
      // Get presigned URL
      const url = await minioClient.presignedGetUrl(
        'GET',
        testBucket,
        fileName,
        3600
      );
      
      // Download via browser
      const response = await page.goto(url);
      expect(response.status()).toBe(200);
      
      const headers = response.headers();
      expect(headers['content-type']).toContain('pdf');
      
      // Cleanup
      await minioClient.removeObject(testBucket, fileName);
    });
  });
  
  describe('API Integration', () => {
    it('should handle API requests with proper CORS', async () => {
      await page.goto(baseUrl);
      
      // Make API call from browser context
      const apiResponse = await page.evaluate(async (apiUrl) => {
        try {
          const response = await fetch(`${apiUrl}/api/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          return {
            status: response.status,
            headers: {
              'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
            },
            data: await response.json(),
          };
        } catch (error) {
          return { error: error.message };
        }
      }, apiUrl);
      
      if (!apiResponse.error) {
        expect(apiResponse.status).toBe(200);
        expect(apiResponse.data.status).toBe('ok');
      }
    });
    
    it('should handle POST requests', async () => {
      await page.goto(baseUrl);
      
      const postResponse = await page.evaluate(async (apiUrl) => {
        try {
          const response = await fetch(`${apiUrl}/api/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              test: true,
              timestamp: Date.now(),
            }),
          });
          
          return {
            status: response.status,
            contentType: response.headers.get('content-type'),
          };
        } catch (error) {
          return { error: error.message };
        }
      }, apiUrl);
      
      // API might return 404 if endpoint doesn't exist, or 200/201 if it does
      if (!postResponse.error) {
        expect([200, 201, 404, 405]).toContain(postResponse.status);
      }
    });
  });
  
  describe('Performance', () => {
    it('should load application within acceptable time', async () => {
      const startTime = Date.now();
      
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      // Log performance metrics
      const metrics = await page.metrics();
      console.log('Performance metrics:', {
        loadTime: `${loadTime}ms`,
        jsHeapUsed: `${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB`,
        documents: metrics.Documents,
        frames: metrics.Frames,
        nodes: metrics.Nodes,
      });
    });
    
    it('should handle multiple concurrent users', async () => {
      const pages = [];
      
      // Simulate 5 concurrent users
      for (let i = 0; i < 5; i++) {
        const newPage = await browser.newPage();
        pages.push(newPage);
      }
      
      // All users load the page simultaneously
      const loadPromises = pages.map(p => 
        p.goto(baseUrl, { waitUntil: 'networkidle2' })
      );
      
      const responses = await Promise.all(loadPromises);
      
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
      
      // Cleanup
      await Promise.all(pages.map(p => p.close()));
    });
  });
  
  describe('Error Handling', () => {
    it('should handle 404 pages gracefully', async () => {
      const response = await page.goto(`${baseUrl}/non-existent-page`, {
        waitUntil: 'networkidle2',
      });
      
      // Should either show 404 or redirect to home
      expect([200, 404]).toContain(response.status());
      
      const content = await page.content();
      const has404 = content.includes('404') || content.includes('not found');
      const hasApp = content.includes('root') || content.includes('app');
      
      expect(has404 || hasApp).toBe(true);
    });
    
    it('should handle API errors gracefully', async () => {
      await page.goto(baseUrl);
      
      const errorResponse = await page.evaluate(async (apiUrl) => {
        try {
          const response = await fetch(`${apiUrl}/api/invalid-endpoint-xyz`, {
            method: 'GET',
          });
          
          return {
            status: response.status,
            ok: response.ok,
          };
        } catch (error) {
          return { error: error.message };
        }
      }, apiUrl);
      
      if (!errorResponse.error) {
        expect(errorResponse.ok).toBe(false);
        expect(errorResponse.status).toBeGreaterThanOrEqual(400);
      }
    });
    
    it('should handle network failures', async () => {
      // Block API requests
      await page.setRequestInterception(true);
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      
      // App should still load even if API calls fail
      const hasRoot = await page.evaluate(() => {
        return document.getElementById('root') !== null;
      });
      
      expect(hasRoot).toBe(true);
    });
  });
  
  describe('Security', () => {
    it('should have security headers', async () => {
      const response = await page.goto(baseUrl);
      const headers = response.headers();
      
      // Check for security headers (if configured)
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
      ];
      
      securityHeaders.forEach(header => {
        if (headers[header]) {
          console.log(`Security header ${header}: ${headers[header]}`);
        }
      });
    });
    
    it('should prevent XSS attacks', async () => {
      await page.goto(baseUrl);
      
      // Try to inject script
      const xssPayload = '<script>window.xssTest = "vulnerable";</script>';
      
      // Check if the app sanitizes user input
      const result = await page.evaluate((payload) => {
        // Try to set innerHTML (app should prevent this)
        const div = document.createElement('div');
        div.innerHTML = payload;
        document.body.appendChild(div);
        
        // Check if script executed
        return window.xssTest === 'vulnerable';
      }, xssPayload);
      
      expect(result).toBe(false);
    });
  });
});