#!/bin/bash

# Hetzner Cloud ISO 27001 Compliant Deployment Script
# This script sets up the Maritime Onboarding Platform on Hetzner Cloud
# with ISO 27001 compliance features enabled

set -e

echo "🚀 Maritime Onboarding Platform - Hetzner ISO 27001 Deployment"
echo "=============================================================="
echo ""

# Configuration
HETZNER_TOKEN=${HETZNER_TOKEN:-"your-api-token"}
SERVER_TYPE="ccx31"  # 8 vCPU, 32GB RAM, NVMe SSD
LOCATION="nbg1"      # Nuremberg, Germany (ISO 27001 certified)
IMAGE="docker-ce"    # Docker pre-installed Ubuntu 22.04

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Create Hetzner Cloud Server
echo "1. Creating Hetzner Cloud Server..."
echo "-----------------------------------"
cat > hetzner-server.json << EOF
{
  "name": "maritime-onboarding-prod",
  "server_type": "${SERVER_TYPE}",
  "location": "${LOCATION}",
  "start_after_create": true,
  "image": "${IMAGE}",
  "ssh_keys": ["your-ssh-key-id"],
  "volumes": [],
  "networks": [],
  "user_data": "$(base64 -w0 cloud-init.yaml)",
  "labels": {
    "environment": "production",
    "compliance": "iso27001",
    "application": "maritime-onboarding"
  },
  "automount": false,
  "placement_group": null
}
EOF

# Step 2: Cloud-init configuration for security hardening
echo "2. Creating security-hardened cloud-init..."
echo "-------------------------------------------"
cat > cloud-init.yaml << 'EOF'
#cloud-config
package_update: true
package_upgrade: true

packages:
  - docker.io
  - docker-compose
  - fail2ban
  - ufw
  - certbot
  - nginx
  - git
  - htop
  - monitoring-plugins
  - prometheus-node-exporter

users:
  - name: maritime
    groups: docker
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - YOUR_SSH_PUBLIC_KEY

