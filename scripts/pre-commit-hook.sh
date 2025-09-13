#!/bin/bash

# Pre-commit hook for axum_napi_bridge v1.0.0
# Runs all tests to ensure code quality before committing

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
print_info "Proceeding with commit..."

exit 0