# Automation Vault Creation Issue - Debugging Summary

## Problem

Automated vaults are being created but not properly initialized. The vault contract is deployed but the `init` function is not being called successfully.

## Symptoms

1. Vault address is created: `AS1eP13XCZFyPB6123eVZD9n5JxGS1epiUyHqZUZaGzn1JBr6XYd`
2. No tokens found in vault storage (empty token list)
3. `getAutomationStatus` returns empty/default values
4. Cannot deposit to the vault

## Root Cause

The factory is using `call(vaultAddress, 'init', initArgs, initCoins)` to initialize the vault after deployment, but this call is likely failing silently or not being executed properly.

## Current Factory Flow

```typescript
// 1. Deploy contract
const vaultAddress = createSC(automatedSplitterByteCode);

// 2. Try to call init (THIS IS FAILING)
call(vaultAddress, "init", initArgs, initCoins);
```

## Solution Options

### Option 1: Use Interface Pattern (RECOMMENDED)

Instead of using `call()`, create an interface and call the init method directly:

```typescript
// In factory-automation-lite.ts
import { IAutomatedSplitter } from "./interfaces/IAutomatedSplitter";

// Deploy contract
const vaultAddress = createSC(automatedSplitterByteCode);

// Create interface instance
const splitterContract = new IAutomatedSplitter(vaultAddress);

// Call init through interface
splitterContract.init(
  tokensWithPercentage,
  caller,
  enableScheduledDeposits,
  // ... all other params
  initialGasReserve,
  initCoins
);
```

### Option 2: Back to Constructor Pattern

Move all initialization logic back to the constructor and pass args to `createSC`:

- Problem: `createSC` doesn't accept constructor args in Massa
- Would need to use a different deployment method

### Option 3: Two-Step Deployment

1. Deploy with minimal constructor
2. Call a separate initialization transaction from the frontend

- Problem: More complex, requires two transactions

## Recommended Fix

Update `factory-automation-lite.ts` to use the interface pattern like `factory-basic.ts` does:

1. Add `IAutomatedSplitter` interface with `init` method
2. Call `init` through the interface instead of using `call()`
3. This ensures type safety and proper execution

## Files to Update

- `contracts/assembly/contracts/factory-automation-lite.ts` - Use interface pattern
- `contracts/assembly/contracts/interfaces/IAutomatedSplitter.ts` - Add `init` method signature

## Testing

After fixing, create a new vault and verify:

1. Tokens are stored correctly (check vault details page)
2. Automation status returns proper values
3. Can deposit to the vault successfully
