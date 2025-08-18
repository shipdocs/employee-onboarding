#!/bin/bash

# E2E Test Runner Script
# Provides convenient commands for running Playwright E2E tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BROWSER="chromium"
HEADED=false
DEBUG=false
UPDATE_SNAPSHOTS=false
WORKERS=4
RETRIES=2

# Function to display usage
usage() {
    echo -e "${BLUE}E2E Test Runner${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all              Run all E2E tests"
    echo "  smoke            Run smoke tests only"
    echo "  crew             Run crew-related tests"
    echo "  manager          Run manager-related tests"
    echo "  admin            Run admin-related tests"
    echo "  visual           Run visual regression tests"
    echo "  a11y             Run accessibility tests"
    echo "  specific <file>  Run specific test file"
    echo "  ui               Open Playwright UI mode"
    echo "  debug            Run in debug mode"
    echo "  update-snapshots Update visual regression snapshots"
    echo "  report           Show last test report"
    echo "  clean            Clean test artifacts"
    echo ""
    echo "Options:"
    echo "  -b, --browser <name>     Browser to use (chromium, firefox, webkit)"
    echo "  -h, --headed             Run tests in headed mode"
    echo "  -w, --workers <num>      Number of parallel workers"
    echo "  -r, --retries <num>      Number of retries for failed tests"
    echo "  --no-deps               Skip dependency check"
    echo ""
    echo "Examples:"
    echo "  $0 all                   # Run all tests"
    echo "  $0 smoke -h              # Run smoke tests in headed mode"
    echo "  $0 crew -b firefox       # Run crew tests in Firefox"
    echo "  $0 specific crew-onboarding.spec.ts"
    echo ""
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}npm is not installed. Please install Node.js and npm.${NC}"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! npm list @playwright/test &> /dev/null; then
        echo -e "${YELLOW}Playwright not found. Installing...${NC}"
        npm install
    fi
    
    # Check if browsers are installed
    if [ ! -d "node_modules/@playwright/test/node_modules/.cache" ]; then
        echo -e "${YELLOW}Playwright browsers not found. Installing...${NC}"
        npx playwright install
    fi
    
    echo -e "${GREEN}Dependencies OK${NC}"
}

# Function to setup test environment
setup_environment() {
    echo -e "${BLUE}Setting up test environment...${NC}"
    
    # Create .env.test if it doesn't exist
    if [ ! -f ".env.test" ]; then
        cp .env.example .env.test
        echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.test
        echo "NODE_ENV=test" >> .env.test
    fi
    
    # Create directories
    mkdir -p tests/e2e/.auth
    mkdir -p tests/e2e/screenshots
    mkdir -p test-results
    
    # Check if dev server is running
    if ! curl -s http://localhost:3000 > /dev/null; then
        echo -e "${YELLOW}Dev server not running. Starting...${NC}"
        npm run dev &
        SERVER_PID=$!
        sleep 5
    fi
    
    echo -e "${GREEN}Environment ready${NC}"
}

# Function to run tests
run_tests() {
    local test_command="npx playwright test"
    local test_pattern=""
    
    # Add browser option
    test_command="$test_command --project=$BROWSER"
    
    # Add headed option
    if [ "$HEADED" = true ]; then
        test_command="$test_command --headed"
    fi
    
    # Add workers option
    test_command="$test_command --workers=$WORKERS"
    
    # Add retries option
    test_command="$test_command --retries=$RETRIES"
    
    # Add test pattern based on command
    case $1 in
        all)
            test_pattern=""
            ;;
        smoke)
            test_pattern="--grep @smoke"
            ;;
        crew)
            test_pattern="tests/e2e/crew-*.spec.ts"
            ;;
        manager)
            test_pattern="tests/e2e/manager-*.spec.ts"
            ;;
        admin)
            test_pattern="tests/e2e/admin-*.spec.ts"
            ;;
        visual)
            test_pattern="tests/e2e/visual-accessibility.spec.ts --grep \"Visual Regression\""
            ;;
        a11y)
            test_pattern="tests/e2e/visual-accessibility.spec.ts --grep \"Accessibility\""
            ;;
        specific)
            test_pattern="tests/e2e/$2"
            ;;
    esac
    
    # Add update snapshots option
    if [ "$UPDATE_SNAPSHOTS" = true ]; then
        test_command="$test_command --update-snapshots"
    fi
    
    # Run tests
    echo -e "${BLUE}Running tests...${NC}"
    echo -e "${YELLOW}Command: $test_command $test_pattern${NC}"
    
    if $test_command $test_pattern; then
        echo -e "${GREEN}Tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Tests failed!${NC}"
        return 1
    fi
}

# Function to clean test artifacts
clean_artifacts() {
    echo -e "${BLUE}Cleaning test artifacts...${NC}"
    rm -rf test-results/*
    rm -rf playwright-report/*
    rm -rf tests/e2e/.auth/*
    echo -e "${GREEN}Cleaned${NC}"
}

# Parse command line arguments
COMMAND=$1
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -h|--headed)
            HEADED=true
            shift
            ;;
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        -r|--retries)
            RETRIES="$2"
            shift 2
            ;;
        --no-deps)
            SKIP_DEPS=true
            shift
            ;;
        *)
            EXTRA_ARGS="$1"
            shift
            ;;
    esac
done

# Main execution
case $COMMAND in
    all|smoke|crew|manager|admin|visual|a11y)
        if [ "$SKIP_DEPS" != true ]; then
            check_dependencies
        fi
        setup_environment
        run_tests $COMMAND
        ;;
    specific)
        if [ -z "$EXTRA_ARGS" ]; then
            echo -e "${RED}Please specify a test file${NC}"
            exit 1
        fi
        if [ "$SKIP_DEPS" != true ]; then
            check_dependencies
        fi
        setup_environment
        run_tests specific "$EXTRA_ARGS"
        ;;
    ui)
        check_dependencies
        setup_environment
        echo -e "${BLUE}Opening Playwright UI...${NC}"
        npx playwright test --ui
        ;;
    debug)
        check_dependencies
        setup_environment
        echo -e "${BLUE}Running in debug mode...${NC}"
        PWDEBUG=1 npx playwright test $EXTRA_ARGS
        ;;
    update-snapshots)
        check_dependencies
        setup_environment
        UPDATE_SNAPSHOTS=true
        run_tests visual
        ;;
    report)
        echo -e "${BLUE}Opening test report...${NC}"
        npx playwright show-report
        ;;
    clean)
        clean_artifacts
        ;;
    *)
        usage
        ;;
esac

# Cleanup
if [ ! -z "$SERVER_PID" ]; then
    echo -e "${BLUE}Stopping dev server...${NC}"
    kill $SERVER_PID
fi