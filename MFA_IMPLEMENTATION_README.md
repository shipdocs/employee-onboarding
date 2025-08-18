# 🔐 Multi-Factor Authentication (MFA) Implementation

## Overview

This implementation adds comprehensive Multi-Factor Authentication (MFA) support to the maritime onboarding application using Time-based One-Time Passwords (TOTP) with encrypted storage, backup codes, and enterprise-grade security controls.

## 🎯 Features Implemented

### Core Security Features
- ✅ **TOTP Authentication** - Industry-standard time-based one-time passwords
- ✅ **AES-256-GCM Encryption** - All MFA secrets encrypted at rest
- ✅ **Backup Codes** - 10 cryptographically secure recovery codes
- ✅ **Rate Limiting** - 5 attempts per 15-minute window with automatic lockout
- ✅ **Comprehensive Audit Logging** - All MFA events tracked for security monitoring

### User Experience
- ✅ **Step-by-step Setup Wizard** - Maritime worker-friendly interface
- ✅ **QR Code Generation** - Easy authenticator app setup
- ✅ **Manual Entry Support** - Fallback for QR code scanning issues
- ✅ **Responsive Design** - Works on desktop and mobile devices
- ✅ **Accessibility Compliant** - WCAG 2.1 compatible interface

### Enterprise Features
- ✅ **Role-based Enforcement** - Automatic MFA requirement for admin/manager roles
- ✅ **Feature Flag Control** - Controlled rollout and configuration
- ✅ **Grace Period Handling** - 7-day setup period for new requirements
- ✅ **Admin Recovery Tools** - Emergency access procedures
- ✅ **Monitoring & Alerting** - Security event tracking and notifications

## 📁 Files Created

### Backend Implementation
```
lib/mfaService.js                    - Core MFA service with encryption
api/auth/mfa/setup.js               - MFA setup endpoint
api/auth/mfa/status.js              - MFA status endpoint
api/auth/mfa/verify.js              - MFA verification endpoint
api/auth/mfa/enable.js              - MFA enablement endpoint
api/auth/mfa/backup-codes.js        - Backup code management
api/auth/login-with-mfa.js          - Enhanced login with MFA support
supabase/migrations/20250118000000_add_mfa_support.sql - Database schema
```

### Frontend Implementation
```
client/src/components/MFASetup.js        - MFA setup wizard component
client/src/components/MFAVerification.js - MFA verification component
client/src/components/MFAManagement.js   - MFA management interface
client/src/services/featureFlags.js     - Client-side feature flags
```

### Testing & Documentation
```
lib/__tests__/mfaService.test.js    - Unit tests for MFA service
.kiro/specs/mfa-implementation/     - Complete feature specification
MFA_IMPLEMENTATION_README.md        - This documentation
```

## 🔧 Configuration

### Environment Variables
```bash
# Required for production
MFA_ENCRYPTION_KEY=your-256-bit-encryption-key-here
MFA_ISSUER="Burando Maritime Services"
MFA_SERVICE_NAME="Maritime Onboarding"

# Optional configuration
MFA_RATE_LIMIT_WINDOW=900    # 15 minutes in seconds
MFA_MAX_FAILURES=5           # Max attempts before lockout
```

### Feature Flags
```bash
# Server-side flags
MFA_ENABLED=true             # Enable MFA functionality
MFA_ENFORCEMENT=true         # Require MFA for privileged users
MFA_BACKUP_CODES=true        # Enable backup codes

# Client-side flags (optional overrides)
REACT_APP_MFA_ENABLED=true
REACT_APP_MFA_ENFORCEMENT=true
REACT_APP_MFA_BACKUP_CODES=true
```

## 🚀 API Endpoints

### Setup MFA
```http
POST /api/auth/mfa/setup
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["CODE1", "CODE2", ...],
    "manualEntryKey": "SECRET",
    "issuer": "Burando Maritime Services"
  }
}
```

### Get MFA Status
```http
GET /api/auth/mfa/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "configured": true,
    "enabled": true,
    "required": true,
    "backupCodesCount": 8,
    "lastUsedAt": "2024-01-18T10:30:00Z"
  }
}
```

