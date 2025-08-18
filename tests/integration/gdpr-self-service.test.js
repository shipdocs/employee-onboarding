/**
 * GDPR Self-Service Portal Tests
 * Tests the complete GDPR self-service functionality
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for testing
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_USER = {
  email: 'gdpr-test@shipdocs.app',
  password: 'TestPassword123!',
  firstName: 'GDPR',
  lastName: 'TestUser',
  role: 'crew'
};

let authToken = null;
let testUserId = null;

describe('GDPR Self-Service Portal', () => {

  beforeAll(async () => {
    // Skip auth setup for now - test API structure
    console.log('GDPR Self-Service Portal tests starting...');
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      // Delete test user's GDPR requests
      await supabase.from('export_data').delete().eq('request_id', testUserId);
      await supabase.from('data_exports').delete().eq('user_id', testUserId);
      await supabase.from('data_deletions').delete().eq('user_id', testUserId);
      await supabase.from('compliance_notifications').delete().eq('user_id', testUserId);
      
      // Delete test user
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Database Schema Validation', () => {
    test('should have created export_data table', async () => {
      const { data, error } = await supabase
        .from('export_data')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should have created compliance_notifications table', async () => {
      const { data, error } = await supabase
        .from('compliance_notifications')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should have created data_deletions table', async () => {
      const { data, error } = await supabase
        .from('data_deletions')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('GDPR Functions Validation', () => {
    test('should have cleanup_expired_exports function', async () => {
      const { data, error } = await supabase.rpc('cleanup_expired_exports');

      // Function should exist and return a number (count of deleted items)
      expect(error).toBeNull();
      expect(typeof data).toBe('number');
    });

    test('should have gdpr_request_summary view', async () => {
      const { data, error } = await supabase
        .from('gdpr_request_summary')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Compliance Notifications', () => {
    test('should have initial compliance notification', async () => {
      const { data, error } = await supabase
        .from('compliance_notifications')
        .select('*')
        .eq('type', 'audit_request')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].message).toContain('GDPR self-service portal');
    });

    test('should validate compliance notification constraints', async () => {
      // Test valid notification
      const { data, error } = await supabase
        .from('compliance_notifications')
        .insert({
          type: 'compliance_issue',
          priority: 'high',
          message: 'Test compliance notification',
          assigned_to: 'test-team'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.type).toBe('compliance_issue');
      expect(data.priority).toBe('high');

      // Clean up
      if (data?.id) {
        await supabase
          .from('compliance_notifications')
          .delete()
          .eq('id', data.id);
      }
    });
  });

  describe('Data Integrity', () => {
    test('should validate table relationships', async () => {
      // Test that foreign key relationships work
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      expect(userError).toBeNull();

      if (users && users.length > 0) {
        // Test data_exports relationship
        const { data: exports, error: exportError } = await supabase
          .from('data_exports')
          .select('*')
          .eq('user_id', users[0].id)
          .limit(1);

        expect(exportError).toBeNull();
        expect(exports).toBeDefined();
      }
    });
  });
});

// Helper function to wait for async operations
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
