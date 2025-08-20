#!/bin/bash

# Apply database migration to fix auth schema mismatches
# Usage: ./apply-migration.sh

set -e

echo "🔧 Applying auth schema migration..."

# Check if Docker container is running
if ! docker ps | grep -q employee-onboarding-database; then
    echo "❌ Error: Database container 'employee-onboarding-database' is not running"
    echo "Please start it with: docker-compose up -d database"
    exit 1
fi

# Apply the migration
echo "📝 Running migration 002-fix-auth-schema.sql..."
docker exec -i employee-onboarding-database psql -U postgres -d employee_onboarding << EOF
$(cat 002-fix-auth-schema.sql)
EOF

echo "✅ Migration applied successfully!"

# Verify the changes
echo ""
echo "🔍 Verifying schema changes..."
echo ""
echo "token_blacklist columns:"
docker exec employee-onboarding-database psql -U postgres -d employee_onboarding -c "\d token_blacklist" | grep -E "token_jti|ip_address|user_agent|token_hash"

echo ""
echo "refresh_tokens columns:"
docker exec employee-onboarding-database psql -U postgres -d employee_onboarding -c "\d refresh_tokens" | grep -E "is_active|is_revoked"

echo ""
echo "✨ Schema migration complete!"