# Backup and Recovery Guide

This guide provides comprehensive procedures for backing up and recovering the Maritime Onboarding System, including database backups, file storage, configuration management, and disaster recovery procedures.

## Backup Overview

### Backup Strategy
- **3-2-1 Rule**: 3 copies of data, 2 different media types, 1 offsite copy
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 24 hours
- **Retention Policy**: Daily (7 days), Weekly (4 weeks), Monthly (12 months)

### What to Backup
1. **Database**: All PostgreSQL data
2. **File Storage**: Certificates, training photos, uploads
3. **Configuration**: Environment variables, settings
4. **Code**: Git repository (already version controlled)
5. **Secrets**: API keys, certificates, credentials

## Database Backup

### Automatic Backups (Supabase)

#### Backup Schedule
- **Free Tier**: Daily backups, 7-day retention
- **Pro Tier**: Daily backups, 30-day retention
- **Team/Enterprise**: Point-in-time recovery available

#### Access Backups
Via Supabase Dashboard:
1. Go to Settings → Database
2. Click on Backups tab
3. View available backups
4. Download or restore as needed

### Manual Database Backups

#### Full Database Backup
```bash
#!/bin/bash
# backup-database.sh

# Configuration
DB_URL="${PRODUCTION_DATABASE_URL}"
BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/maritime_onboarding_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Create backup
echo "Starting database backup..."
pg_dump "${DB_URL}" \
  --verbose \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="${BACKUP_FILE}"

# Compress backup
echo "Compressing backup..."
gzip "${BACKUP_FILE}"

# Verify backup
echo "Verifying backup..."
gunzip -c "${BACKUP_FILE}.gz" | pg_restore -l > /dev/null
if [ $? -eq 0 ]; then
  echo "Backup verified successfully"
else
  echo "Backup verification failed!"
  exit 1
fi

# Upload to cloud storage
echo "Uploading to cloud storage..."
aws s3 cp "${BACKUP_FILE}.gz" "s3://maritime-backups/database/${TIMESTAMP}.sql.gz"

# Clean up old local backups (keep last 7 days)
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

#### Incremental Backups
```bash
#!/bin/bash
# incremental-backup.sh

# Use pg_basebackup for incremental backups
pg_basebackup \
  --pgdata=/backups/incremental/$(date +%Y%m%d) \
  --host=db.supabase.co \
  --port=5432 \
  --username=postgres \
  --checkpoint=fast \
  --write-recovery-conf \
  --wal-method=stream \
  --gzip \
  --progress \
  --verbose
```

#### Table-Specific Backups
```bash
# Backup specific tables
TABLES="users training_sessions certificates audit_log"

for table in $TABLES; do
  pg_dump "${DB_URL}" \
    --table="${table}" \
    --data-only \
    --file="/backups/tables/${table}_$(date +%Y%m%d).sql"
done
```

### Database Restore Procedures

#### Full Restore from Supabase
```bash
# Via Supabase Dashboard
1. Go to Settings → Database → Backups
2. Select backup to restore
3. Click "Restore" button
4. Confirm restoration

# Note: This will overwrite current database
```

#### Manual Restore
```bash
#!/bin/bash
# restore-database.sh

# Configuration
BACKUP_FILE=$1
DB_URL="${PRODUCTION_DATABASE_URL}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-database.sh <backup-file>"
  exit 1
fi

echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Create restore point
echo "Creating restore point..."
pg_dump "${DB_URL}" > "/backups/restore-points/before_restore_$(date +%Y%m%d_%H%M%S).sql"

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
  echo "Decompressing backup..."
  gunzip -k "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Restore database
echo "Restoring database..."
pg_restore \
  --verbose \
  --no-owner \
  --no-privileges \
  --dbname="${DB_URL}" \
  --clean \
  --if-exists \
  "${BACKUP_FILE}"

echo "Database restored successfully"
```

#### Point-in-Time Recovery
```sql
-- Restore to specific timestamp
-- Note: Requires WAL archiving enabled

-- 1. Stop the database
-- 2. Restore base backup
-- 3. Configure recovery
CREATE FILE 'recovery.conf' WITH:
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2025-01-15 14:30:00'

-- 4. Start database
-- 5. Verify recovery
```

## File Storage Backup

### Supabase Storage Backup

#### Automated Storage Backup
```javascript
// scripts/backup-storage.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupBucket(bucketName, backupDir) {
  console.log(`Backing up bucket: ${bucketName}`);
  
  // List all files
  const { data: files, error } = await supabase.storage
    .from(bucketName)
    .list('', {
      limit: 1000,
      offset: 0
    });
  
  if (error) {
    throw error;
  }
  
  // Create backup directory
  const bucketBackupDir = path.join(backupDir, bucketName);
  fs.mkdirSync(bucketBackupDir, { recursive: true });
  
  // Download each file
  for (const file of files) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(file.name);
    
    if (error) {
      console.error(`Failed to download ${file.name}:`, error);
      continue;
    }
    
    // Save file
    const filePath = path.join(bucketBackupDir, file.name);
    const fileDir = path.dirname(filePath);
    fs.mkdirSync(fileDir, { recursive: true });
    
    const buffer = await data.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    console.log(`Backed up: ${file.name}`);
  }
}

