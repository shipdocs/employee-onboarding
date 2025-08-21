# 🚢 Maritime Employee Onboarding System - Complete Installation Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Installation (Recommended)](#quick-installation-recommended)
- [Manual Installation](#manual-installation)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **Node.js**: Version 18+ (only for manual installation)

### System Requirements
- **RAM**: Minimum 8GB
- **Disk Space**: Minimum 10GB free
- **OS**: Linux, macOS, or Windows with WSL2

### Check Prerequisites
```bash
# Check Docker
docker --version

# Check Docker Compose
docker compose version

# Check Git
git --version
```

---

## Quick Installation (Recommended)

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Run the automated setup script
chmod +x setup.sh
./setup.sh
```

The setup script will automatically:
- ✅ Verify all prerequisites
- ✅ Generate secure passwords
- ✅ Create SSL certificates
- ✅ Build the React application
- ✅ Initialize the database
- ✅ Start all services
- ✅ Verify the installation

### 2. Access the Application

After successful installation, access:
- **Main Application**: http://localhost
- **API Health Check**: http://localhost:3000/health
- **Database Admin (pgAdmin)**: http://localhost:5050
- **File Storage (MinIO)**: http://localhost:9001
- **Email Testing (MailHog)**: http://localhost:8025

---

## Manual Installation

If the automated script fails or you prefer manual control:

### 1. Clone Repository
```bash
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file and set secure passwords for:
# - DB_PASSWORD
# - JWT_SECRET
# - NEXTAUTH_SECRET
# - PGADMIN_PASSWORD
# - MINIO_ROOT_PASSWORD
nano .env
```

### 3. Generate SSL Certificates
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=NL/ST=State/L=City/O=Maritime/CN=localhost"
```

### 4. Build Client Application
```bash
cd client
npm install --legacy-peer-deps
npm run build
cd ..
```

### 5. Start Docker Services
```bash
# Start all services
docker compose up -d

# Monitor logs
docker compose logs -f
```

---

## Verification

### Check Service Health
```bash
# View all running services
docker ps

# Check API health
curl http://localhost:3000/health

# Check frontend
curl -I http://localhost

# Check database
docker exec employee-onboarding-database psql -U postgres -d employee_onboarding -c "\dt"
```

### Expected Output
All services should show as "healthy" or "running":
- ✅ employee-onboarding-frontend (Port 80/443)
- ✅ employee-onboarding-backend (Port 3000)
- ✅ employee-onboarding-database (Port 5432)
- ✅ employee-onboarding-redis (Port 6379)
- ✅ employee-onboarding-minio (Port 9000/9001)
- ✅ employee-onboarding-mailhog (Port 1025/8025)
- ✅ employee-onboarding-pgadmin (Port 5050)

---

## Troubleshooting

### Common Issues and Solutions

#### Port Conflicts
```bash
# Error: bind: address already in use

# Solution: Stop conflicting services
sudo systemctl stop apache2  # or nginx
sudo systemctl stop postgresql

# Or change ports in docker-compose.yml
```

#### Database Not Healthy
```bash
# Solution: Wait for initialization
docker logs employee-onboarding-database

# Recreate if needed
docker compose down -v
docker compose up -d
```

#### Frontend Not Loading
```bash
# Check if build exists
ls -la client/build

# Rebuild if missing
cd client && npm run build && cd ..

# Restart frontend
docker compose restart frontend
```

#### Permission Issues
```bash
# Fix permissions
sudo chown -R $USER:$USER .
chmod +x setup.sh
```

#### Network Conflicts
```bash
# Remove old networks
docker network prune

# Or specify different subnet in docker-compose.yml
```

### Reset Everything
```bash
# WARNING: This removes all data!
docker compose down -v
docker system prune -a
rm -rf client/node_modules client/build
./setup.sh
```

---

## Production Deployment

### Security Checklist
- [ ] Change all default passwords in `.env`
- [ ] Use proper SSL certificates (not self-signed)
- [ ] Configure firewall rules
- [ ] Enable automated backups
- [ ] Set up monitoring and alerting
- [ ] Configure email service (replace MailHog)
- [ ] Set NODE_ENV=production

### Environment Variables for Production
```bash
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
API_URL=https://api.your-domain.com

# Use real email service
EMAIL_SERVER=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-email-password
```

### Backup Strategy
```bash
# Database backup
docker exec employee-onboarding-database pg_dump -U postgres employee_onboarding > backup.sql

# File storage backup
docker run --rm -v employee-onboarding_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz /data
```

### Monitoring
```bash
# View logs
docker compose logs -f

# Monitor resource usage
docker stats

# Check application logs
docker logs employee-onboarding-backend
```

---

## Service Management

### Start/Stop Services
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart backend

# View service logs
docker compose logs -f backend
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build
```

### Database Management
```bash
# Access database
docker exec -it employee-onboarding-database psql -U postgres -d employee_onboarding

# Run migrations
docker exec employee-onboarding-backend npm run migrate:all

# Create backup
docker exec employee-onboarding-database pg_dump -U postgres employee_onboarding > backup_$(date +%Y%m%d).sql
```

---

## Getting Started After Installation

1. **Create Admin Account**
   - Navigate to http://localhost
   - Click "Register" or "Sign Up"
   - First user automatically becomes admin

2. **Configure System**
   - Log in with admin account
   - Set up company details
   - Create onboarding workflows
   - Add training modules

3. **Add Users**
   - Create manager accounts
   - Add crew members
   - Assign roles and permissions

4. **Test Features**
   - Create a test onboarding workflow
   - Upload training documents
   - Complete a quiz
   - Generate certificates

---

## Support

### Documentation
- [Quick Start Guide](QUICK_START.md)
- [User Manual](docs/user-guides/)
- [API Documentation](docs/api/)
- [Security Guide](SECURITY.md)

### Get Help
- **Issues**: [GitHub Issues](https://github.com/shipdocs/employee-onboarding/issues)
- **Discussions**: [GitHub Discussions](https://github.com/shipdocs/employee-onboarding/discussions)
- **Email**: support@maritime-onboarding.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Last Updated**: August 2025
**Version**: 2.0.1