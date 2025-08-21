# 🚀 Maritime Onboarding System - Enhanced Hetzner Cloud Deployment

## 🎯 Overview

This directory contains an **enhanced, interactive deployment system** for the Maritime Onboarding System on Hetzner Cloud. The deployment process has been significantly improved based on real-world deployment experience and includes:

- **Interactive configuration** with smart defaults
- **Robust error handling** and automatic rollback
- **Dynamic resource optimization** based on server specifications
- **Comprehensive validation** and health checks
- **Security-first approach** with proper secret management

## ✨ Key Improvements Over Previous Version

### 🔒 Security Enhancements
- ✅ **No hardcoded API tokens** - Environment variable required
- ✅ **Secure password generation** with proper entropy
- ✅ **SSH key-only authentication**
- ✅ **Firewall configuration** with minimal attack surface
- ✅ **Fail2ban protection** against brute force attacks

### 🛠️ Deployment Reliability
- ✅ **Interactive configuration** with guided setup
- ✅ **Pre-deployment validation** to catch issues early
- ✅ **Build timeout handling** to prevent hanging builds
- ✅ **Comprehensive health checks** for all services
- ✅ **Automatic rollback** on deployment failure
- ✅ **Resource optimization** based on server type

### 📊 Monitoring & Validation
- ✅ **Real-time deployment progress** tracking
- ✅ **Comprehensive validation suite** testing all components
- ✅ **Resource usage monitoring** and optimization
- ✅ **Detailed logging** for troubleshooting
- ✅ **Backup system** with automated retention

## 💰 **Cost-Optimized Options**

- **CX21 Server** (2 vCPU, 4GB RAM): €4.90/month
- **50GB Volume**: €5.00/month
- **Backup**: €1-2/month
- **Floating IP**: €0.60/month

## 🚀 **One-Command Deployment**

### Prerequisites
- Hetzner Cloud API token (already configured)
- Local machine with `curl`, `jq`, and `ssh-keygen`
- Domain name (optional, for SSL)

```bash
# Make executable and deploy
chmod +x deployment/hetzner/deploy.sh
./deployment/hetzner/deploy.sh
```

**What it does automatically:**
- ✅ Creates Hetzner Cloud server with firewall
- ✅ Generates secure passwords (32+ character random)
- ✅ Deploys optimized Docker Compose stack
- ✅ Configures production-ready Nginx
- ✅ Sets up automated backups
- ✅ Configures health checks and monitoring

## 📋 **Server Specifications**

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **Server** | CX21 (2 vCPU, 4GB RAM, 40GB SSD) | €4.90 |
| **Volume** | 50GB additional storage | €5.00 |
| **Backup** | Automated daily backups | €1-2 |
| **Network** | 20TB traffic included | €0 |
| **Firewall** | DDoS protection included | €0 |

### Included Services
- **Application**: Maritime Onboarding System (optimized for CX21)
- **Database**: PostgreSQL 15 (512MB memory limit)
- **Cache**: Redis 7 (256MB memory limit)
- **Reverse Proxy**: Nginx (128MB memory limit)
- **SSL**: Let's Encrypt with auto-renewal
- **Backups**: Automated daily backups with 30-day retention

## 🔧 Configuration

### Environment Variables

Edit `/opt/maritime-onboarding/.env` on the server:

```bash
# Domain configuration
DOMAIN=your-domain.com
APP_URL=https://your-domain.com
SSL_EMAIL=admin@your-domain.com

# Email configuration
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=Maritime Onboarding <noreply@your-domain.com>

# Security contacts
SECURITY_EMAIL=security@your-domain.com
DEVOPS_EMAIL=devops@your-domain.com
```

### SSL Certificate Setup

```bash
# SSH into your server
ssh -i ~/.ssh/maritime_deployment root@YOUR_SERVER_IP

# Configure your domain in .env file
nano /opt/maritime-onboarding/.env

# Generate SSL certificate
cd /opt/maritime-onboarding
docker-compose run --rm certbot

# Restart Nginx to use the certificate
docker-compose restart nginx
```

## 🛠️ Management Commands

### Service Management

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update application
git pull origin master
docker-compose build --no-cache
docker-compose up -d
```

### Database Management

```bash
# Access database
docker-compose exec database psql -U postgres -d maritime_onboarding

