#!/bin/bash

# Script to create a clean repository ready for public release

echo "🎯 Creating Clean Public Repository"
echo "===================================="
echo ""
echo "This will create a new clean repository without any git history"
echo "in ../new-onboarding-2025-public/"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Define paths
CURRENT_DIR=$(pwd)
CLEAN_DIR="../new-onboarding-2025-public"

# Check if target directory exists
if [ -d "$CLEAN_DIR" ]; then
    echo "❌ Directory $CLEAN_DIR already exists!"
    echo "   Please remove it first or choose a different name"
    exit 1
fi

echo ""
echo "📋 Step 1: Creating clean directory..."
mkdir -p "$CLEAN_DIR"

echo "📋 Step 2: Copying files (excluding .git and sensitive files)..."
# Copy all files except git directory and sensitive files
rsync -av \
    --exclude='.git' \
    --exclude='*.env' \
    --exclude='*.env.*' \
    --exclude='!*.env.example' \
    --exclude='!*.env.template' \
    --exclude='mcp-config.json' \
    --exclude='test-claude-implementations.js' \
    --exclude='node_modules' \
    --exclude='.env*' \
    --exclude='files-to-remove.txt' \
    --exclude='.git.backup' \
    --exclude='bfg.jar' \
    --exclude='passwords.txt' \
    . "$CLEAN_DIR/"

echo ""
echo "📋 Step 3: Copying allowed .env templates..."
# Copy only example env files
cp .env.example "$CLEAN_DIR/" 2>/dev/null || true
cp .env.template "$CLEAN_DIR/" 2>/dev/null || true
cp .env.cloud.example "$CLEAN_DIR/" 2>/dev/null || true
cp .env.test.example "$CLEAN_DIR/" 2>/dev/null || true

echo ""
echo "📋 Step 4: Cleaning up any remaining sensitive files..."
cd "$CLEAN_DIR"

# Extra cleanup to be absolutely sure
find . -name "*.env" -not -name "*.example" -not -name "*.template" -delete 2>/dev/null || true
find . -name ".env.*" -not -name "*.example" -not -name "*.template" -delete 2>/dev/null || true
rm -f mcp-config.json test-claude-implementations.js 2>/dev/null || true

echo ""
echo "📋 Step 5: Initializing new git repository..."
git init
git add .
git commit -m "Initial commit: Maritime Onboarding System 2025

A comprehensive crew onboarding and training management platform for the maritime industry.

Features:
- Three-phase training workflow (Basic → Advanced → Quiz → Certificate)
- Multi-language support (English/Dutch)
- Role-based access control
- Automated certificate generation
- Comprehensive compliance tracking

This is a clean repository with no history, created for public release.
Original development repository maintained privately for historical reference."

echo ""
echo "✅ Clean repository created successfully!"
echo ""
echo "📋 Final Steps:"
echo ""
echo "1. Navigate to the new repository:"
echo "   cd $CLEAN_DIR"
echo ""
echo "2. Verify everything looks good:"
echo "   git status"
echo "   ls -la"
echo ""
echo "3. Create a new GitHub repository:"
echo "   Option A: Use GitHub CLI"
echo "   gh repo create maritime-onboarding-2025 --public --source=. --remote=origin --push"
echo ""
echo "   Option B: Use GitHub web interface"
echo "   - Create new public repository on GitHub"
echo "   - Then run:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "4. Update README with:"
echo "   - Installation instructions"
echo "   - Environment setup guide"
echo "   - Contributing guidelines"
echo "   - License information"
echo ""
echo "5. Add these GitHub features:"
echo "   - Enable Issues"
echo "   - Enable Discussions"
echo "   - Add topics (maritime, onboarding, training, nodejs, react)"
echo "   - Set up Security tab (security policy, advisories)"
echo ""
echo "✨ Your repository is ready to go public!"