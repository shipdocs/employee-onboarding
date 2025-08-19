# Employee Onboarding System

A complete maritime crew onboarding and training management system featuring automated training workflows, interactive quizzes, and certificate generation. **Ready to use after Docker setup with working admin accounts and training content.**

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green.svg)](https://onboarding.burando.online)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

## 🚀 **Quick Start**

### **✅ SYSTEM STATUS: Ready to Use**
**👉 [REALITEIT_CHECK.md](REALITEIT_CHECK.md)** - **Complete overview of system capabilities and features**

### **For Development & Testing**
**⚡ [QUICK_START.md](QUICK_START.md)** - Local development setup (Docker Desktop)

### **For Production Deployment**
**🚀 [DEPLOYMENT_OPTIES.md](DEPLOYMENT_OPTIES.md)** - **Real deployment options: VPS, Cloud, Enterprise**
**🛡️ [SECURITY_GUIDE.md](SECURITY_GUIDE.md)** - **Complete security implementation guide**
**🔒 [ENCRYPTION_IMPLEMENTATION.md](ENCRYPTION_IMPLEMENTATION.md)** - **Optional encryption at rest (advanced security)**
**🔑 [KEY_MANAGEMENT_DISASTER_RECOVERY.md](KEY_MANAGEMENT_DISASTER_RECOVERY.md)** - **Critical key management procedures**
**📖 [Complete Documentation](docs/README.md)** - Comprehensive guides and references

### **For End Users**
**👉 [EERSTE_STAPPEN.md](EERSTE_STAPPEN.md)** - First steps after deployment
**👥 [GEBRUIKERSHANDLEIDING.md](GEBRUIKERSHANDLEIDING.md)** - User guide in Dutch

---

## 📚 Documentation

### Quick Links
- **🔐 [Role-Based Access Control](docs/ROLE_BASED_ACCESS_CONTROL.md)** - User roles and permissions
- **📄 [Certificate System](docs/CERTIFICATE_SYSTEM.md)** - Automated certificate generation
- **🔧 [API Reference](docs/api/README.md)** - Complete API documentation
- **🚀 [Deployment Guide](docs/deployment/README.md)** - Production deployment
- **👥 [User Guides](docs/user-guides/README.md)** - How to use the system

## 🚢 Overview

The Maritime Onboarding System streamlines crew training with a modern, role-based platform that automates workflows, manages compliance, and generates professional certificates.

### Key Features
- **🎯 Role-Based Access Control**: Three-tier system (Admin, Manager, Crew)
- **📚 Automated Training Workflows**: Phase-based progression with verification
- **🧠 Interactive Quiz System**: Comprehensive quizzes with manager review
- **📄 PDF Certificate Generation**: Professional certificates with custom templates
- **🔗 Magic Link Authentication**: Secure, password-free crew access
- **📊 Comprehensive Dashboard**: Real-time progress tracking and compliance
- **🔍 Audit Logging**: Complete activity tracking for compliance
- **📱 Responsive Design**: Works on desktop, tablet, and mobile

### Technology Stack
- **Frontend**: React.js 18+ with modern hooks and responsive design
- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL with PostgREST API layer
- **Storage**: MinIO (S3-compatible) for secure file management
- **Email**: SMTP-based transactional emails
- **Authentication**: JWT with multi-factor authentication (MFA)
- **Security**: HTTPS, security headers, rate limiting, and audit logging
- **Deployment**: Docker and Docker Compose (self-hosted)

## 🔧 Key Features

### Security & Compliance
- **Multi-factor Authentication**: Enhanced security for admin accounts
- **Row Level Security**: Database-level access control
- **GDPR Compliance**: Data export and privacy controls
- **Audit Logging**: Complete activity tracking

### Training Management
- **Phase-based Learning**: Structured onboarding progression
- **Interactive Assessments**: Comprehensive quiz system
- **Progress Tracking**: Real-time completion monitoring
- **Certificate Generation**: Automated PDF certificates

## 🎯 Training Workflow

The system implements a structured three-phase training progression:

```
🔄 TRAINING PROGRESSION:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Phase 1         │ ─→ │ Phase 2         │ ─→ │ Phase 3         │ ─→ │ Certificate     │
│ Basic Training  │    │ Advanced Items  │    │ Final Quiz      │    │ Generation      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

1. **Phase 1**: Basic training items with instructor signature verification
2. **Phase 2**: Advanced training items requiring photo proof submission
3. **Phase 3**: Comprehensive quiz with manager review and approval
4. **Completion**: Automated certificate generation and email distribution

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+), npm, Vercel CLI, Supabase CLI
- Supabase account, Vercel account, MailerSend account

### Installation

```bash
# Clone and install
git clone https://github.com/shipdocs/employee-onboarding.git
cd employee-onboarding
npm install && cd client && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your Supabase and MailerSend credentials

# Setup database
supabase link --project-ref your-project-id
supabase db push
npm run setup:admin

# Start development with Vercel CLI
vercel dev
```

### Access the System
- **Application**: `http://localhost:3000`
- **Admin Login**: Use credentials from setup
- **Documentation**: See [docs/README.md](docs/README.md) for complete guides

## 🧹 Clean Repository

This repository has been reset to a clean state with a single initial commit containing all the latest code and documentation. This provides:

- **Fresh Start**: Clean git history without development artifacts
- **Organized Structure**: All files properly organized and documented
- **Latest Features**: All recent improvements and security fixes included
- **Production Ready**: Immediately deployable codebase

## 🔄 Development Environments

The system uses a validated three-tier deployment pipeline:

| Environment | Purpose | URL | Database |
|-------------|---------|-----|----------|
| **Local** | Development | `localhost:3000` | Production (read-only) |
| **Testing** | Team review | `XXXXXXXXX-projects.vercel.app` | Testing DB |
| **Preview** | Final approval | `XXXXXXXXXpreview-shipdocs-projects.vercel.app` | Preview DB |
| **Production** | Live system | `your_url` | Production DB |

## 👥 User Roles

### 👑 Admin
- Full system access and configuration
- Manager account management
- PDF template management (exclusive)
- System settings and audit logs

### 👔 Manager
- Crew member management
- Training progress monitoring
- Quiz result review and approval
- Certificate generation and distribution

### 👷 Crew
- Personal profile management
- Training completion with photo proof
- Interactive quiz participation
- Certificate access and download

## 🛠️ Development Tools

### Database Management
```bash
npm run db:pull              # Sync schema from remote
npm run db:push              # Apply local migrations
npm run db:create-migration  # Create new migration
npm run setup:admin          # Create admin user
```

### Testing & Verification
```bash
npm run test:permissions     # Test file permissions
npm run verify:deployment    # Verify deployment status
vercel dev                   # Start development server
```

## 🎉 Project Status

✅ **Production Ready** - Complete three-tier deployment pipeline validated
✅ **Full Feature Set** - All core functionality implemented and tested
✅ **Comprehensive Documentation** - Detailed guides for all user types
✅ **Scalable Architecture** - Serverless deployment with Supabase backend
✅ **Clean Codebase** - Fresh git history with organized structure

**🚀 Ready for maritime crew training operations!**

## 📝 Recent Updates

- **Clean Git History**: Repository has been reset to a single initial commit for a fresh start
- **Documentation Cleanup**: All documentation has been organized and updated
- **Security Enhancements**: Latest security fixes and improvements implemented
- **Production Deployment**: System is live and operational at [onboarding.burando.online](https://onboarding.burando.online)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/README.md](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/shipdocs/employee-onboarding/issues)
- **Email**: info@shipdocs.app

---

**Built with ❤️ for the maritime industry**
