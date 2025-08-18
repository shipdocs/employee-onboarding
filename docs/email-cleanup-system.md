# Email Cleanup System Documentation

**Automated data retention enforcement for email logging compliance**

## 🎯 Overview

The Email Cleanup System provides automated data retention enforcement for email logs, ensuring GDPR compliance and preventing unlimited storage growth. The system runs on Vercel with multiple redundancy layers.

## 📅 Schedule

### **Primary: Vercel Cron**
- **Schedule**: Daily at 1:00 AM UTC
- **Endpoint**: `/api/cron/email-cleanup`
- **Configuration**: `vercel.json`

### **Backup: GitHub Actions**
- **Schedule**: Daily at 2:30 AM UTC (30 min after primary)
- **Workflow**: `.github/workflows/email-cleanup-backup.yml`
- **Purpose**: Backup trigger if Vercel cron fails

## 🔧 Configuration

### **Environment Variables**
```bash
CRON_SECRET=your_secure_64_char_hex_secret
EMAIL_CLEANUP_ENABLED=true
EMAIL_CLEANUP_BATCH_SIZE=1000
EMAIL_CLEANUP_MAX_BATCHES=10
EMAIL_CLEANUP_INTERVAL_HOURS=24
```

### **Retention Categories**
- **Minimal**: 30 days (non-critical emails)
- **Standard**: 90 days (normal business emails) - **DEFAULT**
- **Extended**: 365 days (important notifications)
- **Permanent**: Never expires (critical audit records)

## 🚀 API Endpoints

### **1. Automated Cron Endpoint**
```
POST /api/cron/email-cleanup
Authorization: Bearer {CRON_SECRET}
```

**Response**:
```json
{
  "success": true,
  "total_deleted": 150,
  "tables_processed": 2,
  "execution_time_ms": 1250,
  "details": [
    {
      "table_name": "email_notifications",
      "deleted_count": 100,
      "batch_count": 1
    },
    {
      "table_name": "email_logs", 
      "deleted_count": 50,
      "batch_count": 1
    }
  ]
}
```

### **2. Admin Manual Cleanup**
```
POST /api/admin/email-cleanup
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "dryRun": false,
  "batchSize": 500,
  "maxBatches": 5
}
```

**Requirements**: Admin role authentication

### **3. Retention Status Monitoring**
```
GET /api/admin/email-retention-status
Authorization: Bearer {JWT_TOKEN}
```

**Response**:
```json
{
  "success": true,
  "summary": {
    "total_records": 1000,
    "total_expired": 50,
    "total_active": 950,
    "cleanup_needed": true
  },
  "details": [...]
}
```

## 🔒 Security

### **Authentication**
- **Cron Endpoint**: Bearer token with `CRON_SECRET`
- **Admin Endpoints**: JWT authentication + admin role
- **GitHub Actions**: Repository secrets for `CRON_SECRET`

### **Authorization**
- Cron jobs: System-level access
- Manual cleanup: Admin role required
- Status monitoring: Admin role required

### **Audit Trail**
- All cleanup operations logged to `audit_log` table
- Execution metrics tracked
- User attribution for manual operations

## 📊 Monitoring

### **Vercel Logs**
```bash
# Monitor cron execution
vercel logs --follow

# Filter for email cleanup
vercel logs --follow | grep "email-cleanup"
```

### **Database Monitoring**
```sql
-- Check retention status
SELECT * FROM email_retention_status;

-- Check recent cleanup operations
SELECT * FROM audit_log 
WHERE action IN ('email_log_cleanup', 'gdpr_email_deletion')
ORDER BY created_at DESC LIMIT 10;
```

### **Admin Dashboard**
- Access retention status via admin panel
- Manual cleanup triggers
- Real-time compliance monitoring

## 🛠️ Maintenance

### **Manual Cleanup**
```bash
# Test cleanup (dry run)
curl -X POST https://your-app.vercel.app/api/admin/email-cleanup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Force cleanup
curl -X POST https://your-app.vercel.app/api/admin/email-cleanup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### **Configuration Updates**
```bash
# Update batch size
vercel env add EMAIL_CLEANUP_BATCH_SIZE 2000

# Disable cleanup temporarily
vercel env add EMAIL_CLEANUP_ENABLED false

# Redeploy to apply changes
vercel --prod
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Cron Not Running**
1. Check Vercel cron configuration in `vercel.json`
2. Verify `CRON_SECRET` environment variable
3. Check Vercel function logs for errors
4. Ensure GitHub Actions backup is configured

#### **Authentication Failures**
1. Verify `CRON_SECRET` matches in all locations
2. Check JWT token validity for admin endpoints
3. Confirm admin role permissions

#### **Cleanup Failures**
1. Check database connection
2. Verify cleanup functions exist in database
3. Monitor batch size vs. available memory
4. Check for database locks or constraints

### **Emergency Procedures**

#### **Disable Cleanup**
```bash
vercel env add EMAIL_CLEANUP_ENABLED false
vercel --prod
```

#### **Manual Database Cleanup**
```sql
-- Emergency cleanup (use with caution)
SELECT cleanup_expired_email_logs(500, 5);

-- Check results
SELECT * FROM email_retention_status;
```

## 📈 Performance

### **Optimization Settings**
- **Batch Size**: 1000 records (configurable)
- **Max Batches**: 10 per run (configurable)
- **Memory**: 1GB allocated to cron function
- **Timeout**: 5 minutes maximum execution

### **Scaling Considerations**
- Increase batch size for large datasets
- Adjust max batches for time constraints
- Monitor memory usage during cleanup
- Consider off-peak scheduling for large operations

## 🔄 Backup & Recovery

### **Backup Strategy**
- GitHub Actions provides backup trigger
- Manual admin endpoints for emergency cleanup
- Database functions can be called directly
- Retention status monitoring for validation

### **Recovery Procedures**
1. Verify primary cron failure
2. Trigger GitHub Actions backup manually
3. Use admin endpoints for immediate cleanup
4. Monitor retention status for compliance
5. Investigate and fix primary cron issues

## ✅ Compliance

### **GDPR Requirements**
- ✅ Automatic data retention enforcement
- ✅ Right to be forgotten (`delete_user_email_logs`)
- ✅ Data lifecycle management
- ✅ Audit trail for all operations

### **Data Protection**
- ✅ Configurable retention periods
- ✅ Secure deletion of expired data
- ✅ Access control for cleanup operations
- ✅ Monitoring and alerting capabilities

**The Email Cleanup System ensures automated compliance with data retention requirements while providing operational flexibility and monitoring capabilities.**
