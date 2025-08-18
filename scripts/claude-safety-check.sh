#!/bin/bash

# Claude Safety Check Script
# Detects common syntax errors introduced during AI code editing sessions
# Run this after every Claude session to catch issues before deployment

set -e

echo "🤖 Claude Safety Check - Scanning for AI-introduced syntax errors..."
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Function to report issues
report_issue() {
    echo -e "${RED}❌ ISSUE FOUND:${NC} $1"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

# Function to report success
report_success() {
    echo -e "${GREEN}✅${NC} $1"
}

# Function to report info
report_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

echo -e "${BLUE}1. Checking for malformed console.error blocks...${NC}"
MALFORMED_CONSOLE=$(find api/ lib/ -name "*.js" -exec grep -l "console\.error.*{$" {} \; 2>/dev/null || true)
if [ -n "$MALFORMED_CONSOLE" ]; then
    report_issue "Malformed console.error blocks found in:"
    echo "$MALFORMED_CONSOLE" | while read file; do
        echo "   - $file"
        grep -n "console\.error.*{$" "$file" | head -3
    done
else
    report_success "No malformed console.error blocks found"
fi

echo ""
echo -e "${BLUE}2. Checking for orphaned closing parentheses...${NC}"
ORPHANED_PARENS=$(find api/ lib/ -name "*.js" -exec grep -l "^\s*)\s*;\s*$" {} \; 2>/dev/null || true)
if [ -n "$ORPHANED_PARENS" ]; then
    # Filter out legitimate cases (function calls, etc.)
    SUSPICIOUS_PARENS=""
    echo "$ORPHANED_PARENS" | while read file; do
        # Check if the line before the ) is suspicious
        SUSPICIOUS=$(grep -B1 -n "^\s*)\s*;\s*$" "$file" | grep -E "(^\s*$|^\s*//)" || true)
        if [ -n "$SUSPICIOUS" ]; then
            SUSPICIOUS_PARENS="$SUSPICIOUS_PARENS $file"
        fi
    done
    
    if [ -n "$SUSPICIOUS_PARENS" ]; then
        report_issue "Suspicious orphaned closing parentheses found in:"
        echo "$SUSPICIOUS_PARENS" | tr ' ' '\n' | while read file; do
            if [ -n "$file" ]; then
                echo "   - $file"
                grep -B2 -A1 -n "^\s*)\s*;\s*$" "$file" | head -6
            fi
        done
    else
        report_success "No suspicious orphaned parentheses found"
    fi
else
    report_success "No orphaned closing parentheses found"
fi

echo ""
echo -e "${BLUE}3. Checking for orphaned code fragments...${NC}"
ORPHANED_CODE=$(find api/ lib/ -name "*.js" -exec grep -l "^\s*\.\w\+\s*$" {} \; 2>/dev/null || true)
if [ -n "$ORPHANED_CODE" ]; then
    report_issue "Orphaned code fragments found in:"
    echo "$ORPHANED_CODE" | while read file; do
        echo "   - $file"
        grep -n "^\s*\.\w\+\s*$" "$file" | head -3
    done
else
    report_success "No orphaned code fragments found"
fi

echo ""
echo -e "${BLUE}4. Running Node.js syntax check...${NC}"
SYNTAX_ERRORS=""
find api/ lib/ -name "*.js" | while read file; do
    if ! node -c "$file" 2>/dev/null; then
        echo "$file" >> /tmp/syntax_errors.tmp
    fi
done

if [ -f /tmp/syntax_errors.tmp ]; then
    SYNTAX_ERRORS=$(cat /tmp/syntax_errors.tmp)
    rm -f /tmp/syntax_errors.tmp
fi

if [ -n "$SYNTAX_ERRORS" ]; then
    report_issue "Syntax errors found in:"
    echo "$SYNTAX_ERRORS" | while read file; do
        echo "   - $file"
        node -c "$file" 2>&1 | head -3
    done
else
    report_success "All JavaScript files have valid syntax"
fi

echo ""
echo -e "${BLUE}5. Checking for incorrect createClient() calls...${NC}"
INCORRECT_CREATECLIENT=$(find api/ lib/ -name "*.js" -exec grep -l "createClient()" {} \; 2>/dev/null || true)
if [ -n "$INCORRECT_CREATECLIENT" ]; then
    report_issue "Potentially incorrect createClient() calls found in:"
    echo "$INCORRECT_CREATECLIENT" | while read file; do
        echo "   - $file"
        grep -n "createClient()" "$file" | head -3
    done
else
    report_success "No incorrect createClient() calls found"
fi

echo ""
echo "=================================================================="
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! No Claude-introduced syntax errors detected.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Found $ISSUES_FOUND potential issue(s). Please review and fix before deploying.${NC}"
    echo ""
    echo -e "${YELLOW}💡 Common fixes:${NC}"
    echo "   - Remove orphaned lines (like standalone '.length' or ');')"
    echo "   - Fix malformed console.error blocks by commenting all lines"
    echo "   - Replace createClient() with imported supabase client"
    echo "   - Run 'npm run build' to verify fixes"
    exit 1
fi
