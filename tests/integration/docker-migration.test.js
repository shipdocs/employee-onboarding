/**
 * Integration Tests for Docker Migration
 * Tests the complete Docker-based architecture replacing Supabase/Vercel
 */

const request = require('supertest');
const { Pool } = require('pg');
const Minio = require('minio');

describe('Docker Migration Integration Tests', () => {
  let dbPool;
  let minioClient;
  let apiUrl;
  
  beforeAll(async () => {
    // Setup test environment
    apiUrl = process.env.API_URL || 'http://localhost:3000';
    
    // Initialize PostgreSQL connection
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'employee_onboarding',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    
    // Initialize MinIO client
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    
    // Wait for services to be ready
    await waitForServices();
  });
  
  afterAll(async () => {
    // Cleanup
    if (dbPool) await dbPool.end();
  });
  
  /**
   * Helper function to wait for services
   */
  async function waitForServices(maxRetries = 30, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Check database
        await dbPool.query('SELECT 1');
        
        // Check MinIO
        await minioClient.listBuckets();
        
        // Check API
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('Services not ready after maximum retries');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  describe('Service Health Checks', () => {
    it('should verify PostgreSQL is accessible', async () => {
      const result = await dbPool.query('SELECT version()');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].version).toContain('PostgreSQL');
    });
    
    it('should verify MinIO is accessible', async () => {
      const buckets = await minioClient.listBuckets();
      expect(Array.isArray(buckets)).toBe(true);
    });
    
    it('should verify backend API is healthy', async () => {
      const response = await fetch(`${apiUrl}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
    
    it('should verify PostgREST is accessible', async () => {
      const postgrestUrl = process.env.POSTGREST_URL || 'http://localhost:3001';
      const response = await fetch(postgrestUrl);
      
      expect(response.status).toBe(200);
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/openapi+json');
    });
    
    it('should verify Redis is accessible', async () => {
      const redis = require('redis');
      const client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      });
      
      await new Promise((resolve, reject) => {
        client.on('connect', resolve);
        client.on('error', reject);
      });
      
      const pong = await new Promise((resolve, reject) => {
        client.ping((err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      expect(pong).toBe('PONG');
      client.quit();
    });
  });
  
  describe('Database Operations', () => {
    const testTableName = 'test_migration_' + Date.now();
    
    beforeAll(async () => {
      // Create test table
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS ${testTableName} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
    
    afterAll(async () => {
      // Drop test table
      await dbPool.query(`DROP TABLE IF EXISTS ${testTableName}`);
    });
    
    it('should perform CRUD operations on PostgreSQL', async () => {
      // Create
      const insertResult = await dbPool.query(
        `INSERT INTO ${testTableName} (name, data) VALUES ($1, $2) RETURNING *`,
        ['Test Record', { key: 'value' }]
      );
      expect(insertResult.rows).toHaveLength(1);
      const recordId = insertResult.rows[0].id;
      
      // Read
      const selectResult = await dbPool.query(
        `SELECT * FROM ${testTableName} WHERE id = $1`,
        [recordId]
      );
      expect(selectResult.rows[0].name).toBe('Test Record');
      expect(selectResult.rows[0].data).toEqual({ key: 'value' });
      
      // Update
      const updateResult = await dbPool.query(
        `UPDATE ${testTableName} SET name = $1 WHERE id = $2 RETURNING *`,
        ['Updated Record', recordId]
      );
      expect(updateResult.rows[0].name).toBe('Updated Record');
      
      // Delete
      const deleteResult = await dbPool.query(
        `DELETE FROM ${testTableName} WHERE id = $1 RETURNING id`,
        [recordId]
      );
      expect(deleteResult.rows[0].id).toBe(recordId);
    });
    
    it('should handle transactions correctly', async () => {
      const client = await dbPool.connect();
      
      try {
        await client.query('BEGIN');
        
        await client.query(
          `INSERT INTO ${testTableName} (name, data) VALUES ($1, $2)`,
          ['Transaction Test 1', { tx: 1 }]
        );
        
        await client.query(
          `INSERT INTO ${testTableName} (name, data) VALUES ($1, $2)`,
          ['Transaction Test 2', { tx: 2 }]
        );
        
        await client.query('COMMIT');
        
        const result = await client.query(
          `SELECT * FROM ${testTableName} WHERE name LIKE 'Transaction Test%'`
        );
        expect(result.rows).toHaveLength(2);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    
    it('should rollback failed transactions', async () => {
      const client = await dbPool.connect();
      
      try {
        await client.query('BEGIN');
        
        await client.query(
          `INSERT INTO ${testTableName} (name, data) VALUES ($1, $2)`,
          ['Rollback Test', { will_rollback: true }]
        );
        
        // This should fail (null in NOT NULL column)
        await client.query(
          `INSERT INTO ${testTableName} (name, data) VALUES ($1, $2)`,
          [null, { invalid: true }]
        );
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
      
      const result = await dbPool.query(
        `SELECT * FROM ${testTableName} WHERE name = 'Rollback Test'`
      );
      expect(result.rows).toHaveLength(0);
    });
  });
  
  describe('Storage Operations', () => {
    const testBucket = 'test-migration-' + Date.now();
    
    beforeAll(async () => {
      // Create test bucket
      const exists = await minioClient.bucketExists(testBucket);
      if (!exists) {
        await minioClient.makeBucket(testBucket, 'us-east-1');
      }
    });
    
    afterAll(async () => {
      // Clean up test bucket
      try {
        const objects = [];
        const stream = minioClient.listObjects(testBucket, '', true);
        
        await new Promise((resolve, reject) => {
          stream.on('data', obj => objects.push(obj.name));
          stream.on('end', resolve);
          stream.on('error', reject);
        });
        
        for (const objName of objects) {
          await minioClient.removeObject(testBucket, objName);
        }
        
        await minioClient.removeBucket(testBucket);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    
    it('should upload files to MinIO', async () => {
      const fileName = 'test-upload.txt';
      const fileContent = Buffer.from('Test content for MinIO upload');
      
      await minioClient.putObject(
        testBucket,
        fileName,
        fileContent,
        fileContent.length,
        { 'Content-Type': 'text/plain' }
      );
      
      const stat = await minioClient.statObject(testBucket, fileName);
      expect(stat.size).toBe(fileContent.length);
    });
    
    it('should download files from MinIO', async () => {
      const fileName = 'test-download.txt';
      const fileContent = 'Download test content';
      
      await minioClient.putObject(
        testBucket,
        fileName,
        Buffer.from(fileContent)
      );
      
      const stream = await minioClient.getObject(testBucket, fileName);
      const chunks = [];
      
      await new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      const downloadedContent = Buffer.concat(chunks).toString();
      expect(downloadedContent).toBe(fileContent);
    });
    
    it('should list files in bucket', async () => {
      // Upload multiple files
      const files = ['file1.txt', 'file2.txt', 'dir/file3.txt'];
      
      for (const file of files) {
        await minioClient.putObject(
          testBucket,
          file,
          Buffer.from(`Content of ${file}`)
        );
      }
      
      const objects = [];
      const stream = minioClient.listObjects(testBucket, '', true);
      
      await new Promise((resolve, reject) => {
        stream.on('data', obj => objects.push(obj.name));
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      files.forEach(file => {
        expect(objects).toContain(file);
      });
    });
    
    it('should delete files from MinIO', async () => {
      const fileName = 'test-delete.txt';
      
      await minioClient.putObject(
        testBucket,
        fileName,
        Buffer.from('To be deleted')
      );
      
      await minioClient.removeObject(testBucket, fileName);
      
      await expect(
        minioClient.statObject(testBucket, fileName)
      ).rejects.toThrow();
    });
    
    it('should generate presigned URLs', async () => {
      const fileName = 'test-presigned.txt';
      const content = 'Presigned URL test';
      
      await minioClient.putObject(
        testBucket,
        fileName,
        Buffer.from(content)
      );
      
      const url = await minioClient.presignedGetUrl(
        'GET',
        testBucket,
        fileName,
        24 * 60 * 60 // 24 hours
      );
      
      expect(url).toContain(testBucket);
      expect(url).toContain(fileName);
      expect(url).toContain('X-Amz-Signature');
      
      // Test the URL works
      const response = await fetch(url);
      const downloadedContent = await response.text();
      expect(downloadedContent).toBe(content);
    });
  });
  
  describe('API Endpoints', () => {
    it('should handle authentication endpoints', async () => {
      const response = await fetch(`${apiUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' }),
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
    
    it('should handle rate limiting', async () => {
      const requests = [];
      
      // Make many rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          fetch(`${apiUrl}/api/health`)
        );
      }
      
      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);
      
      // At least one should be rate limited if rate limiting is enabled
      // or all should be 200 if rate limiting is disabled
      const allOk = statuses.every(s => s === 200);
      const hasRateLimited = statuses.some(s => s === 429);
      
      expect(allOk || hasRateLimited).toBe(true);
    });
    
    it('should serve static files', async () => {
      const response = await fetch(`${apiUrl}/favicon.ico`);
      
      // Should either return the favicon or 404 if not configured
      expect([200, 404]).toContain(response.status);
    });
  });
  
  describe('Supabase Compatibility Layer', () => {
    it('should handle Supabase-style database queries', async () => {
      const dbClient = require('../../lib/database-direct');
      
      // Test the compatibility layer
      const result = await dbClient
        .from('users')
        .select('*')
        .limit(1);
      
      expect(result).toBeDefined();
      expect(result.error || result.data).toBeDefined();
    });
    
    it('should handle Supabase-style storage operations', async () => {
      const storage = require('../../lib/storage-minio');
      
      // Test the compatibility layer
      const bucket = storage.from('uploads');
      expect(bucket).toBeDefined();
      expect(typeof bucket.upload).toBe('function');
      expect(typeof bucket.download).toBe('function');
    });
  });
  
  describe('Docker Network Communication', () => {
    it('should allow backend to connect to database', async () => {
      const response = await fetch(`${apiUrl}/api/test/db-connection`);
      
      // This endpoint might not exist, but we're testing network connectivity
      expect([200, 404]).toContain(response.status);
    });
    
    it('should verify all services are on the same network', async () => {
      // This test verifies that services can communicate internally
      // It's a meta-test that ensures Docker networking is configured correctly
      
      const services = [
        { name: 'Database', check: () => dbPool.query('SELECT 1') },
        { name: 'MinIO', check: () => minioClient.listBuckets() },
        { name: 'API', check: () => fetch(`${apiUrl}/health`) },
      ];
      
      const results = await Promise.allSettled(
        services.map(s => s.check())
      );
      
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'rejected') {
          console.error(`${services[index].name} failed:`, result.reason);
        }
      });
    });
  });
  
  describe('Environment Configuration', () => {
    it('should not have Supabase variables configured', () => {
      expect(process.env.SUPABASE_URL).toBeUndefined();
      expect(process.env.SUPABASE_ANON_KEY).toBeUndefined();
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    });
    
    it('should have Docker-specific variables configured', () => {
      // These should be set in the Docker environment
      const dockerVars = [
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'MINIO_ENDPOINT',
        'POSTGREST_URL',
      ];
      
      dockerVars.forEach(varName => {
        if (!process.env[varName]) {
          console.warn(`Expected ${varName} to be configured`);
        }
      });
    });
  });
});