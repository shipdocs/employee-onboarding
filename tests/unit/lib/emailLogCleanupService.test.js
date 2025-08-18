/**
 * Unit tests for EmailLogCleanupService
 * Tests data retention enforcement and GDPR compliance features
 */

const { EmailLogCleanupService } = require('../../../lib/emailLogCleanupService');

// Mock Supabase
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        not: jest.fn(() => ({
          lt: jest.fn()
        })),
        lt: jest.fn(),
        head: jest.fn()
      })),
      insert: jest.fn()
    }))
  }
}));

describe('EmailLogCleanupService', () => {
  let cleanupService;
  let mockSupabase;

  beforeEach(() => {
    cleanupService = new EmailLogCleanupService();
    mockSupabase = require('../../../lib/supabase').supabase;
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    test('should have default configuration', () => {
      const config = cleanupService.getConfig();
      
      expect(config).toEqual({
        defaultBatchSize: 1000,
        defaultMaxBatches: 10,
        cleanupInterval: 24,
        enableCleanup: true,
        dryRun: false
      });
    });

    test('should update configuration', () => {
      const newConfig = {
        defaultBatchSize: 500,
        enableCleanup: false
      };

      cleanupService.updateConfig(newConfig);
      const config = cleanupService.getConfig();

      expect(config.defaultBatchSize).toBe(500);
      expect(config.enableCleanup).toBe(false);
      expect(config.defaultMaxBatches).toBe(10); // Should keep existing values
    });
  });

  describe('Cleanup Operations', () => {
    test('should run cleanup successfully', async () => {
      const mockCleanupResults = [
        { table_name: 'email_notifications', deleted_count: 150, batch_count: 1 },
        { table_name: 'email_logs', deleted_count: 75, batch_count: 1 }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockCleanupResults,
        error: null
      });

      const result = await cleanupService.runCleanup();

      expect(result.success).toBe(true);
      expect(result.total_deleted).toBe(225);
      expect(result.tables_processed).toBe(2);
      expect(result.details).toEqual(mockCleanupResults);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_expired_email_logs', {
        batch_size: 1000,
        max_batches: 10
      });
    });

    test('should handle cleanup failure', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await cleanupService.runCleanup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    test('should skip cleanup when disabled', async () => {
      cleanupService.updateConfig({ enableCleanup: false });

      const result = await cleanupService.runCleanup();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('cleanup_disabled');
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    test('should perform dry run without deleting', async () => {
      const mockCountResults = [
        { table_name: 'email_notifications', deleted_count: 100, batch_count: 0 },
        { table_name: 'email_logs', deleted_count: 50, batch_count: 0 }
      ];

      // Mock the count queries
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          not: jest.fn(() => ({
            lt: jest.fn().mockResolvedValue({ data: 100, error: null })
          })),
          lt: jest.fn().mockResolvedValue({ data: 50, error: null })
        }))
      });

      const result = await cleanupService.runCleanup({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dry_run).toBe(true);
      expect(result.total_deleted).toBe(150);
      expect(mockSupabase.rpc).not.toHaveBeenCalled(); // Should not call cleanup function
    });
  });

  describe('GDPR Compliance', () => {
    test('should delete user email logs successfully', async () => {
      const userId = 123;
      const mockDeletionResults = [
        { table_name: 'email_notifications', deleted_count: 25 },
        { table_name: 'email_logs', deleted_count: 15 }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockDeletionResults,
        error: null
      });

      const result = await cleanupService.deleteUserEmailLogs(userId);

      expect(result.success).toBe(true);
      expect(result.user_id).toBe(userId);
      expect(result.deleted_records).toEqual(mockDeletionResults);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_user_email_logs', {
        target_user_id: userId
      });
    });

    test('should handle GDPR deletion failure', async () => {
      const userId = 123;

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const result = await cleanupService.deleteUserEmailLogs(userId);

      expect(result.success).toBe(false);
      expect(result.user_id).toBe(userId);
      expect(result.error).toContain('User not found');
    });
  });

  describe('Retention Status', () => {
    test('should get retention status successfully', async () => {
      const mockStatusData = [
        {
          table_name: 'email_logs',
          retention_category: 'standard',
          total_records: 1000,
          permanent_records: 0,
          expired_records: 150,
          active_records: 850,
          oldest_record: '2024-01-01T00:00:00Z',
          newest_record: '2024-12-01T00:00:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockStatusData,
          error: null
        })
      });

      const result = await cleanupService.getRetentionStatus();

      expect(result.success).toBe(true);
      expect(result.status).toEqual(mockStatusData);
      expect(mockSupabase.from).toHaveBeenCalledWith('email_retention_status');
    });

    test('should handle retention status error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'View not found' }
        })
      });

      const result = await cleanupService.getRetentionStatus();

      expect(result.success).toBe(false);
      expect(result.error).toContain('View not found');
    });
  });

  describe('Scheduling', () => {
    test('should skip cleanup when not due', async () => {
      // Mock getLastCleanupTime to return recent time
      const recentTime = new Date(Date.now() - (1 * 60 * 60 * 1000)); // 1 hour ago
      jest.spyOn(cleanupService, 'getLastCleanupTime').mockResolvedValue(recentTime);

      const result = await cleanupService.scheduleCleanup();

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('cleanup_not_due');
      expect(result.next_cleanup).toBeDefined();
    });

    test('should run cleanup when due', async () => {
      // Mock getLastCleanupTime to return old time
      const oldTime = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
      jest.spyOn(cleanupService, 'getLastCleanupTime').mockResolvedValue(oldTime);

      // Mock successful cleanup
      mockSupabase.rpc.mockResolvedValue({
        data: [{ table_name: 'email_logs', deleted_count: 10, batch_count: 1 }],
        error: null
      });

      const result = await cleanupService.scheduleCleanup();

      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(result.total_deleted).toBe(10);
    });
  });

  describe('Logging', () => {
    test('should log cleanup operation', async () => {
      const mockResults = {
        success: true,
        total_deleted: 100,
        duration_ms: 1500
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      await cleanupService.logCleanupOperation(mockResults);

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_log');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: null,
        action: 'email_log_cleanup',
        resource_type: 'email_logs',
        resource_id: null,
        details: mockResults,
        ip_address: null,
        user_agent: 'email-cleanup-service'
      });
    });

    test('should log GDPR deletion', async () => {
      const userId = 123;
      const mockResults = {
        success: true,
        user_id: userId,
        deleted_records: []
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      await cleanupService.logGDPRDeletion(userId, mockResults);

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_log');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: userId,
        action: 'gdpr_email_deletion',
        resource_type: 'email_logs',
        resource_id: userId.toString(),
        details: mockResults,
        ip_address: null,
        user_agent: 'email-cleanup-service'
      });
    });
  });
});
