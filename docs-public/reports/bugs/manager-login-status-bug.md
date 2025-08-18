<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Manager Login Bug

## Issue
Manager login is failing with "Account is not active" error even when the manager account is properly configured.

## Root Cause
In `/api/auth/manager-login.js` line 125, the code checks:
```javascript
if (user.status !== 'active') {
  return res.status(401).json({ error: 'Account is not active' });
}
```

However, the database constraint `users_status_check` only allows these values:
- 'not_started'
- 'in_progress'
- 'forms_completed'
- 'training_completed'
- 'fully_completed'
- 'suspended'

The value 'active' is NOT in this list.

## Evidence
1. When admins create managers (`/api/admin/managers/index.js` line 134), they set `status: 'fully_completed'`
2. The database constraint was updated in migration `07-rename-user-statuses.sql`
3. Admin login works because it checks for 'fully_completed' status

## Fix Applied
Changed line 125 in `/api/auth/manager-login.js` from:
```javascript
if (user.status !== 'active') {
```
to:
```javascript
if (user.status !== 'fully_completed') {
```

## Status
- Fix has been applied to the code
- Needs deployment to take effect
- Admin login works as a workaround for testing

## Test Accounts Affected
- user@example.com (password: YOUR_TEST_PASSWORD)