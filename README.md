# Maritime Onboarding System 2025 

A comprehensive crew onboarding and training management system for the maritime industry, featuring automated training workflows, interactive quizzes, and certificate generation.

## 📚 **Documentation**

**📖 [Complete Documentation](docs/README.md)** - Start here for comprehensive guides and references

### **Quick Links**
- **🚀 [Getting Started](docs/getting-started/README.md)** - Get started with the system
- **🔄 [Development Workflow](docs/for-developers/development-workflow/workflow.md)** - Three-tier deployment pipeline
- **🔐 [Role-Based Access Control](docs/ROLE_BASED_ACCESS_CONTROL.md)** - User roles and permissions
- **📄 [Certificate System](docs/CERTIFICATE_SYSTEM.md)** - Automated certificate generation
- **🔧 [API Reference](docs/api/README.md)** - Complete API documentation

## 🚢 **Overview**

The Maritime Onboarding System streamlines crew training with a modern, role-based platform that automates workflows, manages compliance, and generates professional certificates.

### **Key Features**
- **🎯 Role-Based Access Control**: Three-tier system (Admin, Manager, Crew)
- **📚 Automated Training Workflows**: Phase-based progression with verification
- **🧠 Interactive Quiz System**: Comprehensive quizzes with manager review
- **📄 PDF Certificate Generation**: Professional certificates with custom templates
- **🔗 Magic Link Authentication**: Secure, password-free crew access
- **📊 Comprehensive Dashboard**: Real-time progress tracking and compliance
- **🔍 Audit Logging**: Complete activity tracking for compliance
- **📱 Responsive Design**: Works on desktop, tablet, and mobile

### **Technology Stack**
- **Frontend**: React.js with modern hooks and responsive design
- **Backend**: Vercel API routes (serverless architecture)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for secure file management
- **Email**: MailerSend for reliable transactional emails
- **Authentication**: JWT with role-based access control

## 🔧 **Key Features**

### **Security & Compliance**
- **Multi-factor Authentication**: Enhanced security for admin accounts
- **Row Level Security**: Database-level access control
- **GDPR Compliance**: Data export and privacy controls
- **Audit Logging**: Complete activity tracking

### **Training Management**
- **Phase-based Learning**: Structured onboarding progression
- **Interactive Assessments**: Comprehensive quiz system
- **Progress Tracking**: Real-time completion monitoring
- **Certificate Generation**: Automated PDF certificates

## 🎯 **Training Workflow**

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

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js (v18+), npm, Vercel CLI, Supabase CLI
- Supabase account, Vercel account, MailerSend account

### **Installation**

```bash
# Clone and install
git clone https://github.com/shipdocs/new-onboarding-2025.git
cd new-onboarding-2025
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

### **Access the System**
- **Application**: `http://localhost:3000`
- **Admin Login**: Use credentials from setup
- **Documentation**: See [docs/README.md](docs/README.md) for complete guides

## 🔄 **Development Environments**

The system uses a validated three-tier deployment pipeline:

| Environment | Purpose | URL | Database |
|-------------|---------|-----|----------|
| **Local** | Development | `localhost:3000` | Production (read-only) |
| **Testing** | Team review | `new-onboarding-2025-git-testing-shipdocs-projects.vercel.app` | Testing DB |
| **Preview** | Final approval | `new-onboarding-2025-git-preview-shipdocs-projects.vercel.app` | Preview DB |
| **Production** | Live system | `onboarding.burando.online` | Production DB |

## 👥 **User Roles**

### **👑 Admin**
- Full system access and configuration
- Manager account management
- PDF template management (exclusive)
- System settings and audit logs

### **👔 Manager**
- Crew member management
- Training progress monitoring
- Quiz result review and approval
- Certificate generation and distribution

### **👷 Crew**
- Personal profile management
- Training completion with photo proof
- Interactive quiz participation
- Certificate access and download

## 🛠️ **Development Tools**

### **Database Management**
```bash
npm run db:pull              # Sync schema from remote
npm run db:push              # Apply local migrations
npm run db:create-migration  # Create new migration
npm run setup:admin          # Create admin user
```

### **Testing & Verification**
```bash
npm run test:permissions     # Test file permissions
npm run verify:deployment    # Verify deployment status
vercel dev                   # Start development server
```

## 🎉 **Project Status**

✅ **Production Ready** - Complete three-tier deployment pipeline validated
✅ **Full Feature Set** - All core functionality implemented and tested
✅ **Comprehensive Documentation** - Detailed guides for all user types
✅ **Scalable Architecture** - Serverless deployment with Supabase backend

**🚀 Ready for maritime crew training operations!**
# Trigger rebuild
