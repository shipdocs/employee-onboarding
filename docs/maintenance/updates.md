# System Updates and Maintenance Guide

This guide provides comprehensive procedures for maintaining and updating the Maritime Onboarding System, including dependency updates, security patches, database migrations, and scheduled maintenance procedures.

## Update Overview

### Update Categories
1. **Security Updates** - Critical patches, immediate deployment
2. **Dependency Updates** - npm packages, framework versions
3. **Feature Updates** - New functionality, enhancements
4. **Database Updates** - Schema changes, migrations
5. **Infrastructure Updates** - Platform, service updates

### Update Schedule
- **Security Patches**: Immediate (within 24 hours)
- **Critical Updates**: Weekly
- **Minor Updates**: Bi-weekly
- **Major Updates**: Monthly
- **Platform Updates**: Quarterly

## Dependency Management

### Checking for Updates

#### Automated Dependency Checking
```bash
#!/bin/bash
# check-dependencies.sh

echo "=== Dependency Update Check ==="

# Check npm outdated packages
echo "Checking npm packages..."
npm outdated --json > npm-outdated.json

# Check for security vulnerabilities
echo "Checking for vulnerabilities..."
npm audit --json > npm-audit.json

# Check Vercel CLI version
echo "Checking Vercel CLI..."
vercel --version
npm view vercel version

# Check Supabase CLI version
echo "Checking Supabase CLI..."
supabase --version
npm view supabase version

# Generate report
node scripts/generate-update-report.js
```

#### Update Report Generator
```javascript
// scripts/generate-update-report.js
const fs = require('fs');

function generateUpdateReport() {
  const outdated = JSON.parse(fs.readFileSync('npm-outdated.json'));
  const audit = JSON.parse(fs.readFileSync('npm-audit.json'));
  
  const report = {
    date: new Date().toISOString(),
    summary: {
      outdatedPackages: Object.keys(outdated).length,
      vulnerabilities: {
        critical: audit.metadata.vulnerabilities.critical || 0,
        high: audit.metadata.vulnerabilities.high || 0,
        moderate: audit.metadata.vulnerabilities.moderate || 0,
        low: audit.metadata.vulnerabilities.low || 0
      }
    },
    updates: categorizeUpdates(outdated),
    security: audit.vulnerabilities || {}
  };
  
  fs.writeFileSync('update-report.json', JSON.stringify(report, null, 2));
  console.log('\nUpdate Report Generated: update-report.json');
  
  // Send alerts if critical updates
  if (report.summary.vulnerabilities.critical > 0) {
    sendCriticalAlert(report);
  }
  
  return report;
}

function categorizeUpdates(outdated) {
  const categories = {
    major: [],
    minor: [],
    patch: []
  };
  
  Object.entries(outdated).forEach(([pkg, info]) => {
    const current = info.current;
    const latest = info.latest;
    
    if (!current || !latest) return;
    
    const [currMajor, currMinor] = current.split('.');
    const [latMajor, latMinor] = latest.split('.');
    
    if (currMajor !== latMajor) {
      categories.major.push({ package: pkg, ...info });
    } else if (currMinor !== latMinor) {
      categories.minor.push({ package: pkg, ...info });
    } else {
      categories.patch.push({ package: pkg, ...info });
    }
  });
  
  return categories;
}
```

### Updating Dependencies

#### Security Updates
```bash
#!/bin/bash
# security-update.sh

echo "=== Security Update Process ==="

# Create backup
cp package-lock.json package-lock.json.backup

# Fix vulnerabilities
npm audit fix

# If that doesn't work, force fixes
npm audit fix --force

# Run tests
npm test

# If tests pass, commit
if [ $? -eq 0 ]; then
  git add package.json package-lock.json
  git commit -m "security: fix npm vulnerabilities"
else
  echo "Tests failed! Reverting changes..."
  mv package-lock.json.backup package-lock.json
  npm install
fi
```

