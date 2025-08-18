# Development Environment Setup

This guide provides detailed instructions for setting up a complete local development environment for the Maritime Onboarding System.

## 🎯 **Prerequisites**

### **System Requirements**
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **Internet**: Stable broadband connection

### **Required Software**

#### **Node.js and Package Managers**
```bash
# Install Node.js 18+ (recommended: use Node Version Manager)
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Windows (use Node.js installer from nodejs.org)
# Download and install Node.js 18+ from https://nodejs.org/

# Verify installation
node --version  # Should be v18.x.x or higher
npm --version   # Should be 9.x.x or higher
```

#### **Git Version Control**
```bash
# Install Git
# macOS: git --version (installs Xcode Command Line Tools)
# Linux: sudo apt-get install git
# Windows: Download from https://git-scm.com/

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### **Development Tools**
```bash
# Install Vercel CLI
npm install -g vercel

# Install Supabase CLI
npm install -g supabase

# Verify installations
vercel --version
supabase --version
```

## 🔧 **IDE Setup**

### **Visual Studio Code (Recommended)**

#### **Installation**
1. Download from [code.visualstudio.com](https://code.visualstudio.com/)
2. Install for your operating system
3. Launch VS Code

#### **Essential Extensions**
```bash
# Install via VS Code Extensions panel or command line
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-typescript-next
```

#### **VS Code Settings**
Create `.vscode/settings.json` in project root:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "tailwindCSS.includeLanguages": {
    "javascript": "javascript",
    "html": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

#### **Workspace Configuration**
Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Vercel Dev",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vercel",
      "args": ["dev"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## 🗄️ **Database Setup**

### **Supabase Account Setup**

1. **Create Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up with GitHub (recommended) or email
   - Verify your email address

2. **Create Development Project**
   - Click "New Project"
   - Organization: Create or select existing
   - Project details:
     ```
     Name: maritime-onboarding-dev
     Database Password: [Generate strong password]
     Region: [Choose closest to your location]
     ```
   - Wait for project creation (2-3 minutes)

3. **Get Project Credentials**
   - Go to Settings → API
   - Copy these values:
     - Project URL
     - anon public key
     - service_role key (keep secret!)

### **Local Database Configuration**

```bash
# Initialize Supabase in project
cd new-onboarding-2025
supabase init

# Link to your development project
supabase link --project-ref your-dev-project-id

# Pull current schema (if project has existing schema)
supabase db pull

# Apply migrations to your development database
supabase db push
```

### **Database Development Tools**

#### **Supabase Studio (Web Interface)**
- Access via Supabase dashboard
- Visual table editor
- SQL query editor
- Real-time data viewer

#### **Local Database Tools (Optional)**
```bash
# Install pgAdmin (GUI for PostgreSQL)
# macOS: brew install --cask pgadmin4
# Windows: Download from https://www.pgadmin.org/
# Linux: sudo apt-get install pgadmin4

# Or use command line tools
# Connection string from Supabase Settings → Database
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

## 📧 **Email Service Setup**

### **MailerSend Account**

1. **Create Account**
   - Go to [mailersend.com](https://mailersend.com)
   - Sign up for free account
   - Verify email address

2. **Domain Setup**
   - Add your domain (or use subdomain like `mail.yourdomain.com`)
   - Add required DNS records:
     ```
     TXT: v=spf1 include:mailersend.net ~all
     CNAME: mail._domainkey → mail._domainkey.mailersend.net
     CNAME: _dmarc → _dmarc.mailersend.net
     ```
   - Wait for domain verification (up to 24 hours)

3. **API Token**
   - Go to Settings → API Tokens
   - Create new token with "Email sending" scope
   - Copy token securely

### **Development Email Testing**

For development, you can use:

1. **MailerSend Sandbox**: Test emails without sending
2. **Mailtrap**: Email testing service
3. **Local SMTP**: For offline development

```bash
# Test email configuration
node -e "
const { sendEmail } = require('./services/email');
sendEmail(
  'test@yourdomain.com',
  'Test Email',
  'This is a test email from development environment.'
).then(() => console.log('✅ Email test successful'))
.catch(err => console.error('❌ Email test failed:', err));
"
```

## 🔐 **Environment Configuration**

### **Environment Variables Setup**

```bash
# Copy environment template
cp .env.example .env

# Generate secure JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### **Complete .env Configuration**
```bash
# Supabase Configuration (Development)
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key

# Authentication
JWT_SECRET=your-generated-64-char-secret
MAGIC_LINK_EXPIRY=24h

# Email Configuration (MailerSend)
MAILERSEND_API_KEY=your-mailersend-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME="Your Organization Development"

# Application Configuration
NODE_ENV=development
BASE_URL=http://localhost:3000
HR_EMAIL=dev-hr@yourdomain.com

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-admin-password

# Development Settings
DEBUG=true
DEBUG_SQL=false
MAX_FILE_SIZE=10485760

# Rate Limiting (relaxed for development)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
```

### **Environment Validation**
```bash
# Create validation script
cat > scripts/validate-env.js << 'EOF'
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'MAILERSEND_API_KEY',
  'EMAIL_FROM',
  'BASE_URL',
  'ADMIN_EMAIL'
];

console.log('🔍 Validating environment variables...');
const missing = requiredVars.filter(var => !process.env[var]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(var => console.error(`  - ${var}`));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}
EOF

