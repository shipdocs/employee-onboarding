#!/bin/bash

# Script to add MFA environment variables to Vercel Preview and Development environments
# The Production environment already has these variables

echo "🔧 Adding MFA environment variables to Vercel Preview and Development environments..."

# Get the MFA_ENCRYPTION_KEY from .env.development
MFA_KEY=$(grep "MFA_ENCRYPTION_KEY=" .env.development | cut -d'=' -f2)

if [ -z "$MFA_KEY" ]; then
    echo "❌ MFA_ENCRYPTION_KEY not found in .env.development"
    exit 1
fi

echo "✅ Found MFA_ENCRYPTION_KEY in .env.development"

# Add MFA_ENCRYPTION_KEY to Preview and Development
echo "📝 Adding MFA_ENCRYPTION_KEY..."
echo "$MFA_KEY" | vercel env add MFA_ENCRYPTION_KEY --scope preview,development

# Add MFA_ENFORCEMENT
echo "📝 Adding MFA_ENFORCEMENT..."
echo "true" | vercel env add MFA_ENFORCEMENT --scope preview,development

# Add MFA_BACKUP_CODES  
echo "📝 Adding MFA_BACKUP_CODES..."
echo "true" | vercel env add MFA_BACKUP_CODES --scope preview,development

echo "🎉 All MFA environment variables have been added to Preview and Development environments!"
echo ""
echo "📋 Summary of MFA variables:"
echo "  ✅ MFA_ENABLED (already added)"
echo "  ✅ MFA_ENCRYPTION_KEY"
echo "  ✅ MFA_ENFORCEMENT" 
echo "  ✅ MFA_BACKUP_CODES"
echo ""
echo "🚀 You can now test MFA in development and preview environments!"
