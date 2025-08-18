# Development Guide

Welcome to the development guide for the Maritime Onboarding System. This section covers everything you need to know about developing, testing, and contributing to the project.

## 🏗️ **Development Overview**

The Maritime Onboarding System uses a modern, unified architecture designed for consistency across all environments:

### **Architecture Highlights**
- **Unified Vercel Architecture**: Same serverless functions run locally and in production
- **Supabase-Only Database**: Pure PostgreSQL, no SQLite fallback
- **Three-Tier Deployment**: Testing → Preview → Production pipeline
- **React Frontend**: Modern hooks and context-based state management
- **API-First Design**: RESTful API with comprehensive documentation

### **Technology Stack**
- **Frontend**: React 18, TailwindCSS, React Router v6
- **Backend**: Vercel serverless functions (Node.js)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for files and documents
- **Email**: MailerSend for transactional emails
- **PDF Generation**: PDFKit with custom template engine
- **Authentication**: JWT with role-based access control
- **Internationalization**: i18next (English/Dutch)

## 🚀 **Quick Development Setup**

### **Prerequisites**
- Node.js 18+, npm, Git
- Vercel CLI, Supabase CLI
- Code editor (VS Code recommended)

### **1. Clone and Setup**
```bash
git clone https://github.com/shipdocs/new-onboarding-2025.git
cd new-onboarding-2025
npm install && cd client && npm install && cd ..
```

### **2. Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your Supabase and MailerSend credentials
```

### **3. Database Setup**
```bash
supabase link --project-ref your-project-id
supabase db push
npm run setup:admin
```

### **4. Start Development**
```bash
# Build React app
cd client && npm run build && cd .. && cp -r client/build ./build

# Start unified development server
vercel dev
```

## 🔄 **Development Workflow**

### **Branch Strategy**
```
main (production) ← preview ← testing ← feature branches
```

### **Environment Pipeline**
| Environment | Branch | URL | Database | Purpose |
|-------------|--------|-----|----------|---------|
| **Local** | `main` | `localhost:3000` | Production (read-only) | Development |
| **Testing** | `testing` | `new-onboarding-2025-git-testing-shipdocs-projects.vercel.app` | Testing DB | Team review |
| **Preview** | `preview` | `new-onboarding-2025-git-preview-shipdocs-projects.vercel.app` | Preview DB | Final approval |
| **Production** | `main` | `onboarding.burando.online` | Production DB | Live system |

### **Development Process**
1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Develop Locally**: Use `vercel dev` for development
3. **Test Changes**: Run tests and verify functionality
4. **Push to Testing**: `git push origin testing`
5. **Review in Testing Environment**: Team review and validation
6. **Promote to Preview**: `git checkout preview && git merge testing`
7. **Stakeholder Approval**: Final review in preview environment
8. **Deploy to Production**: `git checkout main && git merge preview`

## 🛠️ **Development Tools**

### **Essential Commands**
```bash
# Development
vercel dev                    # Start development server
npm run dev:build            # Build React app
npm run dev:fresh            # Clean build

# Database
npm run db:pull              # Sync schema from remote
npm run db:push              # Apply local migrations
npm run db:create-migration  # Create new migration
npm run setup:admin          # Create admin user

# Testing
npm run test:permissions     # Test file permissions
npm run verify:deployment    # Verify deployment status
npm test                     # Run test suite

# Utilities
npm run migrate:all          # Run all migrations
npm run setup:environments   # Configure environments
```

### **Recommended VS Code Extensions**
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### **Code Quality Tools**
- **ESLint**: JavaScript/React linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **Jest**: Unit testing framework

## 📁 **Project Structure**

```
new-onboarding-2025/
├── api/                     # Vercel serverless functions
│   ├── auth/               # Authentication endpoints
│   ├── admin/              # Admin-specific endpoints
│   ├── manager/            # Manager-specific endpoints
│   ├── crew/               # Crew-specific endpoints
│   ├── training/           # Training system endpoints
│   ├── upload/             # File upload endpoints
│   └── cron/               # Scheduled tasks
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth, Language)
│   │   ├── services/       # API service functions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── build/              # Built React app
├── docs/                   # Documentation
├── lib/                    # Shared libraries
├── services/               # Backend services
├── config/                 # Configuration files
├── scripts/                # Utility scripts
├── supabase/               # Database migrations and config
└── migration/              # Legacy migration scripts
```

## 🔧 **API Development**

### **API Structure**
All API endpoints follow RESTful conventions and are organized by user role:

```
/api/
├── auth/                   # Authentication (all roles)
├── admin/                  # Admin-only endpoints
├── manager/                # Manager-only endpoints
├── crew/                   # Crew-only endpoints
├── training/               # Training system
├── upload/                 # File uploads
└── cron/                   # Scheduled tasks
```

### **Creating New Endpoints**
1. **Create API File**: `api/your-endpoint.js`
2. **Implement Handler**:
   ```javascript
   import { authenticateUser } from '../../lib/auth';
   
   export default async function handler(req, res) {
     try {
       const user = await authenticateUser(req);
       
       if (req.method === 'GET') {
         // Handle GET request
         res.json({ success: true, data: {} });
       } else {
         res.status(405).json({ error: 'Method not allowed' });
       }
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   }
   ```
3. **Add Authentication**: Use appropriate auth middleware
4. **Test Endpoint**: Use Postman or curl
5. **Document API**: Update API documentation

### **Database Operations**
```javascript
import { getDatabase } from '../../config/database';

const db = getDatabase();

// Query data
const { data, error } = await db
  .from('users')
  .select('*')
  .eq('role', 'crew');

// Insert data
const { data, error } = await db
  .from('users')
  .insert({ email, first_name, last_name });

// Update data
const { data, error } = await db
  .from('users')
  .update({ status: 'active' })
  .eq('id', userId);
```

## 🎨 **Frontend Development**

### **Component Structure**
```javascript
// components/ExampleComponent.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { LanguageContext } from '../contexts/LanguageContext';

const ExampleComponent = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        {t('example.title')}
      </h2>
      {/* Component content */}
    </div>
  );
};