#### Controlled Updates
```javascript
// scripts/update-dependencies.js
const { execSync } = require('child_process');
const fs = require('fs');

class DependencyUpdater {
  constructor() {
    this.updates = [];
    this.testResults = {};
  }
  
  async updatePackage(packageName, version) {
    console.log(`Updating ${packageName} to ${version}...`);
    
    try {
      // Create branch
      execSync(`git checkout -b update/${packageName}-${version}`);
      
      // Update package
      execSync(`npm install ${packageName}@${version}`);
      
      // Run tests
      console.log('Running tests...');
      execSync('npm test');
      
      // Build project
      console.log('Building project...');
      execSync('npm run build');
      
      // Commit changes
      execSync(`git add package.json package-lock.json`);
      execSync(`git commit -m "chore: update ${packageName} to ${version}"`);
      
      this.updates.push({
        package: packageName,
        version,
        status: 'success'
      });
      
    } catch (error) {
      console.error(`Failed to update ${packageName}:`, error.message);
      
      // Revert changes
      execSync('git checkout -- .');
      execSync('git checkout main');
      
      this.updates.push({
        package: packageName,
        version,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  async updateAll(updates) {
    for (const update of updates) {
      await this.updatePackage(update.package, update.version);
    }
    
    this.generateReport();
  }
  
  generateReport() {
    const report = {
      date: new Date().toISOString(),
      updates: this.updates,
      successful: this.updates.filter(u => u.status === 'success').length,
      failed: this.updates.filter(u => u.status === 'failed').length
    };
    
    fs.writeFileSync('update-results.json', JSON.stringify(report, null, 2));
    console.log('\nUpdate Report:', report);
  }
}
```

## Database Updates

### Migration Management

#### Creating Migrations
```bash
#!/bin/bash
# create-migration.sh

MIGRATION_NAME=$1

if [ -z "$MIGRATION_NAME" ]; then
  echo "Usage: ./create-migration.sh <migration-name>"
  exit 1
fi

# Create migration file
supabase migration new "$MIGRATION_NAME"

# Open in editor
code "supabase/migrations/*_${MIGRATION_NAME}.sql"

echo "Migration created. Edit the file and then run:"
echo "  npm run db:migrate:test   # Test locally"
echo "  npm run db:migrate:prod   # Apply to production"
```

#### Migration Template
```sql
-- Migration: Add new feature
-- Author: Your Name
-- Date: 2025-01-15

-- Up Migration
BEGIN;

-- Add new column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_last_login 
ON users(last_login) 
WHERE last_login IS NOT NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can update own last_login" ON users;
CREATE POLICY "Users can update own last_login" ON users
  FOR UPDATE USING (id = auth.jwt_user_id())
  WITH CHECK (id = auth.jwt_user_id());

-- Add comment
COMMENT ON COLUMN users.last_login IS 'Last successful login timestamp';

COMMIT;

-- Down Migration (in comments for reference)
-- ALTER TABLE users DROP COLUMN IF EXISTS last_login;
-- DROP INDEX IF EXISTS idx_users_last_login;
```

#### Testing Migrations
```bash
#!/bin/bash
# test-migration.sh

echo "=== Testing Database Migration ==="

# 1. Backup current dev database
pg_dump $DEV_DATABASE_URL > /tmp/dev_backup.sql

# 2. Apply migration
supabase db push --db-url $DEV_DATABASE_URL

# 3. Run migration tests
npm run test:migrations

# 4. If tests fail, rollback
if [ $? -ne 0 ]; then
  echo "Migration tests failed! Rolling back..."
  psql $DEV_DATABASE_URL < /tmp/dev_backup.sql
  exit 1
fi

echo "Migration tests passed!"
```

#### Production Migration Process
```bash
#!/bin/bash
# migrate-production.sh

echo "=== Production Database Migration ==="

# 1. Put app in maintenance mode
vercel env add MAINTENANCE_MODE true production

# 2. Wait for active connections to close
echo "Waiting for active connections to close..."
sleep 30

# 3. Backup production database
echo "Creating backup..."
pg_dump $PRODUCTION_DATABASE_URL > "/backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql"

# 4. Apply migration
echo "Applying migration..."
supabase db push --db-url $PRODUCTION_DATABASE_URL

# 5. Verify migration
echo "Verifying migration..."
psql $PRODUCTION_DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# 6. Remove maintenance mode
vercel env rm MAINTENANCE_MODE production

# 7. Deploy new code if needed
vercel --prod

echo "Migration completed successfully!"
```

## Application Updates

### Feature Deployment

