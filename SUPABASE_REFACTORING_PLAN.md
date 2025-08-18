# Maritime Onboarding System - Supabase Refactoring Plan

## 🎯 Goal: Remove Supabase Dependency, Use Docker-Only Architecture

### Current Architecture
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Backend    │───▶│  PostgreSQL     │
│   (React)       │    │   (Node.js)  │    │  (Docker)       │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Supabase   │
                       │   Storage    │
                       └──────────────┘
```

### Target Architecture
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Backend    │───▶│  PostgreSQL     │
│   (React)       │    │   (Node.js)  │    │  (Docker)       │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   MinIO      │
                       │   (Docker)   │
                       └──────────────┘
```

## 📋 Files That Need Refactoring

### 1. Database Connection Files
- `lib/supabase.js` - Replace with direct PostgreSQL client
- `services/database.js` - Remove Supabase client
- `lib/supabase-wrapper.js` - Replace with PostgreSQL queries
- `lib/supabase-backup.js` - Remove or replace with PostgreSQL backup

### 2. Storage Service Files
- `lib/storage.js` - Replace Supabase Storage with MinIO/filesystem
- `api/upload/content-image.js` - Update file upload logic
- `api/upload/content-video.js` - Update video upload logic
- `lib/services/dataExportService.js` - Update export storage

### 3. Authentication Files
- `api/auth/manager-login.js` - Remove Supabase auth calls
- `lib/auth.js` - Use direct PostgreSQL for user management

### 4. Configuration Files
- `docker-compose.secure-simple.yml` - Remove Supabase service
- `.env.production` - Remove Supabase environment variables

## 🔄 Replacement Strategy

### 1. Database Access
**Replace:** Supabase client
**With:** Direct PostgreSQL client (pg) or PostgREST API calls

```javascript
// OLD: Supabase client
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

// NEW: Direct PostgreSQL
const result = await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
```

### 2. File Storage
**Replace:** Supabase Storage
**With:** MinIO (S3-compatible) or local filesystem

```javascript
// OLD: Supabase Storage
await supabase.storage
  .from('content-media')
  .upload(fileName, fileContent);

// NEW: MinIO or filesystem
await minioClient.putObject(
  'content-media',
  fileName,
  fileContent
);
```

### 3. Authentication
**Replace:** Supabase Auth
**With:** Direct PostgreSQL user management

```javascript
// OLD: Supabase auth
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// NEW: Direct authentication
const user = await authenticateUser(email, password);
const token = generateJWT(user);
```

## 🐳 Docker Services to Add

### 1. MinIO for File Storage
```yaml
minio:
  image: minio/minio:latest
  container_name: maritime_minio
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
  volumes:
    - minio_data:/data
  ports:
    - "9000:9000"
    - "9001:9001"
  command: server /data --console-address ":9001"
```

### 2. Redis for Caching (Optional)
```yaml
redis:
  image: redis:7-alpine
  container_name: maritime_redis
  volumes:
    - redis_data:/data
```

## 📦 NPM Packages to Install

### Remove
```bash
npm uninstall @supabase/supabase-js
```

### Add
```bash
npm install pg                    # PostgreSQL client
npm install minio                 # MinIO client
npm install multer                # File upload handling
npm install sharp                 # Image processing
```

## 🔧 Environment Variables to Update

### Remove from .env.production
```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

### Add to .env.production
```bash
# PostgreSQL Direct Connection
DATABASE_URL=postgresql://maritime_user:${POSTGRES_PASSWORD}@database:5432/maritime_onboarding_prod

# MinIO Configuration
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=${MINIO_PASSWORD}
MINIO_USE_SSL=false

# File Storage
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,application/pdf
```

## 🧪 Testing Strategy

### 1. Database Operations
- Test all CRUD operations work with direct PostgreSQL
- Verify PostgREST API still functions
- Check authentication flows

### 2. File Operations
- Test image uploads to MinIO
- Test video uploads to MinIO
- Verify file download/access
- Test backup storage

### 3. Integration Tests
- End-to-end user workflows
- Training content management
- Data export functionality

## 📈 Migration Steps

### Phase 1: Database Migration
1. Replace Supabase client with PostgreSQL client
2. Update all database queries
3. Test authentication system

### Phase 2: Storage Migration
1. Set up MinIO container
2. Replace storage service
3. Migrate existing files
4. Update upload endpoints

### Phase 3: Cleanup
1. Remove Supabase dependencies
2. Update Docker configuration
3. Clean up environment variables
4. Update documentation

## ⚠️ Potential Challenges

### 1. File Migration
- Need to download existing files from Supabase Storage
- Upload to new MinIO instance
- Update file URLs in database

### 2. Query Complexity
- Some Supabase queries might be complex to convert
- PostgREST syntax differences
- Need to handle transactions properly

### 3. Authentication
- Ensure JWT tokens still work
- Verify role-based access control
- Test magic link functionality

## 🎯 Success Criteria

- ✅ All Supabase dependencies removed
- ✅ Application runs entirely in Docker
- ✅ File uploads/downloads work
- ✅ Authentication system functional
- ✅ Database operations working
- ✅ No external API dependencies
- ✅ Performance maintained or improved

## 📞 Support During Refactoring

When working with Claude on this refactoring:

1. **Start with database layer** - Replace Supabase client first
2. **Then tackle storage** - Set up MinIO and file handling
3. **Test incrementally** - Don't change everything at once
4. **Keep backups** - Save current working state before changes
5. **Document changes** - Update this plan as you progress

Good luck with the refactoring! This will make your system much more self-contained and easier to manage.
