#!/bin/bash

echo "=========================================="
echo "Deploying Automation Factory"
echo "=========================================="
echo ""

# Use automation-only factory
echo "1. Switching to automation-only factory..."
cp assembly/contracts/factory-automation-only.ts assembly/contracts/factory.ts
echo "   ✓ Using factory-automation-only.ts"
echo ""

# Build
echo "2. Building contracts..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ✗ Build failed!"
    exit 1
fi
echo "   ✓ Build successful"
echo ""

# Deploy
echo "3. Deploying to blockchain..."
npm run deploy
if [ $? -ne 0 ]; then
    echo "   ✗ Deployment failed!"
    exit 1
fi
echo ""

echo "=========================================="
echo "Automation Factory Deployed!"
echo "=========================================="
echo ""
echo "This factory creates ONLY automated vaults."
echo "Use it alongside the basic factory for full functionality."
echo ""
