# Maritime Onboarding System - Documentation

Welcome to the comprehensive documentation for the Maritime Onboarding System. This documentation covers all aspects of the system from installation to advanced features.

> **🚀 Quick Start**: New to the project? Start with [Getting Started](getting-started/README.md) for a complete setup guide.

## 📚 **Documentation Structure**

### **🚀 [Getting Started](getting-started/)**
- **[Quick Start Guide](getting-started/README.md)** - Get up and running in minutes
- **[First Steps](getting-started/first-steps.md)** - Post-installation configuration
- **[Troubleshooting](getting-started/troubleshooting.md)** - Common setup issues

### **👨‍💻 [For Developers](for-developers/)**
- **[Developer Overview](for-developers/README.md)** - Complete developer documentation
- **[Architecture](for-developers/architecture/)** - System architecture and design
  - **[System Overview](for-developers/architecture/overview.md)** - High-level architecture
  - **[Database Design](for-developers/architecture/database-design.md)** - Supabase schema
- **[API Reference](for-developers/api-reference/)** - Complete API documentation
  - **[API Overview](for-developers/api-reference/README.md)** - API conventions
  - **[Endpoints](for-developers/api-reference/endpoints/)** - All API endpoints
- **[Development Workflow](for-developers/development-workflow/)** - Development guides
  - **[Environment Setup](for-developers/development-workflow/environment-setup.md)** - Local setup
  - **[Workflow Guide](for-developers/development-workflow/workflow.md)** - Development pipeline
- **[Quick Reference](for-developers/quick-reference.md)** - Common commands and patterns

### **🏗️ [For Administrators](for-administrators/)**
- **[Admin Overview](for-administrators/README.md)** - System administration guide
- **[Deployment](for-administrators/deployment/)** - Deployment procedures
  - **[Overview](for-administrators/deployment/overview.md)** - Deployment strategy
  - **[Vercel Deployment](for-administrators/deployment/vercel-deployment.md)** - Vercel guide
- **[Security](for-administrators/security/)** - Security implementation
  - **[Security Overview](for-administrators/security/security-overview.md)** - Security features
  - **[Implementation Guide](for-administrators/security/implementation-guide.md)** - Security setup
- **[User Guide](for-administrators/user-guide.md)** - Admin user guide

### **👥 [For Users](for-users/)**
- **[User Overview](for-users/README.md)** - End-user documentation
- **[Manager Guide](for-users/manager-guide.md)** - Manager operations guide
- **[Crew Guide](for-users/crew-guide.md)** - Crew member guide
- **[Training Materials](for-users/training-materials/)** - Training resources

### **⚡ [Features](features/)**
- **[Feature Overview](features/README.md)** - Complete feature documentation
- **[Authentication](features/authentication/)** - Magic links and JWT auth
- **[Training System](features/training-system/)** - Three-phase training workflow
- **[Certificate Generation](features/certificate-generation/)** - PDF certificates
- **[Multilingual Support](features/multilingual-support/)** - EN/NL translations
- **[Offline Functionality](features/offline-functionality/)** - PWA and offline mode
- **[Role-Based Access](features/role-based-access.md)** - RBAC implementation

### **🔧 [API Documentation](api/)**
- **[API Overview](api/README.md)** - API architecture and conventions
- **[Translation Endpoints](api/TRANSLATION_API_ENDPOINTS.md)** - Translation API

### **🔄 [Migration](migration/)**
- **[Migration Overview](migration/README.md)** - Migration procedures
- **[Migration Strategy](migration/MIGRATION_STRATEGY.md)** - Migration approach
- **[Consolidation Summary](migration/MIGRATION_CONSOLIDATION_SUMMARY.md)** - Migration status

### **🛠️ [Maintenance](maintenance/)**
- **[Maintenance Overview](maintenance/README.md)** - System maintenance procedures

## 🎯 **Quick Navigation**

### **👨‍💻 For Developers**
1. **New to the project?** → [Getting Started Guide](getting-started/README.md)
2. **Setting up locally?** → [Environment Setup](for-developers/development-workflow/environment-setup.md)
3. **Ready to develop?** → [Development Workflow](for-developers/development-workflow/workflow.md)
4. **Need API details?** → [API Reference](for-developers/api-reference/README.md)
5. **Working with database?** → [Database Design](for-developers/architecture/database-design.md)

### **🏗️ For System Administrators**
1. **Understanding the system?** → [System Overview](for-developers/architecture/overview.md)
2. **Setting up environments?** → [Deployment Overview](for-administrators/deployment/overview.md)
3. **Deploying to production?** → [Vercel Deployment](for-administrators/deployment/vercel-deployment.md)
4. **Understanding roles?** → [Role-Based Access Control](features/role-based-access.md)
5. **Security setup?** → [Security Implementation](for-administrators/security/implementation-guide.md)

### **📄 For Content Creators**
1. **Creating PDF templates?** → [PDF Template System](features/pdf-templates.md)
2. **Understanding certificates?** → [Certificate System](features/certificate-system.md)
3. **Managing training content?** → [Training System](features/training-system.md)

## 📋 **Documentation Status**

### **✅ Completed Sections**
- **Getting Started**: Complete setup and first steps guides
- **Development**: Comprehensive development environment and workflow
- **Architecture**: System architecture and design documentation
- **Features**: Complete feature documentation and guides
- **API**: API overview and structure (reference in progress)
- **Deployment**: Deployment strategy and environment configuration
- **Migration**: Migration procedures and best practices
- **Maintenance**: System maintenance and monitoring procedures

### **🔄 In Progress**
- **API Reference**: Detailed endpoint documentation
- **Feature Guides**: Specific feature implementation guides
- **Troubleshooting**: Expanded troubleshooting scenarios

