# 🚢 Maritime Onboarding Platform

**The first open source maritime crew onboarding and training management system** - Built by maritime professionals, for the maritime industry.

Transform your crew training with automated workflows, compliance tracking, and professional certificate generation. **Production-ready with Docker deployment and complete training content included.**

[![Open Source](https://img.shields.io/badge/Open%20Source-MIT-green.svg)](LICENSE)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-blue.svg)](https://maritime-onboarding.example.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](docker-compose.yml)
[![Maritime Industry](https://img.shields.io/badge/Industry-Maritime-navy.svg)](https://www.imo.org/)

> **🎯 Professional Services Available** - Need help with deployment, training, or customization? [Contact our maritime experts →](https://shipdocs.app/services)

---

## 📸 **See It In Action**

| **Dashboard Overview** | **Training Progress** | **Certificate Generation** |
|:---:|:---:|:---:|
| ![Dashboard](https://via.placeholder.com/400x250/2563eb/ffffff?text=Dashboard+Overview) | ![Training](https://via.placeholder.com/400x250/059669/ffffff?text=Training+Progress) | ![Certificate](https://via.placeholder.com/400x250/dc2626/ffffff?text=Certificate+Generation) |
| *Real-time crew progress tracking* | *Phase-based training workflow* | *Professional PDF certificates* |

> **🚀 [Live Demo](https://maritime-onboarding.example.com)** - Experience the full system (demo credentials in docs)

## ⚡ **Quick Start**

Get your maritime training system running in under 10 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/shipdocs/maritime-onboarding.git
cd maritime-onboarding

# 2. Start with Docker (includes demo data)
docker-compose up -d

# 3. Access the system
echo "🌊 Maritime Onboarding Platform is ready!"
echo "📱 Access at: http://localhost"
```

**🎉 That's it!** Your system is running with:
- ✅ **Demo crew members** and training content
- ✅ **Admin account** (admin@example.com / password: admin123)
- ✅ **Complete training workflows** ready to use
- ✅ **Professional certificates** with your branding

### **📚 Documentation Quick Links**
- **🚀 [Installation Guide](docs/installation/README.md)** - Detailed setup instructions
- **⚙️ [Configuration](docs/configuration/README.md)** - Customize for your fleet
- **🔐 [Security Setup](docs/security/README.md)** - Production security guide
- **👥 [User Guide](docs/user-guide/README.md)** - How to use the system
- **🔧 [API Reference](docs/api/README.md)** - Integration documentation

### **🆘 Need Help?**
- **📖 [Documentation](docs/)** - Comprehensive guides
- **💬 [Community Forum](https://github.com/shipdocs/maritime-onboarding/discussions)** - Ask questions
- **🐛 [Report Issues](https://github.com/shipdocs/maritime-onboarding/issues)** - Bug reports
- **💼 [Professional Services](https://shipdocs.app/services)** - Expert implementation help

---

## 🌟 **Why Choose Maritime Onboarding Platform?**

### **🚢 Built for Maritime, By Maritime Professionals**
Unlike generic training platforms, this system understands maritime operations:
- **STCW Compliance** - Built-in support for international maritime standards
- **Vessel Operations** - Designed for shipboard and shore-based training
- **Maritime Workflows** - Phase-based training that matches real onboarding
- **Industry Expertise** - Created by professionals with maritime experience

### **🔓 Open Source Advantages**
- **✅ No Vendor Lock-in** - You own your data and deployment
- **✅ Full Transparency** - Audit the code for security and compliance
- **✅ Community Driven** - Benefit from maritime industry contributions
- **✅ Cost Effective** - No licensing fees, pay only for services you need
- **✅ Customizable** - Modify to fit your specific fleet requirements

### **🚀 Core Features**

| Feature | Description | Benefit |
|---------|-------------|---------|
| **🎯 Role-Based Access** | Admin, Manager, Crew roles with granular permissions | Secure, organized access control |
| **📚 Training Workflows** | Phase-based progression with photo verification | Structured, compliant onboarding |
| **🧠 Interactive Quizzes** | Comprehensive assessments with manager review | Verified competency validation |
| **📄 Certificate Generation** | Professional PDF certificates with custom branding | Automated compliance documentation |
| **🔗 Magic Link Auth** | Password-free access for crew members | Simple, secure authentication |
| **📊 Progress Tracking** | Real-time dashboards and compliance monitoring | Complete visibility and control |
| **🔍 Audit Logging** | Complete activity tracking for all users | Compliance and security auditing |
| **📱 Mobile Ready** | Responsive design for all devices | Accessible anywhere, anytime |

## 🏗️ **Architecture & Technology**

### **Modern, Production-Ready Stack**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │    │   Node.js       │    │  PostgreSQL     │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │
│   (Port 80)     │    │   (Port 3000)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │     MinIO       │    │     Redis       │
│  Load Balancer  │    │  File Storage   │    │     Cache       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Technology Stack**
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React.js 18+ | Modern, responsive user interface |
| **Backend** | Node.js + Express | RESTful API and business logic |
| **Database** | PostgreSQL 15+ | Reliable data storage with ACID compliance |
| **File Storage** | MinIO (S3-compatible) | Secure document and photo storage |
| **Authentication** | JWT + Magic Links | Secure, user-friendly authentication |
| **Email** | SMTP/MailerSend | Transactional emails and notifications |
| **Caching** | Redis | Performance optimization |
| **Deployment** | Docker + Docker Compose | Containerized, scalable deployment |
| **Security** | HTTPS, Rate Limiting, Audit Logs | Enterprise-grade security |

### **🔒 Security Features**
- **🛡️ Multi-Factor Authentication** - Enhanced security for admin accounts
- **🔐 Row Level Security** - Database-level access control
- **📋 GDPR Compliance** - Data export and privacy controls
- **📊 Audit Logging** - Complete activity tracking for compliance
- **🔒 Data Encryption** - Optional encryption at rest
- **🚫 Rate Limiting** - Protection against abuse
- **🔍 Security Headers** - OWASP recommended security headers

## 🎯 **Maritime Training Workflow**

### **Structured Three-Phase Onboarding**
Designed to match real maritime onboarding procedures:

```
🔄 TRAINING PROGRESSION:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Phase 1         │ ─→ │ Phase 2         │ ─→ │ Phase 3         │ ─→ │ Certificate     │
│ Basic Training  │    │ Advanced Items  │    │ Final Quiz      │    │ Generation      │
│ ✓ Orientation   │    │ ✓ Safety Drills │    │ ✓ Assessment    │    │ ✓ PDF Download  │
│ ✓ Safety Brief  │    │ ✓ Equipment     │    │ ✓ Manager Review│    │ ✓ Email Delivery│
│ ✓ Ship Tour     │    │ ✓ Procedures    │    │ ✓ Approval      │    │ ✓ Record Keeping│
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Phase Details**
1. **📚 Phase 1: Foundation Training**
   - Basic orientation and safety briefings
   - Instructor signature verification
   - Ship familiarization and emergency procedures

2. **🔧 Phase 2: Practical Training**
   - Hands-on equipment training
   - Photo proof submission for verification
   - Advanced safety and operational procedures

3. **🧠 Phase 3: Competency Assessment**
   - Comprehensive knowledge quiz
   - Manager review and approval process
   - Final competency validation

4. **📄 Phase 4: Certification**
   - Automated professional certificate generation
   - Email delivery to crew and management
   - Permanent record keeping for compliance

## 💼 **Professional Services**

### **🚀 Need Expert Help?**
While the software is free and open source, we offer professional services for maritime companies who want expert assistance:

#### **📋 Implementation Services**
- **⚙️ Custom Deployment** - Tailored setup for your infrastructure
- **🔧 Configuration** - Optimized for your fleet and procedures
- **📊 Data Migration** - Import existing crew and training records
- **🔗 Integration** - Connect with your existing maritime software

#### **🎓 Training & Support**
- **👥 User Training** - Comprehensive training for your team
- **📞 Priority Support** - Direct access to maritime experts
- **📋 Compliance Consulting** - Ensure STCW and flag state compliance
- **🔄 Best Practices** - Optimize workflows based on industry experience

#### **🛠️ Custom Development**
- **⚡ Feature Development** - Custom features for your specific needs
- **🎨 Branding & UI** - White-label solutions with your company branding
- **📱 Mobile Apps** - Native mobile applications for crew
- **🔌 API Integration** - Connect with maritime management systems

> **📞 [Contact Our Maritime Experts](https://shipdocs.app/contact)** - Get a free consultation for your fleet

## 🚀 **Installation & Deployment**

### **🐳 Docker Deployment (Recommended)**
The fastest way to get started - everything included:

```bash
# 1. Clone the repository
git clone https://github.com/shipdocs/maritime-onboarding.git
cd maritime-onboarding

# 2. Start all services
docker-compose up -d

# 3. Access your system
open http://localhost
```

**✅ Includes:**
- Complete maritime training system
- Demo crew members and training content
- Admin account (admin@example.com / admin123)
- Professional certificate templates
- Email system (MailHog for testing)

### **⚙️ Manual Installation**
For development or custom deployments:

```bash
# Prerequisites: Node.js 18+, PostgreSQL, Redis
git clone https://github.com/shipdocs/maritime-onboarding.git
cd maritime-onboarding

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and email settings

# Setup database
npm run db:setup
npm run db:seed

# Start the application
npm start
```

### **☁️ Cloud Deployment**
Deploy to your preferred cloud provider:

- **🔵 DigitalOcean** - [One-click deployment guide](docs/deployment/digitalocean.md)
- **🟠 AWS** - [ECS deployment guide](docs/deployment/aws.md)
- **🟢 Google Cloud** - [Cloud Run deployment guide](docs/deployment/gcp.md)
- **🟣 Azure** - [Container Instances guide](docs/deployment/azure.md)

### **🔧 Configuration**
Essential configuration for production:

```bash
# Environment variables
DATABASE_URL=postgresql://user:pass@host:5432/maritime
REDIS_URL=redis://localhost:6379
EMAIL_PROVIDER=smtp  # or mailersend
SMTP_HOST=your-smtp-server.com
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
```

> **📖 [Complete Deployment Guide](docs/deployment/README.md)** - Detailed instructions for all deployment scenarios

## 👥 **User Roles & Permissions**

### **🎭 Three-Tier Role System**
Designed for maritime organizational structure:

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **👑 Admin** | Full System | User management, system configuration, audit logs, certificate templates |
| **👔 Manager** | Fleet Management | Crew oversight, training approval, progress monitoring, certificate generation |
| **👷 Crew** | Personal Training | Profile management, training completion, quiz participation, certificate access |

### **🔐 Security & Permissions**
- **Granular Access Control** - Each role has specific permissions
- **Data Isolation** - Users only see relevant information
- **Audit Trail** - All actions logged for compliance
- **Secure Authentication** - Magic links, MFA, and JWT tokens

## 🛠️ **Development & API**

### **🔧 Development Tools**
```bash
# Database management
npm run db:migrate           # Run database migrations
npm run db:seed             # Seed with demo data
npm run db:reset            # Reset database

# Development
npm run dev                 # Start development server
npm run test                # Run test suite
npm run lint                # Code quality checks
npm run build               # Build for production
```

### **📡 API Integration**
RESTful API with comprehensive endpoints:

```javascript
// Example: Get crew training progress
GET /api/crew/{id}/progress
{
  "crewId": "123",
  "currentPhase": 2,
  "completedItems": 15,
  "totalItems": 20,
  "certificateReady": false
}
```

> **📖 [Complete API Documentation](docs/api/README.md)** - Full endpoint reference with examples

## 🌍 **Community & Support**

### **💬 Community**
- **🗣️ [GitHub Discussions](https://github.com/shipdocs/maritime-onboarding/discussions)** - Ask questions, share ideas
- **🐛 [Issue Tracker](https://github.com/shipdocs/maritime-onboarding/issues)** - Report bugs, request features
- **📧 [Mailing List](https://shipdocs.app/newsletter)** - Stay updated with releases
- **🐦 [Twitter](https://twitter.com/shipdocs)** - Follow for updates and maritime tech news

### **📚 Documentation**
- **📖 [User Guide](docs/user-guide/)** - How to use the system
- **⚙️ [Admin Guide](docs/admin-guide/)** - System administration
- **🔧 [Developer Guide](docs/developer-guide/)** - Customization and development
- **🚀 [Deployment Guide](docs/deployment/)** - Production deployment options

### **🆘 Support Options**

| Support Type | Response Time | Cost | Best For |
|--------------|---------------|------|----------|
| **Community Forum** | Best effort | Free | General questions, community help |
| **GitHub Issues** | 1-3 days | Free | Bug reports, feature requests |
| **Professional Support** | 4-24 hours | Paid | Production issues, urgent help |
| **Enterprise Support** | 1-4 hours | Paid | Mission-critical deployments |

> **💼 [Professional Support Plans](https://shipdocs.app/support)** - Get expert help when you need it

## 🤝 **Contributing**

We welcome contributions from the maritime community! Here's how you can help:

### **🚀 Ways to Contribute**
- **🐛 Report Bugs** - Found an issue? [Create an issue](https://github.com/shipdocs/maritime-onboarding/issues)
- **💡 Suggest Features** - Have an idea? [Start a discussion](https://github.com/shipdocs/maritime-onboarding/discussions)
- **📝 Improve Documentation** - Help make the docs better
- **🔧 Submit Code** - Fix bugs or add features
- **🌍 Translations** - Help translate for international maritime use
- **📢 Spread the Word** - Share with other maritime professionals

### **🔄 Development Process**
```bash
# 1. Fork and clone
git clone https://github.com/your-username/maritime-onboarding.git

# 2. Create feature branch
git checkout -b feature/your-amazing-feature

# 3. Make changes and test
npm run test
npm run lint

# 4. Commit and push
git commit -m "Add amazing maritime feature"
git push origin feature/your-amazing-feature

# 5. Create Pull Request
```

> **📋 [Contributing Guidelines](CONTRIBUTING.md)** - Detailed contribution instructions

## 📄 **License & Legal**

### **📜 Open Source License**
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ **Commercial Use** - Use in your business freely
- ✅ **Modification** - Customize for your needs
- ✅ **Distribution** - Share with others
- ✅ **Private Use** - Use internally without restrictions
- ⚠️ **No Warranty** - Software provided "as-is"

### **🏢 Professional Services**
While the software is open source, professional services are provided under separate commercial terms.

## 🎯 **Project Roadmap**

### **🚀 Current Version (v2.0)**
- ✅ Complete maritime training workflows
- ✅ Role-based access control
- ✅ Certificate generation
- ✅ Docker deployment
- ✅ Comprehensive documentation

### **🔮 Upcoming Features**
- **📱 Mobile App** - Native iOS/Android applications
- **🌐 Multi-language** - Support for international crews
- **📊 Advanced Analytics** - Training effectiveness insights
- **🔌 API Integrations** - Connect with maritime management systems
- **☁️ Cloud Hosting** - Managed hosting options

> **🗳️ [Vote on Features](https://github.com/shipdocs/maritime-onboarding/discussions/categories/feature-requests)** - Help prioritize development

---

## 🏆 **Success Stories**

> *"This open source platform transformed our crew onboarding process. The transparency and customization options were exactly what we needed for our fleet operations."*
>
> **— Maritime Operations Manager, International Shipping Company**

> *"Finally, a training system built by people who understand maritime operations. The professional services team helped us deploy it perfectly."*
>
> **— Fleet Manager, Offshore Services**

---

**🚢 Built with ❤️ for the maritime industry by [Burando Maritime Services](https://shipdocs.app)**

*Empowering maritime professionals with open source technology and expert services.*
