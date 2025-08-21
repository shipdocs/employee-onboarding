#!/bin/bash

# Local Supabase Testing Setup Script
echo "🚀 Setting up local Supabase for Dynamic Workflow testing..."
echo "================================================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g @supabase/cli
else
    echo "✅ Supabase CLI found"
fi

# Start Supabase if not running
echo "\n📦 Starting local Supabase..."
supabase start

if [ $? -eq 0 ]; then
    echo "✅ Supabase started successfully"
else
    echo "❌ Failed to start Supabase"
    exit 1
fi

# Show status
echo "\n📊 Supabase Status:"
supabase status

# Apply migrations
echo "\n🔄 Applying migrations..."
supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/postgres"

if [ $? -eq 0 ]; then
    echo "✅ Migrations applied successfully"
else
    echo "❌ Migration failed"
fi

# Test database connection
echo "\n🧪 Testing database setup..."
node test-local-db.js

echo "\n================================================================"
echo "🎉 Local setup complete!"
echo "\n🌐 Access points:"
echo "   • Database: postgresql://postgres:postgres@localhost:54322/postgres"
echo "   • API: http://localhost:54321"
echo "   • Studio: http://localhost:54323"
echo "\n🚀 Ready to test dynamic workflow system!"
echo "\n📝 Next steps:"
echo "   1. Run: npm run dev (in client/ directory)"
echo "   2. Visit: http://localhost:3000/flows"
echo "   3. Test workflow creation and management"
echo "================================================================"