# Retention Report — 2025-08
Project: maritime-onboarding-fresh (ocqnnyxnqaedarcohywe)
Date: 2025-08-08

## Policy Cutoffs (Configured)
- audit_log: 90 days
- email_logs & email_queue (sent/failed): 30 days
- performance_metrics & security_events: 60 days
- data_exports (completed): 21 days

## Dry Run Results (Supabase RPC)
- audit_log_deleted: 0
- email_logs_deleted: 0
- email_queue_deleted: 0
- performance_metrics_deleted: 0
- security_events_deleted: 0
- data_exports_deleted: 0

## Notes
- This is a dry‑run summary. For destructive run, POST /api/admin/retention/run with { "dryRun": false } (admin‑only).
- On destructive runs, an audit_log event retention_run is recorded.

