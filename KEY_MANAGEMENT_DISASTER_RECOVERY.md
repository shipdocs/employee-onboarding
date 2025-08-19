# 🚨 KEY MANAGEMENT & DISASTER RECOVERY PLAN

## ⚠️ CRITICAL WARNING

**LOSING ENCRYPTION KEYS = PERMANENT DATA LOSS**

If encryption keys are lost, corrupted, or become inaccessible:
- ❌ **ALL encrypted data becomes permanently unrecoverable**
- ❌ **No amount of technical expertise can recover the data**
- ❌ **Backups are useless without the encryption keys**
- ❌ **Business operations could be completely halted**

## 🛡️ KEY PROTECTION STRATEGY

### 1. **Multiple Key Backups (3-2-1 Rule)**

```bash
# Primary location (production server)
./secrets/keys/

# Backup location 1 (encrypted USB drive)
/media/backup-usb/maritime-keys-backup/

# Backup location 2 (secure cloud storage)
s3://maritime-secure-backups/encryption-keys/

# Backup location 3 (offline vault/safe)
Physical storage in fireproof safe
```

### 2. **Key Escrow System**

```bash
# Split keys using Shamir's Secret Sharing
# Require 3 out of 5 key holders to reconstruct
./scripts/split-keys.sh --threshold=3 --shares=5

# Distribute to trusted parties:
# - CTO (Share 1)
# - Lead DevOps (Share 2) 
# - Security Officer (Share 3)
# - External Auditor (Share 4)
# - Legal Counsel (Share 5)
```

### 3. **Automated Key Backup**

```bash
#!/bin/bash
# scripts/backup-keys.sh

# Encrypt keys with master password
gpg --symmetric --cipher-algo AES256 \
    --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 \
    --s2k-count 65536 \
    --output "keys-backup-$(date +%Y%m%d).gpg" \
    ./secrets/

# Upload to multiple locations
aws s3 cp keys-backup-*.gpg s3://maritime-secure-backups/
rsync keys-backup-*.gpg backup-server:/secure/maritime/
```

## 🔄 KEY ROTATION STRATEGY

### Safe Key Rotation Process

```bash
# 1. Create new keys (keep old ones)
./scripts/generate-new-keys.sh

# 2. Test new keys thoroughly
./scripts/test-encryption-keys.sh

# 3. Migrate data gradually (dual encryption)
./scripts/migrate-to-new-keys.sh --gradual

# 4. Verify all data accessible with new keys
./scripts/verify-data-integrity.sh

# 5. Only then remove old keys
./scripts/retire-old-keys.sh --confirm
```

### Key Rotation Schedule

| Key Type | Rotation Frequency | Risk Level |
|----------|-------------------|------------|
| Field Encryption | 90 days | HIGH |
| Volume Encryption | 180 days | CRITICAL |
| JWT Secrets | 30 days | MEDIUM |
| Database Passwords | 60 days | HIGH |
| Backup Encryption | 365 days | CRITICAL |

## 🆘 DISASTER RECOVERY PROCEDURES

### Scenario 1: Primary Key Loss

```bash
# 1. STOP all services immediately
docker compose down

# 2. Assess damage
./scripts/assess-key-damage.sh

# 3. Restore from backup
./scripts/restore-keys-from-backup.sh

# 4. Verify key integrity
./scripts/verify-key-integrity.sh

# 5. Test data access
./scripts/test-data-access.sh

# 6. Resume operations
docker compose up -d
```

### Scenario 2: Corrupted Encryption

```bash
# 1. Identify corrupted data
./scripts/identify-corrupted-data.sh

# 2. Restore from last known good backup
./scripts/restore-from-backup.sh --date=YYYY-MM-DD

# 3. Re-encrypt with fresh keys
./scripts/re-encrypt-data.sh

# 4. Verify integrity
./scripts/verify-data-integrity.sh
```

### Scenario 3: Complete System Loss

```bash
# 1. Provision new infrastructure
# 2. Restore keys from escrow/backup
# 3. Restore encrypted data from backups
# 4. Verify decryption works
# 5. Resume operations
```

## 🔐 KEY STORAGE BEST PRACTICES

### Production Environment

```bash
# 1. Hardware Security Module (HSM) - RECOMMENDED
# Store master keys in HSM, derive working keys

# 2. Encrypted key files with strong permissions
chmod 600 ./secrets/keys/*
chown root:root ./secrets/keys/*

# 3. Environment variables (less secure)
export FIELD_ENCRYPTION_KEY="$(cat ./secrets/keys/field_encryption.key)"
```

### Development Environment

```bash
# Use separate, weaker keys for development
# NEVER use production keys in development
./scripts/generate-dev-keys.sh
```

## 📋 KEY MANAGEMENT CHECKLIST

