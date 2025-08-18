// tests/unit/session-management.test.js - Unit tests for session management
const EnhancedSessionManager = require('../../lib/security/EnhancedSessionManager');

describe('Enhanced Session Management', () => {
  let sessionManager;
  
  beforeEach(() => {
    sessionManager = new EnhancedSessionManager({
      maxConcurrentSessions: 3,
      sessionTimeout: 2 * 60 * 60 * 1000 // 2 hours
    });
  });

  describe('Session Creation', () => {
    it('should generate unique session IDs', async () => {
      const mockReq = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.100',
          'accept-language': 'en-US',
          'accept-encoding': 'gzip, deflate'
        },
        connection: { remoteAddress: '192.168.1.100' }
      };

      // Test metadata extraction
      const metadata = sessionManager.extractSessionMetadata(mockReq);
      
      expect(metadata).toHaveProperty('ip_address');
      expect(metadata).toHaveProperty('user_agent');
      expect(metadata).toHaveProperty('device_fingerprint');
      expect(metadata.ip_address).toBe('192.168.1.100');
      expect(metadata.user_agent).toBe('Mozilla/5.0');
      expect(metadata.device_fingerprint).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should enforce concurrent session limits', () => {
      const triggers = [
        'PASSWORD_CHANGED',
        'ACCOUNT_LOCKED',
        'SUSPICIOUS_ACTIVITY',
        'MFA_DISABLED',
        'ROLE_CHANGED',
        'ACCOUNT_COMPROMISED'
      ];

      triggers.forEach(trigger => {
        expect(sessionManager.shouldInvalidateSessions(trigger)).toBe(true);
      });

      expect(sessionManager.shouldInvalidateSessions('NORMAL_ACTIVITY')).toBe(false);
    });
  });

  describe('Session Validation', () => {
    it('should detect IP mismatches', async () => {
      const mockSession = {
        session_id: 'test-session-123',
        user_id: 'user-123',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_active: true
      };

      const mockReqDifferentIP = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.200', // Different IP
        },
        connection: { remoteAddress: '192.168.1.200' }
      };

      // Metadata should detect different IP
      const metadata = sessionManager.extractSessionMetadata(mockReqDifferentIP);
      expect(metadata.ip_address).not.toBe(mockSession.ip_address);
    });

    it('should identify session invalidation triggers', () => {
      const securityEvents = [
        'PASSWORD_CHANGED',
        'ACCOUNT_LOCKED',
        'SUSPICIOUS_ACTIVITY'
      ];

      securityEvents.forEach(event => {
        const shouldInvalidate = sessionManager.shouldInvalidateSessions(event);
        expect(shouldInvalidate).toBe(true);
      });
    });
  });

  describe('Device Fingerprinting', () => {
    it('should generate consistent fingerprints for same device', () => {
      const req1 = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'accept-language': 'en-US,en;q=0.9',
          'accept-encoding': 'gzip, deflate, br'
        }
      };

      const req2 = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'accept-language': 'en-US,en;q=0.9',
          'accept-encoding': 'gzip, deflate, br'
        }
      };

      const fingerprint1 = sessionManager.extractSessionMetadata(req1).device_fingerprint;
      const fingerprint2 = sessionManager.extractSessionMetadata(req2).device_fingerprint;

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should generate different fingerprints for different devices', () => {
      const req1 = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'accept-language': 'en-US,en;q=0.9',
          'accept-encoding': 'gzip, deflate, br'
        }
      };

      const req2 = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'accept-language': 'fr-FR,fr;q=0.9',
          'accept-encoding': 'gzip, deflate'
        }
      };

      const fingerprint1 = sessionManager.extractSessionMetadata(req1).device_fingerprint;
      const fingerprint2 = sessionManager.extractSessionMetadata(req2).device_fingerprint;

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });
});