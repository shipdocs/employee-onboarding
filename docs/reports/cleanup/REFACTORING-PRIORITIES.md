# Refactoring Priority List

Based on the code analysis, here's the prioritized list of refactoring tasks ordered by impact and effort.

## 🔴 Critical Priority (Week 1)

### 1. Fix Dependency Management (2 days)
**Impact**: High | **Effort**: Low | **Risk**: Low

```bash
# Add missing dependencies to client/package.json
cd client
npm install react-router-dom react-query react-hook-form lucide-react react-hot-toast
npm install react-quill dompurify @dnd-kit/core @dnd-kit/sortable
```

**Benefits**:
- Prevents build failures
- Enables proper version management
- Fixes security vulnerabilities

### 2. Remove Dead Code (1 day)
**Impact**: High | **Effort**: Low | **Risk**: Low

```bash
# Remove these unused files:
rm client/src/components/AddManagerModal.tsx
rm client/src/components/EditManagerModal.tsx
rm client/src/components/admin/ErrorDashboard.js
rm client/src/components/ErrorBoundary.js  # Keep .tsx version
rm client/src/test-translations.js
rm client/src/validate-*.js
rm -rf client/src/components/ContentEditor/  # Unused editor
rm lib/*.ts  # Keep .js versions
```

**Benefits**:
- 30% reduction in bundle size
- Cleaner codebase
- Faster builds

### 3. Standardize ES Module Imports (2 days)
**Impact**: High | **Effort**: Medium | **Risk**: Medium

Fix all API files to use hybrid import pattern:
```typescript
// api/**/*.ts files
const { supabase } = require('../../lib/supabase');
const { generateJWT } = require('../../lib/auth');
import type { Request, Response } from '../../types/api';
```

**Benefits**:
- No more 500 errors
- Consistent import patterns
- TypeScript compatibility

## 🟡 High Priority (Week 2)

### 4. Consolidate Duplicate Components (3 days)
**Impact**: Medium | **Effort**: Medium | **Risk**: Low

| Duplicate | Action | Keep |
|-----------|--------|------|
| ErrorBoundary.js/tsx | Merge | ErrorBoundary.tsx |
| AuthContext/OnboardingContext | Consolidate | AuthContext.tsx |
| Multiple email templates | Unify | EmailTemplates.js |

### 5. API Response Standardization (2 days)
**Impact**: Medium | **Effort**: Low | **Risk**: Low

Create `lib/apiResponse.js`:
```javascript
export const success = (data, meta = {}) => ({
  success: true,
  data,
  meta
});

export const error = (code, message, status = 400) => ({
  success: false,
  error: { code, message },
  status
});
```

## 🟢 Medium Priority (Week 3)

### 6. File Structure Organization (3 days)
**Impact**: Low | **Effort**: High | **Risk**: Low

```
client/src/
├── components/
│   ├── common/      # Merge all shared components
│   ├── features/    # Feature-specific components
│   └── layouts/     # Layout components
├── hooks/           # All custom hooks
├── services/        # API services only
└── utils/           # Pure utility functions
```

### 7. Test Coverage Improvement (1 week)
**Impact**: Medium | **Effort**: High | **Risk**: Low

Priority order:
1. Auth flows (critical path)
2. API endpoints (stability)
3. Utility functions (easy wins)
4. React components (user experience)

### 8. TypeScript Migration Completion (1 week)
**Impact**: Medium | **Effort**: High | **Risk**: Medium

```bash
# Convert in this order:
1. lib/*.js → lib/*.ts
2. services/*.js → services/*.ts
3. api/**/*.js → api/**/*.ts (remaining files)
4. client/src/services/*.js → *.ts
```

## ⚪ Low Priority (Week 4+)

### 9. Performance Optimization
- Implement code splitting
- Add React.lazy for routes
- Optimize images with next/image
- Add service worker for offline

### 10. Documentation
- JSDoc for all functions
- README for each module
- Storybook for components
- API documentation with Swagger

## 📊 Quick Wins (Can do anytime)

1. **Enable Prettier** (5 min)
```bash
npm install -D prettier
echo '{"semi": true, "singleQuote": true}' > .prettierrc
npx prettier --write .
```

2. **Add Pre-commit Hooks** (10 min)
```bash
npm install -D husky lint-staged
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

3. **Update .gitignore** (2 min)
Add:
```
# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

## 📈 Tracking Progress

### Week 1 Checklist
- [ ] Fix package.json dependencies
- [ ] Remove 46 unused files
- [ ] Standardize API imports
- [ ] Run `npm run knip` - should show 50% less issues

### Week 2 Checklist
- [ ] Merge duplicate components
- [ ] Implement standard API responses
- [ ] Set up pre-commit hooks
- [ ] Test coverage > 40%

### Week 3 Checklist
- [ ] Complete file reorganization
- [ ] TypeScript coverage > 80%
- [ ] All critical paths tested
- [ ] Bundle size < 1.5MB

### Week 4 Checklist
- [ ] Performance score > 90
- [ ] Documentation complete
- [ ] Zero knip warnings
- [ ] Maintainability grade: A

## 🎯 Success Metrics

| Metric | Current | Week 1 | Week 2 | Week 4 |
|--------|---------|--------|--------|--------|
| Unused files | 46 | 0 | 0 | 0 |
| Bundle size | 2.5MB | 1.8MB | 1.5MB | 1.2MB |
| Test coverage | 25% | 35% | 50% | 70% |
| Build time | 120s | 90s | 60s | 45s |
| TS coverage | 40% | 60% | 80% | 100% |

## 🚀 How to Start

1. Create feature branch: `git checkout -b refactor/simone-week-1`
2. Run baseline: `npm run knip > baseline.txt`
3. Start with Critical Priority #1
4. Commit after each completed task
5. PR at end of each week

Remember: **Small, focused changes** with **thorough testing** = Success! 🎉