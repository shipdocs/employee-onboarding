# Maritime Onboarding System - Architectuur

## 🏗️ High-Level Architectuur

Het Maritime Onboarding System volgt een moderne, cloud-native architectuur ontworpen voor schaalbaarheid, betrouwbaarheid en onderhoudbaarheid.

### Architectuur Principes

1. **Unified Architecture**: Dezelfde code draait in alle omgevingen
2. **Serverless Computing**: Auto-scaling Vercel functions
3. **Security-First**: Database-level access control met RLS
4. **API-First Design**: RESTful API voor alle functionaliteit

## 🎯 Technologie Stack

### Frontend Layer
- **React 18**: Modern hooks en context-based state management
- **Vercel Edge Network**: Globale CDN voor performance
- **Responsive Design**: Mobile-first approach

### Application Layer
- **Vercel Serverless Functions**: Auto-scaling API endpoints
- **JWT Authentication**: Stateless, secure token-based auth
- **Role-Based Middleware**: Granular permission system

### Data Layer
- **Supabase PostgreSQL**: Managed database met automatic backups
- **Row Level Security (RLS)**: Database-level access control
- **Supabase Storage**: File uploads en PDF backgrounds

### External Services
- **MailerSend**: Email delivery service
- **PDF-lib**: Dynamic PDF generation

## 📁 Project Structuur

```
maritime-onboarding-system/
├── api/                    # Vercel API routes
│   ├── auth/              # Authentication endpoints
│   ├── admin/             # Admin-only endpoints
│   ├── manager/           # Manager-only endpoints
│   ├── crew/              # Crew-only endpoints
│   ├── training/          # Training system endpoints
│   ├── upload/            # File upload endpoints
│   ├── pdf/               # PDF generation endpoints
│   └── health.js          # Health check endpoint
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page-level components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   └── build/             # Production build
├── lib/                   # Shared libraries
├── services/              # Business logic services
├── config/                # Configuration files
├── migration/             # Database migrations
├── scripts/               # Utility scripts
├── tests/                 # Test suites
└── docs/                  # Documentation
```

## 🔐 Security Architectuur

### Authentication Flow
1. **Magic Link Generation**: Secure token creation
2. **Email Delivery**: MailerSend integration
3. **Token Validation**: JWT verification
4. **Role Assignment**: Automatic role-based routing

### Authorization Layers
1. **API Middleware**: Route-level permission checks
2. **Database RLS**: Row-level security policies
3. **Frontend Guards**: Component-level access control

## 📊 Database Schema

### Core Tables
- **users**: User accounts met role-based access
- **training_sessions**: Training progress tracking
- **quiz_results**: Quiz scores en antwoorden
- **pdf_templates**: Dynamic certificate templates
- **magic_links**: Authentication tokens
- **audit_log**: System activity tracking

### Relationships
- Users hebben meerdere training sessions
- Training sessions bevatten training items
- Quiz results zijn gekoppeld aan users
- PDF templates genereren certificates

## 🚀 Deployment Architectuur

### Environment Pipeline
```
Local Development → Testing → Preview → Production
```

### Environment Details
- **Local**: `vercel dev` op localhost:3000
- **Testing**: Dedicated testing environment
- **Preview**: Git branch previews
- **Production**: Live system op onboarding.burando.online

### CI/CD Pipeline
1. **Code Push**: Git commit triggers deployment
2. **Build Process**: Vercel builds en deploys
3. **Database Migration**: Automatic schema updates
4. **Health Checks**: Post-deployment verification

## 🔄 Data Flow

### Training Workflow
1. **User Registration**: Magic link authentication
2. **Training Assignment**: Role-based training paths
3. **Progress Tracking**: Real-time progress updates
4. **Quiz Completion**: Automated scoring
5. **Certificate Generation**: Dynamic PDF creation
6. **Email Delivery**: Automated certificate distribution

### API Request Flow
1. **Client Request**: Frontend API call
2. **Authentication**: JWT token validation
3. **Authorization**: Role-based permission check
4. **Business Logic**: Service layer processing
5. **Database Query**: Supabase interaction
6. **Response**: JSON data return

## 🎯 Performance Optimalisatie

### Frontend Optimalisatie
- **Code Splitting**: Lazy loading van components
- **Caching**: Browser en CDN caching
- **Compression**: Gzip/Brotli compression

### Backend Optimalisatie
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Serverless Scaling**: Auto-scaling based on demand

### Monitoring
- **Health Checks**: Automated system monitoring
- **Performance Metrics**: Response time tracking
- **Error Logging**: Comprehensive error tracking

## 🔧 Development Patterns

### API Design Patterns
- **RESTful Endpoints**: Consistent API structure
- **Error Handling**: Standardized error responses
- **Validation**: Input validation en sanitization

### Frontend Patterns
- **Component Composition**: Reusable component architecture
- **Context Management**: Centralized state management
- **Hook Patterns**: Custom hooks voor business logic

### Database Patterns
- **Migration System**: Version-controlled schema changes
- **Seed Data**: Consistent test data setup
- **Backup Strategy**: Automated backup procedures