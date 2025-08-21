#!/bin/bash

# Convert only compliance and important 2025 documents to PDF

echo "📋 Converting Compliance & Key 2025 Documents to PDF"
echo "============================================================"

# List of important documents to convert
declare -a important_docs=(
    "docs/LEVERANCIERS_COMPLIANCE_RAPPORT.html"
    "docs/COMPLIANCE_DOCUMENTATION_INDEX.html"
    "docs/COMPLIANCE_PERCENTAGE_CALCULATION.html"
    "docs/COMPLIANCE_REPORT_V2.html"
    "docs/GDPR_DATA_PROCESSING_AGREEMENT.html"
    "docs/SLA.html"
    "docs/PRIVACY_SECURITY_CONTACT.html"
    "docs/templates/SAAS_LEVERANCIERSOVEREENKOMST.html"
    "docs/SECURITY_FIX_REPORT.html"
    "docs/reports/production-readiness-report.html"
    "docs/for-administrators/security/security-overview.html"
    "docs/for-administrators/security/implementation-guide.html"
)

# Function to convert HTML to PDF
convert_to_pdf() {
    local html_file="$1"
    local pdf_file="${html_file%.html}.pdf"
    
    if [[ ! -f "$html_file" ]]; then
        echo "⚠️  File not found: $(basename "$html_file")"
        return 1
    fi
    
    echo -n "Converting $(basename "$html_file")... "
    
    # Try different Chrome/Chromium commands
    if command -v chromium &> /dev/null; then
        chromium --headless --disable-gpu --print-to-pdf="$pdf_file" "$html_file" 2>/dev/null
    elif command -v google-chrome &> /dev/null; then
        google-chrome --headless --disable-gpu --print-to-pdf="$pdf_file" "$html_file" 2>/dev/null
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser --headless --disable-gpu --print-to-pdf="$pdf_file" "$html_file" 2>/dev/null
    else
        echo "❌ No Chrome/Chromium found"
        return 1
    fi
    
    if [[ -f "$pdf_file" ]]; then
        echo "✅ PDF created"
        return 0
    else
        echo "❌ Failed"
        return 1
    fi
}

# Convert each important document
success=0
failed=0

for doc in "${important_docs[@]}"; do
    if convert_to_pdf "$doc"; then
        ((success++))
    else
        ((failed++))
    fi
done

echo
echo "============================================================"
echo "📊 Summary:"
echo "============================================================"
echo "✅ Successfully converted: $success documents"
if [[ $failed -gt 0 ]]; then
    echo "❌ Failed: $failed documents"
fi

echo
echo "📁 Key compliance PDFs are now available in the docs folder:"
echo "   - LEVERANCIERS_COMPLIANCE_RAPPORT.pdf"
echo "   - GDPR_DATA_PROCESSING_AGREEMENT.pdf"
echo "   - SLA.pdf"
echo "   - SAAS_LEVERANCIERSOVEREENKOMST.pdf"
echo
echo "✨ Compliance documentation ready for distribution!"