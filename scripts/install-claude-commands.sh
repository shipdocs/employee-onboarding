#!/bin/bash

# Claude Command Suite Installation Script for Maritime Onboarding System
# This script sets up the Claude Command Suite for this project

set -e

echo "Claude Command Suite Installation for Maritime Onboarding System"
echo "=============================================================="
echo ""

# Check if .claude/commands directory exists
if [ ! -d ".claude/commands" ]; then
    echo "Error: .claude/commands directory not found!"
    echo "Please ensure you're running this from the project root."
    exit 1
fi

# Count the number of commands
command_count=$(ls -1 .claude/commands/*.md 2>/dev/null | wc -l)

if [ $command_count -eq 0 ]; then
    echo "Error: No command files found in .claude/commands/"
    exit 1
fi

echo "✅ Found $command_count Claude commands in the project"
echo ""
echo "Available commands:"
echo "------------------"

# List all available commands
for cmd in .claude/commands/*.md; do
    basename "$cmd" .md | sed 's/^/  \/project:/'
done

echo ""
echo "✅ Claude Command Suite is ready to use!"
echo ""
echo "Usage examples:"
echo "  /project:code-review        - Perform a comprehensive code review"
echo "  /project:security-audit     - Run a security audit"
echo "  /project:create-feature     - Create a new feature"
echo "  /project:fix-issue         - Fix an issue"
echo ""
echo "For more information about each command, open the corresponding"
echo "file in .claude/commands/ directory."