#### Feature Update Process
```javascript
// scripts/deploy-feature.js
class FeatureDeployment {
  constructor(featureName, version) {
    this.featureName = featureName;
    this.version = version;
    this.steps = [];
  }
  
  async deploy() {
    try {
      await this.preDeploymentChecks();
      await this.runTests();
      await this.buildApplication();
      await this.deployToTesting();
      await this.runSmokeTests();
      await this.deployToProduction();
      await this.postDeploymentVerification();
      
      this.notifySuccess();
    } catch (error) {
      await this.rollback();
      this.notifyFailure(error);
      throw error;
    }
  }
  
  async preDeploymentChecks() {
    console.log('Running pre-deployment checks...');
    
    // Check dependencies
    execSync('npm audit');
    
    // Check build
    execSync('npm run build');
    
    // Check tests
    execSync('npm test');
    
    this.logStep('Pre-deployment checks passed');
  }
  
  async deployToTesting() {
    console.log('Deploying to testing environment...');
    
    // Create deployment
    const result = execSync('vercel --target=preview', { encoding: 'utf8' });
    const deploymentUrl = result.match(/https:\/\/[^\s]+/)[0];
    
    this.testingUrl = deploymentUrl;
    this.logStep('Deployed to testing', { url: deploymentUrl });
  }
  
  async runSmokeTests() {
    console.log('Running smoke tests...');
    
    const tests = [
      () => this.testEndpoint('/api/health'),
      () => this.testEndpoint('/api/auth/verify'),
      () => this.testFeature()
    ];
    
    for (const test of tests) {
      await test();
    }
    
    this.logStep('Smoke tests passed');
  }
  
  async deployToProduction() {
    console.log('Deploying to production...');
    
    // Get approval
    const approval = await this.getApproval();
    if (!approval) {
      throw new Error('Deployment not approved');
    }
    
    // Deploy
    execSync('vercel --prod');
    
    this.logStep('Deployed to production');
  }
}
```

### Rollback Procedures

#### Automated Rollback
```javascript
// scripts/rollback.js
class RollbackManager {
  async rollback(deploymentId) {
    console.log(`Rolling back to deployment: ${deploymentId}`);
    
    try {
      // 1. Get deployment info
      const deployment = await this.getDeployment(deploymentId);
      
      // 2. Verify deployment is healthy
      await this.verifyDeployment(deployment);
      
      // 3. Promote to production
      await this.promoteDeployment(deploymentId);
      
      // 4. Verify rollback
      await this.verifyRollback();
      
      // 5. Notify team
      await this.notifyRollback(deploymentId);
      
    } catch (error) {
      console.error('Rollback failed:', error);
      await this.emergencyProcedure();
    }
  }
  
  async verifyDeployment(deployment) {
    const healthCheck = await fetch(`${deployment.url}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Deployment health check failed');
    }
  }
  
  async promoteDeployment(deploymentId) {
    execSync(`vercel promote ${deploymentId} --yes`);
  }
  
  async emergencyProcedure() {
    // Last known good deployment
    const lastGood = process.env.LAST_KNOWN_GOOD_DEPLOYMENT;
    
    if (lastGood) {
      execSync(`vercel alias ${lastGood} onboarding.burando.online`);
    } else {
      console.error('No last known good deployment!');
      // Implement emergency static page
    }
  }
}
```

## Scheduled Maintenance

### Maintenance Windows

#### Maintenance Schedule
```javascript
// config/maintenance-schedule.js
export const maintenanceSchedule = {
  regular: {
    day: 'Sunday',
    time: '02:00-04:00 UTC',
    frequency: 'weekly',
    tasks: [
      'Database vacuum',
      'Log rotation',
      'Backup verification',
      'Security updates'
    ]
  },
  extended: {
    day: 'First Sunday',
    time: '02:00-06:00 UTC',
    frequency: 'monthly',
    tasks: [
      'Major updates',
      'Database optimization',
      'Full system backup',
      'Performance tuning'
    ]
  }
};
```

#### Maintenance Mode
```javascript
// middleware/maintenance.js
export function maintenanceMode(req, res, next) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    // Allow health checks
    if (req.path === '/api/health') {
      return next();
    }
    
    // Get maintenance info
    const info = {
      status: 'maintenance',
      message: process.env.MAINTENANCE_MESSAGE || 'System maintenance in progress',
      estimatedEndTime: process.env.MAINTENANCE_END_TIME,
      contact: 'support@company.com'
    };
    
    // Return maintenance page
    res.status(503).json(info);
  } else {
    next();
  }
}
```

### Maintenance Tasks

#### Database Maintenance
```bash
#!/bin/bash
# database-maintenance.sh

echo "=== Database Maintenance ==="

# 1. Update statistics
echo "Updating statistics..."
psql $DATABASE_URL -c "ANALYZE;"