### Daily Checks
- [ ] Verify key files exist and are readable
- [ ] Check key backup integrity
- [ ] Monitor encryption/decryption errors

### Weekly Checks
- [ ] Test key restoration from backup
- [ ] Verify all backup locations accessible
- [ ] Check key rotation schedule

### Monthly Checks
- [ ] Full disaster recovery test
- [ ] Update key escrow if personnel changes
- [ ] Review and update key management procedures

### Quarterly Checks
- [ ] Rotate encryption keys
- [ ] Audit key access logs
- [ ] Update disaster recovery documentation

## 🚨 EMERGENCY CONTACTS

### Key Recovery Team
- **Primary**: CTO - +31-XXX-XXXXXX
- **Secondary**: Lead DevOps - +31-XXX-XXXXXX
- **Backup**: Security Officer - +31-XXX-XXXXXX

### External Support
- **HSM Vendor**: [Contact Info]
- **Cloud Provider**: [Support Contacts]
- **Security Consultant**: [Emergency Contact]

## 🛠️ IMPLEMENTATION SCRIPTS

### Key Backup Script
```bash
#!/bin/bash
# scripts/emergency-key-backup.sh

echo "🚨 EMERGENCY KEY BACKUP"
echo "======================="

# Create timestamped backup
BACKUP_DIR="./emergency-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copy all secrets
cp -r ./secrets/* "$BACKUP_DIR/"

# Create encrypted archive
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
gpg --symmetric --output "$BACKUP_DIR.tar.gz.gpg" "$BACKUP_DIR.tar.gz"

# Clean up unencrypted files
rm -rf "$BACKUP_DIR" "$BACKUP_DIR.tar.gz"

echo "✅ Emergency backup created: $BACKUP_DIR.tar.gz.gpg"
echo "⚠️  Store this file in multiple secure locations!"
```

### Key Verification Script
```bash
#!/bin/bash
# scripts/verify-keys.sh

echo "🔍 VERIFYING ENCRYPTION KEYS"
echo "============================"

# Test each key
for key_file in ./secrets/keys/*.key; do
    echo "Testing: $key_file"
    
    # Test encryption/decryption
    test_data="test-$(date +%s)"
    if echo "$test_data" | openssl enc -aes-256-cbc -k "$(cat $key_file)" | \
       openssl enc -d -aes-256-cbc -k "$(cat $key_file)" | \
       grep -q "$test_data"; then
        echo "✅ $key_file - OK"
    else
        echo "❌ $key_file - FAILED"
        exit 1
    fi
done

echo "✅ All keys verified successfully"
```

## 📖 RECOVERY PROCEDURES

### Step-by-Step Recovery

1. **Assess the Situation**
   ```bash
   # What keys are lost?
   # What data is affected?
   # What backups are available?
   ```

2. **Stop All Services**
   ```bash
   docker compose down
   systemctl stop maritime-*
   ```

3. **Restore Keys**
   ```bash
   # From backup location
   ./scripts/restore-keys.sh --source=backup-location
   
   # From escrow (if needed)
   ./scripts/reconstruct-from-escrow.sh
   ```

4. **Verify Key Integrity**
   ```bash
   ./scripts/verify-keys.sh
   ./scripts/test-decryption.sh
   ```

5. **Restore Data (if needed)**
   ```bash
   ./scripts/restore-data-from-backup.sh --date=latest-good
   ```

6. **Test System**
   ```bash
   ./scripts/test-full-system.sh
   ```

7. **Resume Operations**
   ```bash
   docker compose up -d
   ```

## ⚖️ LEGAL & COMPLIANCE

### Documentation Requirements
- [ ] Key management policy documented
- [ ] Recovery procedures tested and documented
- [ ] Incident response plan approved
- [ ] Insurance coverage for data loss reviewed

### Audit Trail
- [ ] All key operations logged
- [ ] Access to keys monitored
- [ ] Regular compliance audits scheduled

## 🎯 RECOMMENDATIONS

### Immediate Actions (Before Encryption)
1. **Create comprehensive key backup strategy**
2. **Test disaster recovery procedures**
3. **Set up key escrow system**
4. **Train operations team**
5. **Document all procedures**

### Long-term Improvements
1. **Implement Hardware Security Module (HSM)**
2. **Set up automated key rotation**
3. **Regular disaster recovery drills**
4. **External security audits**

## 🚨 FINAL WARNING

**NEVER PROCEED WITH ENCRYPTION WITHOUT:**
- ✅ Multiple key backups in place
- ✅ Tested recovery procedures
- ✅ Trained personnel
- ✅ Documented processes
- ✅ Management approval and understanding

**Remember: It's better to have unencrypted data than encrypted data with lost keys!**
