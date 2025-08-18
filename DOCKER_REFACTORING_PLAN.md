# 🚀 Docker-Only Architecture Refactoring Plan

## Executive Summary
Complete removal of Supabase dependencies in favor of a pure Docker-based architecture using PostgreSQL, PostgREST, and MinIO for storage.

---

## 📊 Current State Analysis

### Supabase Dependencies Found
- **77 files** directly import/require Supabase
- **Primary dependency**: `@supabase/supabase-js`
- **Main usage points**:
  - Database queries (can use PostgREST directly)
  - File storage (replace with MinIO)
  - Authentication (already using JWT)
  - Real-time subscriptions (not heavily used)

### Current Docker Services
```yaml
✅ Already Have:
- PostgreSQL database
- PostgREST API
- Nginx proxy
- Backend Node.js service
- Frontend React service
- MailHog for email

❌ Need to Add:
- MinIO (S3-compatible storage)
- PgAdmin (database management)
- Backup service
```

---

## 🎯 Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Network                      │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Frontend  │  │   Backend   │  │   MailHog   │ │
│  │   (React)   │  │  (Node.js)  │  │   (Email)   │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘ │
│         │                 │                          │
│         └────────┬────────┘                          │
│                  ▼                                   │
│         ┌─────────────┐                             │
│         │    Nginx    │                             │
│         │   (Proxy)   │                             │
│         └──────┬──────┘                             │
│                │                                     │
│     ┌──────────┴───────────┬──────────┐            │
│     ▼                      ▼          ▼            │
│ ┌─────────┐         ┌──────────┐ ┌─────────┐      │
│ │PostgREST│         │  MinIO   │ │ PgAdmin │      │
│ │  (API)  │         │(Storage) │ │  (GUI)  │      │
│ └────┬────┘         └──────────┘ └────┬────┘      │
│      │                                 │            │
│      └──────────────┬──────────────────┘           │
│                     ▼                               │
│            ┌─────────────┐                          │
│            │ PostgreSQL  │                          │
│            │  Database   │                          │
│            └─────────────┘                          │
└───────────────────────────────────────────────────────┘
```

---

## 📝 Refactoring Steps

### Phase 1: Add Missing Services (Day 1)

#### 1.1 Add MinIO Service
```yaml
# docker-compose.yml addition
minio:
  image: minio/minio:latest
  container_name: maritime_minio
  restart: unless-stopped
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  volumes:
    - minio_data:/data
  command: server /data --console-address ":9001"
  networks:
    - maritime_network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 30s
    timeout: 20s
    retries: 3
```

#### 1.2 Add PgAdmin Service
```yaml
pgadmin:
  image: dpage/pgadmin4:latest
  container_name: maritime_pgadmin
  restart: unless-stopped
  ports:
    - "5050:80"
  environment:
    PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
    PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
  volumes:
    - pgadmin_data:/var/lib/pgadmin
  networks:
    - maritime_network
```

### Phase 2: Create Database Access Layer (Day 2)

#### 2.1 Create Direct PostgreSQL Client
```javascript
// lib/database.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'database',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
```

#### 2.2 Create PostgREST Client
```javascript
// lib/postgrest.js
const fetch = require('node-fetch');

class PostgRESTClient {
  constructor(url, headers = {}) {
    this.url = url;
    this.headers = {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...headers
    };
  }

  from(table) {
    return new QueryBuilder(this.url, table, this.headers);
  }
}

class QueryBuilder {
  constructor(url, table, headers) {
    this.url = `${url}/${table}`;
    this.headers = headers;
    this.queryParams = [];
  }

  select(columns = '*') {
    if (columns !== '*') {
      this.queryParams.push(`select=${columns}`);
    }
    return this;
  }

  eq(column, value) {
    this.queryParams.push(`${column}=eq.${value}`);
    return this;
  }

  insert(data) {
    return this._execute('POST', data);
  }

  update(data) {
    return this._execute('PATCH', data);
  }

  delete() {
    return this._execute('DELETE');
  }

  async _execute(method = 'GET', body = null) {
    const url = this.queryParams.length 
      ? `${this.url}?${this.queryParams.join('&')}`
      : this.url;

    const options = {
      method,
      headers: this.headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data
    };
  }
}

module.exports = PostgRESTClient;
```

### Phase 3: Create Storage Service (Day 2)

#### 3.1 MinIO Storage Service
```javascript
// lib/storage.js
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

class StorageService {
  constructor() {
    this.buckets = {
      uploads: 'uploads',
      certificates: 'certificates',
      proofs: 'training-proofs'
    };
  }

  async ensureBuckets() {
    for (const bucket of Object.values(this.buckets)) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
      }
    }
  }

  async upload(bucket, fileName, stream, metadata = {}) {
    await minioClient.putObject(bucket, fileName, stream, metadata);
    return `/${bucket}/${fileName}`;
  }

  async download(bucket, fileName) {
    return minioClient.getObject(bucket, fileName);
  }

  async delete(bucket, fileName) {
    await minioClient.removeObject(bucket, fileName);
  }

  async getUrl(bucket, fileName, expiry = 7200) {
    return minioClient.presignedGetObject(bucket, fileName, expiry);
  }
}

