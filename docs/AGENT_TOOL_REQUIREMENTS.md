# Agent Tool Requirements

**Last Updated:** August 6, 2025

## Overview

All custom agents in the Maritime Onboarding System 2025 have been updated to REQUIRE the use of specific tools for consistency, quality, and effectiveness.

## Mandatory Tools for ALL Agents

### 1. Serena MCP
**Purpose:** Semantic code retrieval and editing
**Required For:**
- Finding relevant code across the codebase
- Making intelligent code modifications
- Understanding code relationships and dependencies
- Refactoring operations
- Code analysis and review

**Installation Status:** ✅ Installed and configured

### 2. Context7 MCP
**Purpose:** Up-to-date documentation on third-party code
**Required For:**
- Checking latest API documentation
- Understanding library updates and changes
- Finding best practices and examples
- Researching security vulnerabilities
- Accessing framework documentation

**Installation Status:** ✅ Installed and configured

### 3. Sequential Thinking
**Purpose:** Structured decision-making processes
**Required For:**
- Architectural decisions
- Planning complex implementations
- Debugging difficult issues
- Risk assessment
- Test planning
- Security analysis

## Updated Agents

The following agents have been updated with these requirements:

### 1. Captain Mode Agent (`/captain-mode`)
- **File:** `.claude/commands/captain-mode.md`
- **Role:** Project manager and coordinator
- **Updated:** ✅ Tool requirements added

### 2. Maritime Compliance Agent (`/maritime-compliance`)
- **File:** `.claude/commands/maritime-compliance.md`
- **Role:** ISO27001 and maritime regulation compliance
- **Updated:** ✅ Tool requirements added

### 3. Database Optimization Agent (`/database-optimizer`)
- **File:** `.claude/commands/database-optimizer.md`
- **Role:** Supabase and database performance optimization
- **Updated:** ✅ Tool requirements added

### 4. Security Specialist Agent (`/security-specialist`)
- **File:** `.claude/commands/security-specialist.md`
- **Role:** Security assessment and vulnerability analysis
- **Updated:** ✅ Tool requirements added

### 5. Testing & QA Agent (`/testing-qa`)
- **File:** `.claude/commands/testing-qa.md`
- **Role:** Test coverage and quality assurance
- **Updated:** ✅ Tool requirements added

## MCP Configuration

The MCP servers are configured in `~/.config/claude-code/mcp.toml`:

```toml
[servers.supabase]
command = "npx"
args = ["@supabase/mcp-server-supabase", "--url", "...", "--key", "..."]
env = {}

[servers.serena]
command = "uvx"
args = [
  "--from", "git+https://github.com/oraios/serena",
  "serena",
  "start-mcp-server",
  "--context", "ide-assistant",
  "--project", "/home/martin/Ontwikkeling/new-onboarding-2025"
]
env = {}

[servers.context7]
command = "npx"
args = ["@upstash/context7-mcp"]
env = {}
```

## Usage Guidelines

### For Developers

When invoking any custom agent:
1. The agent will automatically use Serena for code operations
2. The agent will consult Context7 for documentation
3. The agent will apply sequential thinking for decisions

### For Agent Implementation

Each agent now includes this section:
```markdown
## Required Tools and Methodology

**ALWAYS use these tools for every task:**
1. **Serena MCP** - For all semantic code retrieval and editing operations
2. **Context7 MCP** - For up-to-date documentation on third-party code
3. **Sequential Thinking** - For all decision-making processes
```

## Benefits

1. **Consistency:** All agents follow the same methodology
2. **Quality:** Better code understanding through semantic analysis
3. **Accuracy:** Up-to-date documentation prevents outdated solutions
4. **Reliability:** Sequential thinking reduces errors in complex tasks
5. **Efficiency:** Faster code navigation and modification

## Verification

To verify the tools are working:
1. Restart Claude Code to load the MCP configuration
2. Check that MCP servers are running
3. Test an agent command and observe tool usage

## Troubleshooting

If tools are not working:
1. Check `~/.config/claude-code/mcp.toml` exists
2. Verify `uvx` is installed for Serena
3. Ensure npm/npx is available for Context7
4. Restart Claude Code after configuration changes

## Future Enhancements

Consider adding:
- Performance monitoring MCP for optimization tasks
- Documentation generation MCP for automated docs
- Deployment MCP for CI/CD operations
- Analytics MCP for usage insights