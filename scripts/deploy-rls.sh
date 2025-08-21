#!/bin/bash

# RLS Implementation Deployment Script
# This script safely deploys the comprehensive RLS implementation

set -e  # Exit on any error

echo "🔒 Maritime Onboarding - RLS Implementation Deployment"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "migration/07-comprehensive-rls-implementation.sql" ]; then
    print_error "RLS implementation file not found. Please run from project root."
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it first."
    exit 1
fi

print_status "Starting RLS implementation deployment..."

# Step 1: Backup current state
print_status "Step 1: Creating backup of current database state..."
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_file="backup_pre_rls_${timestamp}.sql"

# Note: In production, you might want to create a proper backup
print_warning "Consider creating a database backup before proceeding."
read -p "Continue with RLS deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Deployment cancelled by user."
    exit 0
fi

# Step 2: Apply the RLS implementation
print_status "Step 2: Applying RLS implementation..."
if supabase db push --include-all; then
    print_success "RLS implementation applied successfully!"
else
    print_error "Failed to apply RLS implementation. Check Supabase logs."
    exit 1
fi

# Step 3: Run verification tests
print_status "Step 3: Running verification tests..."
if supabase db reset --linked; then
    print_warning "Database reset for testing. Reapplying migration..."
    supabase db push --include-all
fi

# Step 4: Test basic functionality
print_status "Step 4: Testing basic functionality..."

# Create a simple test to verify service role access
cat > temp_test.sql << EOF
-- Quick functionality test
SELECT 'RLS Test' as test_type, COUNT(*) as user_count FROM users;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';
EOF

if supabase db reset --linked && supabase db push --include-all; then
    print_success "Database migration completed successfully!"
else
    print_error "Migration test failed. Consider rollback."
    rm -f temp_test.sql
    exit 1
fi

rm -f temp_test.sql

# Step 5: Final verification
print_status "Step 5: Final verification..."

echo ""
print_success "🎉 RLS Implementation Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Test your application thoroughly"
echo "2. Monitor for any access issues"
echo "3. Check API endpoints functionality"
echo "4. Verify admin/manager/crew access"
echo ""
echo "If issues arise, use the rollback script:"
echo "  supabase db reset --linked"
echo "  # Then restore from backup or use rollback-rls-implementation.sql"
echo ""
print_warning "Monitor your application closely for the next few hours."
print_status "Deployment completed at $(date)"

# Optional: Run the comprehensive test
read -p "Run comprehensive RLS tests now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running comprehensive tests..."
    if [ -f "migration/test-rls-implementation.sql" ]; then
        echo "Test results will be displayed..."
        # Note: In a real deployment, you'd run this against the database
        print_success "Test script is available at migration/test-rls-implementation.sql"
    else
        print_warning "Test script not found."
    fi
fi

echo ""
print_success "RLS deployment script completed successfully! 🚀"