# 2. Vacuum tables
echo "Vacuuming tables..."
psql $DATABASE_URL -c "VACUUM ANALYZE users;"
psql $DATABASE_URL -c "VACUUM ANALYZE training_sessions;"
psql $DATABASE_URL -c "VACUUM ANALYZE certificates;"

# 3. Reindex if needed
echo "Checking index bloat..."
psql $DATABASE_URL -f scripts/check-index-bloat.sql

# 4. Clean up old data
echo "Cleaning up old data..."
psql $DATABASE_URL -c "DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';"
psql $DATABASE_URL -c "DELETE FROM token_blacklist WHERE created_at < NOW() - INTERVAL '30 days';"

# 5. Check table sizes
echo "Checking table sizes..."
psql $DATABASE_URL -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"
```

#### Application Maintenance
```javascript
// scripts/app-maintenance.js
async function performApplicationMaintenance() {
  const tasks = [
    {
      name: 'Clear temporary files',
      fn: clearTempFiles
    },
    {
      name: 'Rotate logs',
      fn: rotateLogs
    },
    {
      name: 'Clean cache',
      fn: cleanCache
    },
    {
      name: 'Optimize images',
      fn: optimizeImages
    },
    {
      name: 'Update dependencies',
      fn: updateDependencies
    }
  ];
  
  for (const task of tasks) {
    console.log(`Running: ${task.name}`);
    try {
      await task.fn();
      console.log(`✓ ${task.name} completed`);
    } catch (error) {
      console.error(`✗ ${task.name} failed:`, error);
    }
  }
}

async function clearTempFiles() {
  const tempDirs = ['/tmp/uploads', '/tmp/exports'];
  
  for (const dir of tempDirs) {
    const files = await fs.readdir(dir);
    const oldFiles = files.filter(file => {
      const stats = fs.statSync(path.join(dir, file));
      const age = Date.now() - stats.mtime.getTime();
      return age > 24 * 60 * 60 * 1000; // 24 hours
    });
    
    for (const file of oldFiles) {
      await fs.unlink(path.join(dir, file));
    }
  }
}
```

## Performance Optimization

### Regular Optimization Tasks

#### Performance Audit
```javascript
// scripts/performance-audit.js
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runPerformanceAudit(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port
  };
  
  const runnerResult = await lighthouse(url, options);
  
  await chrome.kill();
  
  return {
    score: runnerResult.lhr.categories.performance.score * 100,
    metrics: {
      fcp: runnerResult.lhr.audits['first-contentful-paint'].numericValue,
      lcp: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
      tti: runnerResult.lhr.audits['interactive'].numericValue,
      cls: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue
    },
    opportunities: runnerResult.lhr.audits
      .filter(audit => audit.details?.type === 'opportunity')
      .map(audit => ({
        title: audit.title,
        savings: audit.details.overallSavingsMs
      }))
  };
}
```

#### Bundle Optimization
```javascript
// scripts/optimize-bundle.js
import { analyzeBundle } from 'webpack-bundle-analyzer';

async function optimizeBundle() {
  // Analyze current bundle
  const analysis = await analyzeBundle('./dist/stats.json');
  
  // Find large dependencies
  const largeDeps = analysis.modules
    .filter(m => m.size > 100000) // 100KB
    .sort((a, b) => b.size - a.size);
  
  console.log('Large dependencies:', largeDeps);
  
  // Suggest optimizations
  const suggestions = [];
  
  // Check for duplicate dependencies
  const duplicates = findDuplicates(analysis.modules);
  if (duplicates.length > 0) {
    suggestions.push({
      type: 'duplicates',
      message: 'Remove duplicate dependencies',
      items: duplicates
    });
  }
  
  // Check for unused exports
  const unused = findUnusedExports();
  if (unused.length > 0) {
    suggestions.push({
      type: 'unused',
      message: 'Remove unused exports',
      items: unused
    });
  }
  
  return suggestions;
}
```

## Monitoring Updates

### Update Monitoring

#### Version Tracking
```javascript
// lib/version-tracking.js
export class VersionTracker {
  constructor() {
    this.versions = {
      app: process.env.npm_package_version,
      node: process.version,
      npm: this.getNpmVersion(),
      database: this.getDatabaseVersion()
    };
  }
  
