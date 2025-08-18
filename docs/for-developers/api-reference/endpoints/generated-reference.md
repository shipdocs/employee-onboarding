# API Reference

*Auto-generated from codebase analysis on 2025-07-14*

## Available Endpoints

Found 128 API endpoints in the codebase.

### Admin

#### `GET /api/admin/audit-log`

**File**: `api/admin/audit-log.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/admin/cleanup-tokens`

**File**: `api/admin/cleanup-tokens.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET, POST, PUT, DELETE /api/admin/feature-flags`

**File**: `api/admin/feature-flags.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/admin/feedback/summary`

**File**: `api/admin/feedback/summary.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/admin/managers/:id/resend-welcome-email`

**File**: `api/admin/managers/[id]/resend-welcome-email.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `POST /api/admin/managers/:id/send-magic-link`

**File**: `api/admin/managers/[id]/send-magic-link.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET, DELETE, PATCH /api/admin/managers/:id`

**File**: `api/admin/managers/[id].js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET, POST /api/admin/managers`

**File**: `api/admin/managers/index.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `GET /api/admin/performance/maritime`

**File**: `api/admin/performance/maritime.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/admin/performance/metrics`

**File**: `api/admin/performance/metrics.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/admin/quiz-results-detailed`

**File**: `api/admin/quiz-results-detailed.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/admin/refactoring-metrics`

**File**: `api/admin/refactoring-metrics.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/admin/run-notification-migration`

**File**: `api/admin/run-notification-migration.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/admin/stats`

**File**: `api/admin/stats.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET, POST, PUT, DELETE /api/admin/system-settings`

**File**: `api/admin/system-settings.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/admin/test-notifications`

**File**: `api/admin/test-notifications.js`

🔒 **Requires Authentication**

**Response Type**: json

---

### Auth

#### `POST /api/auth/admin-login`

**File**: `api/auth/admin-login.js`

✅ **Has Input Validation**

**Response Type**: json

---

#### `POST /api/auth/change-password`

**File**: `api/auth/change-password.js`

✅ **Has Input Validation**

**Response Type**: json

---

#### `POST /api/auth/logout`

**File**: `api/auth/logout.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/auth/magic-login`

**File**: `api/auth/magic-login.js`

**Response Type**: json

---

#### `POST /api/auth/request-magic-link`

**File**: `api/auth/request-magic-link.js`

**Response Type**: json

---

#### `GET /api/auth/verify`

**File**: `api/auth/verify.js`

🔒 **Requires Authentication**

**Response Type**: json

---

### Config

#### `GET, PUT /api/config/:key`

**File**: `api/config/[key].js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: unknown

---

#### `POST /api/config/batch`

**File**: `api/config/batch.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: unknown

---

#### `GET /api/config/environment`

**File**: `api/config/environment.js`

**Response Type**: unknown

---

### Content

#### `GET /api/content/check-migration`

**File**: `api/content/check-migration.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/content/migrate-training-data`

**File**: `api/content/migrate-training-data.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: unknown

---

#### `GET, PUT, DELETE /api/content/quizzes/:id`

**File**: `api/content/quizzes/[id].js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, POST /api/content/quizzes`

**File**: `api/content/quizzes.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/content/training/load-initial-data`

**File**: `api/content/training/load-initial-data.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, PUT, DELETE /api/content/training/phases/:id`

**File**: `api/content/training/phases/[id].js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: unknown

---

#### `GET /api/content/training/phases-simple`

**File**: `api/content/training/phases-simple.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, POST /api/content/training/phases`

**File**: `api/content/training/phases.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/content/validate`

**File**: `api/content/validate.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: unknown

---

### Crew

#### `POST /api/crew/forms/complete`

**File**: `api/crew/forms/complete.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `POST /api/crew/onboarding/analytics`

**File**: `api/crew/onboarding/analytics.js`

**Response Type**: json

---

#### `GET, POST, DELETE /api/crew/onboarding/progress`

**File**: `api/crew/onboarding/progress.js`

**Response Type**: json

---

#### `POST /api/crew/process/complete`

**File**: `api/crew/process/complete.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET, PUT /api/crew/profile`

**File**: `api/crew/profile.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `POST /api/crew/training/phase/:phase/start`

**File**: `api/crew/training/phase/[phase]/start.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/crew/training/phase/:phase`

**File**: `api/crew/training/phase/[phase].js`

✅ **Has Input Validation**

**Response Type**: json

---

#### `GET /api/crew/training/progress`

**File**: `api/crew/training/progress.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/crew/training/phases`

**File**: `pages/api/crew/training/phases.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

### Cron

#### `HANDLER /api/cron/automated-cleanup`

