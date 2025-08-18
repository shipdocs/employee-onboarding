# Supabase Migration System

This directory contains the migration system for the Maritime Onboarding project, designed to work with Supabase branching, GitHub, and Vercel integration.

## Directory Structure

```
supabase/
├── config.toml                 # Supabase project configuration
├── migrations/                 # Migration files directory
│   ├── 20250528070308_remote_schema.sql      # Initial remote schema
│   ├── 20250528071902_remote_schema.sql      # Full schema remote migration
│   ├── 20250528100001_add_migration_tracking.sql  # Migration tracking
│   ├── 20250528125150_test_migration_system.sql   # Test migration
│   ├── 20250528160800_ensure_admin_user.sql       # Admin user creation
│   └── 20250528161500_fix_admin_password.sql      # Admin password fix
└── seed.sql                    # Seed data for development
```

## Getting Started

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Install Vercel CLI (for local development):
   ```bash
   npm install -g vercel
   ```

## Environment Configuration

The project uses a single fresh Supabase project for development:

| Environment | Project ID | Purpose |
|-------------|------------|---------|
| **Development** | `ocqnnyxnqaedarcohywe` | Fresh development project |

### Initial Setup

For local development, link to the fresh project:

```bash
# Link to fresh project
supabase link --project-ref ocqnnyxnqaedarcohywe

# Pull latest schema
supabase db pull

# Apply migrations locally
supabase db push
```

### Creating a New Migration

To create a new migration:

```bash
node scripts/create-migration.js add_new_feature
```

This will create a new migration file in `supabase/migrations/` with a timestamp prefix.

Edit the migration file to add your SQL statements.

### Testing Migrations Locally

To apply migrations to your local development environment:

```bash
supabase db push
```

### Applying Seed Data

To apply seed data to your local development environment:

```bash
node scripts/apply-seed.js
```

You can also apply a specific seed file:

```bash
node scripts/apply-seed.js admin-user.sql
```

## Three-Tier Deployment Workflow

The project uses a validated three-tier deployment pipeline:

```
🔄 DEPLOYMENT WORKFLOW:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Local Dev       │ ─→ │ Testing Branch  │ ─→ │ Preview Branch  │ ─→ │ Production      │
│ Schema Sync     │    │ Team Review     │    │ Final Approval  │    │ Live System     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Local Development

1. **Sync Schema**: `supabase db pull` to get latest production schema
2. **Create Migration**: `npm run db:create-migration feature_name`
3. **Test Locally**: `supabase db push` to apply changes
4. **Commit Changes**: Include migration files in commits

### Deployment Pipeline

1. **Testing Environment**: Push to `testing` branch for team review
2. **Preview Environment**: Push to `preview` branch for final approval
3. **Production**: Merge to `main` branch for live deployment

### Automatic Migration

Vercel automatically applies migrations on deployment to each environment's respective Supabase database.

You can also manually trigger the workflow to apply migrations to a specific environment.

### Promotion Process

1. Develop and test on the testing branch
2. Merge testing into preview for staging verification
3. Merge preview into main for production deployment

## Environment Configuration

| Environment | Supabase Project Ref | Branch |
|-------------|---------------------|--------|
| Testing     | awylsjqmqhsegvvrkiim | testing |
| Preview     | atonfoxqfdfmraucwygt | preview |
| Production  | [REMOVED - WRONG PROJECT] | main |

## Best Practices

1. **One Change Per Migration**: Each migration should focus on a single logical change
2. **Descriptive Names**: Use clear, descriptive names for migration files
3. **Idempotent Migrations**: When possible, make migrations rerunnable
4. **Test Before Pushing**: Always test migrations locally before pushing
5. **Document Complex Changes**: Add comments for complex migrations
6. **Regular Backups**: Ensure regular backups before applying migrations
7. **Monitor Migration Logs**: Check logs for any issues

## Troubleshooting

### Common Issues

1. **Supabase CLI not found**
   - Make sure you've installed it with `npm install -g supabase`

2. **Authentication errors**
   - Run `supabase login` to authenticate

3. **Migration conflicts**
   - Make sure your migrations are idempotent
   - Check if the migration has already been applied

4. **Database connection issues**
   - Verify your Supabase URL and service role key
   - Check network connectivity

### Getting Help

If you encounter issues with the migration system, check:
1. Supabase documentation: https://supabase.com/docs
2. GitHub Actions logs
3. Migration logs table in the database