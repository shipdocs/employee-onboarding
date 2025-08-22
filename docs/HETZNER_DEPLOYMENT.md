# 🚢 Maritime Onboarding - Hetzner Deployment Guide

This guide provides a comprehensive, automated deployment process for the Maritime Onboarding Platform on Hetzner servers, based on lessons learned from manual deployment experiences.

## 📋 **Overview**

The deployment process has been optimized to handle all the issues encountered during manual deployment:

- ✅ **Automated SSL certificate generation** with Let's Encrypt
- ✅ **Dynamic domain configuration** for any client
- ✅ **Syntax error validation and fixing**
- ✅ **Dependency management** (glob package placement)
- ✅ **Content Security Policy** configuration for external resources
- ✅ **Git authentication** setup
- ✅ **Service health validation**
- ✅ **Settings optimization** (database vs .env)

## 🚀 **Quick Start**

### **1. Server Preparation**

```bash
# On your Hetzner server (as root)
curl -sSL https://raw.githubusercontent.com/shipdocs/employee-onboarding/master/scripts/hetzner-deploy.sh | bash
```

### **2. SSL Certificate Setup**

```bash
cd /opt/maritime-onboarding
./scripts/hetzner-deploy-ssl.sh
```

### **3. Services Deployment**

```bash
./scripts/hetzner-deploy-services.sh
```

## 📖 **Detailed Deployment Process**

### **Phase 1: Basic Setup (`hetzner-deploy.sh`)**

**What it does:**
- Collects deployment configuration (domain, emails, Git credentials)
- Installs prerequisites (Docker, Docker Compose, Git, Certbot)
- Sets up Git authentication
- Clones/updates repository
- Validates and fixes code syntax
- Configures environment with secure passwords

**Manual Issues Resolved:**
- ✅ Automated Docker installation
- ✅ Git authentication setup
- ✅ Syntax error detection and fixing
- ✅ Secure password generation
- ✅ Domain-specific configuration

### **Phase 2: SSL Setup (`hetzner-deploy-ssl.sh`)**

**What it does:**
- Configures nginx for Let's Encrypt webroot method
- Generates SSL certificates automatically
- Updates Content Security Policy for Google Fonts and Cloudflare
- Creates automated renewal script with cron job
- Validates SSL configuration

**Manual Issues Resolved:**
- ✅ Automated Let's Encrypt certificate generation
- ✅ Zero-downtime certificate renewal
- ✅ CSP headers for external resources
- ✅ Nginx configuration optimization

### **Phase 3: Services Deployment (`hetzner-deploy-services.sh`)**

**What it does:**
- Validates dependencies (glob package placement)
- Builds all containers with error handling
- Starts services in correct order
- Validates service health
- Tests API endpoints
- Shows comprehensive deployment summary

**Manual Issues Resolved:**
- ✅ Dependency validation and fixing
- ✅ Container build error handling
- ✅ Service startup order
- ✅ Health check validation
- ✅ API endpoint testing

## ⚙️ **Configuration Management Optimization**

### **Settings Analysis**

Run the settings optimization script to analyze and improve configuration management:

```bash
node scripts/optimize-settings.js
```

**What it does:**
- Analyzes current .env configuration
- Categorizes settings by security level
- Generates optimized .env template
- Creates database migration for application settings
- Provides security recommendations

### **Settings Categories**

| Category | Location | Examples | Rationale |
|----------|----------|----------|-----------|
| **Infrastructure** | `.env` | DB passwords, JWT secrets, API keys | Security-sensitive, deployment-specific |
| **Application** | Database | Email addresses, timeouts, feature flags | User-manageable, business logic |
| **Environment** | `.env` | NODE_ENV, BASE_URL | Environment-specific |
| **Testing** | `.env` | Test domains, debug flags | Development-specific |

### **Security Benefits**

- 🔒 **Reduced .env exposure**: Only infrastructure secrets in .env
- 🎛️ **Admin interface management**: Application settings via UI
- 🔄 **Runtime updates**: Change settings without redeployment
- 📊 **Better organization**: Logical categorization of settings

## 🛠️ **Troubleshooting**

### **Common Issues and Solutions**

#### **SSL Certificate Generation Fails**
```bash
# Check DNS propagation
dig +short yourdomain.com

# Verify port 80 accessibility
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Manual certificate generation
certbot certonly --webroot -w /opt/maritime-onboarding/nginx/letsencrypt -d yourdomain.com
```

#### **API Routes Not Loading**
```bash
# Check backend logs
docker-compose logs backend --tail=50

# Validate syntax
find api -name "*.js" -exec node -c {} \;

# Rebuild backend
docker-compose build backend && docker-compose restart backend
```

#### **Frontend Build Issues**
```bash
# Check frontend logs
docker-compose logs frontend --tail=50

# Rebuild frontend
docker-compose build frontend && docker-compose restart frontend
```

### **Service Health Checks**

```bash
# Check all services
docker-compose ps

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/health
curl https://yourdomain.com/api/health

# Check database
docker-compose exec database psql -U postgres -d employee_onboarding -c "SELECT COUNT(*) FROM users;"
```

## 📊 **Monitoring and Maintenance**

### **Log Monitoring**

```bash
# View all logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

### **SSL Certificate Renewal**

The deployment automatically sets up SSL certificate renewal:

- **Schedule**: Every Sunday at 2 AM
- **Script**: `/opt/maritime-onboarding/renew-ssl.sh`
- **Log**: `/var/log/ssl-renewal.log`

### **Updates and Maintenance**

```bash
# Update deployment
cd /opt/maritime-onboarding
git pull origin master
docker-compose build
docker-compose up -d

# Database backup
docker-compose exec database pg_dump -U postgres employee_onboarding > backup.sql

# View system resources
docker stats
df -h
free -h
```

## 🔐 **Security Considerations**

### **Environment File Security**

- ✅ Never commit `.env` files to version control
- ✅ Use strong, unique passwords (32+ characters)
- ✅ Restrict file permissions: `chmod 600 .env`
- ✅ Regular password rotation

### **Database Settings Security**

- ✅ Encrypted sensitive settings in database
- ✅ Admin interface access control
- ✅ Audit trail for setting changes
- ✅ Role-based setting management

### **Network Security**

- ✅ Firewall configuration for required ports only
- ✅ SSL/TLS encryption for all communications
- ✅ Regular security updates
- ✅ Monitoring and alerting

## 📞 **Support and Documentation**

- **Repository**: https://github.com/shipdocs/employee-onboarding
- **Issues**: https://github.com/shipdocs/employee-onboarding/issues
- **Discussions**: https://github.com/shipdocs/employee-onboarding/discussions
- **Documentation**: https://github.com/shipdocs/employee-onboarding/docs

## 🎯 **Next Steps After Deployment**

1. **DNS Configuration**: Point your domain to the server IP
2. **Testing**: Thoroughly test all application features
3. **Backup Setup**: Configure automated database backups
4. **Monitoring**: Set up application and infrastructure monitoring
5. **Security Review**: Conduct security audit and penetration testing
6. **Documentation**: Update client-specific documentation
7. **Training**: Train client administrators on system usage

---

**This deployment process eliminates all manual interventions encountered during the initial deployment, providing a reliable, repeatable, and secure installation process for any client domain.**
