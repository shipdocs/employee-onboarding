#!/bin/bash

# Maritime Onboarding E2E Test Runner
# Easy-to-use script for running tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║        🚢 Maritime Onboarding E2E Test Suite         ║"
echo "║                    Test Runner                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Parse command line arguments
TEST_TYPE=${1:-"smoke"}
HEADLESS=${2:-"true"}

# Function to run tests
run_tests() {
    local test_name=$1
    local test_command=$2
    
    echo -e "\n${BLUE}🧪 Running ${test_name} tests...${NC}"
    echo "Command: ${test_command}"
    echo "================================"
    
    # Run the test command
    eval $test_command
    
    # Check exit code
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ ${test_name} tests completed successfully!${NC}"
    else
        echo -e "\n${RED}❌ ${test_name} tests failed!${NC}"
        exit 1
    fi
}

# Main test execution
case "$TEST_TYPE" in
    "smoke")
        run_tests "Smoke" "npm run test:smoke"
        ;;
    "auth")
        run_tests "Authentication" "npm run test:auth"
        ;;
    "crew")
        run_tests "Crew Onboarding" "npm run test:crew"
        ;;
    "manager")
        run_tests "Manager Dashboard" "npm run test:manager"
        ;;
    "admin")
        run_tests "Admin Functions" "npm run test:admin"
        ;;
    "performance")
        run_tests "Performance" "npm run test:performance"
        ;;
    "full")
        run_tests "Full Suite" "npm run test:full"
        ;;
    "staging")
        run_tests "Staging Environment" "npm run test:staging"
        ;;
    "production")
        echo -e "${YELLOW}⚠️  Production tests will run in headless mode${NC}"
        run_tests "Production Environment" "npm run test:production"
        ;;
    "debug")
        echo -e "${YELLOW}🔍 Debug mode - Browser will be visible${NC}"
        run_tests "Debug" "node index.js --no-headless --modules authentication"
        ;;
    "interactive")
        run_tests "Interactive" "npm run test:interactive"
        ;;
    *)
        echo -e "${RED}❌ Unknown test type: $TEST_TYPE${NC}"
        echo ""
        echo "Available test types:"
        echo "  smoke       - Quick validation tests (default)"
        echo "  auth        - Authentication tests only"
        echo "  crew        - Crew onboarding tests only"
        echo "  manager     - Manager dashboard tests only"
        echo "  admin       - Admin function tests only"
        echo "  performance - Performance tests only"
        echo "  full        - Complete test suite"
        echo "  staging     - Test against staging environment"
        echo "  production  - Test against production (headless)"
        echo "  debug       - Debug mode with visible browser"
        echo "  interactive - Interactive test selection"
        echo ""
        echo "Usage: ./run-tests.sh [test-type] [headless]"
        echo "Example: ./run-tests.sh smoke true"
        exit 1
        ;;
esac

# Show report location
echo -e "\n${BLUE}📊 Test reports available in:${NC}"
echo "   ./reports/test-report-*.html"
echo "   ./reports/test-report-*.json"

# Offer to open report
if command -v open &> /dev/null; then
    echo -e "\n${YELLOW}Would you like to open the latest HTML report? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        latest_report=$(ls -t reports/test-report-*.html 2>/dev/null | head -1)
        if [ -n "$latest_report" ]; then
            open "$latest_report"
        else
            echo -e "${RED}No report found${NC}"
        fi
    fi
fi

echo -e "\n${GREEN}✨ Test execution complete!${NC}"