#!/bin/bash

# 🚀 Maritime Onboarding - Simplified Deployment Helper
# This script helps with the simplified workflow: Feature Branch → Main

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production URL
PRODUCTION_URL="https://onboarding.burando.online"

echo -e "${BLUE}🚀 Maritime Onboarding - Simplified Deployment${NC}"
echo -e "${BLUE}=============================================${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "📍 Current branch: ${YELLOW}$CURRENT_BRANCH${NC}"

# Check if we're on main
if [[ "$CURRENT_BRANCH" == "main" ]]; then
    echo -e "${YELLOW}⚠️  You're on the main branch${NC}"
    echo -e "Consider creating a feature branch for your changes:"
    echo -e "${BLUE}git checkout -b feature/your-feature-name${NC}"
    echo ""
fi

# Function to create feature branch
create_feature_branch() {
    echo -e "${YELLOW}📝 Enter feature name (e.g., 'user-authentication'):${NC}"
    read -p "Feature name: " feature_name
    
    if [[ -z "$feature_name" ]]; then
        echo -e "${RED}❌ Feature name cannot be empty${NC}"
        return 1
    fi
    
    branch_name="feature/$feature_name"
    
    echo -e "${YELLOW}🌿 Creating feature branch: $branch_name${NC}"
    git checkout -b "$branch_name"
    
    echo -e "${GREEN}✅ Feature branch created!${NC}"
    echo -e "Preview URL will be: ${BLUE}new-onboarding-2025-git-$branch_name-shipdocs-projects.vercel.app${NC}"
}

# Function to create PR to main
create_pr_to_main() {
    echo -e "${YELLOW}📤 Creating PR to main...${NC}"
    
    # Check if there are changes to push
    if ! git diff --quiet HEAD origin/"$CURRENT_BRANCH" 2>/dev/null; then
        echo -e "${YELLOW}📤 Pushing current changes...${NC}"
        git push -u origin "$CURRENT_BRANCH"
    fi
    
    # Create PR
    gh pr create \
        --base "main" \
        --title "🚀 Deploy: $(git log -1 --pretty=format:'%s')" \
        --body "## 🎯 Changes
$(git log --oneline origin/main..HEAD)

## ✅ Pre-Deployment Checklist
- [ ] Tested locally with \`vercel dev\`
- [ ] Tested on preview environment
- [ ] Ready for production deployment

## 🔗 Preview Environment
**URL**: \`new-onboarding-2025-git-$CURRENT_BRANCH-shipdocs-projects.vercel.app\`

---
**Simplified Workflow**: Feature Branch → Preview → Main" \
        --label "deployment"
    
    echo -e "${GREEN}✅ PR created successfully!${NC}"
}

# Main menu
echo ""
echo -e "${YELLOW}🎯 What would you like to do?${NC}"
echo "1. 🌿 Create new feature branch"
echo "2. 🚀 Create PR to main (deploy to production)"
echo "3. 📊 Check current status"
echo "4. 🆘 Help & workflow info"
echo "5. ❌ Exit"
echo ""

read -p "Choose an option (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}🌿 Creating New Feature Branch${NC}"
        echo -e "${YELLOW}==============================${NC}"
        create_feature_branch
        ;;
    2)
        echo ""
        echo -e "${YELLOW}🚀 Creating PR to Main${NC}"
        echo -e "${YELLOW}=====================${NC}"
        echo ""
        echo -e "This will create a PR: ${YELLOW}$CURRENT_BRANCH${NC} → ${YELLOW}main${NC}"
        echo -e "After merge, changes will be live at:"
        echo -e "${BLUE}$PRODUCTION_URL${NC}"
        echo ""
        read -p "Continue? (y/N): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            create_pr_to_main
            echo ""
            echo -e "${GREEN}🎉 Next steps:${NC}"
            echo -e "1. Test your changes on the preview URL"
            echo -e "2. Wait for PR review and approval"
            echo -e "3. Merge to deploy to production"
        else
            echo -e "${YELLOW}❌ PR creation cancelled${NC}"
        fi
        ;;
    3)
        echo ""
        echo -e "${YELLOW}📊 Current Status${NC}"
        echo -e "${YELLOW}===============${NC}"
        echo -e "Current branch: ${BLUE}$CURRENT_BRANCH${NC}"
        echo -e "Production URL: ${BLUE}$PRODUCTION_URL${NC}"
        
        if [[ "$CURRENT_BRANCH" != "main" ]]; then
            echo -e "Preview URL: ${BLUE}new-onboarding-2025-git-$CURRENT_BRANCH-shipdocs-projects.vercel.app${NC}"
        fi
        
        echo ""
        echo -e "Recent commits:"
        git log --oneline -5
        ;;
    4)
        echo ""
        echo -e "${YELLOW}🆘 Simplified Workflow Help${NC}"
        echo -e "${YELLOW}============================${NC}"
        echo ""
        echo -e "${BLUE}📋 Workflow Steps:${NC}"
        echo -e "1. Work locally on main: ${BLUE}vercel dev${NC}"
        echo -e "2. Create feature branch: ${BLUE}git checkout -b feature/name${NC}"
        echo -e "3. Push and test preview: ${BLUE}git push -u origin feature/name${NC}"
        echo -e "4. Create PR to main when ready"
        echo -e "5. Merge to deploy to production"
        echo ""
        echo -e "${BLUE}🔗 URLs:${NC}"
        echo -e "Production: ${BLUE}$PRODUCTION_URL${NC}"
        echo -e "Preview: ${BLUE}new-onboarding-2025-git-[branch]-shipdocs-projects.vercel.app${NC}"
        echo ""
        echo -e "${BLUE}💡 Tips:${NC}"
        echo -e "- Always test locally first with ${BLUE}vercel dev${NC}"
        echo -e "- Test on preview environment before merging"
        echo -e "- Use descriptive branch names: ${BLUE}feature/user-auth${NC}"
        ;;
    5)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac
