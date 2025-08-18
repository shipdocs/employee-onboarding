/**
 * Unit Tests for MinIO Storage Service
 * Tests the storage-minio.js module that replaced Supabase Storage
 */

const Minio = require('minio');

// Mock the minio module
jest.mock('minio');

describe('MinIO Storage Service', () => {
  let storageService;
  let mockMinioClient;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.resetModules();
    
    // Create mock MinIO client
    mockMinioClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      getObject: jest.fn(),
      removeObject: jest.fn(),
      listObjects: jest.fn(),
      presignedGetUrl: jest.fn(),
      presignedPutUrl: jest.fn(),
      statObject: jest.fn(),
      copyObject: jest.fn(),
    };
    
    // Mock Client constructor
    Minio.Client = jest.fn(() => mockMinioClient);
    
    // Set test environment variables
    process.env.MINIO_ENDPOINT = 'test-minio';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_USE_SSL = 'false';
    process.env.MINIO_ACCESS_KEY = 'test-access-key';
    process.env.MINIO_SECRET_KEY = 'test-secret-key';
    
    // Import the module
    storageService = require('../../../lib/storage-minio');
  });
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_USE_SSL;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    jest.clearAllMocks();
  });
  
  describe('MinIO Client Configuration', () => {
    it('should create client with correct configuration from environment', () => {
      expect(Minio.Client).toHaveBeenCalledWith({
        endPoint: 'test-minio',
        port: 9000,
        useSSL: false,
        accessKey: 'test-access-key',
        secretKey: 'test-secret-key',
      });
    });
    
    it('should use default values when environment variables are not set', () => {
      // Reset environment
      delete process.env.MINIO_ENDPOINT;
      delete process.env.MINIO_PORT;
      delete process.env.MINIO_ACCESS_KEY;
      delete process.env.MINIO_SECRET_KEY;
      
      // Reimport module
      jest.resetModules();
      Minio.Client = jest.fn(() => mockMinioClient);
      require('../../../lib/storage-minio');
      
      expect(Minio.Client).toHaveBeenCalledWith(expect.objectContaining({
        endPoint: 'minio',
        port: 9000,
        accessKey: 'minioadmin',
        secretKey: 'minioadmin',
      }));
    });
  });
  
  describe('Bucket Operations', () => {
    it('should ensure bucket exists before operations', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue();
      
      await storageService.ensureBucket('test-bucket');
      
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('test-bucket', 'us-east-1');
    });
    
    it('should not create bucket if it already exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      
      await storageService.ensureBucket('existing-bucket');
      
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('existing-bucket');
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });
    
    it('should handle bucket creation errors', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockRejectedValue(new Error('Permission denied'));
      
      await expect(
        storageService.ensureBucket('forbidden-bucket')
      ).rejects.toThrow('Permission denied');
    });
  });
  
  describe('File Upload Operations', () => {
    beforeEach(() => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
    });
    
    it('should upload file successfully', async () => {
      const buffer = Buffer.from('test file content');
      mockMinioClient.putObject.mockResolvedValue({ etag: '123456' });
      
      const result = await storageService.upload('uploads', 'test.txt', buffer);
      
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        'test.txt',
        buffer,
        buffer.length,
        expect.any(Object)
      );
      expect(result).toEqual({
        success: true,
        key: 'test.txt',
        bucket: 'uploads',
        size: buffer.length,
      });
    });
    
    it('should handle upload with metadata', async () => {
      const buffer = Buffer.from('test content');
      const metadata = { 'Content-Type': 'text/plain', 'x-user-id': '123' };
      
      mockMinioClient.putObject.mockResolvedValue({ etag: 'abc123' });
      
      await storageService.upload('uploads', 'doc.txt', buffer, metadata);
      
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        'doc.txt',
        buffer,
        buffer.length,
        metadata
      );
    });
    
    it('should handle upload errors', async () => {
      const buffer = Buffer.from('test');
      mockMinioClient.putObject.mockRejectedValue(new Error('Storage full'));
      
      await expect(
        storageService.upload('uploads', 'test.txt', buffer)
      ).rejects.toThrow('Storage full');
    });
    
    it('should validate file size limits', async () => {
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      await expect(
        storageService.upload('uploads', 'large.bin', largeBuffer, {}, { maxSize: 50 * 1024 * 1024 })
      ).rejects.toThrow('File size exceeds maximum allowed');
    });
  });
  
  describe('File Download Operations', () => {
    it('should download file successfully', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('chunk1'));
            callback(Buffer.from('chunk2'));
          }
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return mockStream;
        }),
      };
      
      mockMinioClient.getObject.mockResolvedValue(mockStream);
      
      const result = await storageService.download('uploads', 'test.txt');
      
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('uploads', 'test.txt');
      expect(result.toString()).toBe('chunk1chunk2');
    });
    
    it('should handle download errors', async () => {
      mockMinioClient.getObject.mockRejectedValue(new Error('File not found'));
      
      await expect(
        storageService.download('uploads', 'missing.txt')
      ).rejects.toThrow('File not found');
    });
    
    it('should handle stream errors during download', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Stream interrupted'));
          }
          return mockStream;
        }),
      };
      
      mockMinioClient.getObject.mockResolvedValue(mockStream);
      
      await expect(
        storageService.download('uploads', 'corrupt.txt')
      ).rejects.toThrow('Stream interrupted');
    });
  });
  
  describe('File Deletion Operations', () => {
    it('should delete file successfully', async () => {
      mockMinioClient.removeObject.mockResolvedValue();
      
      const result = await storageService.delete('uploads', 'old-file.txt');
      
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('uploads', 'old-file.txt');
      expect(result).toEqual({ success: true });
    });
    
    it('should handle deletion errors', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('Permission denied'));
      
      await expect(
        storageService.delete('uploads', 'protected.txt')
      ).rejects.toThrow('Permission denied');
    });
    
    it('should delete multiple files', async () => {
      mockMinioClient.removeObject.mockResolvedValue();
      
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      const results = await storageService.deleteMultiple('uploads', files);
      
      expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(3);
      files.forEach(file => {
        expect(mockMinioClient.removeObject).toHaveBeenCalledWith('uploads', file);
      });
      expect(results).toEqual(files.map(() => ({ success: true })));
    });
  });
  
  describe('File Listing Operations', () => {
    it('should list files in bucket', async () => {
      const mockObjects = [
        { name: 'file1.txt', size: 100, lastModified: new Date() },
        { name: 'file2.pdf', size: 200, lastModified: new Date() },
      ];
      
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            mockObjects.forEach(obj => callback(obj));
          }
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return mockStream;
        }),
      };
      
      mockMinioClient.listObjects.mockReturnValue(mockStream);
      
      const result = await storageService.list('uploads', 'prefix/');
      
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith('uploads', 'prefix/', true);
      expect(result).toEqual(mockObjects);
    });
    
    it('should handle listing errors', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Access denied'));
          }
          return mockStream;
        }),
      };
      
      mockMinioClient.listObjects.mockReturnValue(mockStream);
      
      await expect(
        storageService.list('private-bucket')
      ).rejects.toThrow('Access denied');
    });
  });
  
  describe('Presigned URL Operations', () => {
    it('should generate presigned GET URL', async () => {
      const mockUrl = 'https://minio.local/bucket/file.txt?signature=xyz';
      mockMinioClient.presignedGetUrl.mockResolvedValue(mockUrl);
      
      const url = await storageService.getPresignedUrl('uploads', 'file.txt', 3600);
      
      expect(mockMinioClient.presignedGetUrl).toHaveBeenCalledWith(
        'GET',
        'uploads',
        'file.txt',
        3600
      );
      expect(url).toBe(mockUrl);
    });
    
    it('should generate presigned PUT URL', async () => {
      const mockUrl = 'https://minio.local/bucket/upload.txt?signature=abc';
      mockMinioClient.presignedPutUrl.mockResolvedValue(mockUrl);
      
      const url = await storageService.getPresignedUploadUrl('uploads', 'upload.txt', 1800);
      
      expect(mockMinioClient.presignedPutUrl).toHaveBeenCalledWith(
        'PUT',
        'uploads',
        'upload.txt',
        1800
      );
      expect(url).toBe(mockUrl);
    });
    
    it('should handle presigned URL generation errors', async () => {
      mockMinioClient.presignedGetUrl.mockRejectedValue(new Error('Invalid expiry'));
      
      await expect(
        storageService.getPresignedUrl('uploads', 'file.txt', -1)
      ).rejects.toThrow('Invalid expiry');
    });
  });
  
  describe('Supabase Storage Compatibility', () => {
    it('should provide Supabase-like from() interface', () => {
      const bucket = storageService.from('uploads');
      
      expect(bucket).toBeDefined();
      expect(typeof bucket.upload).toBe('function');
      expect(typeof bucket.download).toBe('function');
      expect(typeof bucket.remove).toBe('function');
      expect(typeof bucket.list).toBe('function');
      expect(typeof bucket.createSignedUrl).toBe('function');
    });
    
    it('should handle Supabase-style upload', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'xyz' });
      
      const file = Buffer.from('test content');
      const result = await storageService
        .from('uploads')
        .upload('path/to/file.txt', file);
      
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        'path/to/file.txt',
        file,
        file.length,
        expect.any(Object)
      );
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });
    
    it('should handle Supabase-style download', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') callback(Buffer.from('content'));
          if (event === 'end') setTimeout(callback, 0);
          return mockStream;
        }),
      };
      
      mockMinioClient.getObject.mockResolvedValue(mockStream);
      
      const result = await storageService
        .from('uploads')
        .download('file.txt');
      
      expect(result.data).toBeDefined();
      expect(result.data.toString()).toBe('content');
      expect(result.error).toBeNull();
    });
    
    it('should handle Supabase-style errors', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('Not found'));
      
      const result = await storageService
        .from('uploads')
        .remove(['missing.txt']);
      
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: expect.stringContaining('Not found')
      }));
    });
  });
  
  describe('File Metadata Operations', () => {
    it('should get file metadata', async () => {
      const mockStat = {
        size: 1024,
        lastModified: new Date('2024-01-01'),
        etag: 'abc123',
        metaData: { 'content-type': 'text/plain' },
      };
      
      mockMinioClient.statObject.mockResolvedValue(mockStat);
      
      const metadata = await storageService.getMetadata('uploads', 'file.txt');
      
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('uploads', 'file.txt');
      expect(metadata).toEqual(mockStat);
    });
    
    it('should handle metadata retrieval errors', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Object not found'));
      
      await expect(
        storageService.getMetadata('uploads', 'missing.txt')
      ).rejects.toThrow('Object not found');
    });
  });
  
  describe('File Copy Operations', () => {
    it('should copy file within same bucket', async () => {
      mockMinioClient.copyObject.mockResolvedValue({ etag: 'new-etag' });
      
      const result = await storageService.copy(
        'uploads',
        'source.txt',
        'uploads',
        'destination.txt'
      );
      
      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        'uploads',
        'destination.txt',
        '/uploads/source.txt',
        null
      );
      expect(result).toEqual({ success: true, etag: 'new-etag' });
    });
    
    it('should copy file between buckets', async () => {
      mockMinioClient.copyObject.mockResolvedValue({ etag: 'copied' });
      
      await storageService.copy(
        'uploads',
        'file.txt',
        'backup',
        'file-backup.txt'
      );
      
      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        'backup',
        'file-backup.txt',
        '/uploads/file.txt',
        null
      );
    });
    
    it('should handle copy errors', async () => {
      mockMinioClient.copyObject.mockRejectedValue(new Error('Copy failed'));
      
      await expect(
        storageService.copy('uploads', 'src.txt', 'backup', 'dst.txt')
      ).rejects.toThrow('Copy failed');
    });
  });
});