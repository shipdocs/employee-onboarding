# Claude AI Agent System

This directory contains the Claude AI agent configurations and commands for the Maritime Onboarding project.

## Structure

- `agents.json` - Agent definitions and configurations
- `commands/` - Individual command definitions
- `mcp.json` - Model Context Protocol configuration

## Usage

Use the configured agents and commands to assist with development tasks specific to the Maritime Onboarding System.

## Recent Production Fixes (August 4, 2025)

Claude Code successfully identified and resolved several critical production issues:

### 🔧 **Critical Fixes Delivered:**

#### **1. MFA Endpoints 500 Errors (PR #166)**
- **Issue**: MFA status/setup endpoints returning 500 errors due to missing `apiResponse` module
- **Root Cause**: Endpoints importing non-existent `lib/apiResponse.js`
- **Fix**: Removed apiResponse imports, replaced with standard Express JSON responses
- **Impact**: Fixed "Failed to load MFA status" errors in crew profiles

#### **2. PyPDF2 Security Vulnerability (PR #167)**
- **Issue**: Dependabot alert #8 - PyPDF2 infinite loop vulnerability (medium severity)
- **Root Cause**: Vulnerable PyPDF2 package (versions >= 2.2.0, <= 3.0.1) in requirements.txt
- **Fix**: Removed unused PyPDF2 package (already replaced with pdfplumber in code)
- **Impact**: Resolved security vulnerability with no functional impact

#### **3. JWT Token Expiration Handling (Commit 918e929)**
- **Issue**: 401 Unauthorized errors on MFA endpoints after login
- **Root Cause**: `tokenService.setToken()` using default 1-hour expiration instead of JWT's 24-hour expiration
- **Fix**: Extract actual expiration time from JWT payload and pass to tokenService
- **Impact**: Fixed persistent 401 errors after fresh login

### 🎯 **Technical Insights:**

#### **Authentication Flow Analysis:**
- JWT tokens generated with 24-hour expiration
- Frontend tokenService was defaulting to 1-hour expiration
- Caused premature token invalidation despite valid JWT
- Fix extracts `exp` and `iat` from JWT payload for accurate expiration

#### **ES Module Compatibility:**
- Production errors due to `__dirname` usage in ES modules
- Fixed in `services/automated-certificate-service.js` with proper ES module imports
- Used `fileURLToPath(import.meta.url)` pattern for ES module compatibility

#### **Security Best Practices:**
- Proactive removal of unused vulnerable dependencies
- Standard Express JSON responses instead of custom wrappers
- Proper JWT expiration handling for security

### 🚀 **Development Workflow:**

Claude Code demonstrated excellent debugging capabilities:
- **Root Cause Analysis**: Traced errors to specific module imports and configuration issues
- **Systematic Fixes**: Created separate PRs for each issue with clear documentation
- **Production Testing**: Verified fixes against actual production errors
- **Security Focus**: Addressed Dependabot alerts proactively

This showcases the value of AI-assisted debugging for complex production issues.

## Agent Capabilities

### **Captain Mode Agent**
- Strategic oversight and coordination
- High-level decision making
- Cross-system integration planning

### **Maritime Compliance Agent**
- Regulatory compliance verification
- Maritime-specific requirements
- Safety and certification standards

### **Database Optimizer Agent**
- Performance optimization
- Query analysis and improvement
- Schema design recommendations

### **Security Specialist Agent**
- Vulnerability assessment
- Security best practices
- Authentication and authorization

### **Testing QA Agent**
- Test strategy development
- Quality assurance processes
- Automated testing implementation

## Command Usage

Each command in the `commands/` directory provides specific functionality:
- Use `/captain-mode` for strategic planning
- Use `/maritime-compliance` for regulatory checks
- Use `/database-optimizer` for performance issues
- Use `/security-specialist` for security reviews
- Use `/testing-qa` for quality assurance

## Integration with Development Workflow

The Claude AI system integrates seamlessly with:
- GitHub workflow automation
- Supabase database operations
- Production monitoring and alerting
- Security vulnerability management
- Quality assurance processes

This system provides intelligent assistance for complex maritime software development challenges.
