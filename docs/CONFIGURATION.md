# Configuration Guide - Maritime Onboarding Platform

## Overview

The Maritime Onboarding Platform uses environment variables for configuration. This guide covers all configuration options and best practices.

## Configuration Files

### `.env` File Structure

The platform uses a `.env` file in the root directory for configuration. Never commit this file to version control.

```bash
# Create from template
cp .env.example .env
```

## Core Configuration

### Database Settings

```env
# PostgreSQL Database Configuration
DB_HOST=localhost           # Database host (use 'database' for Docker)
DB_PORT=5432                # PostgreSQL port
DB_NAME=employee_onboarding # Database name
DB_USER=postgres            # Database user
DB_PASSWORD=SecurePass123!  # Database password (change in production)

# Connection Pool Settings (optional)
DB_POOL_MIN=2               # Minimum pool connections
DB_POOL_MAX=10              # Maximum pool connections
DB_SSL=false                # Enable SSL (true for production)
```

### Authentication & Security

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-chars  # Generate with: openssl rand -base64 32
JWT_EXPIRY=7d                                  # Token expiration (7d, 24h, etc.)
JWT_REFRESH_EXPIRY=30d                         # Refresh token expiration

# Session Configuration
SESSION_SECRET=another-secret-key              # Session encryption key
SESSION_TIMEOUT=3600000                        # Session timeout in ms (1 hour)

# Security Headers
ENABLE_HELMET=true                             # Enable security headers
CORS_ORIGIN=http://localhost                   # Allowed CORS origins

# Rate Limiting
RATE_LIMIT_WINDOW=15                          # Window in minutes
RATE_LIMIT_MAX=100                            # Max requests per window
```

### Application URLs

```env
# Application URLs
FRONTEND_URL=http://localhost                  # Frontend application URL
BACKEND_URL=http://localhost:3000             # Backend API URL
API_BASE_PATH=/api                            # API base path

# For production with SSL
# FRONTEND_URL=https://your-domain.com
# BACKEND_URL=https://api.your-domain.com
```

## Email Configuration

### SMTP Configuration

```env
# Email Service Configuration
EMAIL_SERVICE=smtp                            # Service type: smtp, sendgrid, ses, mailgun
EMAIL_FROM=noreply@maritime-onboarding.com    # Default sender email
EMAIL_FROM_NAME=Maritime Onboarding           # Default sender name

# SMTP Settings
SMTP_HOST=smtp.gmail.com                      # SMTP server host
SMTP_PORT=587                                 # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                             # true for port 465, false for other ports
SMTP_USER=<your-email@example.com>            # SMTP username (replace with your email)
SMTP_PASSWORD=<your-app-specific-password>    # SMTP password (replace with your app password)
```

### SendGrid Configuration

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx              # SendGrid API key
SENDGRID_FROM=noreply@your-domain.com         # Verified sender email
```

### AWS SES Configuration

```env
EMAIL_SERVICE=ses
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX              # AWS Access Key
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx           # AWS Secret Key
AWS_REGION=us-east-1                          # AWS Region
SES_FROM=noreply@your-domain.com              # Verified sender email
```

## Storage Configuration

### Local Storage

```env
# File Upload Configuration
UPLOAD_DIR=./uploads                          # Upload directory
MAX_FILE_SIZE=10485760                        # Max file size in bytes (10MB)
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,doc,docx  # Allowed file extensions
```

### S3 Storage

```env
# AWS S3 Configuration
STORAGE_TYPE=s3                               # Storage type: local or s3
S3_BUCKET=maritime-onboarding                 # S3 bucket name
S3_REGION=us-east-1                          # S3 region
S3_ACCESS_KEY=AKIAXXXXXXXXXX                 # S3 access key
S3_SECRET_KEY=xxxxxxxxxxxxx                  # S3 secret key
S3_ENDPOINT=                                  # Custom endpoint (for MinIO, etc.)
```

### MinIO Configuration (Docker)

```env
# MinIO Configuration (S3-compatible)
MINIO_ROOT_USER=minioadmin                    # MinIO root user
MINIO_ROOT_PASSWORD=minioadmin123             # MinIO root password
MINIO_BUCKET=onboarding-files                 # Default bucket name
```

## Feature Flags

```env
# Feature Toggles
ENABLE_MFA=true                               # Multi-factor authentication
ENABLE_MAGIC_LINKS=true                       # Passwordless login
ENABLE_PDF_CERTIFICATES=true                  # PDF certificate generation
ENABLE_AI_TRANSLATIONS=false                  # AI-powered translations
ENABLE_OFFLINE_MODE=true                      # Offline functionality
ENABLE_WEBHOOKS=false                         # Webhook integrations
```

## Monitoring & Logging

```env
# Logging Configuration
LOG_LEVEL=info                                # Log level: error, warn, info, debug
LOG_FORMAT=json                               # Log format: json, simple
LOG_TO_FILE=true                             # Write logs to file
LOG_DIR=./logs                               # Log directory

# Monitoring
ENABLE_METRICS=true                          # Enable metrics collection
METRICS_PORT=9090                            # Metrics endpoint port
SENTRY_DSN=                                  # Sentry error tracking DSN
```

