/**
 * Unit Tests for Direct PostgreSQL Database Client
 * Tests the database-direct.js module that replaced Supabase
 */

const { Pool } = require('pg');
const { EventEmitter } = require('events');

// Mock the pg module
jest.mock('pg');

describe('Database Direct Client', () => {
  let dbClient;
  let mockPool;
  let mockQuery;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.resetModules();
    
    // Create mock pool instance
    mockPool = new EventEmitter();
    mockQuery = jest.fn();
    mockPool.query = mockQuery;
    mockPool.end = jest.fn();
    
    // Mock Pool constructor
    Pool.mockImplementation(() => mockPool);
    
    // Set test environment variables
    process.env.DB_HOST = 'test-host';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test-db';
    process.env.DB_USER = 'test-user';
    process.env.DB_PASSWORD = 'test-password';
    process.env.NODE_ENV = 'test';
    
    // Import the module (this creates the pool)
    dbClient = require('../../../lib/database-direct');
  });
  
  afterEach(async () => {
    // Clean up
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    jest.clearAllMocks();
  });
  
  describe('Connection Pool Configuration', () => {
    it('should create pool with correct configuration from environment variables', () => {
      expect(Pool).toHaveBeenCalledWith({
        host: 'test-host',
        port: 5432,
        database: 'test-db',
        user: 'test-user',
        password: 'test-password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });
    
    it('should use default values when environment variables are not set', () => {
      // Reset environment
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      
      // Reimport module
      jest.resetModules();
      Pool.mockImplementation(() => mockPool);
      require('../../../lib/database-direct');
      
      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        host: 'database',
        port: 5432,
        database: 'maritime',
        user: 'postgres',
        password: 'postgres',
      }));
    });
  });
  
  describe('Query Execution', () => {
    it('should execute query successfully with parameters', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test User' }],
        rowCount: 1,
      };
      mockQuery.mockResolvedValue(mockResult);
      
      const result = await dbClient.query('SELECT * FROM users WHERE id = $1', [1]);
      
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
    });
    
    it('should handle query errors properly', async () => {
      const mockError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(mockError);
      
      await expect(
        dbClient.query('SELECT * FROM invalid_table')
      ).rejects.toThrow('Database connection failed');
    });
    
    it('should log query duration in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockResult = { rows: [], rowCount: 0 };
      mockQuery.mockResolvedValue(mockResult);
      
      await dbClient.query('SELECT * FROM users');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 Query executed',
        expect.objectContaining({
          duration: expect.stringMatching(/\d+ms/),
          rows: 0
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Transaction Handling', () => {
    let mockClient;
    
    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect = jest.fn().mockResolvedValue(mockClient);
    });
    
    it('should handle successful transactions', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      
      const result = await dbClient.transaction(async (client) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['Test']);
        await client.query('UPDATE users SET active = true WHERE name = $1', ['Test']);
        return { success: true };
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('INSERT INTO users (name) VALUES ($1)', ['Test']);
      expect(mockClient.query).toHaveBeenCalledWith('UPDATE users SET active = true WHERE name = $1', ['Test']);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
    
    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')); // INSERT fails
      
      await expect(
        dbClient.transaction(async (client) => {
          await client.query('INSERT INTO users (name) VALUES ($1)', ['Test']);
        })
      ).rejects.toThrow('Constraint violation');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('Supabase Compatibility Layer', () => {
    it('should provide Supabase-like from() interface', () => {
      const fromQuery = dbClient.from('users');
      expect(fromQuery).toBeDefined();
      expect(typeof fromQuery.select).toBe('function');
      expect(typeof fromQuery.insert).toBe('function');
      expect(typeof fromQuery.update).toBe('function');
      expect(typeof fromQuery.delete).toBe('function');
    });
    
    it('should handle select queries with filters', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, name: 'John', age: 30 }],
        rowCount: 1,
      });
      
      const result = await dbClient
        .from('users')
        .select('*')
        .eq('name', 'John')
        .single();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['John'])
      );
      expect(result.data).toEqual({ id: 1, name: 'John', age: 30 });
      expect(result.error).toBeNull();
    });
    
    it('should handle insert operations', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 2, name: 'Jane', age: 25 }],
        rowCount: 1,
      });
      
      const result = await dbClient
        .from('users')
        .insert({ name: 'Jane', age: 25 });
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['Jane', 25])
      );
      expect(result.data).toEqual([{ id: 2, name: 'Jane', age: 25 }]);
      expect(result.error).toBeNull();
    });
    
    it('should handle update operations', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, name: 'John', age: 31 }],
        rowCount: 1,
      });
      
      const result = await dbClient
        .from('users')
        .update({ age: 31 })
        .eq('id', 1);
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([31, 1])
      );
      expect(result.data).toEqual([{ id: 1, name: 'John', age: 31 }]);
      expect(result.error).toBeNull();
    });
    
    it('should handle delete operations', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      });
      
      const result = await dbClient
        .from('users')
        .delete()
        .eq('id', 1);
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users'),
        expect.arrayContaining([1])
      );
      expect(result.error).toBeNull();
    });
    
    it('should handle errors in compatibility layer', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));
      
      const result = await dbClient
        .from('users')
        .select('*')
        .eq('id', 999)
        .single();
      
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: 'Database error'
      }));
    });
  });
  
  describe('Helper Functions', () => {
    it('should provide select helper', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }],
        rowCount: 2,
      });
      
      const result = await dbClient.helpers.select('users', { active: true });
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users'),
        expect.arrayContaining([true])
      );
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
    
    it('should provide insert helper', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 3, name: 'Bob' }],
        rowCount: 1,
      });
      
      const result = await dbClient.helpers.insert('users', { name: 'Bob' });
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['Bob'])
      );
      expect(result).toEqual({ id: 3, name: 'Bob' });
    });
    
    it('should provide update helper', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, status: 'active' }],
        rowCount: 1,
      });
      
      const result = await dbClient.helpers.update(
        'users',
        { status: 'active' },
        { id: 1 }
      );
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['active', 1])
      );
      expect(result).toEqual([{ id: 1, status: 'active' }]);
    });
    
    it('should provide delete helper', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      });
      
      const result = await dbClient.helpers.delete('users', { id: 1 });
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users'),
        expect.arrayContaining([1])
      );
      expect(result).toBe(true);
    });
  });
  
  describe('Connection Pool Events', () => {
    it('should log on successful connection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockPool.emit('connect');
      
      expect(consoleSpy).toHaveBeenCalledWith('📊 [DATABASE] Connected to PostgreSQL');
      consoleSpy.mockRestore();
    });
    
    it('should handle pool errors and exit process', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();
      
      mockPool.emit('error', new Error('Connection lost'));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ [DATABASE] Unexpected error:',
        expect.any(Error)
      );
      expect(exitSpy).toHaveBeenCalledWith(-1);
      
      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
  
  describe('Pool Cleanup', () => {
    it('should end pool connection properly', async () => {
      mockPool.end.mockResolvedValue();
      
      await dbClient.end();
      
      expect(mockPool.end).toHaveBeenCalled();
    });
    
    it('should handle errors during pool cleanup', async () => {
      mockPool.end.mockRejectedValue(new Error('Failed to close pool'));
      
      await expect(dbClient.end()).rejects.toThrow('Failed to close pool');
    });
  });
});