# Installation Guide

## System Requirements

### Minimum Requirements
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 20 GB available
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### Recommended Requirements
- **CPU**: 8 cores
- **RAM**: 16 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps

## Installation Steps

### 1. Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Clone Repository

```bash
git clone https://github.com/maritime/employee-onboarding.git
cd employee-onboarding
```

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

**Required Configuration:**
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret
- `NEXTAUTH_SECRET` - NextAuth secret
- `MINIO_ROOT_PASSWORD` - Object storage password
- `REDIS_PASSWORD` - Redis password

### 5. SSL Configuration (Production)

```bash
# Create SSL directory
mkdir -p ssl

# Copy your certificates
cp /path/to/cert.pem ssl/
cp /path/to/key.pem ssl/
```

### 6. Start Services

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 7. Verify Installation

```bash
# Check service status
docker compose ps

# Check application health
curl http://localhost/health
```

## Database Setup

### Initial Migration

```bash
# Run database migrations
docker compose exec backend npm run migrate
```

### Create Admin User

```bash
# Access database
docker compose exec database psql -U postgres -d employee_onboarding

# Create admin user
INSERT INTO users (email, password, role, is_active) 
VALUES ('admin@company.com', '$2b$10$...', 'admin', true);
```

## Backup Configuration

### Automated Backups

The system includes automated daily backups at 2 AM:

```bash
# View backup configuration
cat docker-compose.yml | grep backup
```

### Manual Backup

```bash
# Create manual backup
docker compose exec backup /backup.sh
```

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

### Health Checks

- Application: http://localhost/health
- API: http://localhost:3000/health
- Database: Port 5432
- Redis: Port 6379

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port
lsof -i :80
# Kill process
kill -9 <PID>
```

**Permission Denied**
```bash
# Fix Docker permissions
sudo chmod 666 /var/run/docker.sock
```

**Database Connection Failed**
```bash
# Check database logs
docker compose logs database
# Restart database
docker compose restart database
```

### Support

- Email: support@maritime.com
- Documentation: http://localhost/docs
- GitHub Issues: https://github.com/maritime/employee-onboarding/issues