# Run validation
node scripts/validate-env.js
```

## 🚀 **Project Setup**

### **Repository Setup**
```bash
# Clone repository
git clone https://github.com/shipdocs/new-onboarding-2025.git
cd new-onboarding-2025

# Install dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Verify installations
npm list --depth=0
```

### **Database Initialization**
```bash
# Apply database schema
supabase db push

# Create admin user
npm run setup:admin

# Verify admin user creation
node -e "
const { getDatabase } = require('./config/database');
const db = getDatabase();
db.from('users').select('email, role').eq('role', 'admin')
  .then(({data}) => console.log('Admin users:', data));
"
```

### **Build and Start**
```bash
# Build React application
cd client
npm run build
cd ..

# Copy build to root directory
cp -r client/build ./build

# Start development server
vercel dev
```

## 🧪 **Development Testing**

### **Verification Checklist**
```bash
# 1. Test API health
curl http://localhost:3000/api/health

# 2. Test database connection
npm run test:permissions

# 3. Test email configuration
node scripts/test-email.js

# 4. Test file upload
node scripts/test-file-upload.js

# 5. Verify admin login
# Open http://localhost:3000 and test admin login
```

### **Manual Testing**
1. **Frontend Access**: Navigate to `http://localhost:3000`
2. **Admin Login**: Use admin credentials
3. **Manager Creation**: Create test manager through admin interface
4. **Crew Creation**: Create test crew member through manager interface
5. **Magic Link**: Test magic link email delivery
6. **Training Workflow**: Complete basic training workflow
7. **File Upload**: Test photo upload functionality
8. **Certificate Generation**: Test PDF certificate creation

## 🛠️ **Development Tools Configuration**

### **Git Hooks Setup**
```bash
# Install Husky for git hooks
npm install --save-dev husky

# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
npx husky add .husky/pre-push "npm run build"
```

### **Code Quality Tools**
```bash
# ESLint configuration (already included)
# Check .eslintrc.js for rules

# Prettier configuration (already included)
# Check .prettierrc for formatting rules

# Run code quality checks
npm run lint          # ESLint
npm run format        # Prettier
npm run test          # Jest tests
```

### **Database Development Tools**
```bash
# Create database utility scripts
mkdir -p scripts/db

# Database reset script
cat > scripts/db/reset.js << 'EOF'
const { getDatabase } = require('../../config/database');

async function resetDatabase() {
  console.log('🔄 Resetting development database...');
  // Add reset logic here
  console.log('✅ Database reset complete');
}

resetDatabase().catch(console.error);
EOF

# Database seed script
cat > scripts/db/seed.js << 'EOF'
const { getDatabase } = require('../../config/database');

async function seedDatabase() {
  console.log('🌱 Seeding development database...');
  // Add seed data logic here
  console.log('✅ Database seeding complete');
}

seedDatabase().catch(console.error);
EOF
```

## 🔧 **Advanced Configuration**

### **Custom Development Scripts**
Add to `package.json`:
```json
{
  "scripts": {
    "dev:clean": "rm -rf .next client/build build && npm run dev:build",
    "dev:reset": "npm run dev:clean && npm run db:reset && npm run setup:admin",
    "dev:seed": "node scripts/db/seed.js",
    "dev:logs": "vercel logs --follow",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint:fix": "eslint . --fix",
    "format:check": "prettier --check .",
    "format:write": "prettier --write ."
  }
}
```

### **Environment Switching**
```bash
# Create environment switching script
cat > scripts/switch-env.js << 'EOF'
const fs = require('fs');
const path = require('path');

const environments = {
  development: '.env.development',
  testing: '.env.testing',
  preview: '.env.preview'
};

const env = process.argv[2];
if (!env || !environments[env]) {
  console.error('Usage: node scripts/switch-env.js [development|testing|preview]');
  process.exit(1);
}

const envFile = environments[env];
if (fs.existsSync(envFile)) {
  fs.copyFileSync(envFile, '.env');
  console.log(`✅ Switched to ${env} environment`);
} else {
  console.error(`❌ Environment file ${envFile} not found`);
}
EOF

# Usage
node scripts/switch-env.js development
```

## 📚 **Next Steps**

After completing environment setup:

1. **[Development Workflow](workflow.md)** - Learn the development process
2. **[Testing Guide](testing.md)** - Set up comprehensive testing
3. **[API Development](README.md)** - Start building API endpoints
4. **[Frontend Development](../architecture/frontend.md)** - React component development
5. **[Database Design](../for-developers/architecture/database-design.md)** - Understanding the data model

## 🚨 **Troubleshooting**

For common setup issues, see:
- **[Troubleshooting Guide](../getting-started/troubleshooting.md)** - Common installation issues
- **[Environment Issues](#)** - Environment-specific problems
- **[Database Issues](#)** - Database connection and migration problems

## 🎯 **Development Best Practices**

1. **Use consistent Node.js version**: Always use Node.js 18+
2. **Keep dependencies updated**: Regularly update packages
3. **Use environment variables**: Never hardcode secrets
4. **Test locally first**: Verify changes before pushing
5. **Follow code standards**: Use ESLint and Prettier
6. **Document changes**: Update relevant documentation
7. **Monitor performance**: Watch for slow queries and API calls