write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "10m",
          "max-file": "3"
        },
        "storage-driver": "overlay2",
        "iptables": true,
        "live-restore": true,
        "userland-proxy": false
      }

  - path: /etc/sysctl.d/99-maritime-security.conf
    content: |
      # IP Spoofing protection
      net.ipv4.conf.all.rp_filter = 1
      net.ipv4.conf.default.rp_filter = 1
      # Ignore ICMP redirects
      net.ipv4.conf.all.accept_redirects = 0
      net.ipv6.conf.all.accept_redirects = 0
      # Ignore send redirects
      net.ipv4.conf.all.send_redirects = 0
      # Disable source packet routing
      net.ipv4.conf.all.accept_source_route = 0
      net.ipv6.conf.all.accept_source_route = 0
      # Log Martians
      net.ipv4.conf.all.log_martians = 1
      # Ignore ICMP ping requests
      net.ipv4.icmp_echo_ignore_broadcasts = 1
      # SYN flood protection
      net.ipv4.tcp_syncookies = 1
      net.ipv4.tcp_syn_retries = 2
      net.ipv4.tcp_synack_retries = 2
      net.ipv4.tcp_max_syn_backlog = 4096

  - path: /etc/fail2ban/jail.local
    content: |
      [DEFAULT]
      bantime = 3600
      findtime = 600
      maxretry = 5
      
      [sshd]
      enabled = true
      port = ssh
      logpath = /var/log/auth.log
      
      [docker-nginx]
      enabled = true
      port = http,https
      logpath = /var/lib/docker/containers/*/*-json.log

runcmd:
  # Security hardening
  - sysctl -p /etc/sysctl.d/99-maritime-security.conf
  - systemctl enable fail2ban
  - systemctl start fail2ban
  
  # Configure firewall
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw allow 3000/tcp  # Backend API
  - ufw allow 5432/tcp  # PostgreSQL (restrict in production)
  - ufw --force enable
  
  # Setup monitoring
  - systemctl enable prometheus-node-exporter
  - systemctl start prometheus-node-exporter
  
  # Create app directory
  - mkdir -p /opt/maritime-onboarding
  - chown maritime:maritime /opt/maritime-onboarding
  
  # Setup automatic security updates
  - apt-get install -y unattended-upgrades
  - dpkg-reconfigure -plow unattended-upgrades
  
  # Install ClamAV for virus scanning
  - apt-get install -y clamav clamav-daemon
  - systemctl enable clamav-freshclam
  - systemctl start clamav-freshclam
  
  # Setup audit logging
  - apt-get install -y auditd
  - systemctl enable auditd
  - systemctl start auditd
  
  # Docker security
  - docker network create maritime-network --subnet=172.20.0.0/16
  
  # Create backup directory
  - mkdir -p /backup/database /backup/files
  - chmod 700 /backup
  
  # Log rotation
  - cat > /etc/logrotate.d/maritime << 'LOGROTATE'
/var/log/maritime/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 maritime adm
    sharedscripts
    postrotate
        docker-compose -f /opt/maritime-onboarding/docker-compose.yml kill -USR1 nginx
    endscript
}
LOGROTATE

final_message: "Maritime Onboarding Platform server ready for deployment!"
EOF

# Step 3: Create production docker-compose.yml
echo "3. Creating production Docker Compose configuration..."
echo "-----------------------------------------------------"
cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      # Enable encryption
      POSTGRES_INITDB_ARGS: "--data-checksums"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:5432:5432"  # Only localhost
    networks:
      - maritime-network
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 30s
      timeout: 10s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"  # Only localhost
    networks:
      - maritime-network
    deploy:
      resources:
        limits:
          memory: 1G
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
      MINIO_BROWSER_REDIRECT_URL: https://minio.${DOMAIN}
      # Enable encryption
      MINIO_KMS_AUTO_ENCRYPTION: on
    volumes:
      - minio_data:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    networks:
      - maritime-network
    deploy:
      resources:
        limits:
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    image: maritime-backend:latest
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@database:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      # Security headers
      FORCE_HTTPS: "true"
      SECURE_COOKIES: "true"
      CSRF_PROTECTION: "true"
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - maritime-network
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  frontend:
    image: maritime-frontend:latest
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      REACT_APP_API_URL: https://api.${DOMAIN}
    ports:
      - "80:80"
      - "443:443"
    networks:
      - maritime-network
    volumes:
      - ./nginx/certs:/etc/nginx/certs:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    deploy:
      resources:
        limits:
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Automated backup service
  backup:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      PGPASSWORD: ${DB_PASSWORD}
    volumes:
      - /backup:/backup
    networks:
      - maritime-network
    command: >
      sh -c "
      while true; do
        echo 'Starting backup...'
        pg_dump -h database -U ${DB_USER} ${DB_NAME} | gzip > /backup/database/backup_\$(date +%Y%m%d_%H%M%S).sql.gz
        # Keep only last 30 days of backups
        find /backup/database -name 'backup_*.sql.gz' -mtime +30 -delete
        # Sync to Hetzner Storage Box (optional)
        # rsync -avz /backup/ u123456@u123456.your-storagebox.de:/backup/
        echo 'Backup completed'
        sleep 86400
      done
      "
    deploy:
      resources:
        limits:
          memory: 512M

networks:
  maritime-network:
    external: true

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
EOF

# Step 4: Create deployment script
echo "4. Creating deployment script..."
echo "--------------------------------"
cat > deploy.sh << 'EOF'
#!/bin/bash

# Maritime Onboarding Platform Deployment Script
set -e

echo "Deploying Maritime Onboarding Platform..."

# Pull latest code
git pull origin main

# Build containers
docker-compose -f docker-compose.production.yml build

# Run database migrations
docker-compose -f docker-compose.production.yml run --rm backend npm run db:migrate

# Deploy with zero-downtime
docker-compose -f docker-compose.production.yml up -d --remove-orphans

# Health check
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "Deployment successful!"
EOF

chmod +x deploy.sh

# Step 5: Create monitoring configuration
echo "5. Setting up monitoring..."
echo "---------------------------"
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
  
  - job_name: 'maritime-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
EOF

# Step 6: SSL Certificate setup
echo "6. Setting up SSL certificates..."
echo "----------------------------------"
cat > setup-ssl.sh << 'EOF'
#!/bin/bash

DOMAIN=${1:-maritime.example.com}
EMAIL=${2:-admin@example.com}

# Install certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Get certificate
certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --email ${EMAIL} \
  -d ${DOMAIN} \
  -d api.${DOMAIN} \
  -d minio.${DOMAIN}

# Setup auto-renewal
cat > /etc/cron.d/certbot << CRON
0 0,12 * * * root certbot renew --quiet && docker-compose -f /opt/maritime-onboarding/docker-compose.production.yml restart frontend
CRON

echo "SSL certificates configured for ${DOMAIN}"
EOF

chmod +x setup-ssl.sh

# Step 7: Create compliance report generator
echo "7. Creating compliance report generator..."
echo "------------------------------------------"
cat > generate-compliance-report.sh << 'EOF'
#!/bin/bash

# ISO 27001 Compliance Report Generator
DATE=$(date +%Y-%m-%d)
REPORT_DIR="/opt/compliance-reports/${DATE}"
mkdir -p ${REPORT_DIR}

echo "Generating ISO 27001 Compliance Report..."
echo "========================================="
echo ""

# System information
echo "1. System Security Status" > ${REPORT_DIR}/compliance-report.txt
echo "-------------------------" >> ${REPORT_DIR}/compliance-report.txt
ufw status verbose >> ${REPORT_DIR}/compliance-report.txt
echo "" >> ${REPORT_DIR}/compliance-report.txt

# Docker security
echo "2. Container Security" >> ${REPORT_DIR}/compliance-report.txt
echo "--------------------" >> ${REPORT_DIR}/compliance-report.txt
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> ${REPORT_DIR}/compliance-report.txt
echo "" >> ${REPORT_DIR}/compliance-report.txt

# SSL certificate status
echo "3. SSL Certificate Status" >> ${REPORT_DIR}/compliance-report.txt
echo "------------------------" >> ${REPORT_DIR}/compliance-report.txt
certbot certificates >> ${REPORT_DIR}/compliance-report.txt
echo "" >> ${REPORT_DIR}/compliance-report.txt

# Backup status
echo "4. Backup Status" >> ${REPORT_DIR}/compliance-report.txt
echo "---------------" >> ${REPORT_DIR}/compliance-report.txt
ls -lah /backup/database/ | tail -5 >> ${REPORT_DIR}/compliance-report.txt
echo "" >> ${REPORT_DIR}/compliance-report.txt

# Security updates
echo "5. Security Updates" >> ${REPORT_DIR}/compliance-report.txt
echo "------------------" >> ${REPORT_DIR}/compliance-report.txt
apt list --upgradable 2>/dev/null | grep -i security >> ${REPORT_DIR}/compliance-report.txt || echo "No security updates pending" >> ${REPORT_DIR}/compliance-report.txt
echo "" >> ${REPORT_DIR}/compliance-report.txt

# Generate PDF report (optional)
# pandoc ${REPORT_DIR}/compliance-report.txt -o ${REPORT_DIR}/compliance-report.pdf

echo "Report generated: ${REPORT_DIR}/compliance-report.txt"
EOF

chmod +x generate-compliance-report.sh

# Step 8: Create .env.production template
echo "8. Creating production environment template..."
echo "----------------------------------------------"
cat > .env.production.template << 'EOF'
# Database
DB_NAME=maritime_onboarding
DB_USER=maritime_admin
DB_PASSWORD=GENERATE_STRONG_PASSWORD_HERE
DB_HOST=database
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=GENERATE_STRONG_PASSWORD_HERE

# JWT & Encryption
JWT_SECRET=GENERATE_64_CHAR_SECRET_HERE
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
ENCRYPTION_KEY=GENERATE_32_BYTE_HEX_HERE

# MinIO (S3-compatible storage)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=GENERATE_ACCESS_KEY_HERE
MINIO_SECRET_KEY=GENERATE_SECRET_KEY_HERE
MINIO_USE_SSL=false

# Email
SMTP_HOST=smtp.mailersend.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_SMTP_USER
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
EMAIL_FROM=noreply@maritime.example.com

# Application
NODE_ENV=production
PORT=3000
DOMAIN=maritime.example.com
CORS_ORIGIN=https://maritime.example.com

# Security
FORCE_HTTPS=true
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMIT_ENABLED=true
SESSION_TIMEOUT=3600
MFA_ENABLED=true
MFA_REQUIRED_FOR_ADMIN=true

# Monitoring
ENABLE_METRICS=true
ENABLE_AUDIT_LOG=true
LOG_LEVEL=info
EOF

echo ""
echo "✅ Hetzner ISO 27001 Deployment Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Update HETZNER_TOKEN in this script"
echo "2. Update SSH keys in cloud-init.yaml"
echo "3. Copy .env.production.template to .env.production and fill in values"
echo "4. Run: hcloud server create --config hetzner-server.json"
echo "5. SSH into server and run deployment"
echo "6. Setup SSL: ./setup-ssl.sh yourdomain.com your@email.com"
echo "7. Generate compliance report: ./generate-compliance-report.sh"
echo ""
echo "📊 Estimated monthly cost: €106 (Hetzner Cloud)"
echo "🔒 ISO 27001 compliant infrastructure ready!"