# External Logging Setup Instructions

## Current Status
✅ Feature branch `feature/external-logging-grafana` created and ready
✅ All code files are in place
✅ Database migration exists (but gitignored)

## Setup Steps Required

### 1. Install Dependencies
```bash
npm install
```

### 2. Apply Database Migration
```bash
# The migration file exists locally but is gitignored
cat database/migrations/003-external-logging-config.sql | docker exec -i employee-onboarding-database psql -U postgres -d employee_onboarding
```

### 3. Verify Setup
```bash
# Run the setup verification
./scripts/setup-external-logging-complete.sh
```

## Files in This Feature

### New Files:
- `client/src/components/admin/ExternalLoggingSettings.js` - React UI component
- `scripts/setup-external-logging-complete.sh` - Setup verification script

### Modified Files:
- `client/src/components/SystemSettings.js` - Added External Logging menu item

### Existing Files (from previous work):
- `api/admin/external-logging.js` - API endpoints
- `lib/services/externalLoggingService.js` - Core service
- `lib/middleware/securityMonitoring.js` - Integration with security monitoring
- `api/auth/verify.js` - Auth event logging integration
- `scripts/setup-external-logging.js` - Environment-based setup
- `docs/EXTERNAL-LOGGING.md` - Complete documentation
- `database/migrations/003-external-logging-config.sql` - Database schema (gitignored)

### Package.json Changes:
- Added `winston: 3.17.0`
- Added `winston-loki: 6.1.3`

## How to Use

1. **Via Admin Dashboard:**
   - Navigate to Settings → External Logging
   - Enter Grafana Cloud credentials
   - Test and save

2. **Via Environment Variables:**
   ```bash
   export GRAFANA_CLOUD_URL=https://logs-prod-us-central1.grafana.net
   export GRAFANA_CLOUD_USER=123456
   export GRAFANA_CLOUD_API_KEY=glc_...
   export EXTERNAL_LOGGING_ENABLED=true
   npm run external-logging:setup
   ```

## Ready to Push
This branch is ready to be pushed to GitHub for review:
```bash
git push origin feature/external-logging-grafana
```