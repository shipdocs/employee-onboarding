# 🚨 IMMEDIATE ACTION REQUIRED - CLAUDE CODE

## **SITUATION REPORT**

The Maritime Employee Onboarding System is **BROKEN** due to incomplete architectural migration from Next.js to Express. 

### **Current State: CRITICAL FAILURE**
- ❌ Application crashes on startup
- ❌ 75+ database import errors  
- ❌ JavaScript syntax errors throughout
- ❌ Hybrid Next.js/Express architecture that cannot work
- ❌ Production deployment completely non-functional

### **Root Cause**
**Incomplete migration** from working Next.js/Vercel setup to Express/Docker during "open source transformation" on Aug 20, 2025.

---

## **YOUR MISSION: FIX THIS MESS**

### **Phase 1: IMMEDIATE ARCHITECTURE DECISION**
**CHOOSE ONE:**

**Option A: Full Express Migration (RECOMMENDED)**
- ✅ Better for Docker deployment
- ✅ More control over server behavior
- ✅ Aligns with current Docker setup
- ❌ Requires converting all `[id]` routes to `:id`

**Option B: Revert to Next.js**
- ✅ Handles `[id]` routes natively
- ✅ Less code changes required
- ❌ More complex Docker setup
- ❌ Less deployment flexibility

**DECISION REQUIRED**: Document your choice in `ARCHITECTURE_DECISION.md`

### **Phase 2: CRITICAL FIXES**

**Database Layer (URGENT)**
```bash
# Find all broken db.query() calls
grep -r "db\.query" api/ | wc -l  # Shows 75+ broken calls
```

**Route System (URGENT)**  
```bash
# Find all Next.js dynamic routes
find api -name "*[*]*" | head -10  # Shows broken route patterns
```

**Syntax Errors (URGENT)**
```bash
# Check for syntax errors
find api -name "*.js" -exec node -c {} \; 2>&1 | grep -i error
```

---

## **SUB-AGENT ASSIGNMENTS**

### **Sub-Agent 1: Architecture Lead**
- **Task**: Make architecture decision (Express vs Next.js)
- **Deadline**: 2 hours
- **Deliverable**: `ARCHITECTURE_DECISION.md`

### **Sub-Agent 2: Database Specialist** 
- **Task**: Fix all 75+ database import errors
- **Deadline**: 4 hours  
- **Deliverable**: Working database layer

### **Sub-Agent 3: API Route Engineer**
- **Task**: Fix route system and syntax errors
- **Deadline**: 6 hours
- **Deliverable**: Clean API routing

### **Sub-Agent 4: Frontend Integration**
- **Task**: Ensure frontend works with new backend
- **Deadline**: 4 hours
- **Deliverable**: Working client-server communication

### **Sub-Agent 5: Testing & Deployment**
- **Task**: Test everything and create production deployment
- **Deadline**: 8 hours
- **Deliverable**: Tested, deployable system

---

## **QUALITY STANDARDS**

### **NON-NEGOTIABLE REQUIREMENTS**
1. **ZERO** application startup errors
2. **ZERO** JavaScript syntax errors  
3. **100%** API endpoint functionality
4. **Comprehensive** testing
5. **Industry standard** code quality

### **TESTING REQUIREMENTS**
- All API endpoints must be tested
- Database operations must be tested
- Frontend integration must be tested
- Deployment must be tested

---

## **EXECUTION PROTOCOL**

### **Start Immediately**
1. Read `CLAUDE_CODE_INSTRUCTIONS.md` for full context
2. Make architecture decision (Express vs Next.js)
3. Assign sub-agents to parallel workstreams
4. Begin critical fixes immediately

### **Communication**
- Document all decisions
- Report progress every 2 hours
- Escalate blockers immediately
- No sugar-coating - be brutally honest

### **Success Criteria**
- Application starts without errors
- All tests pass
- Production deployment works
- Code meets industry standards

---

## **CRITICAL FILES TO EXAMINE**

1. `server.js` - Broken route loading system (300+ lines of buggy code)
2. `api/workflows/translations.js` - Example of broken database imports
3. `api/workflows/slug-routes/translate.js` - Syntax errors
4. `package.json` - Conflicting development instructions
5. `next.config.js` - Next.js config in Express environment

---

## **FINAL WARNING**

This codebase is in **CRITICAL CONDITION**. Half-measures and quick fixes will NOT work. 

**REQUIREMENTS:**
- ✅ Choose ONE architecture and implement it properly
- ✅ Fix ALL syntax and import errors
- ✅ Test EVERYTHING thoroughly
- ✅ Create production-ready deployment

**NO SHORTCUTS. NO EXCUSES. INDUSTRY STANDARDS ONLY.**

---

**START NOW. THE CLOCK IS TICKING.**
