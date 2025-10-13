# Simple Deployment Solution

## The Real Problem

The factory contract is too large because it embeds both:
1. splitter.wasm (~50KB)
2. automated-splitter.wasm (~150KB)

Total: ~200KB+ which causes stack overflow during deployment.

## Simple Solution

**Deploy the factory WITHOUT automation support for now.**

This gives you a working system to test while we figure out the automation deployment.

## Steps

### 1. Comment Out Automated Vault Function

Edit `contracts/assembly/contracts/factory.ts` and comment out the entire `createAutomatedVault` function (lines ~248-340).

### 2. Update Factory Constructor

The factory constructor was modified to expect template addresses. Revert it to the original:

```typescript
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  
  const args = new Args(binaryArgs);
  const swapRouterAddress = args.nextString().expect('swap router address expected');
  
  Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, swapRouterAddress);
  
  // ... rest of constructor
}
```

### 3. Deploy

```bash
npm run build
npm run deploy
```

This will deploy a factory that can:
- ✅ Create basic splitter vaults
- ✅ Create and deposit to vaults
- ✅ All basic functionality works
- ❌ No automation (yet)

### 4. Test

Update your frontend `.env` with the deployed factory address and test:
- Creating vaults
- Depositing funds
- Token splitting
- Withdrawals

## Why This Works

By removing the automated-splitter bytecode, the factory becomes small enough (~80KB) to deploy successfully.

## Adding Automation Later

Once basic functionality is tested, we can add automation using one of these approaches:

### Option A: Separate Automation Factory
Create a second factory just for automated vaults

### Option B: Proper Template Architecture  
Refactor contracts to support true template cloning

### Option C: Upgrade Mechanism
Add an upgrade function to the factory

## Quick Revert Script

If you want to quickly revert to a deployable state:

```bash
# Restore original factory (if you have it in git)
git checkout contracts/assembly/contracts/factory.ts

# Or use the backup
cp contracts/assembly/contracts/factory-template-based.ts.backup contracts/assembly/contracts/factory.ts
```

## Bottom Line

**Get the basic system working first, then add automation.**

This is a pragmatic approach that unblocks you for testing while we solve the deployment architecture properly.

Would you like me to create a script that automatically comments out the automation function and reverts the constructor?
