#!/bin/bash

# Maritime Onboarding System - Documentation Viewer
# Opens the modern documentation in your default browser

echo "🚢 Maritime Onboarding System - Documentation Viewer"
echo "======================================================"

# Check if documentation exists
if [ ! -d "doxygen-docs/html" ]; then
    echo "❌ Documentation not found. Please run ./generate-docs.sh first."
    exit 1
fi

echo "📚 Available documentation:"
echo "   • Complete Documentation: doxygen-docs/html/index.html"
echo "   • Includes: API Reference, User Guides, Deployment, Security"
echo ""

# Function to open URL in browser
open_browser() {
    local url="$1"
    if command -v xdg-open > /dev/null; then
        xdg-open "$url"
    elif command -v open > /dev/null; then
        open "$url"
    elif command -v start > /dev/null; then
        start "$url"
    else
        echo "❌ Could not detect how to open browser on this system."
        echo "   Please manually open: $url"
        return 1
    fi
}

# Ask user what to open
echo "What would you like to view?"
echo "1) Complete Documentation (recommended)"
echo "2) Start local server"
echo "3) Exit"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🌐 Opening Complete Documentation..."
        file_path="$(pwd)/doxygen-docs/html/index.html"
        open_browser "file://$file_path"
        ;;
    2)
        echo "🚀 Starting local server..."
        echo "   Server will be available at: http://localhost:8080"
        echo "   Press Ctrl+C to stop the server"
        echo ""

        # Start server in background
        cd doxygen-docs/html && python3 -m http.server 8080 > /dev/null 2>&1 &
        SERVER_PID=$!

        # Wait a moment for server to start
        sleep 2

        # Open browser
        open_browser "http://localhost:8080"

        echo "✅ Server started (PID: $SERVER_PID)"
        echo "   Documentation available at: http://localhost:8080"
        echo ""
        echo "Press Enter to stop the server..."
        read

        # Stop server
        kill $SERVER_PID 2>/dev/null
        echo "🛑 Server stopped"
        ;;
    3)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✨ Documentation opened successfully!"
echo ""
echo "📋 Quick tips:"
echo "   • Use the search function to find specific topics"
echo "   • Check the navigation tree for organized browsing"
echo "   • All documentation is mobile-responsive"
echo "   • Use dark mode toggle for comfortable viewing"
echo ""
echo "🔗 For more help, visit: https://github.com/shipdocs/employee-onboarding"
