#!/bin/bash

# Maritime Onboarding System - Documentation Theme Customizer
# This script lets you easily switch between different documentation themes

echo "🎨 Maritime Onboarding System - Documentation Customizer"
echo "========================================================"

# Function to update Doxyfile setting
update_doxyfile() {
    local setting=$1
    local value=$2
    sed -i "s/^$setting.*/$setting = $value/" Doxyfile
}

# Function to copy theme CSS file
apply_theme_css() {
    local theme_file=$1
    if [ -f "$theme_file" ]; then
        cp "$theme_file" custom-doxygen.css
        echo "✅ Applied theme: $theme_file"
    else
        echo "❌ Theme file not found: $theme_file"
    fi
}

# Function to generate docs with current settings
generate_docs() {
    echo "📚 Generating documentation..."
    doxygen Doxyfile > /dev/null 2>&1
    echo "✅ Documentation generated at: doxygen-docs/html/index.html"
}

echo ""
echo "Choose a documentation theme:"
echo ""
echo "1. 🌅 Light Theme (Default)"
echo "2. 🌙 Dark Theme"
echo "3. ⚓ Maritime Custom Theme"
echo "4. 📱 Mobile-Optimized Theme"
echo "5. 🎯 Minimal Theme"
echo "6. 📊 Professional Theme"
echo "7. 🔧 Developer Theme"
echo ""

read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo "🌅 Applying Light Theme..."
        update_doxyfile "GENERATE_TREEVIEW" "YES"
        update_doxyfile "HTML_DYNAMIC_MENUS" "YES"
        update_doxyfile "DISABLE_INDEX" "NO"
        # Remove custom CSS for default light theme
        update_doxyfile "HTML_EXTRA_STYLESHEET" ""
        ;;
    2)
        echo "🌙 Applying Dark Theme..."
        update_doxyfile "GENERATE_TREEVIEW" "YES"
        update_doxyfile "HTML_DYNAMIC_MENUS" "YES"
        update_doxyfile "DISABLE_INDEX" "NO"
        apply_theme_css "theme-dark.css"
        ;;
    3)
        echo "⚓ Applying Maritime Custom Theme..."
        update_doxyfile "GENERATE_TREEVIEW" "YES"
        update_doxyfile "HTML_DYNAMIC_MENUS" "YES"
        update_doxyfile "DISABLE_INDEX" "NO"
        # Keep the original maritime theme
        # custom-doxygen.css is already the maritime theme
        ;;
    4)
        echo "📱 Applying Mobile-Optimized Theme..."
        update_doxyfile "GENERATE_TREEVIEW" "NO"
        update_doxyfile "HTML_DYNAMIC_MENUS" "NO"
        update_doxyfile "DISABLE_INDEX" "NO"
        update_doxyfile "HTML_EXTRA_STYLESHEET" ""
        ;;
    5)
        echo "🎯 Applying Minimal Theme..."
        update_doxyfile "GENERATE_TREEVIEW" "NO"
        update_doxyfile "HTML_DYNAMIC_MENUS" "NO"
        update_doxyfile "DISABLE_INDEX" "YES"
        apply_theme_css "theme-minimal.css"
        ;;
    6)
        echo "📊 Applying Professional Theme..."
        update_doxyfile "GENERATE_TREEVIEW" "YES"
        update_doxyfile "HTML_DYNAMIC_MENUS" "YES"
        update_doxyfile "DISABLE_INDEX" "NO"
        update_doxyfile "HTML_EXTRA_STYLESHEET" ""
        ;;
    7)
        echo "🔧 Applying Developer Theme..."
        update_doxyfile "GENERATE_TREEVIEW" "YES"
        update_doxyfile "HTML_DYNAMIC_MENUS" "YES"
        update_doxyfile "DISABLE_INDEX" "NO"
        apply_theme_css "theme-dark.css"
        ;;
    *)
        echo "❌ Invalid choice. Using default theme."
        ;;
esac

echo ""
generate_docs

echo ""
echo "🎨 Theme Applied Successfully!"
echo ""
echo "📖 View your documentation:"
echo "   • File: doxygen-docs/html/index.html"
echo "   • Local server: python3 -m http.server 8080 -d doxygen-docs/html"
echo ""
echo "🔄 To try another theme, run this script again:"
echo "   ./customize-docs.sh"
echo ""

# Offer to open documentation
read -p "🚀 Open documentation in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "doxygen-docs/html/index.html"
    elif command -v open &> /dev/null; then
        open "doxygen-docs/html/index.html"
    else
        echo "Please open doxygen-docs/html/index.html manually in your browser"
    fi
fi

echo ""
echo "✨ Enjoy your customized documentation!"