## Development Settings

```env
# Development Environment
NODE_ENV=development                         # Environment: development, production, test
DEBUG=true                                   # Enable debug mode
DISABLE_AUTH=false                          # Disable authentication (dev only)
SEED_DATABASE=true                          # Seed database with demo data
HOT_RELOAD=true                             # Enable hot reload
```

## Production Settings

```env
# Production Environment
NODE_ENV=production
DEBUG=false
FORCE_HTTPS=true                            # Force HTTPS redirect
TRUST_PROXY=true                           # Trust proxy headers
CLUSTER_MODE=true                          # Enable cluster mode
WORKER_COUNT=auto                          # Number of workers (auto = CPU cores)
```

## Docker-Specific Configuration

```env
# Docker Network Configuration
COMPOSE_PROJECT_NAME=maritime-onboarding    # Docker Compose project name
DOCKER_NETWORK=maritime-network            # Docker network name

# Container Configuration
POSTGRES_IMAGE=postgres:15-alpine          # PostgreSQL image
REDIS_IMAGE=redis:7-alpine                # Redis image
NGINX_IMAGE=nginx:alpine                  # Nginx image
```

## Internationalization

```env
# Localization Settings
DEFAULT_LANGUAGE=en                        # Default language code
SUPPORTED_LANGUAGES=en,es,fr,de,nl,pt     # Supported language codes
LANGUAGE_DETECTION=true                   # Auto-detect user language
```

## API Configuration

```env
# API Settings
API_VERSION=v1                            # API version
API_TIMEOUT=30000                        # API request timeout (ms)
API_PAGINATION_LIMIT=50                  # Default pagination limit
API_MAX_PAGINATION_LIMIT=100            # Maximum pagination limit
```

## Cache Configuration

```env
# Redis Cache Configuration
REDIS_HOST=localhost                     # Redis host (use 'redis' for Docker)
REDIS_PORT=6379                         # Redis port
REDIS_PASSWORD=                         # Redis password (optional)
REDIS_DB=0                              # Redis database number
CACHE_TTL=3600                         # Default cache TTL in seconds
```

## Backup Configuration

```env
# Backup Settings
BACKUP_ENABLED=true                     # Enable automatic backups
BACKUP_SCHEDULE="0 2 * * *"            # Cron schedule (2 AM daily)
BACKUP_RETENTION_DAYS=30               # Keep backups for 30 days
BACKUP_STORAGE=local                   # Storage: local, s3
BACKUP_PATH=./backups                  # Local backup path
```

## Environment-Specific Configurations

### Development (.env.development)

```env
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
EMAIL_SERVICE=mailhog
SMTP_HOST=localhost
SMTP_PORT=1025
```

### Production (.env.production)

```env
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
FORCE_HTTPS=true
CLUSTER_MODE=true
```

### Testing (.env.test)

```env
NODE_ENV=test
DB_NAME=employee_onboarding_test
LOG_LEVEL=error
DISABLE_AUTH=true
```

## Configuration Best Practices

### 1. Security

- Never commit `.env` files to version control
- Use strong, unique passwords and secrets
- Rotate secrets regularly
- Use environment-specific configurations
- Enable SSL/TLS in production

### 2. Secrets Management

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -hex 16     # For API keys
```

### 3. Environment Variables in Docker

```yaml
# docker-compose.yml
services:
  backend:
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```

### 4. Validation

The application validates required environment variables on startup:

```javascript
// Required variables
const required = [
  'DB_HOST',
  'DB_NAME', 
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];
```

### 5. Secret Storage Solutions

For production, consider using:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Kubernetes Secrets

## Troubleshooting Configuration

### Common Issues

1. **Database Connection Failed**
   - Check DB_HOST (use 'database' for Docker, 'localhost' for local)
   - Verify DB_PASSWORD is correct
   - Ensure database service is running

2. **Email Not Sending**
   - Verify SMTP credentials
   - Check firewall rules for SMTP ports
   - Use Mailhog for local testing

3. **JWT Errors**
   - Ensure JWT_SECRET is at least 32 characters
   - Check JWT_EXPIRY format (e.g., '7d', '24h')

4. **CORS Issues**
   - Set CORS_ORIGIN to match your frontend URL
   - Include protocol (http:// or https://)

### Configuration Validation

Run configuration check:

```bash
npm run config:validate
```

This will verify:
- Required variables are set
- Database connection
- Email configuration
- File permissions
- Network connectivity

## Configuration Examples

### Minimal Configuration

```env
# Minimum required configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=employee_onboarding
DB_USER=postgres
DB_PASSWORD=postgres123
JWT_SECRET=your-32-character-minimum-secret-key
FRONTEND_URL=http://localhost
BACKEND_URL=http://localhost:3000
```

### Full Production Configuration

See `.env.example` for a complete production-ready configuration template.

## Support

For configuration help:
- Check the logs: `docker compose logs`
- Run diagnostics: `npm run diagnostics`
- See troubleshooting guide: `/docs/TROUBLESHOOTING.md`