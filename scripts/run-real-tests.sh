#!/bin/bash

echo "🌍 Real-World Integration Testing"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're testing against production or local
if [ "$1" == "local" ]; then
  export BASE_URL="http://localhost:3000"
  echo -e "${YELLOW}🏠 Testing against LOCAL environment${NC}"
else
  export BASE_URL="https://onboarding.burando.online"
  echo -e "${YELLOW}🌐 Testing against PRODUCTION environment${NC}"
fi

echo ""
echo "⚠️  SAFETY CHECKS:"
echo "=================="

# Confirm before running against production
if [[ "$BASE_URL" == *"burando.online"* ]]; then
  echo -e "${RED}WARNING: You're about to run tests against PRODUCTION!${NC}"
  echo "This will create real data in the production database."
  echo ""
  read -p "Are you sure? Type 'yes' to continue: " confirm
  
  if [ "$confirm" != "yes" ]; then
    echo "Test cancelled."
    exit 1
  fi
fi

# Check if test accounts exist
echo ""
echo "📋 Checking test accounts..."
echo ""

# Option to set up test accounts
read -p "Do you need to create test accounts? (y/n): " setup_accounts

if [ "$setup_accounts" == "y" ]; then
  echo "Creating test accounts..."
  node scripts/setup-test-accounts.js
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create test accounts${NC}"
    exit 1
  fi
fi

# Run the tests
echo ""
echo "🧪 Running integration tests..."
echo "==============================="
echo ""

# Run with proper error handling
npm test -- tests/integration/real-world-test.js --no-coverage --verbose

TEST_RESULT=$?

echo ""
echo "📊 TEST SUMMARY"
echo "==============="

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ All integration tests passed!${NC}"
  echo ""
  echo "✓ Authentication flows working"
  echo "✓ Workflow CRUD operations verified"
  echo "✓ Crew onboarding process functional"
  echo "✓ Manager dashboard accessible"
  echo "✓ PDF generation working"
  echo "✓ Email system operational"
  echo "✓ Health checks passing"
else
  echo -e "${RED}❌ Some tests failed${NC}"
  echo ""
  echo "Please review the test output above for details."
fi

echo ""
echo "🧹 CLEANUP"
echo "=========="
read -p "Do you want to clean up test data? (y/n): " cleanup

if [ "$cleanup" == "y" ]; then
  echo "Cleaning up test accounts..."
  node scripts/setup-test-accounts.js cleanup
fi

echo ""
echo "✨ Testing complete!"