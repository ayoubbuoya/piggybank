# Auto-Deposit Feature Not Working - Critical Bug Report

## Problem Statement
The automated recurring deposit feature (DCA - Dollar Cost Averaging) is completely non-functional. Manual deposits work perfectly, but when scheduling auto-deposits via deferred calls, the vault.deposit() function fails silently without any error events.

## System Architecture

### Contract Structure
1. **Factory Contract** (`factory.ts`): 
   - Deployed at: `AS12WXQU2x7WHU21AbM7eLN7PfPjSAFCZejz6PipJhC4X3Q9jvE9C`
   - Manages vault creation and auto-deposit scheduling
   - Uses Massa blockchain's deferred call system for automation

2. **Vault Contract** (`splitter.ts`):
   - DCA vaults that split deposits across multiple tokens (USDC, WETH, WBTC)
   - Uses EagleSwap DEX for token swaps
   - Has special `isFromFactory` logic to skip transferFrom when called by factory

3. **Deferred Call System**:
   - Massa blockchain feature for scheduled execution
   - Factory registers deferred calls that execute `executeScheduledDeposit()` every N seconds

## Auto-Deposit Flow

### User Action
1. User approves USDC to the **factory** (not vault)
2. User calls `factory.scheduleRecurringDeposit(vaultAddress, amount, intervalSeconds)`

### Factory Registration (`scheduleRecurringDeposit`)
```typescript
// Stores schedule in storage
const schedule = new AutoDepositSchedule(
  owner, 
  vaultAddress, 
  amount, 
  intervalSeconds, 
  nextExecutionTime
);

// Registers deferred call
const deferredId = deferredCallRegister(
  new Slot(targetPeriod, Context.currentThread()),
  Context.callee(), // Call factory's own address
  'executeScheduledDeposit', 
  new Args().add(owner).add(nextExecutionTime),
  maxGas: 500000000, // 500M gas
  coins: 0 // No coins sent with deferred call
);
```

### Deferred Execution (`executeScheduledDeposit`)
When the scheduled time arrives, Massa calls `factory.executeScheduledDeposit()`:

```typescript
export function executeScheduledDeposit(binaryArgs: StaticArray<u8>): void {
  // 1. Load schedule from storage
  const schedule = loadSchedule(owner, executionTime);
  
  // 2. Transfer USDC from user to vault
  baseToken.transferFrom(
    schedule.owner,
    schedule.vaultAddress,
    schedule.amount,
    getBalanceEntryCost(...)
  ); // ✅ THIS WORKS - Event: AUTO_DEPOSIT_DEBUG_AFTER_TRANSFER
  
  // 3. Transfer MAS to vault for swap gas
  transferCoins(schedule.vaultAddress, 500000000); // 0.5 MAS
  // ✅ THIS WORKS - Event: AUTO_DEPOSIT_DEBUG_AFTER_MAS_TRANSFER
  
  // 4. Call vault.deposit()
  vault.deposit(
    schedule.amount,      // 1 USDC
    20000000,            // 0.02 MAS per swap
    deadline,
    0                    // No coins with call (vault already has MAS)
  ); // ❌ THIS FAILS SILENTLY - No event after this
  
  // This event never fires:
  generateEvent(createEvent('AUTO_DEPOSIT_DEBUG_AFTER_VAULT_DEPOSIT', ...));
}
```

### Vault Deposit Logic (`splitter.ts`)
```typescript
export function deposit(binaryArgs: StaticArray<u8>): void {
  // Parse args
  const amount = args.nextU256();
  const coinsToUse = args.nextU64(); // 0.02 MAS per swap
  const deadline = args.nextU64();
  
  // Check if caller is factory
  const factoryAddressBytes = Storage.get(FACTORY_ADDRESS_KEY);
  const factoryAddressString = String.UTF8.decodeUnsafe(
    changetype<usize>(factoryAddressBytes), 
    factoryAddressBytes.length
  );
  const isFromFactory = Context.caller().toString() == factoryAddressString;
  
  // Skip transferFrom if factory already did it
  if (!isFromFactory) {
    baseToken.transferFrom(Context.caller(), Context.callee(), amount, ...);
  }
  
  // Do swaps for each token
  for (let i = 0; i < tokens.length; i++) {
    const tokenAddress = tokens[i];
    if (tokenAddress == BASE_TOKEN_ADDRESS) continue;
    
    const percentage = tokensPercentagesMap.get(tokenAddress);
    const tokenAmount = amount * percentage / 100;
    
    // Build swap route (USDC -> WMAS -> TOKEN)
    const swapRoute = [...];
    
    // Execute swap - Uses coinsToUse (0.02 MAS)
    const amountOut = eagleSwapRouter.swap(
      swapRoute,
      coinsToUse,
      deadline,
      coinsToUse  // Forwards MAS to router
    );
    
    assert(amountOut > 0, 'SWAP_FAILED_FOR_' + tokenAddress);
  }
  
  // Emit success event (never fires in auto-deposit)
  if (!isFromFactory) {
    generateEvent(createEvent('DEPOSIT', ...));
  }
}
```

## Observed Behavior

### Event Trail (from `check-events.ts`)
```
✅ AUTO_DEPOSIT_SCHEDULED - Registration successful
✅ AUTO_DEPOSIT_DEFERRED_CALL_REGISTERED - Deferred call created
✅ AUTO_DEPOSIT_EXECUTION_ATTEMPT - Execution started
✅ AUTO_DEPOSIT_DEBUG_SCHEDULE_LOADED - Schedule loaded correctly
✅ AUTO_DEPOSIT_DEBUG_AFTER_TRANSFER - USDC transferred to vault
✅ AUTO_DEPOSIT_DEBUG_AFTER_MAS_TRANSFER - 0.5 MAS transferred to vault
✅ AUTO_DEPOSIT_DEBUG_BEFORE_VAULT_DEPOSIT - About to call vault.deposit()
❌ AUTO_DEPOSIT_DEBUG_AFTER_VAULT_DEPOSIT - NEVER FIRES
```

