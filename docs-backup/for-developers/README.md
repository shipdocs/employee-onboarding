# Developer Documentation

Welcome to the Maritime Onboarding System developer documentation. This section contains everything you need to develop, test, and deploy the system.

## 🚀 Quick Start

New to the project? Follow these steps:

1. **[Getting Started Guide](../getting-started/README.md)** - Initial setup and requirements
2. **[Environment Setup](./development-workflow/environment-setup.md)** - Configure your local environment
3. **[Development Workflow](./development-workflow/workflow.md)** - Understand our development process
4. **[Quick Reference](./quick-reference.md)** - Common commands and patterns

## 📚 Documentation Sections

### 🏗️ [Architecture](./architecture/)
Understanding the system design and structure:
- **[System Overview](./architecture/overview.md)** - High-level architecture
- **[Database Design](./architecture/database-design.md)** - Supabase schema and RLS

### 🔌 [API Reference](./api-reference/)
Complete API documentation:
- **[API Overview](./api-reference/README.md)** - Conventions and patterns
- **[Endpoints Reference](./api-reference/endpoints/overview.md)** - All API endpoints
- **[Generated API Reference](./api-reference/endpoints/generated-reference.md)** - Auto-generated endpoint documentation
- **[Error Handling](./api-reference/error-handling.md)** - Error codes and handling
- **[Response Standards](./api-reference/response-standards.md)** - API response formats

### 💻 [Development Workflow](./development-workflow/)
Development processes and guides:
- **[Environment Setup](./development-workflow/environment-setup.md)** - Local development setup
- **[Workflow Guide](./development-workflow/workflow.md)** - Three-tier development pipeline

### 📖 [Implementation Guides](./implementation-guides/)
Step-by-step implementation guides for common tasks

### 🔧 Additional Resources
- **[Quick Reference](./quick-reference.md)** - Common commands and code snippets

## 🛠️ Technology Stack

- **Frontend**: React 18 with TailwindCSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: JWT with magic links
- **Email**: Unified email service (MailerSend/SMTP)
- **PDF Generation**: PDFKit with custom templates
- **State Management**: React Query
- **Internationalization**: react-i18next (EN/NL)

## 📋 Common Development Tasks

### Starting Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
vercel dev
```

### Working with the Database
```bash
# Pull schema from remote
npm run db:pull

# Push local changes
npm run db:push

# Create migration
npm run db:create-migration -- "migration_name"
```

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

## 🔗 Related Documentation

- **[Features Documentation](../features/)** - Detailed feature documentation
- **[API Documentation](../api/)** - API-specific documentation
- **[Admin Guide](../for-administrators/)** - Deployment and administration
- **[User Guides](../for-users/)** - End-user documentation

---

## Merged Content

# Developer Guide - Maritime Onboarding System

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Development Setup](#development-setup)
4. [Code Standards](#code-standards)
5. [API Development](#api-development)
6. [Frontend Development](#frontend-development)
7. [Database Queries](#database-queries)
8. [Email System](#email-system)
9. [TypeScript Guidelines](#typescript-guidelines)
10. [Testing](#testing)
11. [Deployment](#deployment)

## Architecture Overview

The Maritime Onboarding System is built with:
- **Frontend**: React 18 with TailwindCSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Email**: Unified email service with multiple providers
- **Authentication**: JWT-based with magic links
- **State Management**: React Query for server state

## Project Structure

```
maritime-onboarding-system/
├── api/                    # Vercel serverless functions
│   ├── admin/             # Admin endpoints
│   ├── auth/              # Authentication endpoints
│   ├── crew/              # Crew member endpoints
│   ├── manager/           # Manager endpoints
│   └── training/          # Training-related endpoints
├── client/                # React frontend
│   └── src/
│       ├── components/    # React components
│       │   ├── ui/       # Reusable UI components
│       │   ├── quiz/     # Quiz-specific components
│       │   └── forms/    # Form components
│       ├── hooks/        # Custom React hooks
│       ├── services/     # API service layer
│       └── utils/        # Utility functions
├── lib/                   # Shared backend libraries
│   ├── queries/          # Database query modules
│   ├── auth.js           # Authentication utilities
│   ├── supabase.js       # Supabase client
│   └── unifiedEmailService.js  # Email service
├── types/                 # TypeScript type definitions
└── docs/                  # Documentation

```

## Development Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Supabase account
- Vercel CLI (optional)

### Installation
```bash
# Clone repository
git clone [repository-url]
cd maritime-onboarding-system

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-jwt-secret

# Email
MAILERSEND_API_KEY=your-api-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
```

## Code Standards

### General Principles
1. **Keep functions small** - Single responsibility principle
2. **Use meaningful names** - Self-documenting code
3. **Consistent formatting** - Follow existing patterns
4. **Error handling** - Always handle errors gracefully
5. **No magic numbers** - Use constants

### File Naming
- React components: `PascalCase.jsx` (e.g., `UserProfile.jsx`)
- Utilities/libraries: `camelCase.js` (e.g., `userQueries.js`)
- API routes: `kebab-case.js` (e.g., `get-users.js`)
- TypeScript files: Same as above but `.ts`/`.tsx`

## API Development

### Standard Response Format
All API endpoints return standardized responses:

```javascript
// Success response
{
  success: true,
  data: { /* response data */ },
  meta: { /* optional metadata */ }
}

// Error response
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE"
}
```

### Creating an API Endpoint

```javascript
// api/example/endpoint.js
const { requireAuth } = require('../../lib/auth');
const { supabase } = require('../../lib/supabase');
const { success, error } = require('../../lib/apiResponse');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json(error('METHOD_NOT_ALLOWED', 'Method not allowed'));
  }

  try {
    // Your logic here
    const data = await fetchData();
    
    res.json(success(data));
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json(error('INTERNAL_ERROR', 'Operation failed'));
  }
}