module.exports = new StorageService();
```

### Phase 4: Refactor Core Services (Days 3-4)

#### 4.1 Files to Refactor (Priority Order)

**Critical (Day 3):**
1. `lib/supabase.js` → `lib/database.js` + `lib/postgrest.js`
2. `lib/auth.js` → Remove Supabase auth, use JWT only
3. `lib/storage.js` → MinIO implementation
4. `services/database.js` → Direct PostgreSQL

**API Endpoints (Day 4):**
1. All files in `api/admin/`
2. All files in `api/manager/`
3. All files in `api/crew/`
4. All files in `api/auth/`

#### 4.2 Refactoring Pattern
```javascript
// Before (Supabase)
const { supabase } = require('../lib/supabase');
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'manager');

// After (PostgREST)
const postgrest = require('../lib/postgrest');
const { data, error } = await postgrest
  .from('users')
  .select('*')
  .eq('role', 'manager');

// Or Direct SQL
const db = require('../lib/database');
const { rows } = await db.query(
  'SELECT * FROM users WHERE role = $1',
  ['manager']
);
```

### Phase 5: Update Environment Variables (Day 4)

#### 5.1 Remove Supabase Variables
```bash
# Remove these
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

#### 5.2 Add New Variables
```bash
# Add these
DB_HOST=database
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
POSTGREST_URL=http://postgrest:3000
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
PGADMIN_EMAIL=admin@maritime.com
PGADMIN_PASSWORD=admin123
```

### Phase 6: Testing & Validation (Day 5)

#### 6.1 Test Checklist
- [ ] Database connections work
- [ ] PostgREST queries return data
- [ ] File uploads work with MinIO
- [ ] Authentication flows work
- [ ] All API endpoints respond
- [ ] Frontend can connect to backend
- [ ] Email sending works
- [ ] PDF generation works

#### 6.2 Performance Testing
```bash
# Test database performance
npm run test:performance

# Test API endpoints
npm run test:endpoints

# Run full test suite
npm test
```

---

## 🎯 Migration Commands

### Step 1: Backup Current State
```bash
# Backup database
docker exec maritime_database pg_dump -U postgres postgres > backup.sql

# Backup Docker configs
cp docker-compose.yml docker-compose.backup.yml
cp .env .env.backup
```

### Step 2: Update Docker Compose
```bash
# Stop current services
docker-compose down

# Update docker-compose.yml with new services
# Add MinIO and PgAdmin services

# Start new services
docker-compose up -d
```

### Step 3: Initialize MinIO
```bash
# Create buckets
docker exec -it maritime_minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec -it maritime_minio mc mb local/uploads
docker exec -it maritime_minio mc mb local/certificates
docker exec -it maritime_minio mc mb local/training-proofs
```

### Step 4: Run Refactored Code
```bash
# Install new dependencies
npm install pg minio

# Remove Supabase dependency
npm uninstall @supabase/supabase-js

# Restart services
docker-compose restart backend
```

---

## 📋 Benefits After Refactoring

### Technical Benefits
- ✅ **No external dependencies** - Everything runs locally
- ✅ **Simplified deployment** - Single `docker-compose up`
- ✅ **Better performance** - No network latency to cloud services
- ✅ **Full control** - Complete ownership of infrastructure
- ✅ **Offline capable** - Works without internet

### Cost Benefits
- 💰 No Supabase subscription ($25-500/month saved)
- 💰 No cloud storage costs
- 💰 No API rate limits
- 💰 Predictable infrastructure costs

### Security Benefits
- 🔒 All data stays on-premise
- 🔒 No external API keys to manage
- 🔒 Complete network isolation possible
- 🔒 No third-party data access

---

## ⚠️ Considerations

### What We're Losing
1. **Supabase Dashboard** - Replace with PgAdmin
2. **Automatic backups** - Need to implement local backup strategy
3. **Built-in real-time** - Can add with WebSockets if needed
4. **Supabase Auth UI** - Already using custom JWT auth

### What We're Gaining
1. **Complete independence** from cloud providers
2. **Faster local development** (no internet required)
3. **Easier debugging** (all services local)
4. **Better security** (no external access)

---

## 📊 Time Estimate

- **Day 1**: Add new Docker services (MinIO, PgAdmin)
- **Day 2**: Create database and storage abstraction layers
- **Day 3**: Refactor core libraries
- **Day 4**: Update API endpoints and environment
- **Day 5**: Testing and validation

**Total: 5 days** for complete refactoring

---

## 🚀 Next Steps

1. Review this plan
2. Backup current system
3. Create feature branch for refactoring
4. Follow phase-by-phase implementation
5. Test thoroughly before merging

---

## 📝 Notes

- Keep Supabase proxy temporarily for gradual migration
- Test each service independently
- Document any custom SQL queries needed
- Consider keeping PostgREST for REST API compatibility