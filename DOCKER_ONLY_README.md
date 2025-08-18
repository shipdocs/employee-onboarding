# 🐳 Maritime Onboarding System - Docker-Only Architecture

## Overview
This system now runs entirely on Docker with no external dependencies. All services including database, storage, and email are self-contained.

---

## 🚀 Quick Start

### 1. Prerequisites
- Docker & Docker Compose installed
- 4GB+ RAM available
- Ports 80, 443, 3000, 5432, 9000, 9001 available

### 2. Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd maritime-onboarding

# Create environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Check service health
docker-compose ps
```

### 3. Access Points
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **PgAdmin**: http://localhost:5050 (admin@maritime.com / admin123)
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)
- **MailHog**: http://localhost:8025

---

## 📦 Architecture Components

### Core Services
| Service | Purpose | Port | Container Name |
|---------|---------|------|----------------|
| PostgreSQL | Main database | 5432 | maritime_database |
| PostgREST | REST API for database | 3001 | maritime_postgrest |
| Backend | Node.js API server | 3000 | maritime_backend |
| Frontend | React application | 80/443 | maritime_frontend |
| MinIO | S3-compatible storage | 9000/9001 | maritime_minio |
| Redis | Caching layer | 6379 | maritime_redis |
| MailHog | Email testing | 1025/8025 | maritime_mailhog |
| PgAdmin | Database management | 5050 | maritime_pgadmin |

### Data Persistence
All data is persisted in Docker volumes:
- `postgres_data` - Database files
- `minio_data` - File storage
- `redis_data` - Cache data
- `pgadmin_data` - PgAdmin settings

---

## 🔧 Configuration

### Environment Variables
Key variables in `.env`:
```bash
# Database
DB_NAME=maritime
DB_USER=postgres
DB_PASSWORD=secure_password_here

# Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=secure_minio_password

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_chars

# Admin
PGADMIN_EMAIL=admin@maritime.com
PGADMIN_PASSWORD=secure_admin_password
```

### Security Hardening
For production, update these:
1. Change all default passwords
2. Use strong JWT secret (32+ characters)
3. Configure SSL certificates
4. Set NODE_ENV=production
5. Restrict exposed ports

---

## 📝 Common Operations

### Database Management
```bash
# Access database CLI
docker exec -it maritime_database psql -U postgres -d maritime

# Backup database
docker exec maritime_database pg_dump -U postgres maritime > backup.sql

# Restore database
docker exec -i maritime_database psql -U postgres maritime < backup.sql

# View logs
docker logs maritime_database
```

### Storage Management
```bash
# Access MinIO CLI
docker exec -it maritime_minio mc alias set local http://localhost:9000 minioadmin minioadmin

# List buckets
docker exec -it maritime_minio mc ls local

# Create bucket
docker exec -it maritime_minio mc mb local/new-bucket
```

### Service Management
```bash
# Stop all services
docker-compose down

# Start specific service
docker-compose up -d backend

# Restart service
docker-compose restart backend

# View logs
docker-compose logs -f backend

# Remove everything (including data)
docker-compose down -v
```

---

## 🔄 Migration from Supabase

### Automated Migration
```bash
# Run migration script
npm run migrate:to-docker

# Or manually
node scripts/migrate-to-docker.js
```

### Manual Migration Steps
1. **Backup existing data**
   ```bash
   docker exec maritime_database pg_dump -U postgres > backup.sql
   ```

2. **Update imports**
   - Replace `lib/supabase` with `lib/database-direct`
   - Replace storage calls with MinIO

3. **Update environment**
   - Remove Supabase variables
   - Add Docker service variables

4. **Test thoroughly**
   ```bash
   npm test
   npm run test:endpoints
   ```

---

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Check port conflicts
netstat -tulpn | grep [port]

# Reset service
docker-compose down
docker-compose up -d [service-name]
```

### Database Connection Issues
```bash
# Test connection
docker exec maritime_backend node -e "require('./lib/database-direct').query('SELECT 1')"

# Check network
docker network ls
docker network inspect maritime_network
```

### Storage Issues
```bash
# Check MinIO status
curl http://localhost:9000/minio/health/live

# View MinIO logs
docker logs maritime_minio

# Reset MinIO
docker-compose down minio
docker volume rm maritime_minio_data
docker-compose up -d minio
```

---

## 🔐 Security Best Practices

### For Production
1. **Use secrets management**
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

2. **Enable SSL/TLS**
   ```yaml
   frontend:
     volumes:
       - ./ssl:/etc/nginx/ssl:ro
   ```

3. **Restrict network access**
   ```yaml
   networks:
     maritime_network:
       internal: true
   ```

4. **Regular backups**
   ```bash
   # Add to crontab
   0 2 * * * docker exec maritime_database pg_dump -U postgres maritime > /backups/maritime_$(date +%Y%m%d).sql
   ```

---

## 📊 Monitoring

### Health Checks
All services have built-in health checks:
```bash
# Check all services
docker-compose ps

# Check specific service health
docker inspect maritime_backend --format='{{.State.Health.Status}}'
```

### Resource Usage
```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

### Logs Aggregation
```bash
# View all logs
docker-compose logs

# Follow specific service
docker-compose logs -f backend

# Export logs
docker-compose logs > logs.txt
```

---

## 🔄 Backup & Recovery

### Automated Backups
The backup service runs daily backups automatically.

### Manual Backup
```bash
# Full backup script
./scripts/backup-all.sh

# Individual components
docker exec maritime_database pg_dump -U postgres maritime > db_backup.sql
docker exec maritime_minio mc mirror local/uploads ./backup/uploads
```

### Recovery
```bash
# Restore database
docker exec -i maritime_database psql -U postgres maritime < db_backup.sql

# Restore files
docker exec maritime_minio mc mirror ./backup/uploads local/uploads
```

---

## 🎯 Benefits of Docker-Only

### Advantages
- ✅ **No external dependencies** - Everything runs locally
- ✅ **Cost savings** - No cloud service fees
- ✅ **Complete control** - Full access to all components
- ✅ **Better security** - No external API exposure
- ✅ **Offline capable** - Works without internet
- ✅ **Easier debugging** - All logs accessible locally
- ✅ **Consistent environments** - Same setup everywhere

### Trade-offs
- ⚠️ Manual backup management required
- ⚠️ No automatic scaling
- ⚠️ Self-managed security updates
- ⚠️ No built-in CDN

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MinIO Documentation](https://docs.min.io/)
- [PostgREST Documentation](https://postgrest.org/)

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review service logs
3. Check GitHub issues
4. Contact the development team

---

**Version**: 3.0.0
**Last Updated**: 2025-08-18
**Status**: Production Ready