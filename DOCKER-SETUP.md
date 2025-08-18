# 🐳 Docker Setup - Employee Onboarding System

Complete self-hosted deployment using Docker containers. This setup provides full independence from cloud services and gives you complete control over your data and infrastructure.

## 📋 **Prerequisites**

- Docker (v20.10+)
- Docker Compose (v2.0+)
- 4GB+ RAM available
- 10GB+ disk space

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │ ─→ │   Frontend      │    │   Backend       │
│   Port: 8080    │    │   (React)       │ ─→ │   (Next.js)     │
└─────────────────┘    │   Port: 80      │    │   Port: 3000    │
                       └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   MailHog       │    │   PostgreSQL    │
                       │   Port: 8025    │    │   Port: 5432    │
                       └─────────────────┘    └─────────────────┘
                                                       │
                                              ┌─────────────────┐
                                              │   pgAdmin       │
                                              │   Port: 5050    │
                                              └─────────────────┘
```

## 🚀 **Quick Start**

### 1. **Clone and Setup**
```bash
# Navigate to project directory
cd employee-onboarding

# Copy environment configuration
cp .env.docker .env

# Edit environment variables (important!)
nano .env
```

### 2. **Deploy Application**
```bash
# Make deployment script executable
chmod +x deploy-docker.sh

# Deploy all services
./deploy-docker.sh deploy
```

### 3. **Access Services**
- **Main Application**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Email Testing**: http://localhost:8025
- **Database Admin**: http://localhost:5050

## ⚙️ **Configuration**

### **Environment Variables (.env)**
```bash
# Database
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_jwt_secret_32_chars_minimum
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_minimum

# Admin Access
PGADMIN_EMAIL=admin@localhost.com
PGADMIN_PASSWORD=admin123
```

### **Database Migration**
```bash
# Apply your local migrations
docker-compose -f docker-compose.production.yml exec database psql -U postgres -d employee_onboarding -f /path/to/your/migrations.sql
```

## 🛠️ **Management Commands**

```bash
# Deploy/Start all services
./deploy-docker.sh deploy

# Stop all services
./deploy-docker.sh stop

# Restart all services
./deploy-docker.sh restart

# View logs
./deploy-docker.sh logs

# Complete cleanup (removes all data!)
./deploy-docker.sh cleanup
```

## 📊 **Service Details**

### **Database (PostgreSQL)**
- **Container**: `onboarding_database`
- **Port**: 5432
- **Data**: Persistent volume `postgres_data`
- **Access**: `postgresql://postgres:password@localhost:5432/employee_onboarding`

### **Backend (Next.js)**
- **Container**: `onboarding_backend`
- **Port**: 3000
- **Health**: http://localhost:3000/api/health
- **Logs**: `docker logs onboarding_backend`

### **Frontend (React + Nginx)**
- **Container**: `onboarding_frontend`
- **Port**: 80
- **Health**: http://localhost:80/health
- **Static Files**: Served by Nginx

### **Proxy (Nginx)**
- **Container**: `onboarding_proxy`
- **Port**: 8080 (main entry point)
- **Routes**: `/api/*` → Backend, `/*` → Frontend

### **Email Testing (MailHog)**
- **Container**: `onboarding_mailhog`
- **SMTP**: Port 1025
- **Web UI**: http://localhost:8025

### **Database Admin (pgAdmin)**
- **Container**: `onboarding_pgadmin`
- **Port**: 5050
- **Login**: admin@localhost.com / admin123

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Port Conflicts**
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :8080
   
   # Stop conflicting services
   sudo systemctl stop apache2  # or nginx
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker logs onboarding_database
   
   # Test connection
   docker-compose -f docker-compose.production.yml exec database pg_isready -U postgres
   ```

3. **Build Failures**
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild from scratch
   docker-compose -f docker-compose.production.yml build --no-cache
   ```

### **Health Checks**
```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Check specific service
docker-compose -f docker-compose.production.yml exec backend curl -f http://localhost:3000/api/health
```

## 📁 **File Structure**
```
employee-onboarding/
├── Dockerfile.backend          # Backend container
├── Dockerfile.frontend         # Frontend container
├── docker-compose.production.yml # Main orchestration
├── nginx.conf                  # Frontend nginx config
├── proxy.conf                  # Main proxy config
├── deploy-docker.sh           # Deployment script
├── .env.docker                # Environment template
└── database/
    └── init/                   # Database initialization scripts
```

## 🔒 **Security Considerations**

- Change default passwords in `.env`
- Use strong JWT secrets (32+ characters)
- Consider using Docker secrets for production
- Regularly update container images
- Monitor logs for security events

## 📈 **Scaling**

For production scaling:
- Use Docker Swarm or Kubernetes
- Add load balancers
- Implement database clustering
- Use external storage for uploads
- Add monitoring (Prometheus/Grafana)

## 🆘 **Support**

- **Logs**: `./deploy-docker.sh logs`
- **Status**: `docker-compose -f docker-compose.production.yml ps`
- **Issues**: Check container logs individually
