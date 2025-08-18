# Build Optimization Changes

## Summary
Optimized Vercel build process to reduce build time from ~6 minutes to an estimated 3-4 minutes.

## Changes Made

### 1. Removed Redundant npm install (saves ~1-2 minutes)
**Before:** Build command ran `npm install --legacy-peer-deps` even though Vercel already installed dependencies
**After:** Build command only runs the actual build process

### 2. Optimized Build Scripts
Created three build variants in `client/package.json`:
- `build`: Standard build with ESLint (for local development)
- `build:optimized`: Fast build with ESLint disabled (for Vercel deployments)
- `build:clean`: Full clean build when cache issues occur (manual use only)

### 3. Preserved Webpack Cache (saves ~30-60 seconds)
**Before:** Deleted `node_modules/.cache` on every build, forcing full rebuild
**After:** Cache is preserved between builds for incremental compilation

### 4. Kept PDF Worker Copying
As requested, the PDF.js worker file copying remains in place:
- Copies during postinstall
- Copies to public before build
- Copies to build folder after build

## Configuration Files Updated

### vercel.json
```json
"buildCommand": "cd client && npm run build:optimized && cd .. && cp -r client/build ./build"
```

### client/package.json
Added optimized build scripts while keeping PDF worker functionality

### package.json (root)
Updated main build script to use optimized client build

## Expected Performance Improvements

| Phase | Before | After | Savings |
|-------|--------|-------|---------|
| Dependency Install | 2-2.5 min | (Vercel only) | 1-2 min |
| Cache Deletion | 30-60 sec | 0 sec | 30-60 sec |
| ESLint | 30-45 sec | 0 sec | 30-45 sec |
| **Total** | **6 min** | **3-4 min** | **2-3 min** |

## Notes
- ESLint is disabled in production builds for speed
- Run `npm run build:clean` locally if you encounter cache issues
- PDF worker copying is maintained as it's required for PDF functionality
- Consider migrating from Create React App to Vite/Next.js for further improvements (would reduce to ~1-2 min total)

## Testing
Deploy to Vercel and monitor the build logs to confirm improved build times.