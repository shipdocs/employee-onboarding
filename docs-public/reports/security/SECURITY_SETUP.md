# 🔒 Security Setup Guide

## Environment Configuration

### Test Environment Setup

For running tests, you need to create a local `.env.test` file based on the provided template:

```bash
# Copy the example file
cp .env.test.example .env.test

# Edit with your actual test values
nano .env.test
```

### Important Security Notes

⚠️ **NEVER commit `.env.test` files to the repository!**

The `.env.test` file is now included in `.gitignore` to prevent accidental commits of test credentials.

### Required Test Configuration

Update the following values in your local `.env.test` file:

```env
# Database Configuration
TEST_SUPABASE_URL=your_actual_test_supabase_url
TEST_SUPABASE_SERVICE_KEY=your_actual_test_service_key

# Test User Configuration  
TEST_ADMIN_PASSWORD=your_secure_test_admin_password
TEST_MANAGER_PASSWORD=your_secure_test_manager_password

# Security Keys
JWT_SECRET=your_actual_test_jwt_secret_key
ENCRYPTION_KEY=your_actual_32_character_encryption_key
```

### GitGuardian Security Fix

This setup addresses the GitGuardian security alert that detected hardcoded secrets in the repository. The fix includes:

- ✅ Removed `.env.test` file with hardcoded credentials
- ✅ Added `.env.test` to `.gitignore` 
- ✅ Created `.env.test.example` with placeholder values
- ✅ Documented secure setup process

### Development Workflow

1. **Clone repository**
2. **Copy `.env.test.example` to `.env.test`**
3. **Update `.env.test` with your actual test values**
4. **Never commit `.env.test` to version control**

This ensures test credentials remain secure and are not exposed in the repository history.
