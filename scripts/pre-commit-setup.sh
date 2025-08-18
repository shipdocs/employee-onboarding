#!/bin/bash

# Pre-commit Hook Setup Script
# Sets up automated safety checks to prevent Claude-introduced syntax errors

echo "🔧 Setting up pre-commit hooks for Claude safety..."

# Check if husky is installed
if ! npm list husky &>/dev/null; then
    echo "📦 Installing husky for git hooks..."
    npm install --save-dev husky
fi

# Create .husky directory if it doesn't exist
mkdir -p .husky

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🤖 Running Claude safety checks..."

# Run our custom Claude safety check
if ! ./scripts/claude-safety-check.sh; then
    echo "❌ Pre-commit failed: Claude safety check found issues"
    echo "💡 Fix the issues above and try committing again"
    exit 1
fi

# Run build check
echo "🏗️  Running build check..."
if ! npm run build; then
    echo "❌ Pre-commit failed: Build errors detected"
    exit 1
fi

echo "✅ Pre-commit checks passed!"
EOF

# Make the hook executable
chmod +x .husky/pre-commit

# Initialize husky
npx husky install

# Add to package.json scripts if not already there
if ! grep -q "prepare.*husky install" package.json; then
    echo "📝 Adding husky prepare script to package.json..."
    npm pkg set scripts.prepare="husky install"
fi

echo "✅ Pre-commit hooks setup complete!"
echo ""
echo "📋 What this does:"
echo "   - Runs Claude safety check before every commit"
echo "   - Runs build check to catch syntax errors"
echo "   - Prevents commits with Claude-introduced issues"
echo ""
echo "🚀 To test the setup:"
echo "   git add ."
echo "   git commit -m 'Test commit'"
echo ""
echo "💡 To bypass hooks in emergencies (use carefully):"
echo "   git commit --no-verify -m 'Emergency commit'"
