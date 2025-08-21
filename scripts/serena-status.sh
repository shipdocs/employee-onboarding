#\!/bin/bash

# Script to check Serena MCP server status and start if needed
PROJECT_DIR="/home/martin/Ontwikkeling/new-onboarding-2025"
SERENA_DIR="$PROJECT_DIR/serena-mcp"

echo "Serena MCP Server Status Check"
echo "=============================="

# Check if serena-mcp directory exists
if [ \! -d "$SERENA_DIR" ]; then
    echo "❌ Serena MCP directory not found at $SERENA_DIR"
    echo "Please run: git clone https://github.com/oraios/serena serena-mcp"
    exit 1
fi

# Check if uv is installed
if \! command -v uv &> /dev/null; then
    echo "❌ uv is not installed"
    echo "Please install uv: https://github.com/astral-sh/uv"
    exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Check if server is running
if pgrep -f "serena start-mcp-server" > /dev/null; then
    echo "✅ Serena MCP server is already running"
    echo ""
    echo "To view logs:"
    echo "  tail -f ~/.serena/logs/$(date +%Y-%m-%d)/mcp_*.txt"
else
    echo "⚠️  Serena MCP server is not running"
    echo ""
    echo "To start the server, run:"
    echo "  cd $SERENA_DIR"
    echo "  uv run serena start-mcp-server --context ide-assistant --project $PROJECT_DIR"
fi

echo ""
echo "Dashboard URL: http://127.0.0.1:24282/dashboard/index.html"
echo ""
echo "To integrate with Claude Code, the server should be running and accessible."
