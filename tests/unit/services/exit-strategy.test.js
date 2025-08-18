/**
 * Exit Strategy Implementation Tests
 * Comprehensive testing of exit strategy and data deletion services
 */

const { exitStrategyService, EXIT_STATUS } = require('../../../lib/services/exitStrategyService');
const { dataDeletionService, DELETION_STATUS, DELETION_SCOPE } = require('../../../lib/services/dataDeletionService');

// Mock dependencies
jest.mock('../../../lib/supabase');
jest.mock('../../../lib/services/auditService');
jest.mock('../../../lib/storage');
jest.mock('jszip');

describe('Exit Strategy Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with correct constants', () => {
      expect(EXIT_STATUS).toHaveProperty('PENDING');
      expect(EXIT_STATUS).toHaveProperty('COLLECTING');
      expect(EXIT_STATUS).toHaveProperty('PACKAGING');
      expect(EXIT_STATUS).toHaveProperty('COMPLETED');
      expect(EXIT_STATUS).toHaveProperty('FAILED');
    });

    test('should have required methods', () => {
      expect(typeof exitStrategyService.requestSystemExport).toBe('function');
      expect(typeof exitStrategyService.collectSystemInfo).toBe('function');
      expect(typeof exitStrategyService.collectAllUserData).toBe('function');
      expect(typeof exitStrategyService.generateExportDocumentation).toBe('function');
      expect(typeof exitStrategyService.generateMigrationGuide).toBe('function');
      expect(typeof exitStrategyService.generateDataDictionary).toBe('function');
    });
  });

  describe('generateExportDocumentation', () => {
    test('should generate comprehensive documentation', () => {
      const exportData = {
        metadata: {
          export_date: '2024-01-01T00:00:00Z',
          export_type: 'complete_system_export',
          requested_by: 'admin@test.com',
          export_version: '1.0'
        },
        system_info: {
          application: { name: 'Test App', version: '1.0', environment: 'test' },
          database: { provider: 'Supabase PostgreSQL' }
        },
        data: {
          users: [1, 2, 3],
          audit_logs: [1, 2, 3, 4, 5]
        }
      };

      const documentation = exitStrategyService.generateExportDocumentation(exportData);

      expect(documentation).toContain('Maritime Onboarding System - Complete Export');
      expect(documentation).toContain('Export Date');
      expect(documentation).toContain('**users**: 3 records');
      expect(documentation).toContain('**audit_logs**: 5 records');
      expect(documentation).toContain('migration_guide.md');
    });
  });

  describe('generateMigrationGuide', () => {
    test('should generate detailed migration instructions', () => {
      const guide = exitStrategyService.generateMigrationGuide();

      expect(guide).toContain('Migration Guide - Maritime Onboarding System');
      expect(guide).toContain('Pre-Migration Checklist');
      expect(guide).toContain('Migration Steps');
      expect(guide).toContain('Data Validation');
      expect(guide).toContain('Database Migration');
      expect(guide).toContain('Rollback Procedure');
      expect(guide).toContain('sha256sum');
    });
  });

  describe('generateDataDictionary', () => {
    test('should generate comprehensive data dictionary', () => {
      const dictionary = exitStrategyService.generateDataDictionary();

      expect(dictionary).toHaveProperty('users');
      expect(dictionary).toHaveProperty('training_progress');
      expect(dictionary).toHaveProperty('certificates');
      expect(dictionary).toHaveProperty('audit_log');

      expect(dictionary.users).toHaveProperty('description');
      expect(dictionary.users).toHaveProperty('fields');
      expect(dictionary.users.fields).toHaveProperty('id');
      expect(dictionary.users.fields).toHaveProperty('email');
    });
  });
});

