/**
@page deployment-guide Deployment Guide

@tableofcontents

# 🚀 Production Deployment Guide

This guide covers deploying the Maritime Onboarding System in production environments.

## 🏗️ Deployment Options

### 1. Docker Deployment (Recommended)

#### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ storage

#### Quick Deploy
```bash
# Clone repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Configure environment
cp .env.production .env
# Edit .env with your settings

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Cloud Platform Deployment

#### Vercel (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Railway (Full Stack)
```bash
# Connect to Railway
railway login
railway link

# Deploy
railway up
```

#### DigitalOcean App Platform
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy with one click

### 3. Traditional Server Deployment

#### Ubuntu/Debian Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding
npm install --production

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Security
JWT_SECRET=your_secure_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_encryption_key_32_chars
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com

# Email (Optional)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_password

# File Storage
STORAGE_PROVIDER=supabase
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png
```

### Security Configuration

```bash
# SSL/TLS
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# CORS
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Session
SESSION_TIMEOUT=3600000
SECURE_COOKIES=true
```

## 🌐 Domain & SSL Setup

### 1. Domain Configuration

```bash
# DNS Records (Example)
A     @           your.server.ip
A     www         your.server.ip
CNAME api         your-domain.com
CNAME docs        your-domain.com
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Database Setup

### Supabase Configuration

1. **Create Project**: Sign up at [supabase.com](https://supabase.com)
2. **Configure Database**:
   ```sql
   -- Enable Row Level Security
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
   ALTER TABLE onboarding_workflows ENABLE ROW LEVEL SECURITY;
   ```

3. **Set Up Storage**:
   ```sql
   -- Create storage buckets
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('documents', 'documents', false);
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('avatars', 'avatars', true);
   ```

### Database Migration

```bash
# Run migrations
npm run db:migrate

# Seed production data
npm run db:seed:production
```

## 🔒 Security Hardening

### 1. Server Security

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install fail2ban
```

### 2. Application Security

```bash
# Set secure file permissions
chmod 600 .env
chmod -R 755 public/
chmod -R 644 src/

# Enable security headers
# Add to next.config.js:
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
]
```

## 📈 Monitoring & Logging

### 1. Application Monitoring

```bash
# Install monitoring tools
npm install @sentry/nextjs
npm install pino pino-pretty

# Configure Sentry
# Add to next.config.js
const { withSentryConfig } = require('@sentry/nextjs');
```

### 2. Server Monitoring

```bash
# Install monitoring
sudo apt install htop iotop nethogs

# Log rotation
sudo nano /etc/logrotate.d/maritime-onboarding
```

### 3. Health Checks

```javascript
// pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

## 🔄 Backup & Recovery

### 1. Database Backup

```bash
# Automated Supabase backup
# Configure in Supabase dashboard

# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. File Backup

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  /path/to/application
```

### 3. Recovery Procedures

```bash
# Database restore
psql $DATABASE_URL < backup_file.sql

# Application restore
tar -xzf backup_file.tar.gz
npm install
npm run build
pm2 restart all
```

## 🚀 Performance Optimization

### 1. Caching

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 2. CDN Setup

```bash
# CloudFlare configuration
# 1. Add domain to CloudFlare
# 2. Configure DNS
# 3. Enable caching rules
# 4. Set up page rules
```

## 📋 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrated and seeded
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Security headers enabled
- [ ] Monitoring setup
- [ ] Backup procedures tested
- [ ] Performance optimized
- [ ] Health checks working
- [ ] Documentation updated

---

**Production Support**: 
- 📧 Email: ops@maritime-onboarding.com
- 🚨 Emergency: +1-800-MARITIME-911
- 📖 Runbook: Available in admin dashboard

*/
