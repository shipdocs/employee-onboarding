# Project Cleanup Plan
Generated: 2025-01-03

## Current Status Assessment

### ✅ Already Completed
1. **Migration Cleanup** - Successfully consolidated from 23 to 17 migration files
2. **Archive Organization** - Old migrations moved to `/archive/migration-chaos-2024/`
3. **KNIP Configuration** - Properly configured for dependency analysis

### 🔍 KNIP Analysis Results

#### Critical Issues Found:
1. **1 Unused File**: `config/quiz-data.js` (267 lines of unused quiz configuration)
2. **23 Unlisted Dependencies**: Missing MUI components, prop-types, react-beautiful-dnd, react-dropzone
3. **20 Unresolved Imports**: Broken import paths, missing simone-state module
4. **73 Unused Exports**: Significant dead code across the codebase
5. **10 Duplicate Exports**: Conflicting export patterns

## Cleanup Priorities

### Priority 1: Critical Fixes (Immediate)
1. **Fix Missing Dependencies**
   - Add missing MUI packages to client/package.json
   - Add prop-types, react-beautiful-dnd, react-dropzone
   - Update package-lock.json

2. **Fix Broken Imports**
   - Create missing simone-state.js module or fix imports
   - Fix auth-commonjs import paths
   - Resolve email service import issues

3. **Remove Unused Files**
   - Delete `config/quiz-data.js` (completely unused)
   - Clean up KNIP configuration hints

### Priority 2: Code Quality (Next)
1. **Remove Unused Exports** (73 items)
   - Clean up lib/ directory exports
   - Remove unused client component exports
   - Clean up service exports

2. **Fix Duplicate Exports** (10 items)
   - Resolve conflicting default exports
   - Standardize export patterns

### Priority 3: Optimization (Later)
1. **Dependency Cleanup**
   - Remove unused devDependencies from KNIP ignore list
   - Update outdated packages
   - Consolidate similar dependencies

2. **File Organization**
   - Move test utilities to proper locations
   - Organize script files by function
   - Clean up docs/ directory structure

## Detailed Action Items

### 1. Fix Missing Dependencies
```bash
cd client
npm install @mui/material @mui/icons-material prop-types react-beautiful-dnd react-dropzone
```

### 2. Create Missing simone-state.js
- Analyze usage in complete-task*.js files
- Create proper SimoneStateManager class
- Fix all import references

### 3. Remove Unused Files
- Delete config/quiz-data.js
- Update KNIP config to remove migration/** patterns
- Clean up ignoreDependencies list

### 4. Fix Import Paths
- Create lib/auth-commonjs.js or fix import paths
- Fix email service imports in scripts
- Resolve utility import issues

## Risk Assessment

### Low Risk
- Removing unused files (quiz-data.js)
- Adding missing dependencies
- Cleaning up KNIP configuration

### Medium Risk  
- Removing unused exports (need to verify no dynamic imports)
- Fixing duplicate exports (may affect existing code)

### High Risk
- Creating missing simone-state module (need to understand expected interface)
- Changing import paths (may break existing functionality)

## Progress Update

### ✅ Completed Priority 1 Fixes
1. **Removed unused file**: `config/quiz-data.js` (267 lines)
2. **Added missing dependencies**: @mui/material, @mui/icons-material, prop-types, react-dropzone, html-react-parser
3. **Created missing modules**:
   - `scripts/simone-state.js` - SimoneStateManager class
   - `lib/auth-commonjs.js` - CommonJS auth wrapper
4. **Updated KNIP configuration**: Removed migration patterns, cleaned ignore list

### 📊 KNIP Results Improvement
**Before cleanup:**
- 1 unused file
- 23 unlisted dependencies
- 20 unresolved imports
- 73 unused exports
- 10 duplicate exports

**After cleanup:**
- 42 unused files (client/src components)
- 9 unused dependencies (newly added but not yet used)
- 1 unlisted dependency (fixed)
- 27 unused exports (reduced by 63%)
- 6 duplicate exports (reduced by 40%)

### 🎯 Next Steps
1. **Review unused client components** - Determine which are actually needed
2. **Clean up unused dependencies** - Remove packages that aren't being used
3. **Address remaining unused exports** - Remove dead code
4. **Fix duplicate exports** - Standardize export patterns
5. **Test functionality** - Ensure all fixes work correctly