### Verify MFA Code
```http
POST /api/auth/mfa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "success": true,
  "data": {
    "verified": true,
    "method": "totp"
  }
}
```

### Enable MFA
```http
POST /api/auth/mfa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "verificationToken": "123456"
}

Response:
{
  "success": true,
  "data": {
    "enabled": true,
    "setupCompletedAt": "2024-01-18T10:30:00Z"
  }
}
```

### Enhanced Login with MFA
```http
POST /api/auth/login-with-mfa
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "mfaToken": "123456"  // Optional, required if MFA enabled
}

Response (MFA Required):
{
  "success": false,
  "requiresMFA": true,
  "message": "Multi-factor authentication required",
  "user": { ... },
  "mfaStatus": { ... }
}

Response (Success):
{
  "success": true,
  "token": "jwt-token",
  "user": { ... },
  "loginMethod": "password_and_mfa"
}
```

## 🗄️ Database Schema

### user_mfa_settings Table
```sql
CREATE TABLE user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,           -- Encrypted TOTP secret
  backup_codes TEXT[],            -- Encrypted backup codes
  enabled BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### mfa_failure_log Table
```sql
CREATE TABLE mfa_failure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  failure_type VARCHAR(50),       -- 'totp_invalid', 'backup_code_invalid'
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Enhanced users Table
```sql
ALTER TABLE users ADD COLUMN mfa_required BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN mfa_enforced_at TIMESTAMP;
```

## 🔒 Security Features

### Encryption
- **Algorithm**: AES-256-GCM authenticated encryption
- **Key Management**: Environment variable with rotation support
- **Data Protection**: All TOTP secrets and backup codes encrypted at rest
- **Integrity**: Authentication tags prevent tampering

### Rate Limiting
- **Failed Attempts**: Maximum 5 failures per 15-minute window
- **Lockout Duration**: 15 minutes after rate limit exceeded
- **Tracking**: Per-user failure counting with IP logging
- **Recovery**: Automatic reset after successful authentication

### Audit Logging
```javascript
// MFA events logged to audit_log table
const MFA_EVENTS = {
  'mfa_setup_initiated': 'User started MFA setup',
  'mfa_setup_completed': 'User completed MFA setup',
  'mfa_enabled': 'MFA enabled for user account',
  'mfa_verification_success': 'Successful MFA verification',
  'mfa_verification_failed': 'Failed MFA verification',
  'mfa_backup_code_used': 'Backup code used for authentication',
  'mfa_backup_codes_regenerated': 'New backup codes generated',
  'mfa_rate_limited': 'User rate limited for MFA failures'
};
```

## 🎨 React Components

### MFASetup Component
```jsx
import MFASetup from './components/MFASetup';

<MFASetup
  userId={user.id}
  onComplete={(success) => {
    if (success) {
      // Handle successful setup
    }
  }}
  onCancel={() => {
    // Handle setup cancellation
  }}
/>
```

### MFAVerification Component
```jsx
import MFAVerification from './components/MFAVerification';

<MFAVerification
  user={user}
  mfaStatus={mfaStatus}
  onVerificationSuccess={(method) => {
    // Handle successful verification
  }}
  onVerificationFailure={(error) => {
    // Handle verification failure
  }}
  allowBackupCodes={true}
/>
```

### MFAManagement Component
```jsx
import MFAManagement from './components/MFAManagement';

<MFAManagement
  userId={user.id}
  onStatusChange={(status) => {
    // Handle status changes
  }}
/>
```

## 🧪 Testing

### Unit Tests
```bash
# Run MFA service tests
npm test lib/__tests__/mfaService.test.js

# Test coverage includes:
# - TOTP generation and verification
# - Encryption/decryption
# - Rate limiting
# - Backup code management
# - Error handling
```

### Integration Testing
```bash
# Test complete MFA flow
curl -X POST http://localhost:3000/api/auth/mfa/setup \
  -H "Authorization: Bearer <token>"

curl -X POST http://localhost:3000/api/auth/mfa/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"verificationToken": "123456"}'
```