# Create backup
docker-compose exec database pg_dump -U postgres maritime_onboarding > backup.sql

# Restore backup
docker-compose exec -T database psql -U postgres -d maritime_onboarding < backup.sql
```

### Monitoring

```bash
# Enable monitoring stack
docker-compose --profile monitoring up -d

# Access Grafana
# http://YOUR_SERVER_IP:3001
# Username: admin
# Password: (check .env file)

# Access Prometheus
# http://YOUR_SERVER_IP:9090
```

## 🔒 Security Features

### Automatic Security Configuration
- ✅ UFW firewall (ports 22, 80, 443)
- ✅ Fail2ban for SSH protection
- ✅ Automatic security updates
- ✅ SSL/TLS encryption
- ✅ Security headers
- ✅ Rate limiting

### Hetzner Cloud Firewall
- ✅ Automatically configured
- ✅ Restricts access to necessary ports
- ✅ DDoS protection included

### Generated Passwords
All passwords are automatically generated with high entropy:
- Database password
- Redis password
- JWT secret
- Session secret
- Webhook secret

## 📊 Backup & Recovery

### Automated Backups
- **Schedule**: Daily at 2 AM UTC
- **Retention**: 30 days
- **Location**: `/opt/maritime-onboarding/backups/`
- **Includes**: Database + application files

### Manual Backup
```bash
# Run backup manually
/opt/maritime-onboarding/backup.sh

# List backups
ls -la /opt/maritime-onboarding/backups/
```

### Recovery
```bash
# Restore database from backup
gunzip -c /opt/maritime-onboarding/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
docker-compose exec -T database psql -U postgres -d maritime_onboarding

# Restore application files
tar -xzf /opt/maritime-onboarding/backups/app_backup_YYYYMMDD_HHMMSS.tar.gz
```

## 🔍 Troubleshooting

### Common Issues

#### Services not starting
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check memory usage
free -h
```

#### SSL certificate issues
```bash
# Check certificate status
docker-compose run --rm certbot certificates

# Renew certificate
docker-compose run --rm certbot renew

# Test certificate renewal
docker-compose run --rm certbot renew --dry-run
```

#### Database connection issues
```bash
# Check database status
docker-compose exec database pg_isready -U postgres

# Reset database password
# Edit .env file and restart services
docker-compose restart
```

### Log Locations
- **Application**: `docker-compose logs app`
- **Database**: `docker-compose logs database`
- **Nginx**: `docker-compose logs nginx`
- **System**: `/var/log/maritime/`

## 📈 Scaling

### Vertical Scaling (Upgrade Server)
```bash
# Stop services
docker-compose down

# Resize server in Hetzner Cloud Console
# Or use API:
curl -X POST \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"server_type": "cx31"}' \
  "https://api.hetzner-cloud.com/v1/servers/SERVER_ID/actions/change_type"

# Start services
docker-compose up -d
```

### Horizontal Scaling
For high-traffic deployments, consider:
- Load balancer with multiple app instances
- Separate database server
- Redis cluster
- CDN for static assets

## 💰 Cost Optimization

### Server Types
- **CX11** (1 vCPU, 2GB): €3.29/month - Development
- **CX21** (2 vCPU, 4GB): €4.90/month - Production (recommended)
- **CX31** (2 vCPU, 8GB): €9.51/month - High traffic
- **CX41** (4 vCPU, 16GB): €18.33/month - Enterprise

### Cost Monitoring
```bash
# Check current costs
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://api.hetzner-cloud.com/v1/pricing"
```

## 🆘 Support

### Getting Help
1. **Documentation**: Check this README
2. **Logs**: Always check `docker-compose logs`
3. **Health Check**: `curl http://localhost/health`
4. **Community**: GitHub Discussions
5. **Professional**: Contact support@shipdocs.app

### Emergency Contacts
- **Security Issues**: security@your-domain.com
- **System Issues**: devops@your-domain.com
- **Business Critical**: admin@your-domain.com

---

**🎉 Your Maritime Onboarding System is now running on Hetzner Cloud!**

Access your system at: `https://your-domain.com`
Default admin: `admin@maritime.local` / `admin123`
