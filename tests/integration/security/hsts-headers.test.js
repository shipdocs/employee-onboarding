/**
 * HSTS Headers Integration Test
 * Verifies that HTTP Strict Transport Security headers are properly configured
 */

const request = require('supertest');
const { expect } = require('chai');

describe('HSTS Security Headers', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  describe('API Endpoints', () => {
    it('should include HSTS header in health endpoint', async () => {
      const response = await request(baseUrl)
        .get('/api/health')
        .expect(200);

      expect(response.headers).to.have.property('strict-transport-security');
      
      const hstsHeader = response.headers['strict-transport-security'];
      expect(hstsHeader).to.include('max-age=');
      expect(hstsHeader).to.include('includeSubDomains');
      expect(hstsHeader).to.include('preload');
    });

    it('should include HSTS header in auth endpoints', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login-with-mfa')
        .send({
          email: 'test@example.com',
          password: 'testpassword'
        });

      expect(response.headers).to.have.property('strict-transport-security');
      
      const hstsHeader = response.headers['strict-transport-security'];
      expect(hstsHeader).to.include('max-age=');
      expect(hstsHeader).to.include('includeSubDomains');
    });

    it('should include comprehensive security headers', async () => {
      const response = await request(baseUrl)
        .get('/api/health');

      // HSTS
      expect(response.headers).to.have.property('strict-transport-security');
      
      // Other security headers
      expect(response.headers).to.have.property('x-frame-options');
      expect(response.headers).to.have.property('x-content-type-options');
      expect(response.headers).to.have.property('referrer-policy');
      expect(response.headers).to.have.property('x-xss-protection');
      expect(response.headers).to.have.property('x-dns-prefetch-control');
      
      // Verify values
      expect(response.headers['x-frame-options']).to.equal('DENY');
      expect(response.headers['x-content-type-options']).to.equal('nosniff');
      expect(response.headers['referrer-policy']).to.equal('strict-origin-when-cross-origin');
    });
  });

  describe('Static Files', () => {
    it('should include HSTS header for static files', async () => {
      // Test a static file that should exist
      const response = await request(baseUrl)
        .get('/favicon.ico');

      // Even if file doesn't exist, headers should be applied
      expect(response.headers).to.have.property('strict-transport-security');
    });
  });

  describe('HSTS Configuration', () => {
    it('should have appropriate max-age value', async () => {
      const response = await request(baseUrl)
        .get('/api/health');

      const hstsHeader = response.headers['strict-transport-security'];
      
      // Extract max-age value
      const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
      expect(maxAgeMatch).to.not.be.null;
      
      const maxAge = parseInt(maxAgeMatch[1]);
      
      // Should be at least 1 year (31536000 seconds)
      expect(maxAge).to.be.at.least(31536000);
    });

    it('should include includeSubDomains directive', async () => {
      const response = await request(baseUrl)
        .get('/api/health');

      const hstsHeader = response.headers['strict-transport-security'];
      expect(hstsHeader).to.include('includeSubDomains');
    });

    it('should include preload directive for production', async () => {
      const response = await request(baseUrl)
        .get('/api/health');

      const hstsHeader = response.headers['strict-transport-security'];
      
      // Preload should be included for production-ready configurations
      if (process.env.NODE_ENV === 'production') {
        expect(hstsHeader).to.include('preload');
      }
    });
  });

  describe('Security Headers Consistency', () => {
    const endpoints = [
      '/api/health',
      '/api/auth/login-with-mfa'
    ];

    endpoints.forEach(endpoint => {
      it(`should have consistent security headers for ${endpoint}`, async () => {
        const response = await request(baseUrl)
          .get(endpoint.includes('login') ? endpoint.replace('GET', 'POST') : endpoint);

        // All endpoints should have these security headers
        const requiredHeaders = [
          'strict-transport-security',
          'x-frame-options',
          'x-content-type-options',
          'referrer-policy'
        ];

        requiredHeaders.forEach(header => {
          expect(response.headers).to.have.property(header, 
            `Missing ${header} header for ${endpoint}`);
        });
      });
    });
  });
});