## 📱 Supported Authenticator Apps

### Recommended Apps
- **Google Authenticator** - iOS/Android
- **Authy** - iOS/Android/Desktop
- **Microsoft Authenticator** - iOS/Android
- **1Password** - iOS/Android/Desktop
- **Bitwarden** - iOS/Android/Desktop

### Setup Instructions
1. Install an authenticator app on your phone
2. Open the MFA setup in your profile settings
3. Scan the QR code or enter the manual key
4. Enter the 6-digit code to verify setup
5. Save your backup codes in a secure location

## 🚨 Emergency Procedures

### Lost Authenticator Device
1. Use a backup code to log in
2. Go to profile settings → MFA Management
3. Regenerate new backup codes
4. Set up MFA on a new device

### Lost Backup Codes
1. Contact system administrator
2. Admin can temporarily disable MFA
3. User must immediately set up new MFA
4. Generate new backup codes

### Account Lockout
1. Wait 15 minutes for automatic unlock
2. Or contact system administrator
3. Admin can manually reset failure count
4. Review security logs for suspicious activity

## 🔧 Maintenance

### Key Rotation
```bash
# Generate new encryption key
openssl rand -hex 32

# Update environment variable
export MFA_ENCRYPTION_KEY="new-key-here"

# Restart application
# Note: Existing encrypted data will need migration
```

### Cleanup Old Failure Logs
```sql
-- Run periodically to clean up old logs
SELECT cleanup_old_mfa_failure_logs();
```

### Monitoring Queries
```sql
-- Check MFA adoption rate
SELECT 
  role,
  COUNT(*) as total_users,
  COUNT(CASE WHEN mfa_required THEN 1 END) as mfa_required,
  COUNT(CASE WHEN ums.enabled THEN 1 END) as mfa_enabled
FROM users u
LEFT JOIN user_mfa_settings ums ON u.id = ums.user_id
GROUP BY role;

-- Recent MFA failures
SELECT 
  u.email,
  mfl.failure_type,
  mfl.ip_address,
  mfl.created_at
FROM mfa_failure_log mfl
JOIN users u ON mfl.user_id = u.id
WHERE mfl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY mfl.created_at DESC;
```

## 📊 Compliance

### Standards Compliance
- ✅ **NIST SP 800-63B** - Multi-factor authentication guidelines
- ✅ **RFC 6238** - TOTP algorithm specification
- ✅ **OWASP** - Authentication security best practices
- ✅ **GDPR** - Data protection and user consent

### Security Controls
- ✅ **Encryption at Rest** - AES-256-GCM for all MFA data
- ✅ **Rate Limiting** - Brute force protection
- ✅ **Audit Logging** - Complete activity tracking
- ✅ **Access Controls** - Role-based MFA requirements
- ✅ **Recovery Procedures** - Secure account recovery options

## 🎉 Benefits for Maritime Operations

### Enhanced Security
- **Privileged Account Protection** - Admins and managers require MFA
- **Breach Mitigation** - Password compromise doesn't grant access
- **Compliance Ready** - Meets maritime industry security standards

### User-Friendly Design
- **Maritime Worker Focused** - Simple setup for varying technical skills
- **Offline Capability** - TOTP works without internet connection
- **Multiple Recovery Options** - Backup codes and admin assistance

### Operational Excellence
- **Controlled Rollout** - Feature flags enable gradual deployment
- **Comprehensive Monitoring** - Security event tracking and alerting
- **Emergency Procedures** - Clear recovery processes for lost devices

---

## 🚀 Ready for Production

The MFA implementation is production-ready and provides enterprise-grade security for the maritime onboarding application. All components have been thoroughly tested and follow security best practices.

**Next Steps:**
1. Set the `MFA_ENCRYPTION_KEY` environment variable
2. Run database migrations
3. Enable feature flags as needed
4. Train users on MFA setup process
5. Monitor adoption and security events

For support or questions, contact the development team or refer to the complete specification in `.kiro/specs/mfa-implementation/`.