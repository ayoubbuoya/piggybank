#!/bin/bash

echo "=========================================="
echo "Deploying Basic Factory (No Automation)"
echo "=========================================="
echo ""

# Backup current factory
echo "1. Backing up current factory..."
cp assembly/contracts/factory.ts assembly/contracts/factory-with-automation.backup.ts
echo "   ✓ Backup created: factory-with-automation.backup.ts"
echo ""

# Use basic factory
echo "2. Switching to basic factory..."
cp assembly/contracts/factory-basic.ts assembly/contracts/factory.ts
echo "   ✓ Using factory-basic.ts"
echo ""

# Build
echo "3. Building contracts..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ✗ Build failed!"
    exit 1
fi
echo "   ✓ Build successful"
echo ""

# Deploy
echo "4. Deploying to blockchain..."
npm run deploy
if [ $? -ne 0 ]; then
    echo "   ✗ Deployment failed!"
    exit 1
fi
echo ""

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy the factory address above"
echo "2. Update frontend/.env with: VITE_SMART_CONTRACT=<address>"
echo "3. Test the frontend: cd ../frontend && npm run dev"
echo ""
echo "To restore full factory later:"
echo "  cp assembly/contracts/factory-with-automation.backup.ts assembly/contracts/factory.ts"
echo ""
