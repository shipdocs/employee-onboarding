/**
@page getting-started Getting Started Guide

@tableofcontents

# 🚀 Getting Started with Maritime Onboarding System

This guide will help you get up and running with the Maritime Onboarding System quickly.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Docker** (for containerized deployment)
- **Git** for version control
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## 🔧 Installation Options

### Option 1: Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Option 2: Development Setup

```bash
# Clone and install dependencies
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Option 3: Production Deployment

See the @ref deployment-guide for detailed production setup instructions.

## 🔑 Initial Configuration

### 1. Environment Setup

Create your `.env` file with the following required variables:

```bash
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

### 2. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 3. Create Admin User

```bash
# Create your first admin user
npm run create-admin
```

## 🎯 First Steps

### 1. Access the Application

1. Open your browser to `http://localhost:3000`
2. Click "Staff Login" 
3. Use your admin credentials to log in

### 2. Configure Your Organization

1. Navigate to **Settings** → **Organization**
2. Set up your company information:
   - Company name and details
   - Logo and branding
   - Contact information
   - Maritime certifications

### 3. Set Up User Roles

1. Go to **Settings** → **Roles & Permissions**
2. Configure roles for your organization:
   - **Admin**: Full system access
   - **Manager**: Department management
   - **HR**: Employee onboarding
   - **Crew**: Self-service access

### 4. Create Your First Onboarding Workflow

1. Navigate to **Workflows** → **Create New**
2. Define the onboarding steps:
   - Document collection
   - Training requirements
   - Certification verification
   - Equipment assignment

## 📱 User Interface Overview

### Dashboard
- **Overview**: Key metrics and recent activity
- **Quick Actions**: Common tasks and shortcuts
- **Notifications**: Important updates and alerts

### Main Navigation
- **🏠 Dashboard**: System overview and metrics
- **👥 Employees**: Manage crew members and staff
- **📋 Onboarding**: Workflow management
- **🎓 Training**: Course and certification tracking
- **📊 Reports**: Analytics and compliance reports
- **⚙️ Settings**: System configuration

### Employee Self-Service
- **📄 My Profile**: Personal information and documents
- **🎯 My Tasks**: Assigned onboarding tasks
- **📚 My Training**: Course progress and certificates
- **📞 Support**: Help and contact information

## 🔐 Security Best Practices

### Initial Security Setup

1. **Change Default Passwords**: Update all default credentials
2. **Enable 2FA**: Set up two-factor authentication for admins
3. **Configure SSL**: Ensure HTTPS is enabled in production
4. **Review Permissions**: Audit user roles and access levels

### Data Protection

1. **Backup Strategy**: Set up automated backups
2. **Encryption**: Verify data encryption is active
3. **Access Logs**: Enable audit logging
4. **Compliance**: Configure for maritime regulations

## 🆘 Common Issues & Solutions

### Connection Issues
```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Database Issues
```bash
# Reset database
npm run db:reset

# Check connection
npm run db:status
```

### Permission Issues
```bash
# Fix file permissions
chmod +x scripts/*.sh

# Reset user permissions
npm run reset-permissions
```

## 📚 Next Steps

Once you have the system running:

1. **Explore the Admin Guide**: @ref admin-guide
2. **Set Up Training Modules**: Configure your training programs
3. **Import Existing Data**: Migrate from your current system
4. **Train Your Team**: Familiarize staff with the new system
5. **Go Live**: Start onboarding your first crew members

## 🔗 Additional Resources

- **API Documentation**: Complete API reference
- **Video Tutorials**: Step-by-step video guides
- **Community Forum**: Get help from other users
- **Support**: Contact our support team

---

**Need Help?** 
- 📧 Email: support@maritime-onboarding.com
- 💬 Chat: Available in the application
- 📞 Phone: +1-800-MARITIME

*/