### **📈 Recent Updates**
- **🌊 OFFLINE CONNECTIVITY PHASE 1 COMPLETE**: Critical maritime offline infrastructure
- **Service Worker Implementation**: Intelligent caching with cache-first and network-first strategies
- **Offline Quiz Functionality**: Complete quizzes without internet, automatic sync when online
- **Progressive Web App**: Maritime-optimized PWA with offline capabilities
- **Network Status Monitoring**: Real-time connection monitoring with sync status
- **UX Phase 3.3 Complete**: Enhanced error handling with internationalization
- **Maritime-friendly error messages**: Professional error handling in English/Dutch
- **Enhanced error boundaries**: React error handling with recovery options
- **Reorganized structure**: Improved navigation and organization
- **Updated environment information**: Current URLs and configurations
- **Enhanced security documentation**: Comprehensive security implementation

## 🏢 **System Overview**

The Maritime Onboarding System is a comprehensive platform for managing crew training and certification in the maritime industry.

### **Key Features**
- **Three-tier role system** (Admin, Manager, Crew)
- **Automated training workflows** with phase-based progression
- **Interactive quiz system** with manager review
- **PDF certificate generation** with custom templates
- **Magic link authentication** for crew members
- **Comprehensive audit logging** for compliance
- **Multi-environment deployment** (testing, preview, production)

### **Technology Stack**
- **Frontend**: React.js with modern hooks and context
- **Backend**: Vercel API routes (serverless)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for files and documents
- **Email**: MailerSend for transactional emails
- **PDF Generation**: PDFKit with custom template engine
- **Authentication**: JWT with role-based access control

## 🔄 **Development Environments**

| Environment | Purpose | URL | Database |
|-------------|---------|-----|----------|
| **Local** | Development | `localhost:3000` | Production (read-only) |
| **Testing** | Team review | `new-onboarding-2025-git-testing-shipdocs-projects.vercel.app` | Testing DB |
| **Preview** | Final approval | `new-onboarding-2025-git-preview-shipdocs-projects.vercel.app` | Preview DB |
| **Production** | Live system | `onboarding.burando.online` | Production DB |

## 🎯 **User Roles & Capabilities**

### **👑 Admin**
- **Full system access** and configuration
- **Manager account management** (create, edit, delete)
- **PDF template management** (exclusive access)
- **System settings** and audit log access
- **Complete oversight** of all operations

### **👔 Manager**
- **Crew member management** (create, edit, delete)
- **Training progress monitoring** and review
- **Quiz result review** and approval
- **Certificate generation** and distribution
- **Compliance dashboard** and reporting

### **👷 Crew**
- **Personal profile management** and updates
- **Training completion** with photo proof
- **Interactive quiz participation** and submission
- **Certificate access** and download
- **Progress tracking** and status updates

## 📊 **Training Workflow**

```
🔄 TRAINING PROGRESSION:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Phase 1         │ ─→ │ Phase 2         │ ─→ │ Phase 3         │ ─→ │ Certificate     │
│ Basic Training  │    │ Advanced Items  │    │ Final Quiz      │    │ Generation      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

1. **Phase 1**: Basic training items with instructor verification
2. **Phase 2**: Advanced training with photo proof requirements
3. **Phase 3**: Comprehensive quiz with manager review
4. **Completion**: Automated certificate generation and distribution

## 🔐 **Security Features**

### **Authentication & Authorization**
- **JWT-based authentication** with secure token management
- **Role-based access control** with granular permissions
- **Magic link authentication** for crew members (no passwords)
- **Session management** with configurable timeouts

### **Data Protection**
- **Row Level Security** (RLS) in Supabase database
- **Environment isolation** across development stages
- **Secure file storage** with access controls
- **Audit logging** for all system activities

### **Compliance**
- **Complete audit trail** of all training activities
- **Secure certificate storage** with tamper protection
- **Data retention policies** and cleanup procedures
- **GDPR-compliant** data handling practices

## 🚀 **Deployment Architecture**

### **Unified Vercel Architecture**
- **Consistent deployment** across all environments
- **Serverless API routes** for scalable backend
- **Automatic deployments** on branch pushes
- **Environment-specific configurations**

### **Supabase Branching**
- **Separate databases** for each environment
- **Automated migrations** on deployment
- **Schema synchronization** across branches
- **Backup and recovery** procedures

## 📈 **Performance & Scalability**

### **Optimized Architecture**
- **Serverless functions** for automatic scaling
- **CDN delivery** for static assets
- **Database indexing** for fast queries
- **File compression** and optimization

### **Monitoring & Maintenance**
- **Health check endpoints** for system monitoring
- **Automated cleanup** of expired data
- **Performance metrics** and logging
- **Error tracking** and alerting

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

## 📞 **Support & Resources**

### **Documentation Structure**
- **Comprehensive guides** for all user types
- **Step-by-step tutorials** with examples
- **API documentation** with code samples
- **Troubleshooting guides** for common issues

### **Development Resources**
- **Component documentation** with usage examples
- **Database schema** documentation
- **Migration guides** and best practices
- **Deployment procedures** and checklists

## 🎉 **Getting Started**

Ready to begin? Choose your path:

1. **👨‍💻 Developer**: Start with [Getting Started](getting-started/README.md)
2. **🏗️ System Admin**: Read [Admin Guide](for-administrators/user-guide.md)
3. **📄 Manager**: Explore [Manager Guide](for-users/manager-guide.md)
4. **🔧 DevOps**: Check [Deployment Overview](for-administrators/deployment/overview.md)

The Maritime Onboarding System is designed to be powerful yet easy to use, with comprehensive documentation to support every aspect of development, deployment, and operation.
