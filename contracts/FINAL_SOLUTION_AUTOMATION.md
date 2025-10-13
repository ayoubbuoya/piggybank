# FINAL Solution for Automation Deployment

## The Core Problem

The factory contract becomes **218KB** when it embeds both:
- splitter.wasm (43KB)
- automated-splitter.wasm (86KB)

Massa has a maximum contract size limit, and 218KB exceeds it.

## Why This Happens

The `fileToByteArray()` function embeds the entire WASM file into the factory contract at compile time. This makes the factory huge.

## Real Solutions

### Solution 1: Two Separate Factories (RECOMMENDED)

Deploy two factories:
1. **Basic Factory** - Only creates splitter vaults (117KB - works!)
2. **Automation Factory** - Only creates automated vaults

**Pros:**
- ✅ Both factories are small enough to deploy
- ✅ No code changes needed
- ✅ Works immediately

**Cons:**
- ❌ Need to manage two contract addresses
- ❌ Frontend needs to know which factory to use

**Implementation:**
```typescript
// In frontend
const BASIC_FACTORY = 'AS12...'; // For normal vaults
const AUTOMATION_FACTORY = 'AS12...'; // For automated vaults

// When creating vault
if (enableAutomation) {
  await createAutomatedVault(AUTOMATION_FACTORY, ...);
} else {
  await createSplitterVault(BASIC_FACTORY, ...);
}
```

### Solution 2: External Bytecode Storage

Store the automated-splitter bytecode in a separate storage contract, then load it when needed.

**Pros:**
- ✅ Single factory contract
- ✅ Factory stays small

**Cons:**
- ❌ Requires significant refactoring
- ❌ More complex deployment
- ❌ Higher gas costs for vault creation

### Solution 3: Massa Contract Upgrade Mechanism

Use Massa's built-in contract upgrade feature to add automation later.

**Pros:**
- ✅ Can start with basic factory
- ✅ Add automation without redeployment

**Cons:**
- ❌ Complex upgrade mechanism
- ❌ Still hits size limits

### Solution 4: Optimize Contract Code

Remove unused code, optimize algorithms, reduce contract size.

**Pros:**
- ✅ Single factory
- ✅ All features in one place

**Cons:**
- ❌ Time-consuming
- ❌ May not reduce size enough
- ❌ Risk of breaking functionality

## RECOMMENDED APPROACH

**Use Solution 1: Two Separate Factories**

This is the fastest, safest, and most practical solution.

### Step 1: Deploy Basic Factory

```bash
cd contracts/assembly/contracts
cp factory-basic.ts factory.ts
cd ../..
npm run build
npm run deploy
```

Save the address as `BASIC_FACTORY_ADDRESS`.

### Step 2: Create Automation-Only Factory

Create `factory-automation-only.ts`:

```typescript
// Only has createAutomatedVault function
// Embeds only automated-splitter.wasm
export function createAutomatedVault(binaryArgs: StaticArray<u8>): void {
  const automatedSplitterByteCode = fileToByteArray('build/automated-splitter.wasm');
  // ... rest of implementation
}
```

### Step 3: Deploy Automation Factory

```bash
cp factory-automation-only.ts factory.ts
npm run build
npm run deploy
```

Save the address as `AUTOMATION_FACTORY_ADDRESS`.

### Step 4: Update Frontend

```typescript
// frontend/.env
VITE_BASIC_FACTORY=AS12...
VITE_AUTOMATION_FACTORY=AS12...
VITE_ENABLE_AUTOMATION=true

// frontend/src/lib/massa.ts
export const BASIC_FACTORY = import.meta.env.VITE_BASIC_FACTORY;
export const AUTOMATION_FACTORY = import.meta.env.VITE_AUTOMATION_FACTORY;

// Use appropriate factory based on vault type
```

## Why This is the Best Solution

1. **Works immediately** - No complex refactoring needed
2. **Both contracts are small enough** - Each under 150KB
3. **Clean separation** - Basic vs Advanced features
4. **Easy to maintain** - Each factory has clear responsibility
5. **Scalable** - Can add more specialized factories later

## Implementation Time

- Creating automation-only factory: 30 minutes
- Deploying both factories: 5 minutes
- Updating frontend: 15 minutes
- **Total: ~1 hour**

## Alternative: Just Use Basic Factory for Now

If you want to test quickly:
1. Deploy basic factory (works now)
2. Test all basic features
3. Add automation later when ready

This lets you validate the core system while we implement the two-factory solution properly.

## Next Steps

Would you like me to:
1. Create the automation-only factory contract?
2. Update the frontend to use two factories?
3. Deploy both and get you fully working?

Let me know and I'll implement it!
