# Maritime Onboarding System - Documentation

Welcome to the comprehensive documentation for the **Maritime Onboarding System** - a Docker-based platform for maritime crew training, onboarding workflows, and compliance management.

## 📚 Documentation Structure

### 🔧 For Developers
- **[API Reference](api/)** - Complete REST API documentation
- **[Developer Guides](developer-guides/)** - Setup, architecture, and development workflows
- **[Code Documentation](#)** - Auto-generated from source code comments

### 👥 For Users
- **[User Guides](user-guides/)** - Step-by-step guides for all user roles
- **[Quick Start](#quick-start)** - Get started in minutes
- **[Troubleshooting](#troubleshooting)** - Common issues and solutions

### 🚀 For Administrators
- **[Deployment Guide](deployment/)** - Production deployment instructions
- **[Security Documentation](security/)** - Security configuration and best practices
- **[Maintenance](#maintenance)** - Backup, monitoring, and updates

## 🏗️ System Architecture

### Docker-Only Architecture
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Backend    │───▶│  PostgreSQL     │
│   (React)       │    │   (Node.js)  │    │  (Docker)       │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                      │
                              ▼                      ▼
                       ┌──────────────┐    ┌─────────────────┐
                       │   MinIO      │    │   PostgREST     │
                       │   (Storage)  │    │   (API Layer)   │
                       └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Nginx      │
                       │   (Proxy)    │
                       └──────────────┘
```

### **Key Components**
- **PostgreSQL**: Primary database with full ACID compliance
- **PostgREST**: Automatic REST API generation from database schema
- **MinIO**: S3-compatible object storage for files and media
- **Nginx**: Reverse proxy with SSL termination and security headers
- **Node.js Backend**: Business logic and authentication layer
- **React Frontend**: Modern, responsive user interface

## 🚀 **Quick Start**

### **Prerequisites**
- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 80, 443 available

### **1. Clone and Setup**
```bash
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding
cp .env.example .env.production
```

### **2. Configure Environment**
Edit `.env.production` with your settings:
```bash
# Database
POSTGRES_PASSWORD=your_secure_password

# JWT Secrets
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret

# Application
NEXTAUTH_URL=https://your-domain.com
```

### **3. Deploy**
```bash
docker compose --env-file .env.production -f docker-compose.secure-simple.yml up -d
```

### **4. Verify**
```bash
curl -k https://localhost/health
```

## 🔐 **Security Features**

### **Built-in Security**
- ✅ **HTTPS Encryption** - All traffic encrypted with SSL/TLS
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Role-Based Access** - Granular permission system
- ✅ **Rate Limiting** - Protection against abuse and DoS
- ✅ **Security Headers** - HSTS, CSP, XSS protection
- ✅ **Network Isolation** - Containers communicate via private network
- ✅ **Database Security** - No external database access

### **Authentication Methods**
- **Admin/Manager**: Email and password with MFA support
- **Crew Members**: Magic link (passwordless) authentication
- **API Access**: JWT tokens with role-based permissions

## 📖 **User Roles**

### **👑 Administrator**
- Full system access and configuration
- User account management
- System monitoring and maintenance
- Security configuration

### **👨‍💼 Manager**
- Crew member management
- Training program assignment
- Progress monitoring and reporting
- Certificate generation

### **⚓ Crew Member**
- Access assigned training programs
- Complete interactive assessments
- Track personal progress
- Download certificates

## 🛠️ **Development**

### **Local Development Setup**
```bash
# Install dependencies
npm install

# Start development environment
docker compose -f docker-compose.dev.yml up -d

# Start frontend development server
cd client && npm start

# Start backend development server
npm run dev
```

### **Code Structure**
```
├── api/                 # API endpoint handlers
├── lib/                 # Shared libraries and utilities
├── services/            # Business logic services
├── client/              # React frontend application
├── database/            # Database migrations and seeds
├── nginx/               # Nginx configuration
└── docs/                # Documentation
```

## 📊 **API Overview**

### **Authentication Endpoints**
- `POST /api/auth/login` - Admin/Manager login
- `POST /api/auth/magic-link` - Request magic link for crew
- `POST /api/auth/logout` - Logout and invalidate token

### **User Management**
- `GET /api/users` - Get all users (admin/manager only)
- `POST /api/users` - Create new user
- `GET /api/crew/{id}` - Get crew member profile

### **Training System**
- `GET /api/training-phases` - Get all training phases
- `POST /api/training-phases` - Create new training phase
- `GET /api/quiz/{phaseId}` - Get quiz for training phase

### **File Management**
- `POST /api/upload/image` - Upload training images
- `POST /api/upload/video` - Upload training videos
- `GET /api/files/{id}` - Download files

## 🔧 **Maintenance**

### **Backup**
```bash
# Database backup
docker exec maritime_database pg_dump -U maritime_user maritime_onboarding > backup.sql

# File storage backup
docker exec maritime_minio mc mirror /data /backup
```

### **Updates**
```bash
# Pull latest images
docker compose pull

# Restart services
docker compose --env-file .env.production -f docker-compose.secure-simple.yml up -d
```

### **Monitoring**
```bash
# Check container health
docker ps

# View logs
docker logs maritime_backend
docker logs maritime_nginx
```

## 📞 **Support**

### **Getting Help**
- **Documentation**: This comprehensive guide
- **GitHub Issues**: [Report bugs and request features](https://github.com/shipdocs/employee-onboarding/issues)
- **Email Support**: support@burando.online

### **Contributing**
We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Maritime Onboarding System v1.0** - Docker-Only Architecture  
© 2024 Burando Maritime Services. All rights reserved.