**File**: `api/cron/automated-cleanup.js`

**Response Type**: unknown

---

#### `HANDLER /api/cron/backup-database`

**File**: `api/cron/backup-database.js`

**Response Type**: json

---

#### `HANDLER /api/cron/cleanup-expired`

**File**: `api/cron/cleanup-expired.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `HANDLER /api/cron/cleanup-tokens`

**File**: `api/cron/cleanup-tokens.js`

**Response Type**: json

---

#### `POST /api/cron/progress-monitoring`

**File**: `api/cron/progress-monitoring.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `HANDLER /api/cron/send-reminders`

**File**: `api/cron/send-reminders.js`

🔒 **Requires Authentication**

**Response Type**: json

---

### Email

#### `POST /api/email/resend`

**File**: `api/email/resend.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/email/send-alert`

**File**: `api/email/send-alert.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/email/send-completion`

**File**: `api/email/send-completion.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/email/send-final-completion`

**File**: `api/email/send-final-completion.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/email/send-phase-start`

**File**: `api/email/send-phase-start.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/email/send-quiz-rejection`

**File**: `api/email/send-quiz-rejection.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/email/send-weekly-report`

**File**: `api/email/send-weekly-report.js`

🔒 **Requires Authentication**

**Response Type**: json

---

### Feedback

#### `POST /api/feedback/submit`

**File**: `api/feedback/submit.js`

🔒 **Requires Authentication**

**Response Type**: json

---

### Health

#### `GET /api/health/auth`

**File**: `api/health/auth.js`

**Response Type**: unknown

---

#### `GET /api/health/database`

**File**: `api/health/database.js`

**Response Type**: unknown

---

#### `GET /api/health/email`

**File**: `api/health/email.js`

**Response Type**: unknown

---

#### `GET /api/health/storage`

**File**: `api/health/storage.js`

**Response Type**: unknown

---

#### `GET /api/health`

**File**: `api/health.js`

✅ **Has Input Validation**

**Response Type**: json

---

### Manager

#### `GET /api/manager/certificates`

**File**: `api/manager/certificates/index.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/manager/crew/:id/resend-completion-email`

**File**: `api/manager/crew/[id]/resend-completion-email.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/manager/crew/:id/send-magic-link`

**File**: `api/manager/crew/[id]/send-magic-link.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/manager/crew/:id/send-onboarding-start`

**File**: `api/manager/crew/[id]/send-onboarding-start.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/manager/crew/:id/send-safety-pdf`

**File**: `api/manager/crew/[id]/send-safety-pdf.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET, PUT, DELETE /api/manager/crew/:id`

**File**: `api/manager/crew/[id].js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET, POST /api/manager/crew`

**File**: `api/manager/crew/index.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `GET /api/manager/dashboard/stats`

**File**: `api/manager/dashboard/stats.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/manager/onboarding/overview`

**File**: `api/manager/onboarding/overview.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/manager/onboarding-reviews/:userId/approve`

**File**: `api/manager/onboarding-reviews/[userId]/approve.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/manager/onboarding-reviews`

**File**: `api/manager/onboarding-reviews/index.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/manager/quiz-reviews/:id/approve`

**File**: `api/manager/quiz-reviews/[id]/approve.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/manager/quiz-reviews/pending`

**File**: `api/manager/quiz-reviews/pending.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

### Pdf

#### `POST /api/pdf/generate-certificate`

**File**: `api/pdf/generate-certificate.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/pdf/generate-form-05-03a`

**File**: `api/pdf/generate-form-05-03a.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/pdf/generate-intro-kapitein`

**File**: `api/pdf/generate-intro-kapitein.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/pdf/generate-manager-welcome`

**File**: `api/pdf/generate-manager-welcome.js`

🔒 **Requires Authentication**

**Response Type**: json

---

### Performance

#### `GET, POST /api/performance/metrics`

**File**: `api/performance/metrics.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

### Templates

#### `GET /api/templates/:id/preview`

**File**: `api/templates/[id]/preview.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `PATCH /api/templates/:id/rename`

