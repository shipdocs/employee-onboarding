# Design Document

## Overview

The Multi-Factor Authentication (MFA) system will implement TOTP (Time-based One-Time Password) authentication for privileged users in the maritime onboarding application. The solution leverages industry-standard libraries (speakeasy, qrcode) and follows security best practices including encryption at rest, rate limiting, and comprehensive audit logging. The implementation will integrate seamlessly with the existing authentication flow while providing a user-friendly setup experience suitable for maritime workers with varying technical backgrounds.

## Architecture

### MFA System Architecture
```
Authentication Flow
├── Password Verification (Existing)
├── MFA Challenge (New)
│   ├── TOTP Verification
│   ├── Backup Code Verification
│   └── Rate Limiting & Lockout
└── Session Creation

MFA Management
├── Setup Flow
│   ├── Secret Generation
│   ├── QR Code Generation
│   ├── Backup Code Generation
│   └── Verification & Enablement
├── Data Storage (Encrypted)
│   ├── TOTP Secrets
│   ├── Backup Codes
│   └── Metadata
└── Security Features
    ├── Encryption (AES-256-GCM)
    ├── Rate Limiting
    └── Audit Logging
```

### Integration Points
- **Authentication Service**: Extend existing auth flow with MFA challenge
- **Database Schema**: New tables for MFA settings and failure tracking
- **User Interface**: MFA setup and verification components
- **Audit System**: Enhanced logging for MFA events
- **Feature Flags**: Controlled rollout and enforcement policies

## Components and Interfaces

### 1. MFA Service (`lib/mfaService.js`)
```javascript
interface MFAService {
  setupMFA(userId: string): Promise<MFASetupResult>;
  verifyTOTP(userId: string, token: string): Promise<VerificationResult>;
  enableMFA(userId: string, verificationToken: string): Promise<EnableResult>;
  getMFAStatus(userId: string): Promise<MFAStatus>;
  generateBackupCodes(): string[];
  checkMFARateLimit(userId: string): Promise<RateLimitResult>;
}

interface MFASetupResult {
  qrCode: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface VerificationResult {
  success: boolean;
  method?: 'totp' | 'backup_code';
  error?: string;
  retryAfter?: Date;
}
```

**Responsibilities:**
- Generate and manage TOTP secrets
- Encrypt/decrypt sensitive MFA data
- Verify TOTP codes and backup codes
- Implement rate limiting and security controls
- Generate QR codes for authenticator apps

### 2. MFA Setup Component (`client/src/components/MFASetup.js`)
```javascript
interface MFASetupProps {
  userId: string;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}
```

**Responsibilities:**
- Guide users through MFA setup process
- Display QR codes and manual entry instructions
- Handle verification during setup
- Show backup codes with download/print options
- Provide troubleshooting guidance

### 3. MFA Verification Component (`client/src/components/MFAVerification.js`)
```javascript
interface MFAVerificationProps {
  onVerificationSuccess: (method: string) => void;
  onVerificationFailure: (error: string) => void;
  allowBackupCodes?: boolean;
}
```

**Responsibilities:**
- Prompt for TOTP codes during login
- Handle backup code entry
- Display rate limiting messages
- Provide user-friendly error handling

### 4. Enhanced Authentication API
```javascript
// Enhanced login endpoint
POST /api/auth/login
{
  email: string;
  password: string;
  mfaToken?: string; // Optional for MFA challenge
}

// New MFA endpoints
POST /api/auth/mfa/setup
GET /api/auth/mfa/status
POST /api/auth/mfa/verify
POST /api/auth/mfa/enable
POST /api/auth/mfa/backup-codes/regenerate
```

## Data Models

### Database Schema

#### user_mfa_settings Table
```sql
CREATE TABLE user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- Encrypted JSON string
  backup_codes TEXT[], -- Encrypted backup codes
  enabled BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### mfa_failure_log Table
```sql
CREATE TABLE mfa_failure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  failure_type VARCHAR(50), -- 'totp_invalid', 'backup_code_invalid', 'rate_limited'
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Enhanced users Table
```sql
ALTER TABLE users ADD COLUMN mfa_required BOOLEAN DEFAULT false;
UPDATE users SET mfa_required = true WHERE role IN ('admin', 'manager');
```

### Encryption Schema
```javascript
// Encrypted secret storage format
{
  encrypted: string;    // AES-256-GCM encrypted data
  iv: string;          // Initialization vector
  authTag: string;     // Authentication tag
}
```

## Security Architecture

### Encryption Strategy
- **Algorithm**: AES-256-GCM for authenticated encryption
- **Key Management**: Environment variable with rotation support
- **Data Protection**: All TOTP secrets and backup codes encrypted at rest
- **Key Derivation**: PBKDF2 for additional key strengthening

### Rate Limiting
- **Failed Attempts**: Maximum 5 failures per 15-minute window
- **Lockout Duration**: 15 minutes after rate limit exceeded
- **Tracking**: Per-user failure counting with IP logging
- **Recovery**: Automatic reset after successful authentication

