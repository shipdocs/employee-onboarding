# Environment Configuration System

## Overview

The environment configuration system provides centralized control over application behavior across different deployment environments (development, staging, production). It uses a combination of environment detection strategies and feature toggles to ensure safe and appropriate behavior in each environment.

## Environment Detection

The system detects the current environment using a hierarchical strategy (in order of precedence):

1. **ENVIRONMENT variable** - Explicit environment override
   ```bash
   ENVIRONMENT=staging npm start
   ```

2. **NODE_ENV variable** - Standard Node.js environment
   ```bash
   NODE_ENV=production npm start
   ```

3. **Domain/URL patterns** - Automatic detection based on hostname
   - `localhost` or `127.0.0.1` → development
   - URLs containing `staging` or `stage` → staging
   - `.vercel.app` domains (non-staging) → production

4. **Vercel environment variables** - Vercel-specific detection
   - `VERCEL_ENV=production` → production
   - `VERCEL_ENV=preview` → staging
   - `VERCEL_ENV=development` → development

5. **Production indicator variables** - Fallback detection
   - Non-localhost Supabase URL → staging/production
   - MailerSend email provider → production

6. **Default** - Falls back to development if no other indicators

## Feature Flags

All feature flags follow a consistent naming pattern and can be overridden via environment variables.

### Core Feature Flags

#### Email System
- **EMAIL_SENDING_ENABLED**
  - Controls whether emails are actually sent
  - Default: `true` in production/staging, `false` in development (unless explicitly enabled)
  - Override: `EMAIL_SENDING_ENABLED=true`

#### Quiz System
- **QUIZ_SCORING_ENABLED**
  - Controls real quiz scoring vs fake scoring
  - Default: `true` in production/staging, `false` in development
  - Fake scoring generates random scores between 75-94% in development
  - Override: `QUIZ_SCORING_ENABLED=true`

#### Certificate Generation
- **CERTIFICATE_GENERATION_ENABLED**
  - Controls whether certificates can be generated
  - Default: `true` in production/staging, `false` in development
  - Override: `CERTIFICATE_GENERATION_ENABLED=true`

#### Security
- **RATE_LIMITING_ENABLED**
  - Controls API rate limiting
  - Default: `true` in production/staging, `false` in development
  - Override: `RATE_LIMITING_ENABLED=true`

#### Logging
- **DEBUG_LOGGING_ENABLED**
  - Controls verbose debug logging
  - Default: `false` in production, `true` in development
  - Override: `DEBUG_LOGGING_ENABLED=true`

#### Test Data
- **TEST_DATA_ALLOWED**
  - Allows creation and use of test data
  - Default: `false` in production, `true` in development/staging
  - Override: `TEST_DATA_ALLOWED=true`

### Performance Features

- **CACHING_ENABLED** - Response and query caching
- **PERFORMANCE_MONITORING_ENABLED** - Performance metrics collection

### Authentication Features

- **MAGIC_LINK_ENABLED** - Passwordless authentication
- **SESSION_TIMEOUT_ENABLED** - Automatic session expiration

### Development Features

- **DEV_MODE_BAR_ENABLED** - Development helper UI
- **HOT_RELOAD_ENABLED** - Hot module replacement
- **API_DOCUMENTATION_ENABLED** - API docs endpoints

### Additional Features

- **CORS_ENABLED** - Cross-Origin Resource Sharing
- **DATABASE_MIGRATIONS_ENABLED** - Auto migrations
- **DATABASE_SEEDING_ENABLED** - Test data seeding
- **ERROR_DETAILS_ENABLED** - Detailed error messages
- **ERROR_REPORTING_ENABLED** - External error monitoring
- **WEBHOOK_PROCESSING_ENABLED** - Webhook handling
- **EXTERNAL_API_CALLS_ENABLED** - External API access
- **MAINTENANCE_MODE_ENABLED** - Maintenance page
- **BETA_FEATURES_ENABLED** - Experimental features

## Environment-Specific Behaviors

### Development Environment

```javascript
{
  logging: { level: 'debug', enableConsole: true },
  email: { enabled: false, testMode: true },
  security: { rateLimitProvider: 'memory', requireHttps: false },
  performance: { caching: false, monitoring: false },
  data: { testDataAllowed: true, seedingEnabled: true, mockingEnabled: true }
}
```

- Emails are disabled by default (can be enabled via flag)
- Verbose logging for debugging
- In-memory rate limiting
- Test data and mocking allowed
- No HTTPS requirement

### Staging Environment

```javascript
{
  logging: { level: 'info', enableConsole: true, enableFile: true },
  email: { enabled: true, whitelist: [...], testMode: false },
  security: { rateLimitProvider: 'memory', requireHttps: true },
  performance: { caching: true, monitoring: true },
  data: { testDataAllowed: true, seedingEnabled: false, mockingEnabled: false }
}
```

- Emails sent only to whitelisted domains
- Moderate logging with file output
- HTTPS required
- Performance monitoring enabled
- Test data allowed but no automatic seeding

### Production Environment

```javascript
{
  logging: { level: 'warn', enableConsole: false, enableFile: true, enableRemote: true },
  email: { enabled: true, provider: 'mailersend', testMode: false },
  security: { rateLimitProvider: 'redis', requireHttps: true },
  performance: { caching: true, cacheTTL: 3600, monitoring: true },
  data: { testDataAllowed: false, seedingEnabled: false, mockingEnabled: false }
}
```

