#!/bin/bash
set -e

echo "Starting Open Libra Explorer build process..."

# Clean old build artifacts
echo "Cleaning previous build artifacts..."
rm -rf .next || true
rm -rf node_modules/.cache || true

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build with type-checking and linting disabled for speed
echo "Building application with Next.js..."
NEXT_DISABLE_LINT=1 NEXT_DISABLE_TYPE_CHECKS=1 npm run build

echo "Build completed successfully" 