describe('Data Deletion Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with correct constants', () => {
      expect(DELETION_STATUS).toHaveProperty('PENDING');
      expect(DELETION_STATUS).toHaveProperty('IN_PROGRESS');
      expect(DELETION_STATUS).toHaveProperty('COMPLETED');
      expect(DELETION_STATUS).toHaveProperty('FAILED');

      expect(DELETION_SCOPE).toHaveProperty('USER_DATA');
      expect(DELETION_SCOPE).toHaveProperty('SYSTEM_DATA');
      expect(DELETION_SCOPE).toHaveProperty('COMPLETE_SYSTEM');
    });

    test('should have required methods', () => {
      expect(typeof dataDeletionService.requestDataDeletion).toBe('function');
      expect(typeof dataDeletionService.generateConfirmationCode).toBe('function');
      expect(typeof dataDeletionService.deleteTableData).toBe('function');
      expect(typeof dataDeletionService.getVerificationReport).toBe('function');
    });
  });

  describe('generateConfirmationCode', () => {
    test('should generate consistent confirmation codes', () => {
      const email = 'admin@test.com';
      const code1 = dataDeletionService.generateConfirmationCode(email);
      const code2 = dataDeletionService.generateConfirmationCode(email);

      expect(code1).toBe(code2);
      expect(code1).toHaveLength(8);
      expect(code1).toMatch(/^[A-F0-9]+$/);
    });

    test('should generate different codes for different emails', () => {
      const code1 = dataDeletionService.generateConfirmationCode('admin1@test.com');
      const code2 = dataDeletionService.generateConfirmationCode('admin2@test.com');

      expect(code1).not.toBe(code2);
    });

    test('should generate different codes for different dates', () => {
      // Mock Date to test date dependency
      const originalDate = Date;
      const mockDate = new Date('2024-01-01');
      global.Date = jest.fn(() => mockDate);
      global.Date.now = originalDate.now;

      const code1 = dataDeletionService.generateConfirmationCode('admin@test.com');

      // Change date
      mockDate.setDate(2);
      const code2 = dataDeletionService.generateConfirmationCode('admin@test.com');

      expect(code1).not.toBe(code2);

      // Restore original Date
      global.Date = originalDate;
    });
  });
});

describe('Integration Tests', () => {
  test('exit strategy and deletion services should have compatible interfaces', () => {
    // Test that both services export expected constants
    expect(EXIT_STATUS).toHaveProperty('PENDING');
    expect(EXIT_STATUS).toHaveProperty('COMPLETED');
    expect(DELETION_STATUS).toHaveProperty('PENDING');
    expect(DELETION_STATUS).toHaveProperty('COMPLETED');
    expect(DELETION_SCOPE).toHaveProperty('USER_DATA');
    expect(DELETION_SCOPE).toHaveProperty('COMPLETE_SYSTEM');

    // Test that both services are properly instantiated
    expect(exitStrategyService).toBeDefined();
    expect(dataDeletionService).toBeDefined();
    expect(typeof exitStrategyService.requestSystemExport).toBe('function');
    expect(typeof dataDeletionService.requestDataDeletion).toBe('function');
  });

  test('deletion order should maintain referential integrity', () => {
    const deletionOrder = dataDeletionService.deletionOrder;
    
    expect(Array.isArray(deletionOrder)).toBe(true);
    expect(deletionOrder.length).toBeGreaterThan(0);
    
    // Users should be deleted after dependent tables
    const usersIndex = deletionOrder.indexOf('users');
    const trainingProgressIndex = deletionOrder.indexOf('training_progress');
    const certificatesIndex = deletionOrder.indexOf('certificates');
    
    expect(usersIndex).toBeGreaterThan(trainingProgressIndex);
    expect(usersIndex).toBeGreaterThan(certificatesIndex);
  });

  test('export data structure should be consistent', () => {
    const dictionary = exitStrategyService.generateDataDictionary();
    
    // Verify all critical tables are documented
    const criticalTables = ['users', 'training_progress', 'certificates', 'audit_log'];
    
    criticalTables.forEach(table => {
      expect(dictionary).toHaveProperty(table);
      expect(dictionary[table]).toHaveProperty('description');
      expect(dictionary[table]).toHaveProperty('fields');
      expect(typeof dictionary[table].description).toBe('string');
      expect(typeof dictionary[table].fields).toBe('object');
    });
  });

  test('migration guide should include all necessary steps', () => {
    const guide = exitStrategyService.generateMigrationGuide();
    
    const requiredSections = [
      'Pre-Migration Checklist',
      'Data Validation',
      'Database Migration',
      'Configuration Migration',
      'Validation',
      'Go-Live',
      'Rollback Procedure'
    ];
    
    requiredSections.forEach(section => {
      expect(guide).toContain(section);
    });
  });
});