// Apply middleware
export default requireAuth(handler);
```

### Authentication Middleware

```javascript
// No auth required
export default handler;

// Require any authenticated user
export default requireAuth(handler);

// Require specific role
export default requireManager(handler);
export default requireAdmin(handler);
export default requireCrew(handler);
```

## Frontend Development

### Component Structure

```jsx
// components/ExampleComponent.jsx
import React from 'react';
import { Card } from './ui/Card';
import { useUserData } from '../hooks/useUserData';

export function ExampleComponent({ userId }) {
  const { data, isLoading, error } = useUserData(userId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <Card>
      <h2>{data.name}</h2>
      {/* Component content */}
    </Card>
  );
}
```

### Using UI Components

```jsx
import { Button, Card, Modal, Input } from '../components/ui';

// Button variants
<Button variant="primary" onClick={handleClick}>Submit</Button>
<Button variant="secondary" size="sm">Cancel</Button>

// Card with sections
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>

// Modal
<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
  Modal content
</Modal>
```

### API Calls

```javascript
// services/api.js
import { apiClient } from './apiClient';

export const userService = {
  getProfile: () => apiClient.get('/api/crew/profile'),
  updateProfile: (data) => apiClient.patch('/api/crew/profile', data),
  getTraining: () => apiClient.get('/api/crew/training/progress')
};

// In component
import { useQuery } from 'react-query';
import { userService } from '../services/api';

function Profile() {
  const { data, isLoading } = useQuery('profile', userService.getProfile);
  // ...
}
```

## Database Queries

### Using Query Modules

```javascript
// Use centralized query functions
const { getUserById, updateUser } = require('../../lib/queries/userQueries');
const { getUserTrainingProgress } = require('../../lib/queries/trainingQueries');

// In API handler
const user = await getUserById(userId);
const progress = await getUserTrainingProgress(userId);
```

### Query Caching

```javascript
const { withCache } = require('../../lib/queryCache');

// Cache query results
const data = await withCache(
  () => expensiveQuery(),
  'cache-key',
  300 // TTL in seconds
);
```

### Batch Operations

```javascript
const { getBatchUserProgress } = require('../../lib/queries/trainingQueries');

// Fetch data for multiple users efficiently
const userIds = ['user1', 'user2', 'user3'];
const progressMap = await getBatchUserProgress(userIds);
```

## Email System

### Sending Emails

```javascript
const { unifiedEmailService } = require('../../lib/unifiedEmailService');
const { emailTemplateGenerator } = require('../../lib/emailTemplateGenerator');

// Generate template
const template = emailTemplateGenerator.generateWelcomeTemplate({
  recipientName: user.first_name,
  loginUrl: 'https://app.example.com/login'
});

// Send email
await unifiedEmailService.sendEmail({
  to: user.email,
  ...template
});
```

### Available Templates

- `generateWelcomeTemplate()` - New user welcome
- `generateTrainingReminderTemplate()` - Training reminders
- `generatePhaseCompletionTemplate()` - Phase completion
- `generateQuizResultTemplate()` - Quiz results
- `generateSystemAlertTemplate()` - System notifications
- [See full list in emailTemplateGenerator.js]

## TypeScript Guidelines

### Hybrid Module Pattern

```typescript
// For Vercel serverless compatibility
import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '../../types/database';

// Use require for runtime modules
const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');
```

### Type Definitions

```typescript
// types/database.ts
export interface User {
  id: string;
  email: string;
  role: UserRole;
  // ...
}

// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### API Handler Types

```typescript
import type { AuthenticatedRequest, ApiResponse } from '../../types/api';

interface ResponseData {
  users: User[];
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ResponseData>>
) {
  // Implementation
}
```

## Testing

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Writing Tests

```javascript
// tests/unit/example.test.js
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', async () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = await functionToTest(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] TypeScript compilation successful
- [ ] No console errors
- [ ] API endpoints tested
- [ ] Email sending verified

### Production Considerations

1. **Environment Variables** - Ensure all required vars are set
2. **Database Migrations** - Run any pending migrations
3. **Caching** - Clear caches if needed
4. **Monitoring** - Set up error tracking
5. **Backups** - Ensure database backups are configured

## Common Tasks

### Adding a New API Endpoint

1. Create file in appropriate directory (`api/[role]/[feature].js`)
2. Implement handler with standard response format
3. Add authentication middleware
4. Add TypeScript types if using `.ts`
5. Test endpoint
6. Document in API docs

### Adding a New Component

1. Create component file in `client/src/components`
2. Use UI components from `components/ui`
3. Implement with hooks for data fetching
4. Add prop types or TypeScript interfaces
5. Write unit tests
6. Update component documentation

### Database Schema Changes

1. Create migration file
2. Test migration locally
3. Update type definitions
4. Update query modules if needed
5. Run migration on staging
6. Deploy to production

## Troubleshooting

### Common Issues

**"Cannot find module" in Vercel**
- Use `require()` instead of `import` for runtime modules

**TypeScript errors**
- Check that all types are properly exported/imported
- Ensure `.d.ts` files exist for JS modules

**Email not sending**
- Check email service configuration
- Verify API keys are set
- Check email queue for errors

**Database connection issues**
- Verify Supabase URL and keys
- Check network connectivity
- Review RLS policies

## Resources

- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Check existing documentation in `/docs`
- Review code examples in the codebase
- Ask in the team chat
- Create an issue in the repository