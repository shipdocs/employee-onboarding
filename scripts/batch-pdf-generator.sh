#!/bin/bash

# Batch PDF generator using parallel processing
# This script converts HTML files to PDF in parallel for speed

echo "🚀 Batch PDF Generator - Using parallel processing"
echo "============================================================"

# Function to convert a single HTML to PDF
convert_html_to_pdf() {
    local html_file="$1"
    local pdf_file="${html_file%.html}.pdf"
    
    # Skip if PDF already exists and is newer
    if [[ -f "$pdf_file" ]] && [[ "$pdf_file" -nt "$html_file" ]]; then
        echo "⏭️  Skipping $(basename "$html_file") - PDF up to date"
        return 0
    fi
    
    # Try to convert using chromium
    if command -v chromium &> /dev/null; then
        chromium --headless --disable-gpu --print-to-pdf="$pdf_file" "$html_file" 2>/dev/null
    elif command -v google-chrome &> /dev/null; then
        google-chrome --headless --disable-gpu --print-to-pdf="$pdf_file" "$html_file" 2>/dev/null
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser --headless --disable-gpu --print-to-pdf="$pdf_file" "$html_file" 2>/dev/null
    else
        echo "❌ No Chrome/Chromium found for $(basename "$html_file")"
        return 1
    fi
    
    if [[ -f "$pdf_file" ]]; then
        echo "✅ Generated $(basename "$pdf_file")"
        return 0
    else
        echo "❌ Failed to generate $(basename "$pdf_file")"
        return 1
    fi
}

export -f convert_html_to_pdf

# Find all HTML files
echo "🔍 Finding HTML files in docs directory..."
html_files=($(find docs -name "*.html" -type f))
total=${#html_files[@]}
echo "📁 Found $total HTML files"
echo

# Check for GNU parallel
if command -v parallel &> /dev/null; then
    echo "⚡ Using GNU parallel for fast processing..."
    echo "${html_files[@]}" | tr ' ' '\n' | parallel -j 4 convert_html_to_pdf {}
else
    echo "🐢 Processing files sequentially (install 'parallel' for 4x speed)..."
    count=0
    for html_file in "${html_files[@]}"; do
        count=$((count + 1))
        echo -n "[$count/$total] "
        convert_html_to_pdf "$html_file"
    done
fi

echo
echo "============================================================"
echo "📊 Final Statistics:"
echo "============================================================"

# Count results
html_count=$(find docs -name "*.html" -type f | wc -l)
pdf_count=$(find docs -name "*.pdf" -type f | wc -l)

echo "📄 HTML files: $html_count"
echo "📑 PDF files: $pdf_count"
echo "✅ Conversion rate: $(( pdf_count * 100 / html_count ))%"
echo
echo "✨ Batch PDF generation complete!"

# Tip for missing PDFs
if [[ $pdf_count -lt $html_count ]]; then
    echo
    echo "💡 Some PDFs couldn't be generated. Possible reasons:"
    echo "   - Files with special characters or very long content"
    echo "   - Memory limitations during conversion"
    echo "   - You can try running the script again for missed files"
fi