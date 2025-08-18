<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Admin User Guide

## Welcome to the Maritime Onboarding System

This guide provides comprehensive instructions for system administrators to manage the Maritime Onboarding System effectively and securely.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Company Management](#company-management)
4. [User Management](#user-management)
5. [Workflow Configuration](#workflow-configuration)
6. [Content Management](#content-management)
7. [System Monitoring](#system-monitoring)
8. [Security Features](#security-features)
9. [Reports and Analytics](#reports-and-analytics)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### First Login

1. Navigate to [https://your-domain.com/admin](https://your-domain.com/admin)
2. Enter your admin credentials
3. Complete two-factor authentication (if enabled)
4. You'll be directed to the Admin Dashboard

### Initial Setup Checklist

- [ ] Change default password
- [ ] Enable two-factor authentication
- [ ] Review system settings
- [ ] Configure email templates
- [ ] Set up workflow templates
- [ ] Create first company
- [ ] Add managers and crew

### Navigation Overview

```
┌─────────────────────────────────────────────────────┐
│  Maritime Onboarding  │  👤 Admin Name  │  Logout   │
├─────────────────────────────────────────────────────┤
│  📊 Dashboard  │  🏢 Companies  │  👥 Users  │      │
│  📋 Workflows  │  📚 Content   │  ⚙️ Settings │     │
└─────────────────────────────────────────────────────┘
```

## Dashboard Overview

### Key Metrics

The admin dashboard displays real-time system metrics:

- **Total Companies**: Active companies in the system
- **Active Crew Members**: Currently onboarding crew
- **Completion Rate**: Average onboarding completion
- **Pending Reviews**: Items awaiting admin approval

### Activity Feed

Recent system activities including:
- New user registrations
- Onboarding completions
- System alerts
- Failed login attempts

### Quick Actions

- **Add Company**: Create new company account
- **Invite User**: Send invitation email
- **View Reports**: Access analytics
- **System Health**: Check system status

## Company Management

### Creating a New Company

1. Click **Companies** → **Add New Company**
2. Fill in company details:
   - Company Name (required)
   - Contact Email (required)
   - Contact Phone
   - Address
   - Industry Type
3. Select workflow template
4. Click **Create Company**

### Managing Existing Companies

#### View Company Details
- Navigate to **Companies** → Select company
- View company information, statistics, and users
- Access company-specific settings

#### Edit Company Information
1. Click **Edit** button on company page
2. Update necessary fields
3. Save changes

#### Company Settings
- **Workflow Assignment**: Change default workflow
- **Branding**: Upload company logo
- **Permissions**: Set company-level permissions
- **Integrations**: Configure third-party integrations

### Deactivating a Company

1. Navigate to company details
2. Click **Settings** → **Deactivate Company**
3. Confirm deactivation
4. Choose data retention option:
   - Archive (keep data)
   - Delete (remove after 30 days)

**Note**: Deactivation is reversible within 30 days

## User Management

### User Roles Overview

| Role | Access Level | Typical Responsibilities |
|------|--------------|-------------------------|
| Admin | Full system access | System management, all operations |
| Manager | Company-level access | Manage crew, approve phases |
| Crew | Personal access only | Complete onboarding tasks |

### Adding Users

#### Bulk User Import
1. Go to **Users** → **Import Users**
2. Download CSV template
3. Fill in user details:
   ```csv
   email,name,role,company,position
   john@example.com,John Doe,crew,Maritime Corp,Deck Officer
   jane@example.com,Jane Smith,manager,Maritime Corp,HR Manager
   ```
4. Upload completed CSV
5. Review and confirm import

#### Individual User Creation
1. Click **Users** → **Add User**
2. Select user role
3. Enter user details
4. Choose authentication method:
   - Password (set temporary)
   - Magic link (email invitation)
5. Assign to company
6. Send invitation

### Managing User Permissions

#### Role-Based Permissions
```
Admin Permissions:
├── System Configuration
├── All Company Access
├── User Management
├── Workflow Design
└── Security Settings

Manager Permissions:
├── Company Crew Management
├── Phase Approvals
├── Progress Monitoring
└── Report Generation

Crew Permissions:
├── Personal Dashboard
├── Training Access
├── Document Upload
└── Progress Tracking
```

#### Custom Permissions
1. Navigate to **Users** → Select user → **Permissions**
2. Toggle specific permissions:
   - View sensitive data
   - Export reports
   - Modify workflows
   - Access analytics

### User Account Actions

- **Reset Password**: Force password reset on next login
- **Suspend Account**: Temporarily disable access
- **Unlock Account**: Clear failed login attempts
- **Delete Account**: Permanently remove (after confirmation)
- **Transfer Ownership**: Reassign user's data to another user

## Workflow Configuration

### Understanding Workflows

Workflows define the onboarding journey for crew members:

```
Workflow Structure:
├── Phase 1: Documentation
│   ├── Passport Upload
│   ├── Medical Certificate
│   └── Seaman's Book
├── Phase 2: Safety Training
│   ├── Fire Safety Video
│   ├── First Aid Course
│   └── Safety Quiz
└── Phase 3: Company Specific
    ├── Company Policies
    ├── Role Training
    └── Final Assessment
```

### Creating Custom Workflows

1. Go to **Workflows** → **Create New**
2. Enter workflow details:
   - Name: "Engineering Crew Onboarding"
   - Description: Clear description
   - Industry: Maritime/Shipping
   - Estimated Duration: 14 days

3. Add phases:
   ```
   Phase Configuration:
   - Name: "Technical Documentation"
   - Order: 1
   - Required: Yes
   - Auto-advance: No
   ```

4. Add items to each phase:
   - Document uploads
   - Training materials
   - Assessments
   - External links

5. Set completion criteria:
   - All items required
   - Minimum score needed
   - Manager approval required

### Workflow Templates

Pre-built templates available:
- **Standard Maritime**: General crew onboarding
- **Fast Track**: Experienced crew (7 days)
- **Officer Training**: Extended program (30 days)
- **Contractor**: Temporary crew (3 days)

### Assigning Workflows

#### Default Assignment
1. Go to **Companies** → Select company
2. Click **Settings** → **Default Workflow**
3. Select workflow from dropdown
4. Save changes

#### Individual Assignment
1. Navigate to crew member profile
2. Click **Change Workflow**
3. Select new workflow
4. Choose transition option:
   - Start fresh
   - Map completed items
   - Keep current progress

## Content Management

### Training Materials

#### Uploading Content
1. Go to **Content** → **Training Materials**
2. Click **Upload New**
3. Select content type:
   - Video (MP4, WebM)
   - Document (PDF, DOCX)
   - Presentation (PPT, PPTX)
   - SCORM Package
4. Add metadata:
   - Title
   - Description
   - Duration/Pages
   - Language
   - Tags

#### Content Organization
```
Content Library:
├── Safety Training/
│   ├── Fire Safety/
│   ├── First Aid/
│   └── Emergency Procedures/
├── Technical Skills/
│   ├── Navigation/
│   ├── Engineering/
│   └── Deck Operations/
└── Company Policies/
    ├── Code of Conduct
    ├── HR Policies
    └── Safety Protocols
```

### Document Templates

Create and manage document templates:

1. **Employment Contracts**
   - Variable fields: {{name}}, {{position}}, {{start_date}}
   - Auto-fill from crew data
   - Digital signature integration

2. **Certificates**
   - Completion certificates
   - Training acknowledgments
   - Custom branding

3. **Policy Documents**
   - Version control
   - Acknowledgment tracking
   - Multi-language support

### Multi-language Support

#### Adding Translations
1. Select content item
2. Click **Add Translation**
3. Choose target language
4. Upload translated version
5. Set as default for language

#### Language Configuration
- Supported languages: EN, NL, ES, FR, DE
- Auto-detection based on user preference
- Fallback to English if translation unavailable

## System Monitoring

### Health Dashboard

Access via **Settings** → **System Health**

```
System Status Overview:
┌─────────────────────────────────────┐
│ API Response Time:    120ms ✅      │
│ Database Status:      Healthy ✅     │
│ Email Service:        Active ✅      │
│ Storage Usage:        45% (4.5TB)   │
│ Active Users:         234           │
│ Error Rate:           0.02%         │
└─────────────────────────────────────┘
```

### Performance Metrics

- **Response Times**: API endpoint performance
- **Success Rates**: Operation completion rates
- **User Activity**: Concurrent users, peak times
- **Resource Usage**: CPU, memory, storage

### Alert Configuration

Set up monitoring alerts:

1. Go to **Settings** → **Alerts**
2. Configure thresholds:
   ```
   Error Rate Alert:
   - Threshold: > 1%
   - Window: 5 minutes
   - Action: Email + SMS
   ```
3. Add notification recipients
4. Test alert configuration

### Audit Logs

Access comprehensive audit trails:

```
Audit Log Entry:
- Timestamp: 2025-01-02 10:30:45
- User: admin@burando.online
- Action: UPDATE_COMPANY
- Resource: Company:12345
- Details: Changed workflow template
- IP Address: 192.168.1.100
- Result: Success
```

Filter options:
- Date range
- User
- Action type
- Resource
- Result (success/failure)

## Security Features

### Access Control

#### IP Whitelisting
1. Navigate to **Settings** → **Security** → **IP Whitelist**
2. Add allowed IP ranges:
   ```
   Office Network: 192.168.1.0/24
   VPN Range: 10.0.0.0/16
   ```
3. Enable enforcement
4. Set bypass for emergencies

#### Two-Factor Authentication

Enforce 2FA for all admin accounts:

1. Go to **Settings** → **Security** → **2FA**
2. Select enforcement level:
   - Required for admins
   - Required for managers
   - Optional for crew
3. Choose methods:
   - Authenticator app (recommended)
   - SMS (backup)
   - Email (emergency)

### Security Monitoring

#### Failed Login Monitoring
```
Recent Failed Attempts:
├── user@example.com - 3 attempts - IP: 192.168.1.50
├── admin@test.com - 5 attempts - IP: 10.0.0.100 [BLOCKED]
└── crew@ship.com - 2 attempts - IP: 172.16.0.50
```

Actions available:
- Block IP address
- Lock user account
- Force password reset
- Send security alert

#### Suspicious Activity Detection

Automatic detection of:
- Multiple failed logins
- Unusual access patterns
- Large data exports
- Permission escalation attempts
- Access from new locations

### Data Protection

#### Encryption Status
```
Data Encryption:
├── Database: AES-256 ✅
├── File Storage: AES-256 ✅
├── Backups: AES-256 ✅
├── In Transit: TLS 1.3 ✅
└── At Rest: Encrypted ✅
```

#### Data Retention Policies

Configure automatic data cleanup:

1. **Completed Onboardings**: Keep 2 years
2. **Audit Logs**: Keep 1 year
3. **Temporary Files**: Delete after 30 days
4. **User Sessions**: Expire after 24 hours

#### GDPR Compliance Tools

- **Data Export**: Export all user data
- **Data Deletion**: Right to be forgotten
- **Consent Management**: Track and manage consents
- **Data Portability**: Standard format exports

## Reports and Analytics

### Standard Reports

#### Onboarding Reports
- **Completion Rates**: By company, timeframe, role
- **Average Duration**: Time to complete phases
- **Bottlenecks**: Phases with delays
- **Success Metrics**: First-time pass rates

#### User Activity Reports
- **Login Statistics**: Frequency, patterns
- **Feature Usage**: Most/least used features
- **User Engagement**: Active vs inactive users
- **Device Analytics**: Desktop/mobile usage

### Custom Reports

Create custom reports:

1. Go to **Reports** → **Create Custom**
2. Select data sources:
   - User data
   - Onboarding progress
   - System metrics
   - Audit logs
3. Add filters and grouping
4. Choose visualization:
   - Tables
   - Charts
   - Graphs
   - Heatmaps
5. Schedule delivery

### Analytics Dashboard

```
Key Performance Indicators:
┌────────────────────────────────────┐
│ Weekly Onboarding Completions      │
│ ████████████████████ 85%          │
│                                    │
│ Average Time to Complete           │
│ 12.5 days (Target: 14 days) ✅    │
│                                    │
│ User Satisfaction Score            │
│ ⭐⭐⭐⭐⭐ 4.8/5.0                    │
└────────────────────────────────────┘
```

### Data Export

Export data for external analysis:

1. Select report type
2. Choose format:
   - CSV
   - Excel
   - PDF
   - JSON
3. Apply filters
4. Schedule or download immediately

## Troubleshooting

### Common Issues and Solutions

#### Users Can't Log In
1. Check account status (not suspended/locked)
2. Verify correct email/password
3. Clear browser cache
4. Check IP whitelist settings
5. Review recent security blocks

#### Emails Not Sending
1. Verify email service status
2. Check email configuration
3. Review email logs
4. Test with different recipient
5. Check spam folders

#### Slow Performance
1. Check system health dashboard
2. Review current user load
3. Analyze slow queries
4. Check for large file uploads
5. Review error logs

#### Content Not Loading
1. Verify file permissions
2. Check storage service status
3. Clear CDN cache
4. Test direct file access
5. Review content metadata

### Support Resources

#### Getting Help
- **Documentation**: docs.burando.online
- **Support Email**: support@burando.online
- **Emergency Phone**: +31 (0) 20 123 4567
- **Status Page**: status.burando.online

#### Diagnostic Tools

Built-in diagnostic commands:

```bash
# System health check
/admin/diagnostics/health

# Database connectivity
/admin/diagnostics/database

# Email service test
/admin/diagnostics/email

# Storage access test
/admin/diagnostics/storage
```

### Best Practices

1. **Regular Backups**: Verify automated backups
2. **Update Passwords**: Change every 90 days
3. **Review Permissions**: Monthly audit
4. **Monitor Logs**: Check for anomalies
5. **Test Workflows**: Before assignment
6. **Document Changes**: Keep changelog
7. **Train Staff**: Regular security training

---

**Last Updated**: January 2, 2025  
**Version**: 1.0  
**Support**: admin-support@burando.online