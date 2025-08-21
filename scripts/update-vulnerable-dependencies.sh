#!/bin/bash

# Dependency Security Update Script
# This script updates all vulnerable dependencies identified in the security audit

set -e  # Exit on error

echo "🔒 Maritime Onboarding System - Dependency Security Update"
echo "========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 succeeded${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Backup current package files
echo "📦 Backing up package files..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
cp client/package.json client/package.json.backup
cp client/package-lock.json client/package-lock.json.backup
check_status "Backup creation"

echo ""
echo "🔄 Updating root dependencies..."
echo "================================"

# Update root dependencies
cd /home/martin/Ontwikkeling/new-onboarding-2025

echo "1. Updating axios (HIGH PRIORITY - Security Fix)..."
npm install axios@^1.10.0 --save
check_status "axios update"

echo "2. Migrating from bcryptjs to bcrypt (MODERATE PRIORITY)..."
npm uninstall bcryptjs
npm install bcrypt@^5.1.1 --save
check_status "bcrypt migration"

echo "3. Updating uuid..."
npm install uuid@^11.1.0 --save
check_status "uuid update"

echo "4. Updating nodemailer..."
npm install nodemailer@^7.0.4 --save
check_status "nodemailer update"

echo "5. Updating dotenv (optional but recommended)..."
npm install dotenv@^17.0.1 --save
check_status "dotenv update"

echo ""
echo "🔄 Updating client dependencies..."
echo "==================================="

cd client

echo "1. Updating axios in client (HIGH PRIORITY)..."
npm install axios@^1.10.0 --save
check_status "client axios update"

echo "2. Fixing type definitions..."
npm install @types/react@^18.3.1 @types/react-dom@^18.3.1 --save-dev
check_status "type definitions update"

echo "3. Installing missing dependencies..."
npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2 --save
npm install dompurify@^3.2.6 --save
npm install @types/dompurify@^3.0.5 --save-dev
check_status "missing dependencies installation"

echo ""
echo "🔍 Running security audit..."
echo "============================"

cd ..
echo "Root directory audit:"
npm audit --audit-level=moderate || true

echo ""
echo "Client directory audit:"
cd client
npm audit --audit-level=moderate || true

cd ..

echo ""
echo "📝 Creating migration notes..."
cat > BCRYPT_MIGRATION_NOTES.md << 'EOF'
# bcryptjs to bcrypt Migration Notes

## Code Changes Required

The API for bcrypt is identical to bcryptjs, so you only need to update the import statements:

### Before:
```javascript
const bcrypt = require('bcryptjs');
```

### After:
```javascript
const bcrypt = require('bcrypt');
```

## Files to Update:
1. `/api/auth/admin-login.js`
2. `/api/auth/manager-login.js`
3. `/api/manager/crew/index.js`
4. `/scripts/reset-admin-password.js`
5. `/scripts/generate-password-hash.js`
6. Any other files importing bcryptjs

## Benefits:
- Better performance (C++ implementation)
- More secure against timing attacks
- Active maintenance and security updates
EOF

echo -e "${GREEN}✓ Migration notes created${NC}"

echo ""
echo "🎯 Update Summary"
echo "================="
echo -e "${GREEN}✓ All critical security updates completed${NC}"
echo -e "${YELLOW}⚠️  Please update import statements from 'bcryptjs' to 'bcrypt'${NC}"
echo -e "${YELLOW}⚠️  Run full test suite to ensure compatibility${NC}"
echo ""
echo "Next steps:"
echo "1. Update bcrypt import statements (see BCRYPT_MIGRATION_NOTES.md)"
echo "2. Run: npm test"
echo "3. Run: npm run build"
echo "4. Test authentication flows manually"
echo "5. Commit changes with message: 'fix: update vulnerable dependencies (CVE fixes)'"

echo ""
echo "🔒 Security update complete!"