<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Vercel Deployment Guide

This guide provides comprehensive instructions for deploying the Maritime Onboarding System on Vercel, including configuration, optimization, and troubleshooting.

## Prerequisites

### Required Tools
- Node.js 18.x or higher
- npm or yarn package manager
- Vercel CLI (`npm i -g vercel`)
- Git

### Required Accounts
- Vercel account (free tier works for testing)
- GitHub account (for automatic deployments)
- Supabase account (for database)

## Initial Setup

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link Project
```bash
# In project root directory
vercel link

# Follow prompts:
# - Set up and deploy: Y
# - Which scope: Select your team/personal account
# - Link to existing project: N (first time) or Y (existing)
# - Project name: new-onboarding-2025
# - Directory: ./ (current directory)
```

## Project Configuration

### vercel.json Configuration
Create or update `vercel.json` in the project root:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["ams1"],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30,
      "memory": 1024
    },
    "api/pdf/*.js": {
      "maxDuration": 60,
      "memory": 3008
    },
    "api/upload/*.js": {
      "maxDuration": 60,
      "memory": 3008
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Build Configuration
Ensure `package.json` has correct build scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "vite preview --port 3000"
  }
}
```

## Environment Variables

### Setting Environment Variables

#### Via Vercel CLI
```bash
# Add environment variable
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add MAILERSEND_API_KEY

# Add secret (more secure)
vercel secrets add supabase-service-key "your-service-key"
vercel env add SUPABASE_SERVICE_ROLE_KEY --secret supabase-service-key
```

#### Via Vercel Dashboard
1. Go to Project Settings → Environment Variables
2. Add each variable with appropriate values
3. Select which environments should have access

### Required Environment Variables
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Authentication
JWT_SECRET=your-jwt-secret

# Email
MAILERSEND_API_KEY=your-mailersend-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Maritime Onboarding
HR_EMAIL=hr@yourcompany.com

# Application
VITE_API_URL=https://your-deployment.vercel.app/api
VITE_APP_URL=https://your-deployment.vercel.app
BASE_URL=https://your-deployment.vercel.app

# Optional - Translation Services
MICROSOFT_TRANSLATOR_KEY=your-key
MICROSOFT_TRANSLATOR_REGION=global
GOOGLE_TRANSLATE_API_KEY=your-key
```

## Deployment Process

### Manual Deployment

#### Development/Preview
```bash
# Deploy to preview (creates unique URL)
vercel

# Deploy with specific environment
vercel --env preview
```

#### Production
```bash
# Deploy to production
vercel --prod

# Force deployment (skip build cache)
vercel --prod --force
```

### Automatic Deployment (Recommended)

#### 1. Connect GitHub Repository
```bash
# In Vercel dashboard
1. Go to project settings
2. Select "Git" section
3. Connect GitHub repository
4. Configure branch deployments
```

#### 2. Branch Configuration
- **Production**: Deploy from `main` branch
- **Preview**: Deploy from `preview` branch
- **Development**: Deploy from all other branches

#### 3. Deployment Triggers
Automatic deployments occur on:
- Push to connected branches
- Pull request creation/updates
- Manual trigger in dashboard

## Serverless Functions

### Function Structure
All API routes are serverless functions in the `/api` directory:

```javascript
// api/auth/admin-login.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Handler logic
    const result = await processLogin(req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Function Configuration
Configure individual functions in `vercel.json`:

```json
{
  "functions": {
    "api/auth/*.js": {
      "maxDuration": 10
    },
    "api/pdf/*.js": {
      "maxDuration": 60,
      "memory": 3008
    },
    "api/upload/*.js": {
      "maxDuration": 60,
      "memory": 3008
    },
    "api/cron/*.js": {
      "maxDuration": 300,
      "schedule": "0 2 * * *"
    }
  }
}
```

### Function Limits (Free Tier)
- Max duration: 10 seconds
- Memory: 1024 MB
- Payload size: 5 MB

### Function Limits (Pro Tier)
- Max duration: 60 seconds (300 for cron)
- Memory: 3008 MB
- Payload size: 5 MB

## Performance Optimization

### Build Optimization
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@heroicons/react', 'react-hot-toast'],
          'chart-vendor': ['recharts'],
          'utils': ['date-fns', 'zod']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
};
```

