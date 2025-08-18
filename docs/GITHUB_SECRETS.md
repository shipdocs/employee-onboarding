# GitHub Secrets Configuration

This document lists all GitHub secrets required for the CI/CD pipeline to function properly.

## Required Secrets for E2E Tests

These secrets need to be configured in your GitHub repository settings under Settings → Secrets and variables → Actions.

### Currently Available Secrets ✅
- `SUPABASE_SERVICE_ROLE_KEY_TESTING` - Service role key for test database
- `SUPABASE_SERVICE_ROLE_KEY_PREVIEW` - Service role key for preview environment
- `SUPABASE_SERVICE_ROLE_KEY_PRODUCTION` - Service role key for production
- `SUPABASE_ACCESS_TOKEN` - Access token for Supabase

### Still Needed ❌
- `SUPABASE_URL` - Your Supabase project URL
  - Example: `https://xxxxxxxxxxxxx.supabase.co`
  - Get from: Supabase Dashboard → Settings → API → Project URL
  - This is the same for all environments

### Optional Secrets (for full functionality)

- `MAILERSEND_API_KEY` - For email testing
  - Get from: MailerSend Dashboard → API Tokens

- `JWT_SECRET` - For authentication testing
  - Generate with: `openssl rand -base64 32`

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add the secret name and value
6. Click **Add secret**

## Testing Without Secrets

If you don't have access to a test database, the E2E tests will fail but other tests should still pass. You can:

1. Skip E2E tests in PRs by adding `[skip e2e]` to your commit message
2. Use mock data for local development
3. Request test credentials from the project maintainer

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use different credentials** for test vs production
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Limit secret access** to only required workflows
5. **Use environment-specific secrets** (TEST_ prefix for test secrets)

## Troubleshooting

### E2E Tests Failing with "Missing Credentials"
- Ensure all required secrets are configured
- Check secret names match exactly (case-sensitive)
- Verify secrets haven't expired

### Build Failing with ESLint Warnings
- The CI now treats warnings as non-blocking (CI=false in build step)
- To run strict checks locally: `CI=true npm run build`

## Contact

For access to test credentials or help with secret configuration:
- Email: info@shipdocs.app
- Create an issue in the repository