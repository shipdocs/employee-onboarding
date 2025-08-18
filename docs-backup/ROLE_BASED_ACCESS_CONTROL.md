# Role-Based Access Control (RBAC) System

The Maritime Onboarding System implements a comprehensive three-tier role-based access control system to ensure proper security and workflow management.

> **📍 Location**: This document has been moved to the new documentation structure. Please refer to [Role-Based Access Control](features/role-based-access.md) for the most up-to-date information.

## Quick Reference

### Role Hierarchy
1. **Administrator (Admin)** - Full system control and configuration
2. **Manager** - Crew management and training oversight
3. **Crew Member** - Training completion and profile management

### Key Features
- **Three-tier role system** with hierarchical permissions
- **Secure authentication** with JWT tokens
- **Database-level security** with Row Level Security (RLS)
- **API endpoint protection** with role-based middleware
- **Audit logging** for all administrative actions

## Migration Notice

This documentation has been reorganized for better navigation and maintenance. The complete, updated documentation is now available at:

**[📖 Role-Based Access Control Documentation](features/role-based-access.md)**

### What's New in the Updated Documentation
- **Enhanced security details** with implementation examples
- **Updated API endpoints** with current authentication patterns
- **Improved troubleshooting** with common scenarios
- **Better organization** with clear sections and examples
- **Current environment information** with latest URLs and configurations

### Related Documentation
- **[Authentication System](features/authentication.md)** - Magic links and authentication flow
- **[Security Architecture](architecture/security.md)** - Overall security implementation
- **[API Reference](api/reference.md)** - Complete API documentation with auth examples

---

## Legacy Content (Deprecated)

The content below is maintained for reference but may be outdated. Please use the new documentation structure above.

### 1. Administrator (Admin)
**Highest level access with full system control**

#### Capabilities:
- **System Administration**: Full access to all system settings and configuration
- **PDF Template Management**: Exclusive access to create, edit, and delete PDF templates
- **Manager Account Management**: Create, activate/deactivate, and manage manager accounts
- **Audit Log Access**: View all system activities and user actions
- **System Statistics**: Access to comprehensive system analytics and reports
- **Database Management**: Full access to all data and system maintenance

#### Access Areas:
- Admin Dashboard (`/admin`)
- PDF Template Editor (`/templates/new`, `/templates/edit/:id`)
- Manager Management Interface
- System Settings and Configuration
- Audit Logs and Security Monitoring

#### Login Method:
- Email and password authentication
- Enhanced security with longer password requirements (8+ characters)
- Session logging and audit trail

### 2. Manager
**Mid-level access focused on crew management and training oversight**

#### Capabilities:
- **Crew Management**: Create, edit, and manage crew member accounts
- **Training Review**: Review and approve quiz results and training completion
- **Certificate Management**: View, regenerate, and manage crew certificates
- **Compliance Dashboard**: Monitor training progress and compliance metrics
- **Magic Link Distribution**: Send secure login links to crew members
- **Onboarding Approval**: Final approval for crew member completion

#### Access Areas:
- Manager Dashboard (`/manager`)
- Crew Management Interface
- Quiz Review System
- Certificate Management
- Compliance Reporting

#### Restrictions:
- **No PDF Template Access**: Cannot create or modify templates (admin-only)
- **No Manager Account Management**: Cannot create other manager accounts
- **No System Settings**: Cannot modify system configuration

#### Login Method:
- Email and password authentication
- Account must be activated by an administrator

### 3. Crew Member
**Basic access for training completion and profile management**

#### Capabilities:
- **Training Completion**: Access to all training phases and materials
- **Quiz Taking**: Complete quizzes and assessments
- **Profile Management**: Update personal information and preferences
- **Certificate Viewing**: View and download personal certificates
- **Progress Tracking**: Monitor own training progress

#### Access Areas:
- Crew Dashboard (`/crew`)
- Training Modules (`/crew/training/:phase`)
- Quiz Interface (`/crew/quiz/:phase`)
- Personal Profile (`/crew/profile`)

#### Restrictions:
- **No Management Access**: Cannot manage other users
- **No Administrative Functions**: Cannot access system settings
- **No Template Access**: Cannot create or modify templates

