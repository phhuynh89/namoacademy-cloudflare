#!/bin/bash

# Script to trigger CapCut account creation workflow
# This script commits and pushes to the trigger-action branch to trigger the GitHub Actions workflow

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR" || exit 1

BRANCH_NAME="trigger-action"
REMOTE_NAME="origin"

echo -e "${YELLOW}🚀 Triggering CapCut account creation workflow...${NC}"

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}ERROR: git is not installed or not in PATH${NC}"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Not in a git repository${NC}"
    exit 1
fi

# Check if remote exists
if ! git remote get-url "$REMOTE_NAME" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Remote '$REMOTE_NAME' not found${NC}"
    exit 1
fi

# Fetch latest changes
echo -e "${YELLOW}📥 Fetching latest changes...${NC}"
git fetch "$REMOTE_NAME" || {
    echo -e "${RED}ERROR: Failed to fetch from remote${NC}"
    exit 1
}

# Check if branch exists locally
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo -e "${YELLOW}📂 Branch '$BRANCH_NAME' exists locally, checking out...${NC}"
    git checkout "$BRANCH_NAME" || {
        echo -e "${RED}ERROR: Failed to checkout branch '$BRANCH_NAME'${NC}"
        exit 1
    }
    # Pull latest changes if branch exists on remote
    if git show-ref --verify --quiet "refs/remotes/$REMOTE_NAME/$BRANCH_NAME"; then
        git pull "$REMOTE_NAME" "$BRANCH_NAME" || {
            echo -e "${YELLOW}⚠️  Warning: Failed to pull, continuing anyway...${NC}"
        }
    fi
else
    # Check if branch exists on remote
    if git show-ref --verify --quiet "refs/remotes/$REMOTE_NAME/$BRANCH_NAME"; then
        echo -e "${YELLOW}📂 Branch '$BRANCH_NAME' exists on remote, checking out...${NC}"
        git checkout -b "$BRANCH_NAME" "$REMOTE_NAME/$BRANCH_NAME" || {
            echo -e "${RED}ERROR: Failed to checkout branch '$BRANCH_NAME'${NC}"
            exit 1
        }
    else
        echo -e "${YELLOW}📂 Creating new branch '$BRANCH_NAME'...${NC}"
        # Get current branch name
        CURRENT_BRANCH=$(git branch --show-current)
        git checkout -b "$BRANCH_NAME" || {
            echo -e "${RED}ERROR: Failed to create branch '$BRANCH_NAME'${NC}"
            exit 1
        }
    fi
fi

# Create or update a trigger file with timestamp
TRIGGER_FILE=".workflow-trigger"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "Last triggered: $TIMESTAMP" > "$TRIGGER_FILE"
echo "Triggered by: $(whoami)@$(hostname)" >> "$TRIGGER_FILE"

# Stage the trigger file
git add "$TRIGGER_FILE" || {
    echo -e "${RED}ERROR: Failed to stage trigger file${NC}"
    exit 1
}

# Make an empty commit with timestamp
COMMIT_MESSAGE="Trigger CapCut account creation workflow - $TIMESTAMP"
git commit -m "$COMMIT_MESSAGE" || {
    # If commit fails (no changes), make an empty commit
    echo -e "${YELLOW}⚠️  No changes to commit, making empty commit...${NC}"
    git commit --allow-empty -m "$COMMIT_MESSAGE" || {
        echo -e "${RED}ERROR: Failed to create commit${NC}"
        exit 1
    }
}

# Push to remote
echo -e "${YELLOW}📤 Pushing to '$REMOTE_NAME/$BRANCH_NAME'...${NC}"
git push "$REMOTE_NAME" "$BRANCH_NAME" || {
    echo -e "${RED}ERROR: Failed to push to remote${NC}"
    exit 1
}

echo -e "${GREEN}✅ Successfully triggered CapCut account creation workflow!${NC}"
echo -e "${GREEN}📊 Check the Actions tab in GitHub to see the workflow run${NC}"

# Optionally switch back to original branch
if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    read -p "Switch back to '$CURRENT_BRANCH'? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout "$CURRENT_BRANCH" || {
            echo -e "${YELLOW}⚠️  Warning: Failed to switch back to '$CURRENT_BRANCH'${NC}"
        }
    fi
fi

