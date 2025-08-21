#!/bin/bash

# Complete setup script for external logging feature
# This ensures everything is properly installed and configured

set -e

echo "🚀 Setting up External Logging with Grafana Cloud..."
echo "================================================"

# Step 1: Install dependencies
echo ""
echo "📦 Step 1: Installing NPM dependencies..."
if ! npm list winston >/dev/null 2>&1; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Step 2: Check if database is running
echo ""
echo "🗄️ Step 2: Checking database connection..."
if docker ps | grep -q employee-onboarding-database; then
    echo "✅ Database container is running"
else
    echo "❌ Database container is not running. Starting Docker Compose..."
    docker-compose up -d database
    sleep 5
fi

# Step 3: Apply database migration
echo ""
echo "📝 Step 3: Applying database migration..."
MIGRATION_CHECK=$(docker exec employee-onboarding-database psql -U postgres -d employee_onboarding -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'external_logging_config';" 2>/dev/null || echo "0")

if [ "$MIGRATION_CHECK" -eq "0" ] || [ -z "$MIGRATION_CHECK" ]; then
    echo "Applying migration..."
    docker exec employee-onboarding-database psql -U postgres -d employee_onboarding -f /database/migrations/003-external-logging-config.sql
    echo "✅ Migration applied successfully"
else
    echo "✅ Migration already applied"
fi

# Step 4: Verify API endpoint exists
echo ""
echo "🔌 Step 4: Verifying API endpoint..."
if [ -f "api/admin/external-logging.js" ]; then
    echo "✅ API endpoint exists"
else
    echo "❌ API endpoint missing at api/admin/external-logging.js"
    exit 1
fi

# Step 5: Verify React component exists
echo ""
echo "⚛️ Step 5: Verifying React component..."
if [ -f "client/src/components/admin/ExternalLoggingSettings.js" ]; then
    echo "✅ React component exists"
else
    echo "❌ React component missing"
    exit 1
fi

# Step 6: Check if environment variables are set (optional)
echo ""
echo "🔐 Step 6: Checking environment configuration..."
if [ -n "$GRAFANA_CLOUD_URL" ] && [ -n "$GRAFANA_CLOUD_API_KEY" ]; then
    echo "✅ Environment variables detected. Running automatic setup..."
    npm run external-logging:setup
else
    echo "ℹ️ No environment variables set. You can configure via:"
    echo "   1. Admin Dashboard → Settings → External Logging"
    echo "   2. Or set environment variables and run: npm run external-logging:setup"
fi

# Step 7: Restart backend if running
echo ""
echo "🔄 Step 7: Restarting backend service..."
if docker ps | grep -q employee-onboarding-backend; then
    docker-compose restart backend
    echo "✅ Backend restarted"
else
    echo "ℹ️ Backend not running. Start with: docker-compose up -d"
fi

echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Get your Grafana Cloud credentials:"
echo "   - Sign up at: https://grafana.com/auth/sign-up/create-user"
echo "   - Get your Loki endpoint URL"
echo "   - Create an API key with 'logs:write' permission"
echo ""
echo "2. Configure via Admin Dashboard:"
echo "   - Log in as admin"
echo "   - Go to Settings → External Logging"
echo "   - Enter your credentials"
echo "   - Test connection"
echo "   - Save configuration"
echo ""
echo "Or configure via environment:"
echo "   export GRAFANA_CLOUD_URL=https://logs-prod-us-central1.grafana.net"
echo "   export GRAFANA_CLOUD_USER=123456"
echo "   export GRAFANA_CLOUD_API_KEY=glc_..."
echo "   export EXTERNAL_LOGGING_ENABLED=true"
echo "   npm run external-logging:setup"
echo ""
echo "📚 Documentation: docs/EXTERNAL-LOGGING.md"