- Full email sending to all addresses
- Minimal console logging, remote error reporting
- Redis-backed rate limiting (falls back to memory if unavailable)
- Extended cache TTL (1 hour)
- No test data allowed

## Usage Examples

### Checking Environment

```javascript
const { environmentConfig } = require('./config/environment');

if (environmentConfig.isDevelopment()) {
  console.log('Running in development mode');
}

const currentEnv = environmentConfig.getEnvironment(); // 'development', 'staging', or 'production'
```

### Using Feature Flags

```javascript
const { isEnabled, FEATURES } = require('./config/features');

// Check if email sending is enabled
if (isEnabled(FEATURES.EMAIL_SENDING_ENABLED)) {
  await sendEmail(emailData);
} else {
  console.log('Email sending disabled - would have sent:', emailData);
}

// Check quiz scoring
if (!isEnabled(FEATURES.QUIZ_SCORING_ENABLED) && !environmentConfig.isProduction()) {
  // Use fake scoring in development
  return generateFakeScore();
}
```

### Getting Configuration Values

```javascript
const { environmentConfig } = require('./config/environment');

// Get specific config value
const logLevel = environmentConfig.get('logging.level');
const cachingEnabled = environmentConfig.get('performance.caching');

// Get full config
const config = environmentConfig.getConfig();
```

## Environment Variable Overrides

Any feature flag can be overridden via environment variables:

```bash
# Enable email sending in development
EMAIL_SENDING_ENABLED=true npm run dev

# Disable rate limiting in staging
RATE_LIMITING_ENABLED=false npm start

# Set custom log level
LOG_LEVEL=debug npm start

# Configure email whitelist for staging
EMAIL_WHITELIST="example.com,test.com" npm start
```

## Security Considerations

1. **Production Safety**: The system validates configuration and warns about unsafe settings:
   - Test data enabled in production
   - Debug logging in production
   - Rate limiting disabled in production

2. **Email Safety**: 
   - Development environments don't send emails by default
   - Staging restricts emails to whitelisted domains
   - Production sends all emails normally

3. **Data Protection**:
   - Test data creation is blocked in production
   - Fake quiz scores only available in non-production
   - Detailed error messages hidden in production

## Rate Limiting Providers

The system supports multiple rate limiting backends:

- **Memory Store** (Development/Staging)
  - Simple in-memory storage
  - Auto-cleanup of expired entries
  - No external dependencies

- **Redis Store** (Production)
  - Distributed rate limiting
  - Survives server restarts
  - Requires REDIS_URL environment variable

## Adding New Feature Flags

To add a new feature flag:

1. Add to `/config/features.js`:
```javascript
MY_NEW_FEATURE_ENABLED: {
  name: 'My New Feature',
  description: 'Controls my new feature',
  defaultValue: isProd || isStaging,
  envVar: 'MY_NEW_FEATURE_ENABLED',
  requiresRestart: false
}
```

2. Use in your code:
```javascript
if (isEnabled(FEATURES.MY_NEW_FEATURE_ENABLED)) {
  // Feature is enabled
}
```

3. Override via environment:
```bash
MY_NEW_FEATURE_ENABLED=true npm start
```

## Monitoring and Debugging

### Check Current Configuration

```javascript
const { featureToggles } = require('./config/features');

// Get all feature states
const features = featureToggles.getAllFeatures();
console.log(features);

// Get summary by category
const summary = featureToggles.getFeatureSummary();
console.log(summary);

// Get environment summary
const envSummary = environmentConfig.getSummary();
console.log(envSummary);
```

### Configuration Warnings

The system automatically validates configuration on startup and logs warnings for potentially unsafe settings. Check the console output when starting the application.

## Best Practices

1. **Never hardcode environment-specific values** - Always use the configuration system
2. **Test with production-like settings** - Use staging to verify production behavior
3. **Document new flags** - Add clear descriptions for new feature flags
4. **Use appropriate defaults** - Ensure safe defaults for each environment
5. **Monitor feature usage** - Track which features are enabled in production

## Troubleshooting

### Environment Not Detected Correctly

1. Check environment variables:
   ```bash
   echo $NODE_ENV
   echo $ENVIRONMENT
   echo $VERCEL_ENV
   ```

2. Verify in code:
   ```javascript
   console.log('Detected environment:', environmentConfig.getEnvironment());
   ```

### Feature Flag Not Working

1. Check if flag is defined:
   ```javascript
   console.log('Flag exists:', FEATURES.MY_FLAG in featureToggles.features);
   ```

2. Check override:
   ```bash
   echo $MY_FLAG_ENABLED
   ```

3. Verify current value:
   ```javascript
   console.log('Flag enabled:', isEnabled(FEATURES.MY_FLAG));
   ```

### Rate Limiting Issues

1. Check if enabled:
   ```javascript
   console.log('Rate limiting:', isEnabled(FEATURES.RATE_LIMITING_ENABLED));
   ```

2. Verify store type:
   ```javascript
   console.log('Store provider:', environmentConfig.get('security.rateLimitProvider'));
   ```