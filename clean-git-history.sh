#!/bin/bash

# Git History Cleaning Script for Public Repository
# This script removes all sensitive files from git history

echo "🔒 Git History Cleaning Script"
echo "================================"
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  Make sure you have a backup of your repository"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📋 Step 1: Creating list of files to remove..."

# Create a file with all sensitive patterns to remove
cat > files-to-remove.txt << 'EOF'
.env
.env.*
mcp-config.json
test-claude-implementations.js
*.env
*.env.local
*.env.development
*.env.test
*.env.production
*.env.vercel
*.env.cloud
.env.development.local
.env.test.local
.env.production.local
EOF

echo "✅ File list created"
echo ""
echo "📋 Step 2: Removing files from git history..."

# Use git filter-branch to remove all sensitive files
git filter-branch --force --index-filter \
  'while read file; do 
    git rm --cached --ignore-unmatch "$file" 2>/dev/null || true
  done < files-to-remove.txt' \
  --prune-empty --tag-name-filter cat -- --all

echo "✅ Files removed from history"
echo ""
echo "📋 Step 3: Cleaning up refs and garbage collection..."

# Clean up refs
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin

# Expire reflog
git reflog expire --expire=now --all

# Garbage collection
git gc --prune=now --aggressive

echo "✅ Repository cleaned"
echo ""
echo "📋 Step 4: Verification..."

# Check if any sensitive files remain in history
FOUND_SECRETS=0
for pattern in .env "*.env" "mcp-config.json" "test-claude-implementations.js"; do
    if git log --all --full-history -- "$pattern" | grep -q commit; then
        echo "⚠️  Warning: Found $pattern in history"
        FOUND_SECRETS=1
    fi
done

if [ $FOUND_SECRETS -eq 0 ]; then
    echo "✅ No sensitive files found in history!"
else
    echo "❌ Some sensitive files may still be in history. Please review."
fi

# Clean up
rm -f files-to-remove.txt

echo ""
echo "================================"
echo "📝 Next Steps:"
echo ""
echo "1. Review the changes:"
echo "   git log --oneline -10"
echo ""
echo "2. If everything looks good, force push to remote:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. Tell all collaborators to re-clone the repository"
echo ""
echo "⚠️  IMPORTANT: Anyone who has cloned this repo will need to re-clone it"
echo "   after you force push, as the git history has been rewritten."
echo ""