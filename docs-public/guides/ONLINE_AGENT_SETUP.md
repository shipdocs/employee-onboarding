<!-- This documentation has been sanitized for public viewing. Sensitive data has been replaced with placeholders. -->

# Online Agent Setup Guide

This guide ensures online AI agents (like Augment Agent) use the correct git configuration for the shipdocs organization.

## Quick Setup

Run this command at the start of any session:

```bash
npm run git:setup
```

Or manually:

```bash
git config user.email "user@example.com"
git config user.name "shipdocs"
```

## Why This Matters

- **Vercel Integration**: Vercel checks that commit author email matches GitHub account
- **Proper Attribution**: Ensures commits are properly attributed to shipdocs organization
- **CI/CD Pipeline**: Prevents deployment failures due to author mismatch

## Verification

Check current git config:

```bash
git config user.name    # Should return: shipdocs
git config user.email   # Should return: user@example.com
```

## For Online Agents

**Always run `npm run git:setup` before making any commits!**

This ensures:
- ✅ Commits pass Vercel author checks
- ✅ Proper GitHub attribution
- ✅ Successful CI/CD pipeline execution
- ✅ No deployment failures

## Troubleshooting

If you see "No GitHub account was found matching the commit author email address":

1. Run `npm run git:setup`
2. Amend the last commit: `git commit --amend --reset-author --no-edit`
3. Force push: `git push --force-with-lease`
