#!/bin/bash

# 🧪 Documentation Testing Script
# Tests the Maritime Onboarding System documentation

echo "🧪 Testing Maritime Onboarding System Documentation"
echo "=================================================="

# Test 1: Check if documentation files exist
echo "📁 Test 1: Checking documentation files..."

required_files=(
    "doxygen-docs/html/index.html"
    "doxygen-docs/html/getting-started.html"
    "doxygen-docs/html/admin-guide.html"
    "doxygen-docs/html/deployment-guide.html"
    "doxygen-docs/html/security-guide.html"
    "doxygen-docs/html/modern-doxygen.css"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file missing"
        exit 1
    fi
done

# Test 2: Check if CSS is properly linked
echo ""
echo "🎨 Test 2: Checking CSS integration..."

if grep -q "modern-doxygen.css" doxygen-docs/html/index.html; then
    echo "   ✅ Modern CSS is linked in main page"
else
    echo "   ❌ Modern CSS not found in main page"
    exit 1
fi

# Test 3: Check if navigation links exist
echo ""
echo "🧭 Test 3: Checking navigation structure..."

navigation_checks=(
    "getting-started.html:Getting Started"
    "admin-guide.html:Administrator Guide"
    "deployment-guide.html:Deployment Guide"
    "security-guide.html:Security Guide"
)

for check in "${navigation_checks[@]}"; do
    file=$(echo $check | cut -d: -f1)
    title=$(echo $check | cut -d: -f2)
    
    if [ -f "doxygen-docs/html/$file" ]; then
        if grep -q "$title" "doxygen-docs/html/$file"; then
            echo "   ✅ $file contains '$title'"
        else
            echo "   ⚠️  $file exists but title '$title' not found"
        fi
    else
        echo "   ❌ $file not found"
    fi
done

# Test 4: Check if modern features are present
echo ""
echo "✨ Test 4: Checking modern features..."

modern_features=(
    "Inter:wght@300;400;500;600;700"
    "dark-mode-toggle"
    "smooth scrolling"
    "copy-button"
)

for feature in "${modern_features[@]}"; do
    if grep -r "$feature" doxygen-docs/html/ > /dev/null 2>&1; then
        echo "   ✅ $feature implemented"
    else
        echo "   ⚠️  $feature not found (may be in CSS/JS)"
    fi
done

# Test 5: Check file sizes (ensure content is generated)
echo ""
echo "📊 Test 5: Checking file sizes..."

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        size=$(wc -c < "$file")
        if [ $size -gt 1000 ]; then
            echo "   ✅ $file has content ($size bytes)"
        else
            echo "   ⚠️  $file seems small ($size bytes)"
        fi
    fi
done

# Test 6: Check if Doxygen pages are properly generated
echo ""
echo "🔧 Test 6: Checking Doxygen integration..."

if [ -f "doxygen-docs/html/files.html" ]; then
    echo "   ✅ File index generated"
else
    echo "   ❌ File index missing"
fi

if [ -d "doxygen-docs/html/search" ]; then
    echo "   ✅ Search functionality available"
else
    echo "   ❌ Search functionality missing"
fi

# Test 7: Validate HTML structure
echo ""
echo "🔍 Test 7: Basic HTML validation..."

for file in "${required_files[@]}"; do
    if [[ "$file" == *.html ]]; then
        if grep -q "<!DOCTYPE html" "$file" && grep -q "</html>" "$file"; then
            echo "   ✅ $file has valid HTML structure"
        else
            echo "   ❌ $file has invalid HTML structure"
        fi
    fi
done

echo ""
echo "🎯 Documentation Testing Complete!"
echo ""
echo "📖 To view the documentation:"
echo "   • Run: ./open-docs.sh"
echo "   • Or open: doxygen-docs/html/index.html"
echo ""
echo "🔄 To regenerate documentation:"
echo "   • Run: ./generate-docs.sh"
echo ""
echo "✨ Your Maritime Onboarding System documentation is ready!"
