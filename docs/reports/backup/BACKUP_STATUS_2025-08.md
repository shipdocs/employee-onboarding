# Backup & Retention Status (Aug 2025)
Project: maritime-onboarding-fresh (ocqnnyxnqaedarcohywe)
Date: 2025-08-08

## Snapshots
- Daily database backups: present for last 7 days (status: COMPLETED)
- PITR: disabled

## Retention Enforcement
- No database-scheduled retention/cleanup jobs found (pg_cron not present)
- Application-level tables for jobs (data_deletion_jobs, exit_strategy_jobs) currently empty

## Recommendations
1) Implement scheduled retention jobs (Supabase Edge Function or Vercel Cron)
2) Log monthly retention run result to audit_log and export a PDF snapshot to docs/compliance-2025-pdf
3) Consider enabling PITR if required by contract

## Next Steps
- Create retention policy SQL and schedule
- Perform and document a restore test (Q3 2025)

