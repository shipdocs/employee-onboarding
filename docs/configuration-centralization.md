# Configuration Centralization

## Overview

This document describes the configuration centralization completed as part of the refactoring Week 2. The centralization provides a single source of truth for all application configuration, eliminating scattered settings across environment variables, hardcoded values, and database tables.

## Architecture

### Configuration Service (`lib/configService.js`)

The centralized configuration service provides:

- **Unified Access**: Single API for all configuration values
- **Multiple Sources**: Merges defaults, database, and environment variables
- **Type Safety**: Built-in validation for configuration values
- **Caching**: 5-minute cache for performance
- **Real-time Updates**: Subscribe to configuration changes
- **Environment Overrides**: Different settings per environment

### Configuration Hierarchy

```
1. Defaults (lowest priority)
   └── Hardcoded in configService.js
2. Database Settings
   └── Stored in system_settings table
3. Environment Variables (highest priority)
   └── For migration period and secrets
```

## Usage

### Backend (Node.js)

```javascript
const { config } = require('./lib/configService');

// Get a single value
const timeout = await config.get('api.timeout', 30000);

// Get multiple values
const settings = await config.getMany([
  'auth.jwtExpiresIn',
  'email.provider',
  'training.quizPassPercentage'
]);

// Set a value (updates database)
await config.set('training.quizPassPercentage', 85);

// Subscribe to changes
const unsubscribe = config.subscribe('app.maintenanceMode', (value) => {
  console.log('Maintenance mode:', value);
});

// Check feature flag
const enabled = await config.isFeatureEnabled('new_feature', { userId });
```

### Frontend (React)

```javascript
import configClient, { useConfig } from '../services/configClient';

// Using the hook
function MyComponent() {
  const maxAttempts = useConfig('training.maxQuizAttempts', 3);
  const timeout = useConfig('api.timeout', 30000);
  
  return <div>Max attempts: {maxAttempts}</div>;
}

// Using the client directly
async function loadSettings() {
  const timeout = await configClient.get('api.timeout');
  const settings = await configClient.getMany(['app.name', 'app.url']);
}
```

## Configuration Categories

### Application Settings
- `app.name` - Application display name
- `app.url` - Base URL
- `app.supportEmail` - Support contact email
- `app.maintenanceMode` - Enable/disable maintenance mode

### API Configuration
- `api.timeout` - Request timeout (ms)
- `api.retryAttempts` - Number of retry attempts
- `api.retryDelay` - Delay between retries (ms)
- `api.rateLimitPerMinute` - Rate limit per minute

### Authentication
- `auth.jwtExpiresIn` - JWT token expiration
- `auth.magicLinkExpiresIn` - Magic link expiration (seconds)
- `auth.sessionTimeout` - Session timeout (ms)
- `auth.tokenExpiryWarning` - Warning before expiry (ms)

### Security
- `security.maxLoginAttempts` - Max failed login attempts
- `security.lockoutDuration` - Account lockout time (seconds)
- `security.passwordMinLength` - Minimum password length
- `security.passwordRequireUppercase` - Require uppercase letters
- `security.passwordRequireNumbers` - Require numbers
- `security.passwordRequireSpecial` - Require special characters

### Email
- `email.provider` - Email service provider ('mailersend' or 'smtp')
- `email.fromEmail` - From email address
- `email.fromName` - From display name
- `email.maxRetries` - Maximum retry attempts
- `email.rateLimitPerHour` - Rate limit per hour

### Training
- `training.quizPassPercentage` - Minimum passing score
- `training.maxQuizAttempts` - Maximum quiz attempts
- `training.certificateValidityDays` - Certificate validity period
- `training.photoUploadMaxSize` - Max photo size (bytes)

### Cache
- `cache.defaultTTL` - Default cache TTL (ms)
- `cache.settingsTTL` - Settings cache TTL (ms)
- `cache.userDataTTL` - User data cache TTL (ms)
- `cache.staticAssetsTTL` - Static assets cache TTL (ms)

## API Endpoints

### GET /api/config/:key
Retrieve a configuration value. Public keys don't require authentication.

```bash
curl https://app.com/api/config/app.name
# Response: { "key": "app.name", "value": "Maritime Onboarding System", "source": "default" }
```

### PUT /api/config/:key
Update a configuration value (admin only).

```bash
curl -X PUT https://app.com/api/config/training.quizPassPercentage \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": 85}'
```

### POST /api/config/batch
Retrieve multiple configuration values at once.

```bash
curl -X POST https://app.com/api/config/batch \
  -H "Content-Type: application/json" \
  -d '{"keys": ["app.name", "api.timeout", "training.maxQuizAttempts"]}'
```

## Admin UI

The Configuration Manager component (`ConfigurationManager.jsx`) provides:
- Category-based organization
- Real-time editing
- Type-appropriate inputs
- Value formatting
- Change validation

Access via Admin Dashboard > System > Configuration

## Migration Guide

### From Environment Variables

```javascript
// Old
const timeout = process.env.API_TIMEOUT || 30000;
const jwtSecret = process.env.JWT_SECRET;

// New
const timeout = await config.get('api.timeout', 30000);
const jwtSecret = await config.get('security.jwt_secret');
```

### From Hardcoded Values

```javascript
// Old
const MAX_LOGIN_ATTEMPTS = 5;
const QUIZ_PASS_PERCENTAGE = 80;

// New
const maxAttempts = await config.get('security.maxLoginAttempts');
const passPercentage = await config.get('training.quizPassPercentage');
```

### From Database Settings

```javascript
// Old
const emailProvider = await settingsService.getSetting('email', 'provider');

// New
const emailProvider = await config.get('email.provider');
```

## Benefits

1. **Single Source of Truth**: All configuration in one place
2. **Type Safety**: Validation prevents invalid values
3. **Real-time Updates**: Changes take effect immediately
4. **Environment Flexibility**: Different settings per environment
5. **Better Security**: Sensitive values properly encrypted
6. **Improved Performance**: Intelligent caching reduces database queries
7. **Easy Testing**: Mock configuration for tests
8. **Audit Trail**: Track all configuration changes

## Security Considerations

- Sensitive values are encrypted in the database
- API endpoints sanitize sensitive values
- Admin authentication required for updates
- Read-only keys prevent accidental changes
- Public keys allow frontend access without auth

## Next Steps

1. Complete migration of remaining hardcoded values
2. Add configuration versioning and rollback
3. Implement configuration import/export
4. Add configuration change webhooks
5. Create configuration templates for different environments