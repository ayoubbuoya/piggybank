# Automation Vault - Core Initialization Issue

## The Problem

Automated vaults are being deployed but NOT initialized. The vault contract exists but has no data stored.

## Root Cause

The Massa blockchain has a limitation with how constructors work:

1. `createSC()` automatically calls the constructor with **empty args**
2. We try to call the constructor again with **actual args** through the interface
3. The second call fails because `assert(Context.isDeployingContract())` prevents re-calling the constructor

## Why Basic Vaults Work

The basic splitter has a simple constructor that accepts args directly:

```typescript
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  // Parse args and initialize
}
```

When the interface calls `constructor` with args, it works because it's the FIRST and ONLY call.

## Why Automated Vaults Don't Work

We have too many parameters (21+ individual params) to pass to the constructor. We tried:

1. Passing config objects - serialization issues
2. Passing individual params - too many parameters, interface becomes unwieldy
3. Using an `init` function - doesn't get called properly
4. Checking for empty args in constructor - second call still blocked

## Recommended Solution

### Option 1: Simplify to Match Basic Factory (RECOMMENDED)

Remove automation from vault creation. Create vaults as basic vaults, then add automation through separate transactions:

1. Create basic vault (works perfectly)
2. Call `enableScheduledDeposits()` if needed
3. Call `enableSavingsStrategy()` if needed
4. Add gas reserve through `addGas()`

**Pros:**

- Works with existing proven pattern
- Each step is simple and testable
- User has control over each feature

**Cons:**

- Multiple transactions required
- More complex UX

### Option 2: Embed Bytecode in Factory (Current Approach - BROKEN)

The factory embeds the automated splitter bytecode and tries to initialize it.

**Status:** NOT WORKING - initialization fails silently

### Option 3: Deploy Automation Contract Separately

Deploy the automated splitter as a standalone contract, then have the factory just reference it.

**Pros:**

- Smaller factory size
- Easier to update automation logic

**Cons:**

- More complex deployment process
- Still has the initialization issue

## Immediate Action Required

We've spent significant time trying to make the embedded bytecode approach work. The core issue is a Massa blockchain limitation with constructor re-calling.

**Recommendation:** Pivot to Option 1 (separate transactions for automation setup) or investigate if Massa has a different pattern for complex contract initialization.

## Files Involved

- `contracts/assembly/contracts/factory-automation-lite.ts` - Factory that creates vaults
- `contracts/assembly/contracts/automated-splitter-lite.ts` - Vault contract
- `contracts/assembly/contracts/interfaces/IAutomatedSplitter.ts` - Interface for calling vault
- `frontend/src/lib/automationService.ts` - Frontend service

## Test Results

- ✅ Basic vaults work perfectly
- ❌ Automated vaults deploy but don't initialize
- ❌ No tokens stored in vault
- ❌ No automation data stored
- ❌ Cannot deposit to vault
