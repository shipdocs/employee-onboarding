# MFA Production Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Set Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add:

```bash
# Enable MFA functionality
MFA_ENABLED=true

# Require MFA for admin/manager roles
MFA_ENFORCEMENT=true

# Enable backup codes for recovery
MFA_BACKUP_CODES=true

# Secure encryption key (CRITICAL - generate a new one!)
MFA_ENCRYPTION_KEY=your-secure-32-character-encryption-key-here
```

**⚠️ IMPORTANT**: Generate a secure 32+ character encryption key:
```bash
# Generate secure key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Verify Database Migration

The MFA database migration should already be applied. If not, run:
```bash
npm run db:push
```

### 3. Deploy to Production

```bash
# Deploy with MFA enabled
npm run deploy

# Or using Vercel CLI
vercel --prod
```

### 4. Verify Deployment

```bash
# Run the MFA deployment verification script
node scripts/deploy-mfa-production.js
```

## 🔐 What Gets Deployed

### Backend Features
- ✅ **MFA Service** - Complete TOTP implementation with encryption
- ✅ **API Endpoints** - Setup, verification, status, backup codes
- ✅ **Database Schema** - Encrypted MFA settings and failure tracking
- ✅ **Security Controls** - Rate limiting, audit logging, encryption
- ✅ **Role Enforcement** - Automatic MFA requirement for admin/manager

### Frontend Features
- ✅ **MFA Setup Wizard** - QR code generation and step-by-step setup
- ✅ **Login Integration** - MFA challenge during authentication
- ✅ **Profile Management** - MFA settings in user profile
- ✅ **Backup Codes** - Emergency recovery codes with download
- ✅ **Mobile Responsive** - Works on all devices

### Security Features
- ✅ **AES-256-GCM Encryption** - All secrets encrypted at rest
- ✅ **Rate Limiting** - 5 failures per 15 minutes
- ✅ **Audit Logging** - Complete MFA activity tracking
- ✅ **TOTP Standard** - RFC 6238 compliant
- ✅ **Backup Recovery** - 10 single-use backup codes

## 📱 User Experience

### For Admins/Managers (Required MFA)
1. **First Login** - Redirected to MFA setup if not configured
2. **Setup Process** - Scan QR code with authenticator app
3. **Verification** - Enter 6-digit code to enable MFA
4. **Backup Codes** - Download 10 recovery codes
5. **Future Logins** - Password + MFA code required

### For Regular Users (Optional MFA)
1. **Profile Settings** - MFA setup available in profile
2. **Voluntary Setup** - Can enable for additional security
3. **Same Process** - Identical setup and login flow

## 🛠️ Testing MFA

### 1. Create Test Admin User
```bash
# Create admin user for testing
node scripts/setup-admin-user.js
```

### 2. Test MFA Setup
1. Login as admin user
2. Go to Profile page
3. Find "Multi-Factor Authentication" section
4. Click "Set Up MFA"
5. Scan QR code with authenticator app
6. Enter verification code
7. Download backup codes

### 3. Test MFA Login
1. Logout
2. Login with email/password
3. Enter MFA code when prompted
4. Should successfully authenticate

### 4. Test Backup Codes
1. Logout
2. Login with email/password
3. Click "Use backup code instead"
4. Enter one of your backup codes
5. Should successfully authenticate

## 🔧 Configuration Options

### Environment Variables
```bash
# Core MFA Settings
MFA_ENABLED=true                    # Enable/disable MFA globally
MFA_ENFORCEMENT=true                # Require for admin/manager
MFA_BACKUP_CODES=true               # Enable backup codes
MFA_ENCRYPTION_KEY=<32-char-key>    # Encryption key for secrets

# Optional Settings
MFA_ISSUER="Burando Maritime Services"  # TOTP issuer name
MFA_SERVICE_NAME="Maritime Onboarding"  # Service name in apps
MFA_RATE_LIMIT_WINDOW=900           # Rate limit window (seconds)
MFA_MAX_FAILURES=5                  # Max failures before lockout
```

### Feature Flag Overrides
```bash
# Client-side overrides (if needed)
REACT_APP_MFA_ENABLED=true
REACT_APP_MFA_ENFORCEMENT=true
REACT_APP_MFA_BACKUP_CODES=true
```

## 🚨 Security Considerations

### Production Requirements
- ✅ Use strong encryption key (32+ characters)
- ✅ Enable HTTPS (handled by Vercel)
- ✅ Set secure environment variables
- ✅ Enable audit logging
- ✅ Monitor failed attempts

### Backup & Recovery
- ✅ Backup codes for user recovery
- ✅ Admin tools for user assistance
- ✅ Database backup includes encrypted MFA data
- ✅ Key rotation procedures documented

## 📊 Monitoring & Alerts

### Key Metrics to Monitor
- MFA setup completion rate
- Failed MFA verification attempts
- Backup code usage frequency
- Account lockouts due to MFA failures

### Audit Events
- `mfa_setup_initiated` - User started MFA setup
- `mfa_enabled` - MFA enabled for account
- `mfa_verification_success` - Successful MFA login
- `mfa_verification_failed` - Failed MFA attempt
- `mfa_backup_code_used` - Backup code used
- `mfa_rate_limited` - Account temporarily locked

## 🆘 Troubleshooting

### Common Issues

**MFA not showing in profile**
- Check `MFA_ENABLED=true` in environment variables
- Verify user has admin/manager role
- Check browser console for errors

**QR code not generating**
- Verify `MFA_ENCRYPTION_KEY` is set and 32+ characters
- Check server logs for encryption errors
- Ensure all MFA dependencies are installed

**Verification codes not working**
- Check device time synchronization
- Verify TOTP window settings
- Try backup codes as alternative

**Database errors**
- Ensure MFA migration has been applied
- Check database connection and permissions
- Verify RLS policies are active

### Support Commands
```bash
# Check MFA configuration
node scripts/deploy-mfa-production.js

# Test MFA service
node -e "console.log(require('./lib/mfaService').isMFAEnabled())"

# Check database schema
npm run db:pull
```

## 📞 Support

For MFA-related issues:
1. Check this deployment guide
2. Review server logs for errors
3. Test with backup codes
4. Contact system administrator for account recovery

---

**🔐 MFA is now ready for production! Your maritime onboarding system is more secure than ever.**