  async checkVersions() {
    const checks = [];
    
    // Check Node.js version
    const latestNode = await this.getLatestNodeVersion();
    if (this.isOutdated(this.versions.node, latestNode)) {
      checks.push({
        component: 'Node.js',
        current: this.versions.node,
        latest: latestNode,
        severity: 'medium'
      });
    }
    
    // Check database version
    const latestDb = await this.getLatestPostgresVersion();
    if (this.isOutdated(this.versions.database, latestDb)) {
      checks.push({
        component: 'PostgreSQL',
        current: this.versions.database,
        latest: latestDb,
        severity: 'high'
      });
    }
    
    return checks;
  }
  
  isOutdated(current, latest) {
    const [currMajor, currMinor] = current.split('.');
    const [latMajor, latMinor] = latest.split('.');
    
    return currMajor < latMajor || 
           (currMajor === latMajor && currMinor < latMinor);
  }
}
```

### Update Notifications

#### Notification System
```javascript
// lib/update-notifications.js
export class UpdateNotifier {
  async checkAndNotify() {
    const updates = await this.checkForUpdates();
    
    if (updates.security.length > 0) {
      await this.sendSecurityAlert(updates.security);
    }
    
    if (updates.major.length > 0) {
      await this.sendMajorUpdateNotice(updates.major);
    }
    
    // Weekly digest
    if (new Date().getDay() === 1) { // Monday
      await this.sendWeeklyDigest(updates);
    }
  }
  
  async sendSecurityAlert(vulnerabilities) {
    const critical = vulnerabilities.filter(v => v.severity === 'critical');
    const high = vulnerabilities.filter(v => v.severity === 'high');
    
    if (critical.length > 0) {
      // Page on-call engineer
      await this.pageOnCall({
        severity: 'critical',
        message: `${critical.length} critical security vulnerabilities detected`,
        vulnerabilities: critical
      });
    }
    
    // Send email to team
    await this.sendEmail({
      to: 'security@company.com',
      subject: 'Security Alert: Vulnerabilities Detected',
      template: 'security-alert',
      data: { critical, high }
    });
  }
}
```

## Documentation

### Update Documentation

#### Changelog Management
```javascript
// scripts/update-changelog.js
function updateChangelog(version, changes) {
  const date = new Date().toISOString().split('T')[0];
  const entry = `
## [${version}] - ${date}

### Added
${changes.added.map(item => `- ${item}`).join('\n')}

### Changed
${changes.changed.map(item => `- ${item}`).join('\n')}

### Fixed
${changes.fixed.map(item => `- ${item}`).join('\n')}

### Security
${changes.security.map(item => `- ${item}`).join('\n')}
`;
  
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const updated = changelog.replace(
    '# Changelog\n',
    `# Changelog\n${entry}`
  );
  
  fs.writeFileSync('CHANGELOG.md', updated);
}
```

#### Update Notes Template
```markdown
# Update Notes - v{{version}}

## Overview
Brief description of this update

## New Features
- Feature 1: Description
- Feature 2: Description

## Improvements
- Improvement 1: Description
- Improvement 2: Description

## Bug Fixes
- Fix 1: Description
- Fix 2: Description

## Security Updates
- Update 1: Description
- Update 2: Description

## Breaking Changes
- Change 1: Migration instructions
- Change 2: Migration instructions

## Upgrade Instructions
1. Step 1
2. Step 2
3. Step 3

## Rollback Instructions
If issues occur, rollback using:
```bash
vercel rollback {{previous-deployment-id}}
```

## Notes
- Additional information
- Known issues
- Future deprecations
```

## Best Practices

### Update Guidelines
1. **Test thoroughly** before production
2. **Document all changes** in changelog
3. **Communicate updates** to team/users
4. **Monitor after deployment** for issues
5. **Have rollback plan** ready
6. **Update in stages** (dev → test → prod)

### Security Best Practices
1. **Apply security patches immediately**
2. **Review dependency changes** for risks
3. **Test security updates** in isolation
4. **Monitor for new vulnerabilities** daily
5. **Keep audit trail** of all updates

### Maintenance Best Practices
1. **Schedule regular maintenance** windows
2. **Automate repetitive tasks**
3. **Monitor system health** continuously
4. **Document all procedures**
5. **Practice disaster recovery** regularly

## Related Documentation
- [Monitoring Guide](./monitoring.md) - System monitoring
- [Backup and Recovery](./backup-recovery.md) - Backup procedures
- [Production Deployment](../deployment/production.md) - Deployment guide
- [Security Architecture](../architecture/security.md) - Security details