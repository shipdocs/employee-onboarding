#!/bin/bash

# run-tests.sh - Execute onboarding functionality tests
# This script runs the comprehensive onboarding tests and opens the report

echo "🚀 Starting Shipdocs.app Onboarding Functionality Tests..."
echo "📋 Running comprehensive test suite..."

# Execute the test runner
node run-onboarding-tests.js

# Check if the tests ran successfully
if [ $? -eq 0 ]; then
  echo "✅ Tests completed successfully!"
else
  echo "❌ Tests failed. Check the console output for details."
  exit 1
fi

echo ""
echo "📝 For more information about the test protocol, see ONBOARDING_TEST_PROTOCOL.md"
echo ""