async function main() {
  const backupDir = `/backups/storage/${new Date().toISOString().split('T')[0]}`;
  
  // Backup all buckets
  const buckets = ['certificates', 'training-photos', 'profile-photos'];
  
  for (const bucket of buckets) {
    await backupBucket(bucket, backupDir);
  }
  
  // Create archive
  const archiveName = `storage_backup_${Date.now()}.tar.gz`;
  exec(`tar -czf /backups/${archiveName} -C ${backupDir} .`);
  
  // Upload to cloud storage
  exec(`aws s3 cp /backups/${archiveName} s3://maritime-backups/storage/`);
  
  console.log('Storage backup completed');
}

main().catch(console.error);
```

#### Incremental File Sync
```bash
#!/bin/bash
# sync-storage.sh

# Use rclone for incremental sync
rclone sync \
  supabase:certificates \
  s3:maritime-backups/storage/certificates \
  --progress \
  --transfers 4 \
  --checkers 8 \
  --contimeout 60s \
  --timeout 300s \
  --retries 3 \
  --low-level-retries 10 \
  --stats 1s
```

### Storage Restore Procedures

#### Full Storage Restore
```javascript
// scripts/restore-storage.js
async function restoreBucket(bucketName, backupDir) {
  console.log(`Restoring bucket: ${bucketName}`);
  
  const bucketBackupDir = path.join(backupDir, bucketName);
  const files = getAllFiles(bucketBackupDir);
  
  for (const file of files) {
    const relativePath = path.relative(bucketBackupDir, file);
    const fileContent = fs.readFileSync(file);
    
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(relativePath, fileContent, {
        upsert: true
      });
    
    if (error) {
      console.error(`Failed to restore ${relativePath}:`, error);
    } else {
      console.log(`Restored: ${relativePath}`);
    }
  }
}
```

## Configuration Backup

### Environment Variables

#### Export Configuration
```bash
#!/bin/bash
# backup-config.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/config"

mkdir -p "${BACKUP_DIR}"

# Export Vercel environment variables
vercel env pull .env.production

# Encrypt sensitive configuration
gpg --encrypt \
  --recipient backup@company.com \
  --output "${BACKUP_DIR}/env_${TIMESTAMP}.gpg" \
  .env.production

# Backup Vercel configuration
vercel pull --yes
cp vercel.json "${BACKUP_DIR}/vercel_${TIMESTAMP}.json"

# Create configuration manifest
cat > "${BACKUP_DIR}/manifest_${TIMESTAMP}.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "environment": "production",
  "files": [
    "env_${TIMESTAMP}.gpg",
    "vercel_${TIMESTAMP}.json"
  ],
  "checksum": "$(sha256sum .env.production | cut -d' ' -f1)"
}
EOF
```

#### Restore Configuration
```bash
#!/bin/bash
# restore-config.sh

BACKUP_FILE=$1

# Decrypt configuration
gpg --decrypt "${BACKUP_FILE}" > .env.production

# Apply to Vercel
while IFS= read -r line; do
  if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
    key=$(echo "$line" | cut -d'=' -f1)
    value=$(echo "$line" | cut -d'=' -f2-)
    vercel env add "$key" production <<< "$value"
  fi
done < .env.production
```

### Secret Management

#### Backup Secrets
```bash
#!/bin/bash
# backup-secrets.sh

# Export from secret manager
aws secretsmanager get-secret-value \
  --secret-id maritime-onboarding-prod \
  --query SecretString \
  --output text > /tmp/secrets.json

# Encrypt secrets
gpg --encrypt \
  --recipient security@company.com \
  --output "/backups/secrets/secrets_$(date +%Y%m%d).gpg" \
  /tmp/secrets.json

# Clean up
shred -vfz -n 10 /tmp/secrets.json
```

## Automated Backup System

### Backup Scheduler

#### Cron Configuration
```bash
# /etc/cron.d/maritime-backups

# Database backups
0 2 * * * /scripts/backup-database.sh >> /var/log/backup.log 2>&1
0 3 * * 0 /scripts/backup-database-weekly.sh >> /var/log/backup.log 2>&1
0 4 1 * * /scripts/backup-database-monthly.sh >> /var/log/backup.log 2>&1

