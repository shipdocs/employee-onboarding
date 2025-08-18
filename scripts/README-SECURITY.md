# Security Guidelines for Scripts

## Overview

All scripts in this directory have been updated to use environment variables for sensitive information like passwords. This ensures that passwords are never hardcoded in the source code.

## How to Use Scripts with Environment Variables

### 1. Setting Admin Password
```bash
ADMIN_PASSWORD="your-secure-password" node scripts/reset-admin-password.js
```

### 2. Generating Password Hash
```bash
PASSWORD_TO_HASH="your-password" node scripts/generate-password-hash.js
```

### 3. Running Migration with Admin Setup
```bash
ADMIN_PASSWORD="your-secure-password" node scripts/run-migration-simple.js
```

### 4. Setting Admin and Manager Passwords
```bash
ADMIN_PASSWORD="admin-pass" MANAGER_PASSWORD="manager-pass" node scripts/set-admin-password.js
```

### 5. Setting Up Manager Password
```bash
MANAGER_PASSWORD="your-manager-password" node scripts/setup-manager-password.js
```

### 6. Testing Admin API
```bash
ADMIN_PASSWORD="your-admin-password" node scripts/test-admin-api.js
```

### 7. Quick Admin Test (Shell Script)
```bash
ADMIN_PASSWORD="your-admin-password" ./scripts/quick-admin-test.sh
```

### 8. Testing Onboarding Goals
```bash
MANAGER_PASSWORD="your-manager-password" node scripts/tests/test-onboarding-goals.js
```

## Best Practices

1. **Never commit .env files** - Always add `.env` to your `.gitignore`
2. **Use strong passwords** - Generate secure passwords using a password manager
3. **Rotate passwords regularly** - Change passwords periodically, especially in production
4. **Use different passwords per environment** - Don't reuse passwords between dev/staging/production
5. **Store passwords securely** - Use a secrets management system for production passwords

## Creating a .env File (Optional)

If you prefer not to pass environment variables on the command line, you can create a `.env` file:

```bash
# .env (DO NOT COMMIT THIS FILE)
ADMIN_PASSWORD=your-secure-admin-password
MANAGER_PASSWORD=your-secure-manager-password
ADMIN_EMAIL=adminmartexx@shipdocs.app
MANAGER_EMAIL=manager@shipdocs.app
```

Then run scripts without inline environment variables:
```bash
node scripts/reset-admin-password.js
```

## Security Notes

- The SQL migration file `20250619000000_reset_admin_password.sql` still contains a password hash for backward compatibility, but includes warnings about not using it in production
- Always generate new password hashes for production deployments
- Monitor access logs and audit trails for unauthorized access attempts