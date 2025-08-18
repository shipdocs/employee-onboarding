# Security Checklist for Public Repository

## ⚠️ CRITICAL ISSUES TO FIX BEFORE GOING PUBLIC

### 1. 🔴 Remove ALL Hardcoded Secrets
**CRITICAL**: Found hardcoded Supabase keys in test file:
- `test-claude-implementations.js` contains REAL production Supabase keys (lines 6-7)
  - SUPABASE_ANON_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - SUPABASE_SERVICE_ROLE_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Action Required**: Delete or replace with environment variables immediately!

### 2. 🔴 Remove Sensitive Configuration Files
Found multiple `.env` files in repository:
- `.env` - Production credentials
- `.env.cloud.example` 
- `.env.development` - Development settings
- `.env.local` - Local settings
- `.env.test` - Test credentials
- `.env.vercel` - Vercel deployment settings
- `mcp-config.json` - MCP configuration with potential secrets

**Action Required**: 
- Ensure ALL `.env*` files are removed from git history
- Keep only `.env.example` and `.env.template` as templates

### 3. 🟡 Replace Hardcoded URLs
Found 48 instances of production URLs hardcoded in the codebase:
- `onboarding.burando.online` - Production domain
- `ocqnnyxnqaedarcohywe.supabase.co` - Production Supabase instance

**Action Required**: Replace all hardcoded URLs with environment variables

### 4. 🟡 Clean Test Files
Test files contain mock secrets that could be misleading:
- `tests/setup.js` - Contains mock JWT tokens (safe but should be clearly marked)
- Multiple test files reference production-like configurations

**Action Required**: Clearly mark all test credentials as MOCK/TEST only

## ✅ GOOD SECURITY PRACTICES ALREADY IN PLACE

### 1. Proper .gitignore Configuration
- Environment files are properly ignored
- MCP configuration is ignored
- Test credentials and secrets are ignored
- Good coverage of sensitive file patterns

### 2. Authentication Implementation
- JWT verification with proper token blacklisting
- Suspicious activity detection
- Role-based access control
- Token expiration handling

### 3. Environment Variable Usage
- Most sensitive data uses environment variables
- Clear `.env.example` template provided
- Proper separation of client/server keys

## 📋 PRE-PUBLIC CHECKLIST

### Immediate Actions (MUST DO):
- [ ] **Remove `test-claude-implementations.js` or clean hardcoded keys**
- [ ] **Delete all `.env*` files except templates from repository**
- [ ] **Remove `mcp-config.json` from repository**
- [ ] **Clean git history to remove any committed secrets**
  ```bash
  # Use BFG Repo-Cleaner or git-filter-branch to remove sensitive data
  # https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
  ```

### Security Hardening (SHOULD DO):
- [ ] Replace all hardcoded URLs with environment variables
- [ ] Add security policy file (`SECURITY.md`)
- [ ] Set up secret scanning in GitHub
- [ ] Enable Dependabot for vulnerability alerts
- [ ] Add GitHub Actions for security checks

### Documentation Updates:
- [ ] Update README with clear setup instructions
- [ ] Add contributing guidelines
- [ ] Document security best practices for contributors
- [ ] Add license file

## 🛠️ Recommended Tools

### For Cleaning Git History:
```bash
# Install BFG Repo-Cleaner
java -jar bfg.jar --delete-files test-claude-implementations.js
java -jar bfg.jar --replace-text passwords.txt  # File with patterns to replace

# Or use git-filter-branch (slower but built-in)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch test-claude-implementations.js' \
  --prune-empty --tag-name-filter cat -- --all
```

### For Secret Scanning:
```bash
# Install and run git-secrets
brew install git-secrets
git secrets --install
git secrets --scan
```

### For Dependency Scanning:
```bash
npm audit
npm audit fix
```

## 📝 Post-Public Setup

After making the repository public:
1. Enable GitHub Security features:
   - Security advisories
   - Dependabot alerts
   - Secret scanning
   - Code scanning

2. Set up branch protection rules:
   - Require pull request reviews
   - Require status checks
   - Require up-to-date branches

3. Add security contact information

4. Consider adding:
   - `.github/SECURITY.md` - Security policy
   - `.github/CODEOWNERS` - Code ownership
   - `.github/dependabot.yml` - Automated dependency updates

## ⚠️ FINAL WARNING

**DO NOT make this repository public until ALL items in the "CRITICAL ISSUES" section are resolved!**

The repository currently contains production secrets that would compromise your entire system if exposed.

---
*Generated on: 2025-08-18*
*Review this checklist thoroughly before proceeding*