**File**: `api/templates/[id]/rename.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `GET /api/templates/:id/thumbnail`

**File**: `api/templates/[id]/thumbnail.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, PUT, DELETE /api/templates/:id`

**File**: `api/templates/[id].js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/templates/fields/:id`

**File**: `api/templates/fields/[id].js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, POST /api/templates`

**File**: `api/templates/index.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/templates/pdf-to-image`

**File**: `api/templates/pdf-to-image.js`

**Response Type**: json

---

#### `POST /api/templates/preview`

**File**: `api/templates/preview.js`

**Response Type**: text

---

### Test

#### `POST /api/test/admin-login-no-rate-limit`

**File**: `api/test/admin-login-no-rate-limit.js`

**Response Type**: unknown

---

#### `POST /api/test/admin-login-test`

**File**: `api/test/admin-login-test.js`

**Response Type**: unknown

---

#### `GET /api/test/db-connection`

**File**: `api/test/db-connection.js`

**Response Type**: unknown

---

#### `GET /api/test`

**File**: `api/test.js`

**Response Type**: json

---

### Test-email-service

#### `GET /api/test-email-service`

**File**: `api/test-email-service.js`

**Response Type**: json

---

### Test-env

#### `HANDLER /api/test-env`

**File**: `api/test-env.js`

**Response Type**: unknown

---

### Training

#### `POST /api/training/phase/:phase/item/:itemNumber/complete`

**File**: `api/training/phase/[phase]/item/[itemNumber]/complete.js`

**Response Type**: json

---

#### `POST /api/training/phase/:phase/item/:itemNumber/uncomplete`

**File**: `api/training/phase/[phase]/item/[itemNumber]/uncomplete.js`

**Response Type**: json

---

#### `GET, POST, DELETE /api/training/phase/:phase/translations`

**File**: `api/training/phase/[phase]/translations.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/training/phase/:phase`

**File**: `api/training/phase/[phase].js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `POST /api/training/quiz/:phase/submit`

**File**: `api/training/quiz/[phase]/submit.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `POST /api/training/quiz/:phase/translate`

**File**: `api/training/quiz/[phase]/translate.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, POST, DELETE /api/training/quiz/:phase/translations`

**File**: `api/training/quiz/[phase]/translations.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/training/quiz/:phase`

**File**: `api/training/quiz/[phase].js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/training/quiz-history`

**File**: `api/training/quiz-history.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

#### `GET /api/training/quiz-questions`

**File**: `api/training/quiz-questions.js`

🔒 **Requires Authentication**

**Response Type**: json

---

#### `GET /api/training/stats`

**File**: `api/training/stats.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

### Translation

#### `POST /api/translation/batch-translate`

**File**: `api/translation/batch-translate.js`

**Response Type**: unknown

---

#### `POST /api/translation/detect-language`

**File**: `api/translation/detect-language.js`

**Response Type**: json

---

#### `GET, POST /api/translation/memory`

**File**: `api/translation/memory.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

### Upload

#### `POST /api/upload/content-image`

**File**: `api/upload/content-image.js`

**Response Type**: unknown

---

#### `POST /api/upload/content-video`

**File**: `api/upload/content-video.js`

**Response Type**: unknown

---

#### `POST /api/upload/training-proof/:itemId`

**File**: `api/upload/training-proof/[itemId].js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: json

---

### Workflows

#### `GET /api/workflows/:slug`

**File**: `api/workflows/[slug]/index.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/workflows/:slug/start`

**File**: `api/workflows/[slug]/start.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/workflows/:slug/stats`

**File**: `api/workflows/[slug]/stats.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/workflows/:slug/translate`

**File**: `api/workflows/[slug]/translate.js`

**Response Type**: unknown

---

#### `GET /api/workflows/available-training-content`

**File**: `api/workflows/available-training-content.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/workflows/debug`

**File**: `api/workflows/debug.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, PUT, DELETE, PATCH /api/workflows/edit-workflow`

**File**: `api/workflows/edit-workflow.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, POST, PUT, PATCH /api/workflows`

**File**: `api/workflows/index.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: unknown

---

#### `GET, POST /api/workflows/instances/:id/progress`

**File**: `api/workflows/instances/[id]/progress.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, PUT /api/workflows/instances/:id`

**File**: `api/workflows/instances/[id].js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `POST /api/workflows/items/:itemId/link-training`

**File**: `api/workflows/items/[itemId]/link-training.js`

🔒 **Requires Authentication**

✅ **Has Input Validation**

**Response Type**: unknown

---

#### `POST, PUT, DELETE /api/workflows/items/:itemId/training-content`

**File**: `api/workflows/items/[itemId]/training-content.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, POST /api/workflows/migrate-to-training-integration`

**File**: `api/workflows/migrate-to-training-integration.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/workflows/my-instances`

**File**: `api/workflows/my-instances.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET /api/workflows/progress-analytics`

**File**: `api/workflows/progress-analytics.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

#### `GET, POST /api/workflows/translations`

**File**: `api/workflows/translations.js`

🔒 **Requires Authentication**

**Response Type**: unknown

---

### :...slug

#### `HANDLER /api/:...slug`

**File**: `pages/api/[...slug].js`

**Response Type**: unknown

---

