# Claude Code: Fix Maritime Onboarding System Architecture

## 🚨 CRITICAL MISSION: Fix Broken Hybrid Architecture

### **Problem Summary**
The Maritime Employee Onboarding System is in a **broken hybrid state** due to an incomplete migration from Next.js/Vercel to Express/Docker. The codebase has fundamental architectural inconsistencies that prevent it from running in production.

### **Root Cause Analysis**
1. **Architecture Mismatch**: Next.js API patterns (`[id]` routes) running on Express server (expects `:id`)
2. **Database Import Chaos**: 75+ instances of `db.query()` without proper imports
3. **JavaScript Syntax Errors**: Basic syntax mistakes throughout API files
4. **Route Loading Complexity**: 300+ lines of buggy route conversion logic

### **Evidence of Broken State**
- Path-to-regexp errors on route registration
- "Unexpected token 'catch'" syntax errors
- Missing variable declarations (`db` not defined)
- Container restart loops due to application crashes

---

## 🎯 **YOUR MISSION**

**Fix this codebase to industry standards with ZERO tolerance for technical debt.**

### **Success Criteria**
1. ✅ Application starts without errors
2. ✅ All API endpoints work correctly
3. ✅ Database connections are consistent
4. ✅ No JavaScript syntax errors
5. ✅ Clean, maintainable architecture
6. ✅ Comprehensive testing
7. ✅ Production-ready deployment

### **Constraints**
- **NO POSITIVITY BIAS**: Be brutally honest about code quality
- **INDUSTRY STANDARDS**: Follow best practices, not quick hacks
- **TESTED SOLUTION**: Every fix must be tested and verified
- **CLEAN ARCHITECTURE**: Choose ONE framework and stick to it

---

## 📋 **TASK BREAKDOWN**

### **Phase 1: Architecture Decision (Sub-Agent 1)**
**Objective**: Choose the best architectural approach

**Tasks**:
1. Analyze current codebase structure
2. Evaluate Next.js vs Express options
3. **DECISION**: Choose ONE architecture (recommend Express for Docker deployment)
4. Create migration plan with clear steps
5. Document architectural decisions

**Deliverables**:
- `ARCHITECTURE_DECISION.md` with rationale
- `MIGRATION_PLAN.md` with step-by-step approach

### **Phase 2: Database Layer Standardization (Sub-Agent 2)**
**Objective**: Fix all database access patterns

**Tasks**:
1. Audit all 75+ `db.query()` instances
2. Standardize database imports across all files
3. Fix missing variable declarations
4. Create consistent database service layer
5. Test all database connections

**Deliverables**:
- Fixed database imports in all API files
- `lib/database.js` - standardized database service
- Database connection tests

### **Phase 3: API Route System Overhaul (Sub-Agent 3)**
**Objective**: Create clean, working API routing

**Tasks**:
1. **REMOVE** the complex 300-line route conversion logic
2. Convert all `[id]` patterns to proper Express `:id` routes
3. Fix JavaScript syntax errors in API files
4. Implement proper error handling
5. Create route registration system that actually works

**Deliverables**:
- Clean `server.js` with simple Express routing
- All API files with correct syntax
- Route testing suite

### **Phase 4: Frontend Integration (Sub-Agent 4)**
**Objective**: Ensure frontend works with new backend

**Tasks**:
1. Update frontend API calls to match new routes
2. Fix any React build issues
3. Ensure proper client-server communication
4. Test all user flows

**Deliverables**:
- Updated frontend API service
- Working React build
- Integration tests

### **Phase 5: Testing & Deployment (Sub-Agent 5)**
**Objective**: Comprehensive testing and production deployment

**Tasks**:
1. Create comprehensive test suite
2. Test all API endpoints
3. Test database operations
4. Test full application flow
5. Create production-ready Docker setup
6. Document deployment process

**Deliverables**:
- Complete test suite with 100% API coverage
- Working Docker deployment
- Production deployment guide

---

## 🛠️ **TECHNICAL REQUIREMENTS**

### **Code Quality Standards**
- **ESLint**: All code must pass linting
- **Error Handling**: Proper try-catch blocks everywhere
- **Type Safety**: Use JSDoc or TypeScript
- **Security**: No SQL injection, XSS vulnerabilities
- **Performance**: Efficient database queries

### **Architecture Requirements**
- **Single Framework**: Choose Express OR Next.js, not both
- **Consistent Patterns**: Same import/export style throughout
- **Modular Design**: Clear separation of concerns
- **Scalable Structure**: Easy to maintain and extend

### **Testing Requirements**
- **Unit Tests**: All utility functions
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows
- **Performance Tests**: Database and API response times

---

## 🚀 **EXECUTION STRATEGY**

### **Sub-Agent Coordination**
1. **Phase 1** completes first - architecture decision drives everything
2. **Phases 2-4** can run in parallel after Phase 1
3. **Phase 5** integrates and tests everything
4. **Daily standups**: Each sub-agent reports progress and blockers

### **Quality Gates**
- No phase proceeds without previous phase approval
- All code changes require testing
- No commits without passing all tests
- Architecture decisions require documentation

### **Communication Protocol**
- Use clear, technical language
- Document all decisions and rationale
- Report blockers immediately
- Share test results and metrics

---

## ⚠️ **CRITICAL WARNINGS**

1. **DO NOT** try to make the hybrid system work - it's fundamentally broken
2. **DO NOT** use quick hacks or workarounds
3. **DO NOT** ignore syntax errors or warnings
4. **DO NOT** proceed without proper testing
5. **DO NOT** sugar-coat problems - be brutally honest

---

## 📊 **SUCCESS METRICS**

- **Zero** application startup errors
- **Zero** JavaScript syntax errors
- **100%** API endpoint functionality
- **100%** test coverage for critical paths
- **< 2 seconds** application startup time
- **< 500ms** average API response time

---

## 🎯 **FINAL DELIVERABLE**

A **production-ready Maritime Employee Onboarding System** that:
- Starts reliably every time
- Has clean, maintainable code
- Follows industry best practices
- Is thoroughly tested
- Can be deployed with confidence

**NO EXCUSES. NO SHORTCUTS. INDUSTRY STANDARDS ONLY.**
