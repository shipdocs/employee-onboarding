# Deployment Guide - Maritime Onboarding System

Complete deployment documentation for the Docker-based Maritime Onboarding System.

## 🎯 **Deployment Overview**

The Maritime Onboarding System uses a **Docker-only architecture** for easy deployment and management. All components run in containers with secure networking and persistent storage.

### **Architecture Components**
- **PostgreSQL**: Primary database with persistent storage
- **PostgREST**: Automatic REST API from database schema
- **Node.js Backend**: Business logic and authentication
- **React Frontend**: User interface served by Nginx
- **MinIO**: S3-compatible object storage for files
- **Nginx**: Reverse proxy with SSL termination

## 🔧 **Prerequisites**

### **System Requirements**
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB minimum, 100GB+ for production
- **CPU**: 2 cores minimum, 4+ cores recommended
- **Network**: Static IP address, domain name

### **Software Requirements**
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: For repository access
- **OpenSSL**: For certificate generation

### **Network Requirements**
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Firewall**: Configure to allow only necessary ports
- **DNS**: Domain name pointing to server IP

## 🚀 **Quick Deployment**

### **1. Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### **2. Get the Code**
```bash
# Clone repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Create environment file
cp .env.example .env.production
```

### **3. Configure Environment**
Edit `.env.production` with your settings:
```bash
# Database Configuration
POSTGRES_DB=maritime_onboarding_prod
POSTGRES_USER=maritime_user
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# JWT Configuration (generate with: openssl rand -base64 32)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET
NEXTAUTH_SECRET=YOUR_GENERATED_NEXTAUTH_SECRET

# Application Configuration
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com

# MinIO Configuration
MINIO_ROOT_PASSWORD=CHANGE_THIS_MINIO_PASSWORD

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@your-domain.com
```

### **4. SSL Certificate**
```bash
# Option 1: Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# Option 2: Self-signed (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### **5. Deploy**
```bash
# Start all services
docker compose --env-file .env.production -f docker-compose.secure-simple.yml up -d

# Verify deployment
docker ps
curl -k https://localhost/health
```

## 🔒 **Security Configuration**

### **Firewall Setup**
```bash
# Install UFW
sudo apt install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **SSL/TLS Configuration**
The system includes secure SSL/TLS configuration:
- **TLS 1.2 and 1.3** only
- **Strong cipher suites**
- **HSTS headers**
- **Perfect Forward Secrecy**

### **Security Headers**
Automatically configured security headers:
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`

## 📊 **Monitoring and Health Checks**

### **Health Endpoints**
- **Application**: `https://your-domain.com/health`
- **API**: `https://your-domain.com/api/health`
- **Database**: Internal health checks

### **Container Monitoring**
```bash
# Check container status
docker ps

# View container logs
docker logs maritime_backend
docker logs maritime_nginx
docker logs maritime_database

# Monitor resource usage
docker stats
```

### **Log Management**
```bash
# View application logs
docker logs -f maritime_backend

# View nginx access logs
docker exec maritime_nginx tail -f /var/log/nginx/access.log

# View nginx error logs
docker exec maritime_nginx tail -f /var/log/nginx/error.log
```

## 💾 **Backup and Recovery**

### **Database Backup**
```bash
# Create backup
docker exec maritime_database pg_dump -U maritime_user maritime_onboarding_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec maritime_database pg_dump -U maritime_user maritime_onboarding_prod > $BACKUP_DIR/db_backup_$DATE.sql
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### **File Storage Backup**
```bash
# Backup MinIO data
docker exec maritime_minio mc mirror /data /backup/minio_$(date +%Y%m%d)

# Backup uploaded files
docker cp maritime_backend:/app/uploads ./uploads_backup_$(date +%Y%m%d)
```

### **Recovery Process**
```bash
# Restore database
docker exec -i maritime_database psql -U maritime_user maritime_onboarding_prod < backup.sql

# Restore files
docker cp uploads_backup_20241201 maritime_backend:/app/uploads
```

## 🔄 **Updates and Maintenance**

### **Application Updates**
```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker compose --env-file .env.production -f docker-compose.secure-simple.yml build

# Deploy updates
docker compose --env-file .env.production -f docker-compose.secure-simple.yml up -d
```

### **Security Updates**
```bash
# Update base images
docker compose pull

# Restart with updated images
docker compose --env-file .env.production -f docker-compose.secure-simple.yml up -d

# Clean up old images
docker image prune -f
```

### **SSL Certificate Renewal**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# Reload nginx
docker exec maritime_nginx nginx -s reload
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Containers Won't Start**
```bash
# Check logs
docker logs maritime_database
docker logs maritime_backend

# Check disk space
df -h

# Check memory usage
free -h
```

#### **Database Connection Issues**
```bash
# Check database status
docker exec maritime_database pg_isready -U maritime_user

# Check database logs
docker logs maritime_database

# Test connection
docker exec maritime_backend node -e "console.log('Testing DB connection...')"
```

#### **SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL configuration
curl -I https://your-domain.com

# Check nginx configuration
docker exec maritime_nginx nginx -t
```

### **Performance Optimization**
```bash
# Monitor resource usage
docker stats

# Optimize database
docker exec maritime_database psql -U maritime_user -c "VACUUM ANALYZE;"

# Clear application logs
docker exec maritime_backend sh -c "echo '' > /app/logs/app.log"
```

## 📞 **Support**

### **Getting Help**
- **Documentation**: This deployment guide
- **GitHub Issues**: [Report deployment issues](https://github.com/shipdocs/employee-onboarding/issues)
- **Email Support**: support@burando.online

### **Professional Services**
- **Deployment Assistance**: Available for enterprise customers
- **Custom Configuration**: Tailored deployment solutions
- **24/7 Support**: Enterprise support packages available

---

**For development deployment, see [Development Setup](../developer-guides/development-setup.md)**
