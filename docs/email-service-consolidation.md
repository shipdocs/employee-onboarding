# Email Service Consolidation

## Overview

This document describes the email service consolidation completed as part of the SIMONE workflow Week 2, Day 3. The consolidation standardized email template generation, eliminated duplicate code, and added retry logic for better reliability.

## Changes Made

### 1. Email Template Generator Enhancement

Added new template methods to `emailTemplateGenerator.js`:

- `generateSystemAlertTemplate()` - For system alerts and notifications
- `generateQuizRejectionTemplate()` - For quiz failure notifications  
- `generateWeeklyReportTemplate()` - For weekly training reports
- `generateFirstLoginNotificationTemplate()` - For first-time login alerts

### 2. Refactored Email Endpoints

Updated the following files to use centralized templates:

- `/api/email/send-alert.js` - Now uses `generateSystemAlertTemplate()`
- `/api/email/send-quiz-rejection.js` - Now uses `generateQuizRejectionTemplate()`
- `/api/email/send-weekly-report.js` - Now uses `generateWeeklyReportTemplate()`
- `/lib/notificationService.js` - Both notification methods now use `generateFirstLoginNotificationTemplate()`

### 3. Email Queue and Retry System

Created `/lib/emailQueue.js` with features:

- **Priority Queue**: High, normal, and low priority emails
- **Automatic Retry**: Up to 3 attempts with exponential backoff
- **Rate Limiting**: 1 second delay between emails to prevent spam
- **Database Persistence**: Stores queue in `email_queue` table when available
- **In-Memory Fallback**: Works without database table

### 4. Enhanced Unified Email Service

Added `sendEmailWithRetry()` method to `unifiedEmailService.js`:

```javascript
// Send with retry (non-critical emails)
await unifiedEmailService.sendEmailWithRetry(emailData, {
  priority: 'normal',
  maxRetries: 3
});

// Send immediately (critical emails like magic links)
await unifiedEmailService.sendEmailWithRetry(emailData, {
  immediate: true,
  priority: 'high'
});
```

## Benefits

1. **Consistency**: All emails now use the same template structure and styling
2. **Maintainability**: Email templates are centralized in one location
3. **Reliability**: Automatic retry ensures emails are delivered even during temporary failures
4. **Performance**: Rate limiting prevents overwhelming email providers
5. **Monitoring**: Queue status can be monitored for failed emails
6. **Multilingual**: All templates support both English and Dutch

## Migration Guide

To migrate existing email code to use the new system:

1. **Remove inline HTML templates** from your endpoint
2. **Import emailTemplateGenerator**:
   ```javascript
   import { emailTemplateGenerator } from '../../lib/emailTemplateGenerator';
   ```
3. **Generate template** using appropriate method:
   ```javascript
   const htmlContent = await emailTemplateGenerator.generateYourTemplate(
     param1,
     param2,
     lang
   );
   ```
4. **Send email** with retry support:
   ```javascript
   await unifiedEmailService.sendEmailWithRetry({
     to: recipient.email,
     toName: recipient.name,
     subject: subject,
     html: htmlContent,
     logType: 'your_email_type',
     userId: userId
   }, {
     priority: 'normal' // or 'high' for critical emails
   });
   ```

## Email Queue API

### Queue Status
```javascript
const status = emailQueue.getStatus();
// Returns: { queueLength, processing, statusCounts, oldestItem }
```

### Retry Failed Emails
```javascript
const retriedCount = emailQueue.retryFailed();
```

### Clear Failed Emails
```javascript
const clearedCount = emailQueue.clearFailed();
```

## Database Schema (Optional)

If you want to enable database persistence for the email queue:

```sql
CREATE TABLE email_queue (
  id TEXT PRIMARY KEY,
  email_data JSONB NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  message_id TEXT,
  error TEXT
);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_priority ON email_queue(priority);
CREATE INDEX idx_email_queue_created ON email_queue(created_at);
```

## Next Steps

1. Monitor email queue performance and adjust retry delays if needed
2. Consider adding webhook support for email delivery status
3. Add email preview functionality for template development
4. Implement email analytics dashboard