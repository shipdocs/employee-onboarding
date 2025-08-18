# Deployment Guide

## Environment Variables

For production deployment, set these environment variables:

```bash
# Database Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Application Configuration
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MAGIC_LINK_EXPIRY=24h
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Email Configuration
MAILERSEND_API_KEY=your-mailersend-api-key-here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Company Name
CRON_SECRET=your-cron-secret-key
```

## Security Notes

⚠️ **NEVER commit real credentials to version control!**

- Use environment variables for all sensitive data
- Rotate credentials regularly
- Use different credentials for each environment
- Keep production credentials secure and limited access

## Deployment Steps

1. Set up environment variables in your hosting platform
2. Configure database migrations
3. Test in staging environment first
4. Deploy to production
5. Verify all services are working

For detailed deployment instructions, see the main README.md file.