export default ExampleComponent;
```

### **State Management**
- **AuthContext**: User authentication and role management
- **LanguageContext**: Internationalization and language switching
- **Local State**: Component-specific state with useState
- **API State**: Managed through custom hooks and services

### **Styling Guidelines**
- **TailwindCSS**: Utility-first CSS framework
- **Responsive Design**: Mobile-first approach
- **Color Scheme**: 
  - Admin: Red accents (`red-600`, `red-100`)
  - Manager: Blue accents (`blue-600`, `blue-100`)
  - Crew: Green accents (`green-600`, `green-100`)
- **Typography**: Consistent font sizes and spacing

## 🧪 **Testing**

### **Testing Strategy**
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows
- **Manual Testing**: User acceptance testing

### **Running Tests**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- ExampleComponent.test.js

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### **Writing Tests**
```javascript
// __tests__/ExampleComponent.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExampleComponent from '../components/ExampleComponent';

describe('ExampleComponent', () => {
  test('renders component correctly', () => {
    render(<ExampleComponent />);
    expect(screen.getByText('Example Title')).toBeInTheDocument();
  });

  test('handles user interaction', () => {
    render(<ExampleComponent />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Assert expected behavior
  });
});
```

## 📚 **Documentation**

### **Code Documentation**
- **JSDoc Comments**: For functions and classes
- **README Files**: For major components and services
- **API Documentation**: Comprehensive endpoint documentation
- **Architecture Diagrams**: Visual system overview

### **Contributing Documentation**
1. **Update Relevant Docs**: When adding features
2. **Code Comments**: Explain complex logic
3. **API Changes**: Update API reference
4. **Migration Guides**: For breaking changes

## 🔍 **Debugging**

### **Development Debugging**
```bash
# Enable debug mode
echo "DEBUG=true" >> .env

# View detailed logs
vercel dev --debug

# Database query logging
echo "DEBUG_SQL=true" >> .env
```

### **Browser Debugging**
- **React DevTools**: Component inspection
- **Network Tab**: API request monitoring
- **Console Logs**: Application debugging
- **Application Tab**: Local storage and cookies

### **Server Debugging**
```bash
# View Vercel function logs
vercel logs

# Monitor database queries
# Check Supabase dashboard → Logs

# Email delivery status
# Check MailerSend dashboard
```

## 🚀 **Deployment**

### **Local Testing**
```bash
# Test production build locally
npm run build
vercel dev --prod
```

### **Environment Deployment**
```bash
# Deploy to testing
git push origin testing

# Deploy to preview
git checkout preview && git merge testing && git push origin preview

# Deploy to production
git checkout main && git merge preview && git push origin main
```

### **Deployment Verification**
```bash
# Verify deployment
npm run verify:deployment

# Test API endpoints
curl https://your-domain.com/api/health

# Check application functionality
# Manual testing checklist in deployment docs
```

## 📖 **Further Reading**

- **[Workflow Guide](workflow.md)** - Detailed development workflow
- **[Environment Setup](for-developers/development-workflow/environment-setup.md)** - Advanced local setup
- **[Testing Guide](testing.md)** - Comprehensive testing procedures
- **[Deployment Guide](deployment.md)** - Deployment procedures and best practices
- **[API Documentation](../api/README.md)** - Complete API reference
- **[Architecture Overview](../for-developers/architecture/overview.md)** - System architecture details

## 🤝 **Contributing**

We welcome contributions! Please:

1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Follow Code Standards**: Use ESLint and Prettier
4. **Write Tests**: Ensure good test coverage
5. **Update Documentation**: Keep docs current
6. **Submit Pull Request**: Detailed description of changes

For detailed contribution guidelines, see the main repository README.
