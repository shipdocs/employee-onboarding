const mfaService = require('../mfaService');
const { supabase } = require('../supabase');

// Mock dependencies
jest.mock('../supabase');
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('crypto');
jest.mock('../../config/features');

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    insert: jest.fn(),
    update: jest.fn(() => ({
      eq: jest.fn()
    })),
    upsert: jest.fn(),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

supabase.mockReturnValue(mockSupabase);

describe('MFAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MFA_ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
  });

  afterEach(() => {
    delete process.env.MFA_ENCRYPTION_KEY;
  });

  describe('setupMFA', () => {
    it('should generate MFA setup data successfully', async () => {
      const speakeasy = require('speakeasy');
      const qrcode = require('qrcode');
      
      speakeasy.generateSecret.mockReturnValue({
        base32: 'TESTSECRET',
        otpauth_url: 'otpauth://totp/test'
      });
      
      qrcode.toDataURL.mockResolvedValue('data:image/png;base64,test');
      
      mockSupabase.from().upsert.mockResolvedValue({ data: {}, error: null });

      const result = await mfaService.setupMFA('user-123');

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');
      expect(result).toHaveProperty('manualEntryKey');
      expect(speakeasy.generateSecret).toHaveBeenCalled();
      expect(qrcode.toDataURL).toHaveBeenCalled();
    });

    it('should throw error when MFA is disabled', async () => {
      const { isEnabled } = require('../../config/features');
      isEnabled.mockReturnValue(false);

      await expect(mfaService.setupMFA('user-123')).rejects.toThrow('MFA is not enabled');
    });
  });

  describe('verifyTOTP', () => {
    beforeEach(() => {
      const { isEnabled } = require('../../config/features');
      isEnabled.mockReturnValue(true);
    });

    it('should verify valid TOTP code successfully', async () => {
      const speakeasy = require('speakeasy');
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          secret: JSON.stringify({ encrypted: 'encrypted-secret', iv: 'iv', authTag: 'tag' }),
          backup_codes: [],
          enabled: true
        },
        error: null
      });

      mockSupabase.from().select().eq().gte().order.mockResolvedValue({
        data: [],
        error: null
      });

      speakeasy.totp.verify.mockReturnValue(true);

      const result = await mfaService.verifyTOTP('user-123', '123456');

      expect(result.success).toBe(true);
      expect(result.method).toBe('totp');
    });

    it('should reject invalid TOTP code', async () => {
      const speakeasy = require('speakeasy');
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          secret: JSON.stringify({ encrypted: 'encrypted-secret', iv: 'iv', authTag: 'tag' }),
          backup_codes: [],
          enabled: true
        },
        error: null
      });

      mockSupabase.from().select().eq().gte().order.mockResolvedValue({
        data: [],
        error: null
      });

      speakeasy.totp.verify.mockReturnValue(false);

      const result = await mfaService.verifyTOTP('user-123', '000000');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code');
    });

    it('should handle rate limiting', async () => {
      mockSupabase.from().select().eq().gte().order.mockResolvedValue({
        data: new Array(6).fill({}), // 6 failed attempts
        error: null
      });

      const result = await mfaService.verifyTOTP('user-123', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many failed attempts');
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('enableMFA', () => {
    it('should enable MFA after successful verification', async () => {
      const speakeasy = require('speakeasy');
      
      // Mock successful verification
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          secret: JSON.stringify({ encrypted: 'encrypted-secret', iv: 'iv', authTag: 'tag' }),
          backup_codes: [],
          enabled: false
        },
        error: null
      });

      mockSupabase.from().select().eq().gte().order.mockResolvedValue({
        data: [],
        error: null
      });

      speakeasy.totp.verify.mockReturnValue(true);
      
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      const result = await mfaService.enableMFA('user-123', '123456');

      expect(result.success).toBe(true);
    });
  });

  describe('getMFAStatus', () => {
    it('should return correct status for enabled MFA', async () => {
      const { isEnabled } = require('../../config/features');
      isEnabled.mockReturnValue(true);

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          enabled: true,
          setup_completed_at: '2024-01-01T00:00:00Z',
          last_used_at: '2024-01-02T00:00:00Z',
          backup_codes: ['CODE1', 'CODE2']
        },
        error: null
      });

      const result = await mfaService.getMFAStatus('user-123');

      expect(result.configured).toBe(true);
      expect(result.enabled).toBe(true);
      expect(result.available).toBe(true);
      expect(result.backupCodesCount).toBe(2);
    });

    it('should return unavailable when MFA is disabled', async () => {
      const { isEnabled } = require('../../config/features');
      isEnabled.mockReturnValue(false);

      const result = await mfaService.getMFAStatus('user-123');

      expect(result.available).toBe(false);
      expect(result.reason).toBe('MFA feature is disabled');
    });
  });

  describe('generateSecureBackupCodes', () => {
    it('should generate correct number of backup codes', () => {
      const crypto = require('crypto');
      crypto.randomBytes.mockReturnValue(Buffer.from('random'));

      const codes = mfaService.generateSecureBackupCodes();

      expect(codes).toHaveLength(10);
      expect(codes[0]).toHaveLength(8);
      expect(codes[0]).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt secrets correctly', () => {
      const crypto = require('crypto');
      const mockCipher = {
        update: jest.fn().mockReturnValue('encrypted'),
        final: jest.fn().mockReturnValue(''),
        getAuthTag: jest.fn().mockReturnValue(Buffer.from('tag'))
      };
      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('decrypted'),
        final: jest.fn().mockReturnValue('')
      };

      crypto.randomBytes.mockReturnValue(Buffer.from('iv'));
      crypto.createCipher.mockReturnValue(mockCipher);
      crypto.createDecipher.mockReturnValue(mockDecipher);

      const secret = 'test-secret';
      const encrypted = mfaService.encryptSecret(secret);
      
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');

      const decrypted = mfaService.decryptSecret(encrypted);
      expect(decrypted).toBe('decrypted');
    });
  });
});