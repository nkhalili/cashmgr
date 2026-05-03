#!/bin/bash

echo "🔍 Verifying Cash Mgr. Project Setup..."
echo ""

# Check if packages are built
echo "✓ Checking if shared packages are built..."
if [ -d "packages/core/dist" ] && [ -d "packages/db/dist" ] && [ -d "packages/ui/dist" ]; then
    echo "  ✓ All packages built successfully"
else
    echo "  ✗ Some packages are not built. Run: pnpm build:packages"
    exit 1
fi

# Check package contents
echo "✓ Checking package outputs..."
if [ -f "packages/core/dist/index.js" ] && [ -f "packages/db/dist/index.js" ] && [ -f "packages/ui/dist/index.js" ]; then
    echo "  ✓ All package entry points exist"
else
    echo "  ✗ Some package entry points missing"
    exit 1
fi

echo ""
echo "✅ Project setup verified successfully!"
echo ""
echo "You can now run:"
echo "  pnpm dev:web      # Start web app"
echo "  pnpm dev:mobile   # Start mobile app"
echo "  pnpm dev:desktop  # Start desktop app"
