#!/bin/bash

echo "🎨 Testing Maritime Documentation Themes"
echo "========================================"

# Function to show current theme
show_current_theme() {
    echo ""
    echo "📋 Current theme in custom-doxygen.css:"
    head -n 5 custom-doxygen.css | grep -E "(Maritime|Dark|Minimal)"
    echo ""
}

# Function to regenerate and open
regenerate_and_open() {
    echo "📚 Regenerating documentation..."
    doxygen Doxyfile > /dev/null 2>&1
    echo "✅ Documentation regenerated"
    echo ""
    echo "🌐 Opening in browser..."
    if command -v xdg-open &> /dev/null; then
        xdg-open "doxygen-docs/html/index.html" &
    elif command -v open &> /dev/null; then
        open "doxygen-docs/html/index.html" &
    fi
    echo ""
}

echo "🔄 Testing theme switching..."
echo ""

# Test 1: Maritime Theme
echo "1️⃣ Testing Maritime Theme..."
cp theme-maritime.css custom-doxygen.css
show_current_theme
regenerate_and_open
echo "👀 Look for: ⚓ Maritime Theme indicator, blue gradient header, gold accents"
read -p "Press Enter to continue to next theme..."

# Test 2: Dark Theme  
echo "2️⃣ Testing Dark Theme..."
cp theme-dark.css custom-doxygen.css
show_current_theme
regenerate_and_open
echo "👀 Look for: 🌙 Dark Theme indicator, dark background, blue accents"
read -p "Press Enter to continue to next theme..."

# Test 3: Minimal Theme
echo "3️⃣ Testing Minimal Theme..."
cp theme-minimal.css custom-doxygen.css
show_current_theme
regenerate_and_open
echo "👀 Look for: 🎯 Minimal Theme indicator, clean white design, no sidebar"
read -p "Press Enter to restore maritime theme..."

# Restore Maritime Theme
echo "⚓ Restoring Maritime Theme..."
cp theme-maritime.css custom-doxygen.css
show_current_theme
regenerate_and_open

echo "✨ Theme testing complete!"
echo ""
echo "💡 Tips if you don't see changes:"
echo "   • Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)"
echo "   • Clear browser cache"
echo "   • Try incognito/private window"
echo "   • Check browser console for errors"
echo ""
echo "🎯 Current theme: Maritime (⚓)"
echo "🔄 To switch themes: ./customize-docs.sh"
