# Augment MCP Configuration

This directory contains configuration for Augment VSCode extension with Model Context Protocol (MCP) servers.

## MCP Servers Configured

### 1. Supabase MCP
- **Purpose**: Database operations and queries
- **Package**: `@supabase/mcp-server-supabase@latest`
- **Configuration**: Read-only access to project `ocqnnyxnqaedarcohywe`

### 2. Serena MCP
- **Purpose**: Semantic code retrieval and editing tools
- **Command**: `uvx --from git+https://github.com/oraios/serena serena start-mcp-server`
- **Repository**: https://github.com/oraios/serena
- **Use Cases**:
  - Semantic code search across codebase
  - Intelligent code refactoring and editing
  - Code pattern analysis and suggestions
  - Finding related code sections

### 3. Context7 MCP
- **Purpose**: Up-to-date documentation on third-party code
- **Package**: `@context7/mcp-server@latest`
- **Use Cases**:
  - Fetching latest API documentation
  - Getting current best practices for libraries
  - Checking for updated syntax and methods
  - Verifying compatibility information

## Usage Guidelines

### Always Use:
- **Serena** for semantic code retrieval and editing tools
- **Context7** for up-to-date documentation on third-party code
- **Sequential Thinking** for any decision making

### Workflow:
1. **Planning**: Use Sequential Thinking MCP for complex task breakdown
2. **Documentation**: Use Context7 MCP to verify current best practices
3. **Implementation**: Use Serena MCP for code analysis and editing
4. **Integration**: Combine insights from all MCPs for optimal solutions

## Configuration Files

- `.mcp.json`: MCP server definitions for Augment
- `config.json`: Custom prompt and workflow rules
- `README.md`: This documentation file

## Security Notes

- The `.mcp.json` file is in `.gitignore` as it may contain sensitive tokens
- Supabase access token should be configured in environment or settings
- All MCP servers run with appropriate permissions and access controls

## Restart Required

After modifying MCP configuration, restart Augment/VSCode to load the new servers.
