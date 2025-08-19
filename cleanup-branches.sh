#!/bin/bash

# Git branch cleanup script for Maritime Onboarding System
set -e

echo "========================================="
echo "Git Branch Cleanup Script"
echo "========================================="
echo ""

# Configuration
MAIN_BRANCH="master"
PROTECTED_BRANCHES=("main" "master" "develop" "staging" "production")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if branch is protected
is_protected() {
    local branch=$1
    for protected in "${PROTECTED_BRANCHES[@]}"; do
        if [[ "$branch" == "$protected" ]]; then
            return 0
        fi
    done
    return 1
}

# Step 1: Check current status
echo -e "${YELLOW}Step 1: Checking repository status...${NC}"
git status --short
echo ""

# Step 2: Fetch latest remote information
echo -e "${YELLOW}Step 2: Fetching latest remote information...${NC}"
git fetch --all --prune
echo ""

# Step 3: List all branches
echo -e "${YELLOW}Step 3: Current branch structure:${NC}"
echo "Local branches:"
git branch
echo ""
echo "Remote branches:"
git branch -r
echo ""

# Step 4: Identify Dependabot branches
echo -e "${YELLOW}Step 4: Identifying Dependabot branches...${NC}"
DEPENDABOT_BRANCHES=$(git branch -r | grep "origin/dependabot" | sed 's/origin\///' || true)

if [ -z "$DEPENDABOT_BRANCHES" ]; then
    echo -e "${GREEN}No Dependabot branches found.${NC}"
else
    echo "Found Dependabot branches:"
    echo "$DEPENDABOT_BRANCHES" | while read branch; do
        echo "  - $branch"
    done
    echo ""
    
    # Step 5: Interactive cleanup
    echo -e "${YELLOW}Step 5: Branch cleanup${NC}"
    echo "Do you want to delete all Dependabot branches? (y/n)"
    read -r response
    
    if [[ "$response" == "y" || "$response" == "Y" ]]; then
        echo "$DEPENDABOT_BRANCHES" | while read branch; do
            echo -e "${RED}Deleting remote branch: $branch${NC}"
            git push origin --delete "$branch" 2>/dev/null || echo "  Branch already deleted or not found"
        done
        echo -e "${GREEN}Dependabot branches cleaned up!${NC}"
    else
        echo "Skipping Dependabot branch deletion."
        
        # Offer individual branch deletion
        echo "Do you want to review branches individually? (y/n)"
        read -r individual_response
        
        if [[ "$individual_response" == "y" || "$individual_response" == "Y" ]]; then
            echo "$DEPENDABOT_BRANCHES" | while read branch; do
                echo ""
                echo "Branch: $branch"
                echo "Delete this branch? (y/n/q to quit)"
                read -r branch_response
                
                if [[ "$branch_response" == "q" || "$branch_response" == "Q" ]]; then
                    echo "Quitting individual review."
                    break
                elif [[ "$branch_response" == "y" || "$branch_response" == "Y" ]]; then
                    echo -e "${RED}Deleting: $branch${NC}"
                    git push origin --delete "$branch" 2>/dev/null || echo "  Branch already deleted or not found"
                else
                    echo "Keeping: $branch"
                fi
            done
        fi
    fi
fi

echo ""

# Step 6: Clean up local tracking branches
echo -e "${YELLOW}Step 6: Cleaning up local tracking branches...${NC}"
git remote prune origin
echo -e "${GREEN}Local tracking branches pruned.${NC}"
echo ""

# Step 7: Final status
echo -e "${YELLOW}Step 7: Final branch status:${NC}"
echo "Local branches:"
git branch
echo ""
echo "Remote branches:"
git branch -r | head -20
REMOTE_COUNT=$(git branch -r | wc -l)
if [ "$REMOTE_COUNT" -gt 20 ]; then
    echo "... and $((REMOTE_COUNT - 20)) more"
fi
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Branch cleanup completed!${NC}"
echo -e "${GREEN}=========================================${NC}"