### Vault Events (from `check-errors.ts`)
```
✅ CHANGE_OWNER - Vault created successfully
❌ DEPOSIT - No deposit event (vault.deposit() failing)
```

### No Error Events
- Factory emits zero error events
- Vault emits zero error events
- Execution appears to succeed but vault.deposit() call silently fails

## What Works vs What Doesn't

### ✅ Manual Deposits (Working Perfectly)
```typescript
// User calls vault.deposit() directly
// - User approves USDC to vault
// - User sends 0.1 MAS with transaction
// - vault.deposit() processes: transferFrom + swaps
// - Result: DEPOSIT event emitted, tokens swapped
```

### ❌ Auto-Deposits (Completely Broken)
```typescript
// Factory calls vault.deposit() via deferred execution
// - User approved USDC to factory
// - Factory does transferFrom(user, vault, amount) ✅
// - Factory transfers MAS to vault ✅
// - Factory calls vault.deposit() ❌ FAILS SILENTLY
// - No DEPOSIT event, no error event, execution just stops
```

## Attempted Fixes (All Failed)

### 1. Gas Limit Issues
- ❌ Increased from 20M → 100M → 500M → 1B (too high) → 500M
- Result: Execution happens but still fails at vault.deposit()

### 2. Coin Forwarding Issues
- ❌ Tried sending coins WITH deferred call
- ❌ Tried using Context.transferredCoins()
- ✅ Now using transferCoins() to vault's balance
- Result: Vault HAS MAS but deposit still fails

### 3. Parameter Issues
- ❌ Fixed coinsToUse parameter (was 500M, now 0.02M per swap)
- Result: Correct parameters but still fails

### 4. isFromFactory Comparison Bug
- ❌ Was comparing string to byte array (always false)
- ✅ Fixed using String.UTF8.decodeUnsafe()
- Result: Comparison works but deposit still fails

### 5. Storage/Serialization Issues
- ✅ Fixed storage serialization for AutoDepositSchedule
- ✅ Fixed thread alignment for deferred calls
- Result: Execution happens correctly but deposit still fails

## Critical Questions

1. **Why does vault.deposit() fail silently in deferred context but work perfectly in manual context?**
   - Same function
   - Same parameters
   - Vault has both USDC and MAS
   - No error events

2. **Is there a limitation with contract-to-contract calls in deferred execution context?**
   - Factory → Vault call works for other functions
   - transferFrom works, transferCoins works
   - Only vault.deposit() fails

3. **Could the issue be with the vault's swap calls to EagleSwap router?**
   - Manual deposits call the same swap logic successfully
   - But in deferred context, maybe router calls fail?

4. **Is there a gas accounting issue in deferred calls?**
   - Deferred call has 500M gas
   - transferFrom costs ~50M
   - vault.deposit() needs ~200M for swaps
   - Should be plenty but maybe deferred context has different limits?

## Files to Examine

### Smart Contracts
- `contracts/assembly/contracts/factory.ts` - Lines 280-550 (auto-deposit functions)
- `contracts/assembly/contracts/splitter.ts` - Lines 93-230 (deposit function)
- `contracts/assembly/contracts/interfaces/ISplitter.ts` - Line 26 (deposit interface)

### Test Scripts
- `contracts/src/check-events.ts` - Event analysis tool
- `contracts/src/check-errors.ts` - Error checking tool

### Frontend (Missing Implementation)
- Auto-deposit scheduling UI not implemented in frontend
- User would call: `factory.scheduleRecurringDeposit(vaultAddress, amount, interval)`

## Environment Details

- **Blockchain**: Massa Buildnet
- **Language**: AssemblyScript
- **SDK**: @massalabs/massa-as-sdk v0.9.0
- **Period Duration**: 16 seconds (32 threads)
- **Current Factory**: AS12WXQU2x7WHU21AbM7eLN7PfPjSAFCZejz6PipJhC4X3Q9jvE9C
- **Base Token**: USDC (6 decimals) - AS1hGGbthQy3uoquTfPy6SWoKbrFSzVXngc7M98KfGLEjWc5m3Ea

## Expected Behavior
When auto-deposit executes:
1. Factory transfers USDC from user to vault ✅
2. Factory transfers MAS to vault ✅
3. Factory calls vault.deposit() ✅
4. Vault processes deposit (swaps USDC → WETH/WBTC) ❌
5. Vault emits DEPOSIT event ❌
6. Factory emits success event ❌

## What I Need
A solution that makes vault.deposit() work when called by the factory in a deferred execution context, matching the behavior of manual deposits.

## Debugging Commands
```bash
# Check events
cd contracts
npx tsx src/check-events.ts

# Check errors  
npx tsx src/check-errors.ts

# Build contracts
npm run build

# Deploy factory
npm run deploy
```

## Test Scenario
1. Deploy factory
2. Create vault with 50% WETH 50% WMAS split
3. Approve 12 USDC to factory
4. Schedule: 1 USDC every 300 seconds
5. Wait 5 minutes
6. Check events - AUTO_DEPOSIT_DEBUG_AFTER_VAULT_DEPOSIT should fire but doesn't
7. Check vault - Should have WETH/WBTC but doesn't

---

**This has been failing for 2 days across multiple attempted fixes. The issue is NOT gas, NOT parameters, NOT storage - something fundamental about calling vault.deposit() from a deferred execution context is broken.**
