# Quick Reference: Where to Find Things

## 📍 Documentation Organization (NEW STRUCTURE)

### By Audience
- **Developers**: `docs/for-developers/`
  - Architecture: `docs/for-developers/architecture/`
  - API Reference: `docs/for-developers/api-reference/`
  - Development Workflow: `docs/for-developers/development-workflow/`
- **Administrators**: `docs/for-administrators/`
  - Deployment: `docs/for-administrators/deployment/`
  - Security: `docs/for-administrators/security/`
  - Maintenance: `docs/for-administrators/maintenance/`
- **End Users**: `docs/for-users/`
  - Manager Guide: `docs/for-users/manager-guide.md`
  - Crew Guide: `docs/for-users/crew-guide.md`

### By Topic
- **Features**: `docs/features/`
  - Authentication: `docs/features/authentication/`
  - Training System: `docs/features/training-system/`
  - Certificates: `docs/features/certificate-generation/`
- **API**: `docs/api/` and `docs/for-developers/api-reference/`
- **Getting Started**: `docs/getting-started/`

### Reports & Archives
- **Test Results**: `docs/reports/test-results/`
- **Bug Reports**: `docs/reports/bugs/`
- **Security Reports**: `docs/reports/security/`
- **Archive**: `docs/_archive/` (old documentation snapshots)

## 📍 Code Locations

### Source Code
- **API Routes**: `api/`
- **Frontend**: `client/src/`
- **Backend Services**: `services/`
- **Libraries**: `lib/`

### Scripts
- **Test Scripts**: `scripts/tests/`
- **Utility Scripts**: `scripts/utilities/`
- **Migration Scripts**: `scripts/`
- **Setup Scripts**: `scripts/`

### Configuration
- **Database**: `config/database.js`
- **Environment**: `.env` files in root
- **Vercel**: `vercel.json`

### Tests
- **Unit Tests**: `tests/unit/`
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: `e2e-tests/`

## 🔥 Hot Links (Updated Paths)

### For Developers
- [Getting Started](docs/getting-started/README.md)
- [API Reference](docs/for-developers/api-reference/README.md)
- [Development Workflow](docs/for-developers/development-workflow/workflow.md)
- [Database Design](docs/for-developers/architecture/database-design.md)

### For Administrators
- [Deployment Guide](docs/for-administrators/deployment/overview.md)
- [Security Guide](docs/for-administrators/security/security-overview.md)
- [Admin User Guide](docs/for-administrators/user-guide.md)

### Features
- [Authentication](docs/features/authentication/)
- [Training System](docs/features/training-system/)
- [Offline Functionality](docs/features/offline-functionality/)

### Reports
- [Latest Test Results](reports/test-results/2025-06-10-comprehensive-test-results.md)
- [Known Bugs](docs/reports/bugs/)
- [Security Reports](docs/reports/security/)

## 🎯 Quick Commands

```bash
# Run tests
npm test

# Run specific test file
npm test -- tests/unit/basicFunctionality.test.js

# Run integration tests
node scripts/tests/test-comprehensive.js

# Setup test accounts
node scripts/setup-test-accounts.js

# Clean up test data
node scripts/tests/cleanup-test-data.js
```