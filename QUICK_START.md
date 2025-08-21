# ⚡ Quick Start Guide - Development Setup

**Get the Maritime Onboarding System running locally for development and testing in under 10 minutes!**

**⚠️ This is for DEVELOPMENT only. For production deployment, see [DEPLOYMENT_OPTIES.md](DEPLOYMENT_OPTIES.md)**

---

## 🎯 **For Complete Beginners**

**👉 [INSTALLATIE_VOOR_BEGINNERS.md](INSTALLATIE_VOOR_BEGINNERS.md)** - Complete step-by-step guide in Dutch for non-technical users.

---

## 🚀 **For Developers & IT Professionals**

### **Prerequisites**
- Docker Desktop 20.10+
- Docker Compose 2.0+
- Git
- 8GB RAM, 10GB disk space

### **1. Automated Installation (Recommended)**

```bash
# Clone the repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Run the automated setup script
./setup.sh
```

The setup script will:
- ✅ Check prerequisites (Docker, Docker Compose)
- ✅ Generate secure passwords automatically
- ✅ Create SSL certificates for development
- ✅ Build the client application
- ✅ Start all services
- ✅ Verify the installation

### **2. Manual Installation**

If you prefer manual setup or the script fails:

#### **Clone & Setup**
```bash
# Clone the repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Create environment file
cp .env.example .env
```

#### **Configure Environment**
Edit `.env` file - **minimum required changes**:
```bash
# Change these passwords!
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here
MINIO_ROOT_PASSWORD=your_minio_password_here
```

**💡 Generate secure secrets:**
```bash
# Generate JWT secrets
openssl rand -base64 32
openssl rand -base64 32
```

#### **Build Client Application**
```bash
# Install dependencies and build
cd client
npm install --legacy-peer-deps
npm run build
cd ..
```

#### **Generate SSL Certificates**
```bash
# Create self-signed certificates for development
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
    -subj "/C=NL/ST=State/L=City/O=Maritime/CN=localhost"
```

### **3. Start the System**
```bash
# Start all services
docker compose up -d

# Check status
docker ps

# View logs
docker compose logs -f
```

### **4. Access the Application**
- **Main App**: http://localhost
- **API Health**: http://localhost:3000/health
- **pgAdmin**: http://localhost:5050
- **MinIO Console**: http://localhost:9001
- **MailHog**: http://localhost:8025

---

## 🔧 **Service Ports**

| Service | URL | Port | Purpose |
|---------|-----|------|---------|
| **Frontend** | http://localhost | 80 | Main application |
| **Backend API** | http://localhost:3000 | 3000 | REST API |
| **PostgreSQL** | localhost:5432 | 5432 | Database |
| **PostgREST** | localhost:3001 | 3001 | Auto-generated API |
| **Redis** | localhost:6379 | 6379 | Cache/Sessions |
| **MinIO** | http://localhost:9001 | 9000/9001 | File storage |
| **pgAdmin** | http://localhost:5050 | 5050 | Database admin |
| **MailHog** | http://localhost:8025 | 8025 | Email testing |

---

## 🎮 **First Use**

### **Create Admin Account**
1. Go to http://localhost
2. Click "Register" or "Sign Up"
3. Fill in your details
4. First user automatically becomes admin

### **Test the System**
1. **Login** with your admin account
2. **Create a training workflow**
3. **Add some crew members**
4. **Test the quiz system**
5. **Generate a certificate**

---

## 🛠️ **Daily Operations**

### **Start System**
```bash
docker compose up -d
```

### **Stop System**
```bash
docker compose down
```

### **View Logs**
```bash
# All services
docker compose logs -f

# Specific service
docker logs maritime_backend
docker logs maritime_frontend
docker logs maritime_database
```

### **Update System**
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

**Port 80 already in use:**
```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx
```

**Database connection issues:**
```bash
# Wait 2-3 minutes after startup
# Check database logs
docker logs maritime_database

# Restart database
docker restart maritime_database
```

**Frontend not loading:**
```bash
# Check frontend logs
docker logs maritime_frontend

# Rebuild frontend
docker compose up -d --build frontend
```

### **Reset Everything**
```bash
# Nuclear option - removes all data!
docker compose down -v
docker system prune -a
docker compose up -d
```

---

## 📊 **Health Checks**

### **Quick Status Check**
```bash
# Check all containers
docker ps

# Test API health
curl http://localhost:3000/health

# Test frontend
curl -I http://localhost
```

### **Expected Response**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-18T23:10:22.291Z",
  "environment": "production",
  "version": "2.0.1"
}
```

---

## 🔐 **Security Checklist**

- [ ] Changed all default passwords in `.env`
- [ ] Generated secure JWT secrets
- [ ] Configured SMTP for email notifications
- [ ] Set up SSL certificates (production)
- [ ] Configured firewall rules
- [ ] Regular backups scheduled

---

## 📚 **Next Steps**

### **For Users**
- **[User Guides](docs/user-guides/)** - How to use the system
- **[Role-Based Access](docs/ROLE_BASED_ACCESS_CONTROL.md)** - Understanding permissions

### **For Developers**
- **[API Documentation](docs/api/)** - REST API reference
- **[Development Workflow](docs/developer-guides/)** - Contributing guidelines

### **For Production**
- **[Deployment Guide](docs/deployment/)** - Production setup
- **[Security Guide](docs/security/)** - Security best practices

---

## 🆘 **Need Help?**

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/shipdocs/employee-onboarding/issues)
- **💬 Questions**: [GitHub Discussions](https://github.com/shipdocs/employee-onboarding/discussions)
- **📧 Email**: info@shipdocs.app
- **📖 Full Documentation**: [docs/README.md](docs/README.md)

---

**🎉 You're all set! The Maritime Onboarding System is ready to use.**