#### Login Method:
- Magic link authentication (secure, passwordless)
- Links generated and sent by managers

## Security Implementation

### Authentication Flow
1. **Admin/Manager**: Email + password → JWT token with role claims
2. **Crew**: Magic link → JWT token with role claims
3. **Session Management**: Automatic token expiration and refresh warnings

### Authorization Middleware
- Route-level protection based on user roles
- API endpoint security with role verification
- Hierarchical access control (admin > manager > crew)

### Database Security
- Row Level Security (RLS) policies on all tables
- Role-based data access restrictions
- Audit logging for all administrative actions

## API Endpoints by Role

### Admin-Only Endpoints
```
POST   /api/auth/admin-login
GET    /api/admin/stats
GET    /api/admin/managers
POST   /api/admin/managers
PATCH  /api/admin/managers/:id
DELETE /api/admin/managers/:id
GET    /api/admin/audit-log
GET    /api/admin/settings
PUT    /api/admin/settings
GET    /api/templates
POST   /api/templates
PUT    /api/templates/:id
DELETE /api/templates/:id
```

### Manager-Only Endpoints
```
POST   /api/auth/manager-login
GET    /api/manager/crew
POST   /api/manager/crew
PUT    /api/manager/crew/:id
DELETE /api/manager/crew/:id
GET    /api/manager/quiz-reviews
PATCH  /api/manager/quiz-reviews/:id
GET    /api/manager/certificates
POST   /api/manager/certificates/regenerate
GET    /api/manager/dashboard/stats
```

### Crew-Only Endpoints
```
POST   /api/auth/magic-login
GET    /api/crew/profile
PUT    /api/crew/profile
GET    /api/crew/training/progress
POST   /api/crew/training/phase/:phase/start
GET    /api/crew/certificates
```

## Setup and Migration

### 1. Run Role Migration
```bash
npm run migrate:roles
```

### 2. Set Up Admin User
```bash
npm run setup:admin
```

### 3. Verify Installation
- Test admin login at `/login` (select "Administrator Login")
- Access admin dashboard at `/admin`
- Create manager accounts through admin interface

## Database Schema Changes

### New Tables
- `admin_settings`: System configuration storage
- `manager_permissions`: Granular manager permissions
- `audit_log`: System activity logging

### Updated Tables
- `users`: Added `role`, `is_active`, `password_hash` columns
- `pdf_templates`: Enhanced with admin-only access controls

### New Constraints
- Role validation: `CHECK (role IN ('admin', 'manager', 'crew'))`
- Active status tracking for manager accounts
- Password hash storage for admin/manager authentication

## Frontend Implementation

### Route Protection
- Role-based route rendering in `App.js`
- Conditional navigation based on user role
- Automatic redirects to appropriate dashboards

### Component Access Control
- `useAuth` hook provides role checking functions
- `isAdmin`, `isManager`, `isCrew` boolean flags
- `hasRoleAccess(requiredRole)` hierarchical checking

### UI Adaptations
- Admin: Red accent colors, shield icons, system focus
- Manager: Blue accent colors, management tools, compliance focus
- Crew: Green accent colors, training focus, progress tracking

## Security Best Practices

### Password Security
- Bcrypt hashing with 12 salt rounds
- Minimum 8-character passwords for admin/manager
- Secure password input handling

### Session Management
- JWT tokens with role claims
- Automatic expiration warnings
- Secure token storage and transmission

### Audit Trail
- All administrative actions logged
- IP address and user agent tracking
- Comprehensive activity monitoring

## Troubleshooting

### Common Issues
1. **Migration Errors**: Ensure Supabase connection is working
2. **Admin Login Issues**: Verify password hash is set correctly
3. **Permission Errors**: Check role assignments in database
4. **Template Access**: Ensure user has admin role for template management

### Verification Commands
```bash
# Check admin user exists
npm run setup:admin

# Verify role migration
npm run migrate:roles

# Test permissions
npm run test:permissions
```

## Future Enhancements

### Planned Features
- Granular permission system for managers
- Role-based email notifications
- Advanced audit log filtering
- Multi-organization support
- API key management for integrations

### Security Roadmap
- Two-factor authentication for admin accounts
- Advanced session management
- IP-based access restrictions
- Enhanced audit log analytics
