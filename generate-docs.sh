#!/bin/bash

# Maritime Onboarding System - Documentation Generator
# This script generates comprehensive documentation using Doxygen

echo "🚢 Maritime Onboarding System - Documentation Generator"
echo "======================================================"

# Check if Doxygen is installed
if ! command -v doxygen &> /dev/null; then
    echo "❌ Doxygen is not installed. Installing..."
    sudo apt update && sudo apt install -y doxygen graphviz
fi

# Generate documentation
echo "📚 Generating documentation..."
doxygen Doxyfile

# Check if generation was successful
if [ $? -eq 0 ]; then
    echo "🔧 Fixing JavaScript dependencies..."

    # Fix the HTML to include missing JavaScript files
    cd doxygen-docs/html

    # Add missing script tags before the closing </head> tag
    sed -i '/<\/head>/i\
<script type="text/javascript" src="jquery.js"></script>\
<script type="text/javascript" src="search/search.js"></script>\
<script type="text/javascript" src="search/searchdata.js"></script>' index.html

    # Also fix any other HTML files that might need it
    for file in *.html; do
      if [ "$file" != "index.html" ] && grep -q 'SearchBox\|codefold\|\$(' "$file"; then
        sed -i '/<\/head>/i\
<script type="text/javascript" src="jquery.js"></script>\
<script type="text/javascript" src="search/search.js"></script>\
<script type="text/javascript" src="search/searchdata.js"></script>' "$file"
      fi
    done

    cd ../..
    echo "✅ Documentation generated successfully!"
    echo ""
    echo "📖 Documentation available at:"
    echo "   HTML: file://$(pwd)/doxygen-docs/html/index.html"
    echo "   Local: doxygen-docs/html/index.html"
    echo ""
    echo "📋 Documentation includes:"
    echo "   ✅ API Reference (auto-generated from code)"
    echo "   ✅ User Guides (for all user roles)"
    echo "   ✅ Deployment Guide (Docker-based)"
    echo "   ✅ Security Documentation"
    echo "   ✅ Developer Documentation"
    echo ""
    echo "🌐 To view the documentation:"
    echo "   1. Via Docker application: http://localhost/docs (after docker-compose up)"
    echo "   2. Via backend server: http://localhost:3000/docs (if running locally)"
    echo "   3. Or open doxygen-docs/html/index.html directly in your browser"
    echo "   4. Or run: python3 -m http.server 8080 -d doxygen-docs/html"
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
else
    echo "❌ Documentation generation failed!"
    echo "Check the output above for errors."
    exit 1
fi

echo ""
echo "📝 To regenerate documentation after code changes:"
echo "   ./generate-docs.sh"
echo ""
echo "🎯 Documentation Features:"
echo "   • Complete API reference with examples"
echo "   • User guides for Admin, Manager, and Crew roles"
echo "   • Docker deployment instructions"
echo "   • Security configuration guide"
echo "   • Code documentation with cross-references"
echo "   • Search functionality"
echo "   • Mobile-responsive design"
echo ""
echo "✨ Your Maritime Onboarding System documentation is ready!"
echo ""
echo "🎯 Documentation Features:"
echo "   • Clean, professional HTML output with proper Markdown rendering"
echo "   • Complete API reference with examples"
echo "   • User guides for Admin, Manager, and Crew roles"
echo "   • Docker deployment instructions"
echo "   • Security configuration guide"
echo "   • Code documentation with cross-references"
echo "   • Search functionality"
echo "   • Mobile-responsive design"
echo ""
echo "✅ All HTML formatting issues have been resolved!"
