#!/bin/bash

# Verification script to check if repository is ready to go public

echo "🔍 Repository Public Readiness Check"
echo "====================================="
echo ""

ISSUES_FOUND=0

# Check 1: Look for .env files in working directory
echo "Checking for .env files in working directory..."
ENV_FILES=$(find . -name ".env*" -not -name ".env.example" -not -name ".env.template" -not -name "*.example" | grep -v node_modules | grep -v .git)
if [ -z "$ENV_FILES" ]; then
    echo "✅ No .env files in working directory"
else
    echo "❌ Found .env files:"
    echo "$ENV_FILES"
    ISSUES_FOUND=1
fi
echo ""

# Check 2: Look for sensitive files in git
echo "Checking for sensitive files in git index..."
TRACKED_ENVS=$(git ls-files | grep -E "\.env|mcp-config\.json|test-claude-implementations\.js" | grep -v example | grep -v template)
if [ -z "$TRACKED_ENVS" ]; then
    echo "✅ No sensitive files tracked by git"
else
    echo "❌ Found tracked sensitive files:"
    echo "$TRACKED_ENVS"
    ISSUES_FOUND=1
fi
echo ""

# Check 3: Search for JWT tokens in history
echo "Searching for JWT tokens in git history..."
if git log --all --full-history -S "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --oneline | grep -q .; then
    echo "❌ Found JWT tokens in git history!"
    echo "   Run ./clean-git-history.sh or ./clean-with-bfg.sh to clean"
    ISSUES_FOUND=1
else
    echo "✅ No JWT tokens found in history"
fi
echo ""

# Check 4: Search for Supabase keys in current files
echo "Checking for hardcoded Supabase keys..."
SUPABASE_KEYS=$(grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v "test-" | grep -v "mock" | head -5)
if [ -z "$SUPABASE_KEYS" ]; then
    echo "✅ No hardcoded Supabase keys in code"
else
    echo "⚠️  Found potential Supabase keys (verify if they're test/mock only):"
    echo "$SUPABASE_KEYS" | head -3
    ISSUES_FOUND=1
fi
echo ""

# Check 5: Look for production URLs
echo "Checking for hardcoded production URLs..."
PROD_URL_COUNT=$(grep -r "onboarding.burando.online\|ocqnnyxnqaedarcohywe.supabase.co" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | wc -l)
if [ "$PROD_URL_COUNT" -eq 0 ]; then
    echo "✅ No hardcoded production URLs"
else
    echo "⚠️  Found $PROD_URL_COUNT instances of hardcoded production URLs"
    echo "   Consider replacing with environment variables"
fi
echo ""

# Check 6: Verify .gitignore is proper
echo "Checking .gitignore configuration..."
if grep -q "^\.env$" .gitignore && grep -q "^\.env\.\*$" .gitignore; then
    echo "✅ .gitignore properly configured for .env files"
else
    echo "⚠️  .gitignore may need updates for .env patterns"
fi
echo ""

# Check 7: Look for API keys or secrets in code
echo "Scanning for potential secrets in code..."
SECRET_PATTERNS=$(grep -r -E "api[_-]?key|secret|password|token" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v "process.env" | grep -v "TEST" | grep -v "test" | grep -v "mock" | grep -v "//" | wc -l)
if [ "$SECRET_PATTERNS" -lt 10 ]; then
    echo "✅ Minimal hardcoded secret patterns found"
else
    echo "⚠️  Found $SECRET_PATTERNS potential secret patterns"
    echo "   Review these manually to ensure they're not real secrets"
fi

echo ""
echo "====================================="
echo "📊 Summary:"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ Repository appears ready to go public!"
    echo ""
    echo "Recommended final steps:"
    echo "1. Run: git log --oneline -20  (review recent commits)"
    echo "2. Run: git status  (ensure working directory is clean)"
    echo "3. Create a backup: cp -r . ../backup-before-public"
    echo "4. Make repository public on GitHub"
    echo "5. Enable GitHub security features:"
    echo "   - Secret scanning"
    echo "   - Dependabot alerts"
    echo "   - Code scanning"
else
    echo "❌ Issues found! Fix these before going public:"
    echo ""
    echo "1. Run: ./clean-git-history.sh  (or ./clean-with-bfg.sh for faster cleaning)"
    echo "2. Remove any remaining sensitive files"
    echo "3. Update .gitignore if needed"
    echo "4. Run this script again to verify"
fi

echo ""
exit $ISSUES_FOUND