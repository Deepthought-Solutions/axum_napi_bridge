#!/bin/bash

# Smart git pull script that checks for remote branch existence
# and provides user interaction for branch management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if working directory is dirty
# Outputs: "dirty" or "clean"
is_working_directory_dirty() {
    # Check for tracked file changes (staged and unstaged)
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "dirty"
        return
    fi

    # Check for untracked files
    if [[ -n $(git ls-files --others --exclude-standard) ]]; then
        echo "dirty"
        return
    fi

    echo "clean"
}

# Function to stash changes if working directory is dirty
# Outputs: "stashed" if stashing was performed, "no-stash" if not needed
stash_if_dirty() {
    local dirty_status=$(is_working_directory_dirty)
    if [[ "$dirty_status" == "dirty" ]]; then
        echo -e "${YELLOW}Working directory has uncommitted changes. Stashing...${NC}" >&2
        git stash push --include-untracked -m "Auto-stash before smart git pull at $(date)"
        echo -e "${GREEN}Changes stashed successfully${NC}" >&2
        echo "stashed"
    else
        echo "no-stash"
    fi
}

# Function to pop stash if it was created
# Takes stash status as parameter: "stashed" or "no-stash"
pop_stash_if_needed() {
    local stash_status=$1
    if [[ "$stash_status" == "stashed" ]]; then
        echo -e "${BLUE}Restoring stashed changes...${NC}"
        git stash pop
        echo -e "${GREEN}Stashed changes restored${NC}"
    fi
}

# Get current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

echo -e "${BLUE}Current branch: ${current_branch}${NC}"

# Check if current branch has a corresponding remote branch
if git ls-remote --exit-code --heads origin "$current_branch" >/dev/null 2>&1; then
    echo -e "${GREEN}Remote branch 'origin/${current_branch}' exists. Pulling latest changes...${NC}"

    # Stash changes if working directory is dirty
    stashed=$(stash_if_dirty | tail -1)

    # Pull with rebase strategy
    git pull --rebase origin "$current_branch"
    echo -e "${GREEN}Successfully pulled from origin/${current_branch} using rebase${NC}"

    # Get the current branch ref after pulling
    original_branch_ref=$(git rev-parse HEAD)

    echo -e "${BLUE}Now checking main branch and verifying if branch should be rebased...${NC}"
    git checkout main
    git pull --rebase origin main
    echo -e "${GREEN}Successfully updated main branch using rebase${NC}"

    # Check if original branch ref is in main's history
    if git merge-base --is-ancestor "$original_branch_ref" HEAD; then
        echo -e "${GREEN}Branch '${current_branch}' is now in main's history. Staying on main.${NC}"
        echo -e "${YELLOW}You can delete the local branch '${current_branch}' if no longer needed.${NC}"
    else
        echo -e "${BLUE}Branch '${current_branch}' has unique commits. Switching back and rebasing on main...${NC}"
        git checkout "$current_branch"
        git rebase main
        echo -e "${GREEN}Successfully rebased '${current_branch}' on top of main${NC}"
    fi

    # Restore stashed changes if needed
    pop_stash_if_needed "$stashed"
else
    echo -e "${YELLOW}No remote branch found for '${current_branch}'${NC}"
    echo -e "${BLUE}Switching to main and checking if branch should be rebased...${NC}"

    # Stash changes if working directory is dirty
    stashed=$(stash_if_dirty | tail -1)

    # Get the current branch ref before switching
    original_branch_ref=$(git rev-parse HEAD)

    echo -e "${BLUE}Switching to main branch and pulling latest changes...${NC}"
    git checkout main
    git pull --rebase origin main
    echo -e "${GREEN}Successfully updated main branch using rebase${NC}"

    # Check if original branch ref is in main's history
    if git merge-base --is-ancestor "$original_branch_ref" HEAD; then
        echo -e "${GREEN}Original branch '${current_branch}' is now in main's history. Staying on main.${NC}"
        echo -e "${YELLOW}You can delete the local branch '${current_branch}' if no longer needed.${NC}"
    else
        echo -e "${BLUE}Original branch '${current_branch}' has unique commits. Switching back and rebasing on main...${NC}"
        git checkout "$current_branch"
        git rebase main
        echo -e "${GREEN}Successfully rebased '${current_branch}' on top of main${NC}"
    fi

    # Restore stashed changes if needed
    pop_stash_if_needed "$stashed"
fi