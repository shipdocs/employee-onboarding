#!/bin/bash

echo "🧹 PDF Cleanup Script"
echo "============================================================"
echo

# Lijst van PDFs die we willen behouden (buiten compliance-2025-pdf map)
declare -a keep_pdfs=(
    # Belangrijke technische docs
    "docs/README.pdf"
    "docs/DOCUMENTATION_INDEX.pdf"
    
    # Security reports die nuttig kunnen zijn
    "docs/security/SECURITY_AUDIT_REPORT.pdf"
    "docs/reports/production-readiness-report.pdf"
)

echo "📊 Huidige situatie:"
total_pdfs=$(find docs -name "*.pdf" -type f | wc -l)
compliance_pdfs=$(find docs/compliance-2025-pdf -name "*.pdf" -type f 2>/dev/null | wc -l)
other_pdfs=$(find docs -name "*.pdf" -type f ! -path "docs/compliance-2025-pdf/*" | wc -l)

echo "   Totaal PDF bestanden: $total_pdfs"
echo "   In compliance map: $compliance_pdfs"
echo "   Elders: $other_pdfs"
echo

read -p "Wil je alle PDFs buiten de compliance-2025-pdf map verwijderen? (j/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Jj]$ ]]; then
    echo "🗑️  Verwijderen van PDFs..."
    
    # Verwijder alle PDFs behalve die in compliance-2025-pdf
    find docs -name "*.pdf" -type f ! -path "docs/compliance-2025-pdf/*" -delete
    
    echo "✅ PDFs verwijderd"
else
    echo "❌ Geannuleerd"
fi

echo
echo "📊 Nieuwe situatie:"
total_pdfs=$(find docs -name "*.pdf" -type f | wc -l)
compliance_pdfs=$(find docs/compliance-2025-pdf -name "*.pdf" -type f 2>/dev/null | wc -l)
other_pdfs=$(find docs -name "*.pdf" -type f ! -path "docs/compliance-2025-pdf/*" | wc -l)

echo "   Totaal PDF bestanden: $total_pdfs"
echo "   In compliance map: $compliance_pdfs"
echo "   Elders: $other_pdfs"

echo
echo "✨ Klaar! Compliance PDFs staan netjes in: docs/compliance-2025-pdf/"