# Storage backups
0 5 * * * /scripts/backup-storage.sh >> /var/log/backup.log 2>&1

# Configuration backups
0 6 * * * /scripts/backup-config.sh >> /var/log/backup.log 2>&1

# Cleanup old backups
0 7 * * * /scripts/cleanup-old-backups.sh >> /var/log/backup.log 2>&1
```

#### Backup Monitoring
```javascript
// api/cron/backup-monitor.js
export default async function handler(req, res) {
  const checks = {
    database: await checkLastBackup('database', 25), // hours
    storage: await checkLastBackup('storage', 25),
    config: await checkLastBackup('config', 25)
  };
  
  const failures = Object.entries(checks)
    .filter(([_, status]) => !status.success)
    .map(([type, status]) => ({
      type,
      lastBackup: status.lastBackup,
      message: status.message
    }));
  
  if (failures.length > 0) {
    await sendAlert({
      severity: 'high',
      title: 'Backup Failure Detected',
      message: `${failures.length} backup types have not completed successfully`,
      details: failures
    });
  }
  
  res.json({ checks, failures });
}

async function checkLastBackup(type, maxHours) {
  const lastBackup = await getLastBackupTime(type);
  const hoursSince = (Date.now() - lastBackup) / (1000 * 60 * 60);
  
  return {
    success: hoursSince <= maxHours,
    lastBackup: new Date(lastBackup).toISOString(),
    hoursSince: Math.round(hoursSince),
    message: hoursSince > maxHours 
      ? `Last backup was ${Math.round(hoursSince)} hours ago`
      : 'Backup up to date'
  };
}
```

## Disaster Recovery

### Disaster Recovery Plan

#### Recovery Scenarios
1. **Database Corruption**: Restore from latest backup
2. **Data Loss**: Point-in-time recovery
3. **Service Outage**: Failover to backup region
4. **Complete System Failure**: Full system restore

#### Recovery Procedures

##### Scenario 1: Database Corruption
```bash
#!/bin/bash
# recover-database-corruption.sh

echo "=== Database Corruption Recovery ==="

# 1. Verify corruption
echo "Checking database integrity..."
psql $DATABASE_URL -c "SELECT pg_catalog.pg_is_in_recovery();"

# 2. Take application offline
echo "Taking application offline..."
vercel env add MAINTENANCE_MODE true production

# 3. Create recovery point
echo "Creating recovery point..."
pg_dump $DATABASE_URL > /backups/corruption_recovery_$(date +%Y%m%d_%H%M%S).sql

# 4. Restore from backup
echo "Restoring from latest backup..."
./restore-database.sh /backups/database/latest.sql.gz

# 5. Verify restoration
echo "Verifying database..."
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# 6. Bring application online
echo "Bringing application online..."
vercel env rm MAINTENANCE_MODE production

echo "Recovery completed"
```

##### Scenario 2: Complete System Restore
```bash
#!/bin/bash
# full-system-restore.sh

echo "=== Full System Recovery ==="

# 1. Restore database
echo "Step 1: Restoring database..."
./restore-database.sh $1

# 2. Restore file storage
echo "Step 2: Restoring file storage..."
./restore-storage.sh $2

# 3. Restore configuration
echo "Step 3: Restoring configuration..."
./restore-config.sh $3

# 4. Redeploy application
echo "Step 4: Redeploying application..."
git checkout $4  # Specific version
vercel --prod --force

# 5. Verify services
echo "Step 5: Verifying services..."
curl https://onboarding.burando.online/api/health

