# 🚀 Installation Guide

Get your Maritime Onboarding Platform running in minutes with our comprehensive installation guide.

## 🎯 **Choose Your Installation Method**

| Method | Best For | Time | Difficulty |
|--------|----------|------|------------|
| **[Docker](#docker-installation)** | Quick start, testing | 5 minutes | ⭐ Easy |
| **[Manual](#manual-installation)** | Custom setups, development | 15 minutes | ⭐⭐ Medium |
| **[Cloud](#cloud-deployment)** | Production, scaling | 10 minutes | ⭐⭐⭐ Advanced |

## 🐳 **Docker Installation (Recommended)**

### **Prerequisites**
- Docker and Docker Compose installed
- 4GB RAM minimum, 8GB recommended
- 10GB free disk space

### **Quick Start**
```bash
# 1. Clone the repository
git clone https://github.com/shipdocs/maritime-onboarding.git
cd maritime-onboarding

# 2. Start all services
docker-compose up -d

# 3. Wait for services to start (about 2 minutes)
docker-compose logs -f

# 4. Access your system
open http://localhost
```

### **What's Included**
✅ **Complete maritime training system**  
✅ **PostgreSQL database** with demo data  
✅ **Redis cache** for performance  
✅ **MinIO file storage** for documents  
✅ **Email system** (MailHog for testing)  
✅ **Admin account** (admin@example.com / admin123)  
✅ **Demo crew members** with training data  

### **Verify Installation**
```bash
# Check all services are running
docker-compose ps

# Should show 9 services running:
# - frontend (nginx)
# - backend (node.js)
# - database (postgresql)
# - redis
# - minio
# - postgrest
# - pgadmin
# - mailhog
# - backup
```

### **Default Access**
- **Main Application**: http://localhost
- **Admin Panel**: http://localhost (login with admin@example.com / admin123)
- **Database Admin**: http://localhost:5050 (pgadmin)
- **Email Testing**: http://localhost:8025 (mailhog)
- **File Storage**: http://localhost:9000 (minio)

## ⚙️ **Manual Installation**

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 6+
- SMTP server or email service

### **Step 1: Clone and Install**
```bash
# Clone repository
git clone https://github.com/shipdocs/maritime-onboarding.git
cd maritime-onboarding

# Install dependencies
npm install
```

### **Step 2: Database Setup**
```bash
# Create database
createdb maritime_onboarding

# Run migrations
npm run db:migrate

# Seed with demo data
npm run db:seed
```

### **Step 3: Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/maritime_onboarding

# Redis
REDIS_URL=redis://localhost:6379

# Email (choose one)
EMAIL_PROVIDER=smtp
SMTP_HOST=your-smtp-server.com
SMTP_USER=your-email@company.com
SMTP_PASS=your-password

# Or use MailerSend
EMAIL_PROVIDER=mailersend
MAILERSEND_API_KEY=your-api-key

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# File Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### **Step 4: Start Services**
```bash
# Start Redis (if not running)
redis-server

# Start MinIO (for file storage)
minio server ./data/minio --console-address ":9001"

# Start the application
npm start
```

### **Step 5: Create Admin User**
```bash
# Create your first admin user
npm run create:admin
```

## ☁️ **Cloud Deployment**

### **DigitalOcean (One-Click)**
[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/shipdocs/maritime-onboarding/tree/main)

### **AWS (ECS)**
```bash
# Use our AWS deployment template
aws cloudformation create-stack \
  --stack-name maritime-onboarding \
  --template-url https://raw.githubusercontent.com/shipdocs/maritime-onboarding/main/deploy/aws/cloudformation.yml
```

### **Google Cloud (Cloud Run)**
```bash
# Deploy to Cloud Run
gcloud run deploy maritime-onboarding \
  --source . \
  --platform managed \
  --region us-central1
```

### **Azure (Container Instances)**
```bash
# Deploy to Azure
az container create \
  --resource-group maritime-rg \
  --name maritime-onboarding \
  --image ghcr.io/shipdocs/maritime-onboarding:latest
```

## 🔧 **Post-Installation Setup**

### **1. Configure Email**
```bash
# Test email configuration
npm run test:email
```

### **2. Setup SSL (Production)**
```bash
# Using Let's Encrypt with Certbot
certbot --nginx -d your-domain.com
```

### **3. Configure Backups**
```bash
# Setup automated backups
npm run setup:backups
```

### **4. Security Hardening**
```bash
# Run security checklist
npm run security:check
```

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Docker Issues**
```bash
# Services not starting
docker-compose down
docker-compose pull
docker-compose up -d

# Check logs
docker-compose logs [service-name]

# Reset everything
docker-compose down -v
docker-compose up -d
```

#### **Database Connection Issues**
```bash
# Check database is running
docker-compose ps database

# Check connection
docker-compose exec database psql -U postgres -d maritime -c "SELECT 1;"
```

#### **Email Not Working**
```bash
# Test email configuration
npm run test:email

# Check email logs
docker-compose logs mailhog
```

#### **Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### **Getting Help**
- **📖 [Troubleshooting Guide](troubleshooting.md)** - Detailed solutions
- **💬 [Community Forum](https://github.com/shipdocs/maritime-onboarding/discussions)** - Ask questions
- **🐛 [Report Issues](https://github.com/shipdocs/maritime-onboarding/issues)** - Bug reports
- **💼 [Professional Support](https://shipdocs.app/support)** - Expert assistance

## ✅ **Next Steps**

After successful installation:

1. **[Configure Your System](../configuration/README.md)** - Customize settings
2. **[Create Users](../user-guide/admin.md)** - Add managers and crew
3. **[Setup Training](../user-guide/manager.md)** - Configure training workflows
4. **[Customize Certificates](../configuration/customization.md)** - Brand your certificates

---

**🎉 Congratulations!** Your Maritime Onboarding Platform is ready to use.

**Need help?** Our [professional services team](https://shipdocs.app/services) can assist with deployment, configuration, and training.
