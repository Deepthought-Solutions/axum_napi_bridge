#!/bin/bash

# Pre-commit hook for axum_napi_bridge v1.1.0
# Checks package-lock.json sync, runs all tests to ensure code quality before committing

echo "🔍 Running pre-commit tests..."

# Set error handling
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Change to the root directory
cd "$(git rev-parse --show-toplevel)"

# Function to check and fix package-lock.json sync issues
check_package_lock_sync() {
    local dir="$1"
    local display_name="$2"

    print_info "Checking package-lock.json sync in $display_name..."

    if [ "$dir" != "." ]; then
        cd "$dir"
    fi

    # Test if npm ci works
    if npm ci --silent > /dev/null 2>&1; then
        print_status "Package-lock.json sync OK in $display_name"
    else
        print_info "Package-lock.json out of sync in $display_name, auto-fixing..."
        if npm install --silent; then
            print_status "Successfully updated package-lock.json in $display_name"
        else
            print_error "Failed to fix package-lock.json sync in $display_name"
            exit 1
        fi
    fi

    # Return to root directory if we changed
    if [ "$dir" != "." ]; then
        cd "$(git rev-parse --show-toplevel)"
    fi
}

# Clean generated files that shouldn't be in the repository
print_info "Cleaning generated files..."
rm -f sample/benchmark/*.js 2>/dev/null || true

# Check package-lock.json sync in root and sample directories
check_package_lock_sync "." "root directory"
check_package_lock_sync "sample" "sample directory"

# Store git status before formatting checks
git_status_before=$(git status --porcelain)

# Formatting checks (same as CI pipeline)
print_info "Checking Rust formatting..."
if cargo fmt --all -- --check; then
    print_status "Rust formatting check passed"
else
    print_error "Rust formatting check failed - please run 'cargo fmt --all'"
    exit 1
fi

print_info "Checking TOML formatting..."
if npx taplo format --check; then
    print_status "TOML formatting check passed"
else
    print_error "TOML formatting check failed - please run 'npx taplo format'"
    exit 1
fi

print_info "Checking Prettier formatting (root)..."
if npx prettier . --check; then
    print_status "Prettier formatting check (root) passed"
else
    print_error "Prettier formatting check (root) failed - please run 'npx prettier . --write'"
    exit 1
fi

print_info "Checking Prettier formatting (sample)..."
if cd sample && npx prettier . --check; then
    print_status "Prettier formatting check (sample) passed"
    cd ..
else
    print_error "Prettier formatting check (sample) failed - please run 'cd sample && npx prettier . --write'"
    cd ..
    exit 1
fi

# Check if any formatter made changes to tracked files
git_status_after=$(git status --porcelain)
if [ "$git_status_before" != "$git_status_after" ]; then
    print_error "Files were modified by formatters during pre-commit checks!"
    print_info "Please stage the formatting changes and commit again"
    git diff --name-only
    exit 1
fi

print_info "Running linting checks..."
if npm run lint; then
    print_status "Linting checks passed"
else
    print_error "Linting checks failed - please fix the issues"
    exit 1
fi

print_info "Running main library tests..."
if npm test; then
    print_status "Main library tests passed"
else
    print_error "Main library tests failed"
    exit 1
fi

print_info "Running sample app tests..."
if cd sample && npm test; then
    print_status "Sample app tests passed"
else
    print_error "Sample app tests failed"
    exit 1
fi

# Return to root directory
cd ..

print_info "Running sample app benchmarks..."
if cd sample && npm run bench; then
    print_status "Sample app benchmarks completed"
else
    print_error "Sample app benchmarks failed"
    exit 1
fi

# Clean generated files after benchmarks
print_info "Cleaning generated benchmark files after tests..."
rm -f benchmark/*.js 2>/dev/null || true

# Return to root directory
cd ..

print_info "Running Passenger Nginx tests..."
if cd sample && npm run test:passenger; then
    print_status "Passenger Nginx tests passed"
else
    print_error "Passenger Nginx tests failed"
    exit 1
fi

print_info "Running Passenger Apache tests..."
if npm run test:passenger:apache; then
    print_status "Passenger Apache tests passed"
else
    print_error "Passenger Apache tests failed"
    exit 1
fi

# Return to root directory
cd ..

print_status "All tests passed! 🎉"

# Final check: ensure working directory is clean for commit
print_info "Checking working directory status before commit..."

# Check for untracked files (files that should be in .gitignore)
untracked_files=$(git status --porcelain | grep '^??' || true)
if [ -n "$untracked_files" ]; then
    print_error "Untracked files found in working directory!"
    print_info "The following files are not tracked by git:"
    echo "$untracked_files"
    print_info "These files should either be:"
    print_info "  1. Added to .gitignore if they are generated files, temporary files, secrets, or data files"
    print_info "  2. Staged with 'git add' if they should be included in this commit"
    print_info "Generated files (*.js from *.ts, build artifacts, etc.) must be in .gitignore"
    exit 1
fi

# Check for unstaged changes to tracked files (M in second column of status)
unstaged_changes=$(git status --porcelain | grep '^.[MD]' || true)
if [ -n "$unstaged_changes" ]; then
    print_error "Some tracked files have unstaged changes after tests!"
    print_info "The following files have unstaged changes:"
    echo "$unstaged_changes"
    print_info "Please stage these changes with 'git add' and commit again"
    exit 1
fi

# Check if any previously staged files are no longer staged
# This would show files that were staged but are now modified (not staged)
staged_then_modified=$(git status --porcelain | grep '^ M' || true)
if [ -n "$staged_then_modified" ]; then
    print_error "Some staged files were modified during tests and are no longer fully staged!"
    print_info "The following files were staged but now have unstaged changes:"
    echo "$staged_then_modified"
    print_info "Please re-stage these changes with 'git add' and commit again"
    exit 1
fi

print_status "Working directory is clean and ready for commit"

print_info "Proceeding with commit..."

exit 0