echo "Full system recovery completed"
```

### Recovery Testing

#### Disaster Recovery Drills
```javascript
// scripts/dr-drill.js
class DisasterRecoveryDrill {
  async runDrill(scenario) {
    console.log(`Starting DR drill: ${scenario}`);
    
    const startTime = Date.now();
    const steps = this.getScenarioSteps(scenario);
    const results = [];
    
    for (const step of steps) {
      try {
        const result = await this.executeStep(step);
        results.push({
          step: step.name,
          success: true,
          duration: result.duration,
          notes: result.notes
        });
      } catch (error) {
        results.push({
          step: step.name,
          success: false,
          error: error.message
        });
        break; // Stop on first failure
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    return {
      scenario,
      date: new Date().toISOString(),
      duration: totalDuration,
      rtoMet: totalDuration <= 3600000, // 1 hour
      results
    };
  }
  
  getScenarioSteps(scenario) {
    const scenarios = {
      'database-restore': [
        { name: 'Create test database', fn: this.createTestDatabase },
        { name: 'Restore backup', fn: this.restoreBackup },
        { name: 'Verify data integrity', fn: this.verifyData },
        { name: 'Run smoke tests', fn: this.runSmokeTests },
        { name: 'Clean up', fn: this.cleanUp }
      ],
      'full-recovery': [
        { name: 'Provision infrastructure', fn: this.provisionInfra },
        { name: 'Restore database', fn: this.restoreDatabase },
        { name: 'Restore storage', fn: this.restoreStorage },
        { name: 'Deploy application', fn: this.deployApp },
        { name: 'Verify functionality', fn: this.verifyFunctionality }
      ]
    };
    
    return scenarios[scenario] || [];
  }
}

// Run monthly DR drill
const drill = new DisasterRecoveryDrill();
const result = await drill.runDrill('database-restore');
console.log('DR Drill Results:', result);
```

## Backup Verification

### Automated Verification

#### Backup Integrity Checks
```javascript
// scripts/verify-backups.js
async function verifyDatabaseBackup(backupFile) {
  try {
    // Test restore to temporary database
    const testDb = `test_restore_${Date.now()}`;
    
    // Create test database
    await exec(`createdb ${testDb}`);
    
    // Restore backup
    await exec(`pg_restore -d ${testDb} ${backupFile}`);
    
    // Run integrity checks
    const checks = [
      'SELECT COUNT(*) FROM users',
      'SELECT COUNT(*) FROM training_sessions',
      'SELECT COUNT(*) FROM certificates',
      'SELECT MAX(created_at) FROM audit_log'
    ];
    
    for (const check of checks) {
      await exec(`psql -d ${testDb} -c "${check}"`);
    }
    
    // Clean up
    await exec(`dropdb ${testDb}`);
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function verifyStorageBackup(backupDir) {
  const requiredFiles = [
    'certificates/manifest.json',
    'training-photos/manifest.json'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(backupDir, file);
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `Missing ${file}` };
    }
  }
  
  return { valid: true };
}
```

### Backup Reports

#### Daily Backup Report
```javascript
// scripts/backup-report.js
async function generateBackupReport() {
  const report = {
    date: new Date().toISOString(),
    backups: {
      database: await getBackupStatus('database'),
      storage: await getBackupStatus('storage'),
      config: await getBackupStatus('config')
    },
    storage: {
      used: await getStorageUsed(),
      available: await getStorageAvailable()
    },
    verification: {
      lastRun: await getLastVerification(),
      results: await getVerificationResults()
    }
  };
  
  // Send report
  await sendEmail({
    to: 'ops@company.com',
    subject: `Backup Report - ${new Date().toDateString()}`,
    html: generateReportHtml(report)
  });
  
  // Store report
  await storeReport(report);
  
  return report;
}
```

## Best Practices

### Backup Guidelines
1. **Test restores regularly** - Monthly DR drills
2. **Verify backup integrity** - Automated checks
3. **Document procedures** - Keep runbooks updated
4. **Monitor backup jobs** - Alert on failures
5. **Secure backup storage** - Encryption at rest
6. **Follow 3-2-1 rule** - Multiple copies, different media
7. **Automate everything** - Reduce human error

### Security Considerations
1. **Encrypt all backups** - Use GPG or similar
2. **Secure transfer** - Use TLS/SSL
3. **Access control** - Limit who can restore
4. **Audit trail** - Log all backup operations
5. **Key management** - Rotate encryption keys
6. **Test decryption** - Ensure keys work

### Recovery Guidelines
1. **Document RTO/RPO** - Clear objectives
2. **Practice recovery** - Regular drills
3. **Have rollback plan** - In case restore fails
4. **Communicate status** - Keep stakeholders informed
5. **Verify functionality** - Test after restore
6. **Update documentation** - Learn from incidents

## Troubleshooting

### Common Issues

#### Backup Failures
```bash
# Check disk space
df -h /backups

# Check permissions
ls -la /backups

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check backup logs
tail -f /var/log/backup.log
```

#### Restore Failures
```bash
# Verify backup file
pg_restore -l backup.sql > /dev/null

# Check database permissions
psql $DATABASE_URL -c "\du"

# Test with smaller dataset
pg_dump -t small_table $DATABASE_URL | psql $TEST_DB
```

#### Performance Issues
```bash
# Use parallel backup
pg_dump -j 4 $DATABASE_URL -f backup.sql

# Compress on the fly
pg_dump $DATABASE_URL | gzip > backup.sql.gz

# Use incremental backups
pg_basebackup --wal-method=stream
```

## Related Documentation
- [Monitoring Guide](./monitoring.md) - Monitor backup status
- [Production Deployment](../deployment/production.md) - Production procedures
- [Incident Response](../INCIDENT_RESPONSE_PROCEDURES.md) - Emergency procedures
- [Database Architecture](../architecture/database.md) - Database details