### Edge Functions (Optional)
For better performance, convert appropriate functions to Edge Functions:

```javascript
// api/health.js
export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
```

### Caching Configuration
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

## Custom Domains

### Adding a Custom Domain

#### 1. Via Dashboard
1. Go to Project Settings → Domains
2. Add your domain (e.g., `your-domain.com`)
3. Configure DNS as instructed

#### 2. Via CLI
```bash
vercel domains add your-domain.com
```

### DNS Configuration
Add these records to your DNS provider:

```
Type  Name         Value
A     @            76.76.21.21
CNAME www          cname.vercel-dns.com
```

### SSL Certificates
- Automatically provisioned by Vercel
- Let's Encrypt certificates
- Auto-renewal enabled
- Force HTTPS redirect available

## Monitoring and Analytics

### Vercel Analytics
Enable in project dashboard:
1. Go to Analytics tab
2. Enable Web Analytics
3. Add script to your app

```javascript
// In your app
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

### Function Logs
```bash
# View recent logs
vercel logs

# View specific deployment logs
vercel logs [deployment-url]

# Follow logs in real-time
vercel logs --follow

# Filter by function
vercel logs --filter api/auth/admin-login
```

### Error Tracking
Configure error tracking in functions:

```javascript
// lib/errorTracking.js
export async function trackError(error, context) {
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
    await fetch('https://your-error-tracker.com/api/errors', {
      method: 'POST',
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        context
      })
    });
  }
  
  console.error('Error:', error, context);
}
```

## Security Configuration

### Security Headers
Configure in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### Environment Variable Security
- Use Vercel Secrets for sensitive values
- Different values per environment
- Never commit `.env` files
- Rotate secrets regularly

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
vercel logs --type build

# Test build locally
npm run build

# Clear cache and rebuild
vercel --force
```

#### Function Timeouts
- Check function duration in logs
- Increase `maxDuration` in config
- Optimize database queries
- Consider splitting into multiple functions

#### Environment Variable Issues
```bash
# Pull environment variables locally
vercel env pull

# List all environment variables
vercel env ls

# Check specific variable
vercel env get SUPABASE_URL
```

#### CORS Errors
Ensure all API functions include CORS headers:

```javascript
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Your handler logic
}
```

### Debug Mode
Enable detailed logging:

```javascript
// In your functions
if (process.env.VERCEL_ENV === 'development') {
  console.log('Debug:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
}
```

## Advanced Configuration

### Cron Jobs
Configure scheduled functions:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/reports",
      "schedule": "0 9 * * MON"
    }
  ]
}
```

### Regional Deployment
Deploy to specific regions for better performance:

```json
{
  "regions": ["ams1", "fra1", "cdg1"]
}
```

Available regions:
- `ams1` - Amsterdam, Netherlands
- `fra1` - Frankfurt, Germany
- `cdg1` - Paris, France
- `lhr1` - London, UK
- Add more as needed

### Incremental Static Regeneration
For static pages with dynamic data:

```javascript
export async function getStaticProps() {
  const data = await fetchData();
  
  return {
    props: { data },
    revalidate: 3600 // Regenerate every hour
  };
}
```

## Best Practices

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Build succeeds locally
- [ ] Tests pass
- [ ] Security headers configured
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Custom domain setup
- [ ] SSL certificate active
- [ ] Monitoring alerts configured

### Performance Tips
1. Use Edge Functions for simple endpoints
2. Implement proper caching strategies
3. Optimize images with Vercel Image Optimization
4. Use CDN for static assets
5. Monitor Core Web Vitals

### Security Recommendations
1. Use Vercel Secrets for sensitive data
2. Enable Vercel Firewall (Enterprise)
3. Implement rate limiting
4. Regular security audits
5. Monitor for suspicious activity

## Related Documentation
- [Environment Configuration](./environments.md) - Multi-environment setup
- [Supabase Integration](./supabase.md) - Database configuration
- [Production Deployment](./production.md) - Production best practices
- [API Architecture](../architecture/api.md) - Serverless function details