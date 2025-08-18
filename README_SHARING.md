# 🚢 Maritime Onboarding System 2025

## Repository Sharing Guide

This document helps you understand what's safe to share and how to prepare the repository for different sharing scenarios.

## ✅ Safe to Share (Already in Repository)

### Documentation
- ✅ All Markdown documentation files
- ✅ Compliance PDFs in `/docs/compliance-2025-pdf/`
- ✅ Architecture diagrams and technical specs
- ✅ API documentation
- ✅ User guides and setup instructions

### Code
- ✅ All source code (JavaScript, React, CSS)
- ✅ Database migrations and schemas
- ✅ Test files and configurations
- ✅ Build scripts and configurations

### Configuration Templates
- ✅ `.env.example` - Shows required environment variables
- ✅ `.env.template` - Alternative template file
- ✅ Example configuration files

## ⚠️ Never Share (Excluded via .gitignore)

### Sensitive Files
- ❌ `.env` files with real values
- ❌ `.env.local`, `.env.production`
- ❌ Any file containing passwords, API keys, or secrets
- ❌ SSL certificates (*.pem, *.key, *.crt)
- ❌ Database backups with real data

### Build Artifacts
- ❌ `node_modules/` directories
- ❌ `.next/` build cache
- ❌ `build/` directories
- ❌ `dist/` directories
- ❌ Coverage reports

### Local Configuration
- ❌ `.vscode/` editor settings
- ❌ `.idea/` IDE configurations
- ❌ `*.log` files
- ❌ MCP configuration files

## 📝 Before Sharing Checklist

### For Private Repository (Team Sharing)
```bash
# 1. Ensure sensitive files are not tracked
git status

# 2. Verify .gitignore is working
git check-ignore .env

# 3. Create the private repository on GitHub
# 4. Add remote and push
git remote add origin https://github.com/yourusername/repo-name.git
git push -u origin main
```

### For Public Repository (Open Source)
**⚠️ CRITICAL: Additional steps required!**

1. **Scan for secrets**:
   ```bash
   # Install secret scanner
   npm install -g @secretlint/cli
   
   # Scan repository
   secretlint **/*
   ```

2. **Clean Git history** (if needed):
   ```bash
   # Warning: This rewrites history!
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Double-check sensitive data**:
   - Review all configuration files
   - Check hardcoded URLs/endpoints
   - Verify no internal company data

## 🔐 Security Setup for Team Members

### After Cloning
1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Get credentials from team lead/secure storage:
   - Supabase credentials
   - MailerSend API keys
   - JWT secrets

3. Never commit real credentials:
   ```bash
   # Always check before committing
   git status
   git diff --staged
   ```

## 📂 Repository Structure Overview

```
/
├── api/                 # Serverless functions
├── client/              # React frontend
├── docs/                # Documentation
│   └── compliance-2025-pdf/  # Official PDFs
├── lib/                 # Shared utilities
├── scripts/             # Build & maintenance scripts
├── supabase/           # Database configuration
├── .env.example        # Environment template ✅
├── .gitignore          # Excludes sensitive files ✅
├── SETUP.md            # Developer setup guide ✅
└── README.md           # Project overview
```

## 🚀 Quick Start for New Developers

1. **Read the documentation**:
   - [SETUP.md](SETUP.md) - Complete setup guide
   - [docs/USER_GUIDES.md](docs/USER_GUIDES.md) - User documentation
   - [CLAUDE.md](CLAUDE.md) - AI assistant guidelines

2. **Set up environment**:
   - Follow steps in SETUP.md
   - Get credentials from team lead
   - Never share credentials via email/chat

3. **Start developing**:
   ```bash
   npm install
   npm run dev
   ```

## 📋 Compliance & Legal

- **Business**: Shipdocs
- **Address**: Middelweg 211, 1911 EE Uitgeest, Netherlands
- **Compliance**: GDPR compliant, no ISO certification
- **Documentation**: See `/docs/compliance-2025-pdf/`

## 🤝 Contact

- **Technical**: info@shipdocs.app
- **Documentation**: See `/docs` folder
- **Issues**: Use GitHub Issues for bug reports

---

**Remember**: When in doubt about sharing something, ask first. It's better to be safe than sorry with sensitive data!