# Claude AI Best Practices for Maritime Onboarding Project

## 🚨 MANDATORY RULES FOR ALL CLAUDE SESSIONS

### **BEFORE EVERY CLAUDE SESSION:**
1. ✅ Run `npm run build` to ensure clean starting state
2. ✅ Create feature branch: `git checkout -b claude-session-$(date +%Y%m%d-%H%M)`
3. ✅ Verify working directory is clean: `git status`

### **DURING EVERY CLAUDE SESSION:**
1. ✅ Make ONE targeted change at a time
2. ✅ Ask Claude to verify syntax after each edit
3. ✅ Run `./scripts/claude-safety-check.sh` after each change
4. ✅ Test with `npm run build` before proceeding

### **AFTER EVERY CLAUDE SESSION:**
1. ✅ Run `./scripts/claude-safety-check.sh` (MANDATORY)
2. ✅ Run `npm run build` to verify compilation
3. ✅ Commit with descriptive message
4. ✅ Test in production if changes affect critical paths

## 🚨 Critical Issue: AI-Introduced Syntax Errors

During our development sessions, we discovered that Claude AI can introduce specific types of syntax errors that cause production failures. This document outlines prevention strategies and detection methods.

## 📋 Common Claude-Introduced Errors

### 1. **Orphaned Code Fragments**
```javascript
// ❌ Bad - Orphaned line from incomplete replacement
const data = {
  name: 'test'
};

.length  // ← Orphaned fragment

// ✅ Good - Complete code
const data = {
  name: 'test'
};
```

### 2. **Malformed Commented Console Blocks**
```javascript
// ❌ Bad - Only first line commented
// console.error('Error details:', {
  message: error.message,
  code: error.code
});

// ✅ Good - All lines commented
// console.error('Error details:', {
//   message: error.message,
//   code: error.code
// });
```

### 3. **Orphaned Closing Parentheses**
```javascript
// ❌ Bad - Orphaned closing parenthesis
const config = {
  name: 'test'
};

);  // ← Orphaned from incomplete edit

// ✅ Good - No orphaned syntax
const config = {
  name: 'test'
};
```

### 4. **Incorrect Function Calls After Import Changes**
```javascript
// ❌ Bad - Import changed but calls not updated
const { supabase } = require('./supabase');
const client = createClient(); // ← Should use 'supabase'

// ✅ Good - Consistent with import
const { supabase } = require('./supabase');
// Use 'supabase' directly
```

## 🛡️ Prevention Strategies

### 1. **Pre-Session Checklist**
```bash
# Before any Claude session:
npm run build          # Ensure clean starting state
npm run test          # Verify functionality
git status            # Ensure clean working directory
git checkout -b claude-session-$(date +%Y%m%d-%H%M)
```

### 2. **During Session Best Practices**

#### **A. Be Specific and Targeted**
❌ **Avoid:** "Fix all the API issues"
✅ **Use:** "Fix the syntax error on line 73 of api/workflows/index.js"

#### **B. Request Verification**
```
"After making this change, please verify the JavaScript syntax is valid"
```

#### **C. One Change at a Time**
- Make single, focused changes
- Test each change before proceeding
- Commit frequently with descriptive messages

#### **D. Review Before Applying**
```
"Show me exactly which lines you're changing before making the edit"
```

### 3. **Post-Session Validation**
```bash
# After every Claude session:
./scripts/claude-safety-check.sh    # Run our custom scanner
npm run build                       # Check compilation
npm run test                        # Verify functionality
git diff                           # Review all changes
```

## 🔧 Automated Safety Tools

### 1. **Claude Safety Check Script**
```bash
# Run after every Claude session
./scripts/claude-safety-check.sh
```

This script checks for:
- Malformed console.error blocks
- Orphaned closing parentheses
- Orphaned code fragments
- JavaScript syntax errors
- Incorrect createClient() calls

### 2. **Pre-commit Hook Setup**
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add to package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "./scripts/claude-safety-check.sh && npm run build"
    }
  }
}
```

## 📊 Risk Assessment

### **High Risk Changes** (Extra Caution Required)
- Multiple file edits in one session
- Import/export statement changes
- Commenting/uncommenting code blocks
- Complex multi-line replacements
- Changes near existing commented code

### **Medium Risk Changes**
- Single file edits
- Simple function modifications
- Adding new functions
- Configuration changes

### **Low Risk Changes**
- Documentation updates
- Simple variable renames
- Adding comments
- Formatting changes

## 🚀 Recommended Workflow

### **For Small Changes:**
```bash
1. git checkout -b fix-specific-issue
2. Ask Claude for targeted fix
3. ./scripts/claude-safety-check.sh
4. npm run build && npm run test
5. git add . && git commit -m "Fix: specific description"
6. git checkout main && git merge fix-specific-issue
```

### **For Complex Changes:**
```bash
1. git checkout -b feature-complex-change
2. Break down into small steps
3. For each step:
   a. Ask Claude for one specific change
   b. ./scripts/claude-safety-check.sh
   c. npm run build
   d. git add . && git commit -m "Step X: description"
4. npm run test (full test suite)
5. git checkout main && git merge feature-complex-change
```

## 🎯 Success Metrics

### **Green Flags** (Session Going Well)
- ✅ All syntax checks pass
- ✅ Build succeeds after each change
- ✅ Changes are targeted and specific
- ✅ Git history is clean with descriptive commits

### **Red Flags** (Stop and Review)
- ❌ Syntax errors appearing
- ❌ Build failures
- ❌ Multiple unrelated files changed
- ❌ Unclear what changes were made

## 📞 Emergency Recovery

If you encounter production issues after a Claude session:

```bash
# 1. Immediate rollback
git log --oneline -10  # Find last good commit
git revert <commit-hash>
git push origin main

# 2. Identify issues
./scripts/claude-safety-check.sh

# 3. Fix systematically
# Fix one file at a time
# Test each fix
# Commit incrementally
```

## 💡 Key Takeaways

1. **Claude is powerful but can introduce subtle syntax errors**
2. **Always validate changes with automated tools**
3. **Use targeted, specific requests**
4. **Test frequently and commit often**
5. **When in doubt, ask Claude to verify syntax**

## 🔒 UPDATED SYSTEM RULES FOR CLAUDE

### **For Claude (AI Assistant):**
1. **ALWAYS run syntax verification after each edit**
2. **NEVER make multiple unrelated changes in one session**
3. **ALWAYS ask user to run `./scripts/claude-safety-check.sh` after changes**
4. **ALWAYS verify JavaScript syntax with `node -c filename.js` mentally**
5. **ALWAYS comment ALL lines when commenting console.error blocks**
6. **NEVER leave orphaned code fragments like `.length` or `);`**

### **For User (Martin):**
1. **ALWAYS run `./scripts/claude-safety-check.sh` after Claude sessions**
2. **ALWAYS test changes in production for critical paths**
3. **NEVER skip the safety check, even for "simple" changes**
4. **ALWAYS use feature branches for Claude sessions**
5. **ALWAYS commit frequently with descriptive messages**

---

**Remember:** The goal is to leverage Claude's capabilities while maintaining code quality and preventing production issues. These practices ensure we get the benefits of AI assistance without the risks.

**CRITICAL:** Any Claude session that doesn't follow these rules risks introducing production-breaking syntax errors.
