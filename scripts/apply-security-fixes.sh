#!/bin/bash

# Security Fix Script for Maritime Onboarding System
# Date: 2025-07-02

echo "Starting security remediation process..."

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 completed successfully"
    else
        echo "❌ $1 failed"
        exit 1
    fi
}

# Backup current package-lock files
echo "Creating backups..."
cp package-lock.json package-lock.json.security-backup 2>/dev/null
cp client/package-lock.json client/package-lock.json.security-backup 2>/dev/null

# Install root dependencies
echo "Installing root dependencies..."
npm install
check_status "Root dependency installation"

# Install client dependencies with overrides
echo "Installing client dependencies with security overrides..."
cd client
npm install --legacy-peer-deps
check_status "Client dependency installation"

# Run security audit
echo "Running security audit..."
npm audit || true  # Don't fail on audit issues, just report

# Go back to root
cd ..

# Run basic tests to ensure nothing is broken
echo "Running basic tests..."
npm run test:unit -- --testTimeout=10000 || echo "⚠️  Some tests failed - please review"

echo ""
echo "Security remediation process complete!"
echo ""
echo "Next steps:"
echo "1. Review the test results above"
echo "2. Run 'npm test' for full test suite"
echo "3. Test critical application flows manually"
echo "4. If all tests pass, commit the changes"
echo ""
echo "To revert changes if needed:"
echo "  mv package-lock.json.security-backup package-lock.json"
echo "  mv client/package-lock.json.security-backup client/package-lock.json"