### Audit Logging
```javascript
// MFA audit events
const MFA_EVENTS = {
  SETUP_INITIATED: 'mfa_setup_initiated',
  SETUP_COMPLETED: 'mfa_setup_completed',
  VERIFICATION_SUCCESS: 'mfa_verification_success',
  VERIFICATION_FAILED: 'mfa_verification_failed',
  BACKUP_CODE_USED: 'mfa_backup_code_used',
  BACKUP_CODES_REGENERATED: 'mfa_backup_codes_regenerated',
  RATE_LIMITED: 'mfa_rate_limited'
};
```

## User Experience Design

### MFA Setup Flow
1. **Initiation**: User clicks "Enable MFA" in profile settings
2. **Instructions**: Clear explanation of MFA benefits and process
3. **QR Code Display**: Large, scannable QR code with manual entry option
4. **App Configuration**: Step-by-step authenticator app setup guide
5. **Verification**: User enters TOTP code to confirm setup
6. **Backup Codes**: Display codes with download/print options
7. **Confirmation**: Success message with next steps

### Login Flow Enhancement
1. **Password Entry**: Existing login process unchanged
2. **MFA Challenge**: Prompt for TOTP code (if MFA enabled)
3. **Code Entry**: 6-digit input with backup code option
4. **Verification**: Real-time validation with clear feedback
5. **Access Granted**: Seamless transition to application

### Mobile Considerations
- **Responsive Design**: Touch-friendly input fields
- **QR Code Sizing**: Optimal size for mobile scanning
- **Backup Code Access**: Easy copy/paste functionality
- **Error Handling**: Clear mobile-optimized error messages

## Error Handling

### Setup Errors
- **QR Code Generation Failure**: Fallback to manual entry
- **Database Errors**: Graceful retry with user notification
- **Encryption Errors**: Secure error logging without data exposure
- **Network Issues**: Offline-friendly error messages

### Verification Errors
- **Invalid Codes**: Clear feedback with retry options
- **Rate Limiting**: Informative lockout messages with timing
- **System Errors**: Fallback authentication options
- **Clock Skew**: Tolerance window for time synchronization

### Recovery Procedures
- **Lost Authenticator**: Backup code usage guidance
- **Exhausted Backup Codes**: Admin-assisted recovery process
- **Account Lockout**: Support contact information
- **System Failures**: Emergency access procedures

## Testing Strategy

### Unit Tests
- **MFA Service**: Secret generation, encryption, verification
- **Rate Limiting**: Failure counting and lockout logic
- **Backup Codes**: Generation, validation, and usage tracking
- **Encryption**: Key management and data protection

### Integration Tests
- **Authentication Flow**: End-to-end login with MFA
- **Setup Process**: Complete MFA enablement workflow
- **Database Operations**: CRUD operations with encryption
- **API Endpoints**: All MFA-related API functionality

### Security Tests
- **Penetration Testing**: MFA bypass attempts
- **Encryption Validation**: Key strength and implementation
- **Rate Limiting**: Brute force protection effectiveness
- **Audit Logging**: Complete event tracking verification

### User Acceptance Tests
- **Setup Usability**: Maritime workers can complete setup
- **Mobile Compatibility**: All devices and screen sizes
- **Error Recovery**: Users can resolve common issues
- **Performance**: Setup and verification under 30 seconds

## Performance Considerations

### Optimization Targets
- **Setup Time**: Complete MFA setup in under 2 minutes
- **Verification Time**: TOTP verification under 2 seconds
- **Database Impact**: Minimal query overhead for auth flow
- **Memory Usage**: Efficient encryption/decryption operations

### Scalability
- **Concurrent Users**: Support for 1000+ simultaneous MFA verifications
- **Database Growth**: Efficient indexing for MFA tables
- **Rate Limiting**: Distributed rate limiting for multiple servers
- **Audit Storage**: Log rotation and archival strategies

## Deployment Strategy

### Environment Configuration
```bash
# Required environment variables
MFA_ENCRYPTION_KEY=<256-bit-key>
MFA_ISSUER_NAME="Burando Maritime Services"
MFA_RATE_LIMIT_WINDOW=900 # 15 minutes in seconds
MFA_MAX_FAILURES=5
```

### Feature Flags
- **MFA_ENABLED**: Global MFA feature toggle
- **MFA_ENFORCEMENT**: Require MFA for privileged users
- **MFA_BACKUP_CODES**: Enable backup code functionality
- **MFA_RATE_LIMITING**: Enable rate limiting protection

### Migration Strategy
1. **Phase 1**: Deploy MFA infrastructure (optional setup)
2. **Phase 2**: Enable MFA for admin accounts
3. **Phase 3**: Extend to manager accounts
4. **Phase 4**: Full enforcement with grace period
5. **Phase 5**: Remove grace period, full enforcement

## Compliance and Standards

### Security Standards
- **NIST SP 800-63B**: Multi-factor authentication guidelines
- **RFC 6238**: TOTP algorithm specification
- **OWASP**: Authentication security best practices
- **Maritime Standards**: Industry-specific security requirements

### Data Protection
- **GDPR Compliance**: User consent and data minimization
- **Encryption Standards**: AES-256-GCM with proper key management
- **Audit Requirements**: Complete activity logging
- **Data Retention**: Configurable log retention policies