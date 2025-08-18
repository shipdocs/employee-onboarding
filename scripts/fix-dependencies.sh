#!/bin/bash

echo "🔧 Fixing Maritime Onboarding System Dependencies"
echo "================================================"

# Step 1: Remove unused dependencies from root
echo ""
echo "📦 Step 1: Removing unused dependencies..."
npm uninstall @modelcontextprotocol/server-memory \
  @modelcontextprotocol/server-puppeteer \
  @modelcontextprotocol/server-sequential-thinking \
  @upstash/context7-mcp \
  esbuild \
  multer \
  node-cron \
  path-to-regexp \
  react-pdf \
  sharp

# Step 2: Remove unused dev dependencies
echo ""
echo "📦 Step 2: Removing unused dev dependencies..."
npm uninstall --save-dev @testing-library/user-event \
  @vercel/node \
  autocannon \
  concurrently

# Step 3: Install missing client dependencies
echo ""
echo "📦 Step 3: Installing missing client dependencies..."
cd client
npm install react-router-dom \
  react-query \
  react-hook-form \
  lucide-react \
  react-hot-toast \
  react-quill \
  dompurify \
  @dnd-kit/core \
  @dnd-kit/sortable \
  @dnd-kit/utilities \
  @heroicons/react \
  pdfjs-dist \
  pdf-lib \
  html2canvas \
  jspdf \
  react-dnd \
  react-dnd-html5-backend \
  react-markdown \
  remark-gfm \
  react-datepicker \
  react-i18next \
  i18next \
  i18next-browser-languagedetector \
  js-cookie \
  uuid \
  date-fns \
  classnames \
  lodash.debounce

cd ..

echo ""
echo "✅ Dependencies fixed! Next steps:"
echo "1. Run 'npm run knip' again to verify"
echo "2. Test the application thoroughly"
echo "3. Commit the changes"