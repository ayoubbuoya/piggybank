# Design Document

## Overview

This design implements autonomous vault automation using Massa's Autonomous Smart Contracts (ASC) functionality. The system enables vaults to execute operations autonomously through deferred calls, supporting Dollar-Cost Averaging (DCA), scheduled deposits, and custom savings strategies without external triggers or keepers.

### Key Design Principles

1. **Self-Sovereignty**: Vaults execute autonomously using Massa's native deferred call mechanism
2. **Gas Efficiency**: Minimize gas costs through optimized scheduling and batch operations
3. **Fail-Safe**: Graceful degradation with event emission and retry logic
4. **Extensibility**: Modular design allowing new automation strategies
5. **Security**: Strict access control ensuring only authorized deferred calls execute

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Factory Contract                          │
│  - Creates automated vaults                                  │
│  - Manages vault registry                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ creates
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Automated Splitter Vault                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Automation Engine                            │   │
│  │  - Deferred call scheduler                          │   │
│  │  - Execution validator                              │   │
│  │  - Gas manager                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Strategy Modules                             │   │
│  │  - DCA Strategy                                     │   │
│  │  - Scheduled Deposit Strategy                       │   │
│  │  - Custom Savings Strategy                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Core Vault Logic                             │   │
│  │  - Token distribution                               │   │
│  │  - Swap execution                                   │   │
│  │  - Balance management                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ interacts with
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    EagleFi DEX                               │
│  - Token swaps                                               │
│  - Liquidity pools                                           │
└─────────────────────────────────────────────────────────────┘
```

### Massa Autonomous Smart Contracts (ASC)

Massa's ASC allows contracts to schedule future executions using deferred calls. Key features:

- **sendMessage()**: Schedule a future call to a contract function
- **Autonomous Execution**: Massa network executes scheduled calls automatically
- **Gas Prepayment**: Gas is reserved when scheduling the call
- **Guaranteed Execution**: Network ensures execution at specified time

## Components and Interfaces

### 1. Automation Engine Module

**File**: `contracts/assembly/contracts/lib/AutomationEngine.ts`

Core component managing deferred call lifecycle.

```typescript
class AutomationEngine {
  // Schedule a deferred call
  static scheduleCall(
    targetFunction: string,
    args: Args,
    executeAt: u64,
    gasLimit: u64,
    coins: u64
  ): void;

  // Validate caller is authorized (self-call)
  static validateDeferredExecution(): void;

  // Cancel a scheduled operation
  static cancelScheduledCall(scheduleId: string): void;

  // Calculate next execution time based on frequency
  static calculateNextExecution(
    frequency: AutomationFrequency,
    currentTime: u64
  ): u64;
}

enum AutomationFrequency {
  DAILY,
  WEEKLY,
  BIWEEKLY,
  MONTHLY,
}
```

### 2. DCA Strategy Module

**File**: `contracts/assembly/contracts/lib/strategies/DCAStrategy.ts`

Implements Dollar-Cost Averaging logic.

```typescript
class DCAStrategy {
  // Configuration
  amount: u256; // Amount per purchase
  frequency: AutomationFrequency;
  startTime: u64;
  endTime: u64;
  totalPurchases: u32;
  completedPurchases: u32;
  isActive: bool;

  // Execute a DCA purchase
  static executeDCAPurchase(vaultAddress: Address): void;

  // Schedule next DCA purchase
  static scheduleNextPurchase(vaultAddress: Address): void;

  // Check if DCA should continue
  static shouldContinue(): bool;
}
```

### 3. Scheduled Deposit Strategy Module

**File**: `contracts/assembly/contracts/lib/strategies/ScheduledDepositStrategy.ts`

Manages recurring deposits from user wallet.

```typescript
class ScheduledDepositStrategy {
  // Configuration
  depositAmount: u256;
  frequency: AutomationFrequency;
  sourceWallet: Address;
  startTime: u64;
  endTime: u64;
  isActive: bool;
  retryCount: u8;

  // Execute scheduled deposit
  static executeScheduledDeposit(vaultAddress: Address): void;

  // Handle deposit failure with retry logic
  static handleDepositFailure(error: string): void;

  // Schedule next deposit
  static scheduleNextDeposit(vaultAddress: Address): void;
}
```

### 4. Custom Savings Strategy Module

**File**: `contracts/assembly/contracts/lib/strategies/SavingsStrategy.ts`

Flexible strategy supporting accumulation and distribution.

```typescript
enum StrategyType {
  ACCUMULATION, // Increasing deposits over time
  DISTRIBUTION, // Scheduled withdrawals
  HYBRID, // Both phases
}

class SavingsStrategy {
  strategyType: StrategyType;
  baseAmount: u256;
  growthRate: u8; // Percentage increase per period
  distributionAddress: Address;
  phaseTransitionTime: u64;
  isActive: bool;

  // Execute strategy action
  static executeStrategy(vaultAddress: Address): void;

  // Calculate current amount based on growth rate
  static calculateCurrentAmount(
    baseAmount: u256,
    periods: u32,
    growthRate: u8
  ): u256;

  // Transition between strategy phases
  static transitionPhase(): void;
}
```

### 5. Gas Manager Module

**File**: `contracts/assembly/contracts/lib/GasManager.ts`

Manages gas reserves for deferred operations.

```typescript
class GasManager {
  // Gas reserve balance
  static getGasReserve(): u64;

  // Add gas to reserve
  static depositGas(amount: u64): void;

  // Deduct gas for operation
  static consumeGas(amount: u64): bool;

  // Calculate gas needed for operation
  static estimateGasForOperation(operationType: string): u64;

  // Check if sufficient gas available
  static hasSufficientGas(requiredGas: u64): bool;

  // Emit low gas warning
  static emitLowGasWarning(): void;
}
```

### 6. Enhanced Splitter Contract

**File**: `contracts/assembly/contracts/automated-splitter.ts`

Extended splitter contract with automation capabilities.

```typescript
// New constructor parameters
export function constructor(binaryArgs: StaticArray<u8>): void {
  // Existing parameters...
  // New automation parameters
  const enableDCA = args.nextBool();
  const dcaConfig = args.nextSerializable<DCAConfig>();
  const enableScheduledDeposits = args.nextBool();
  const scheduledDepositConfig =
    args.nextSerializable<ScheduledDepositConfig>();
  const enableSavingsStrategy = args.nextBool();
  const savingsStrategyConfig = args.nextSerializable<SavingsStrategyConfig>();
  const initialGasReserve = args.nextU64();

  // Initialize automation if enabled
  if (enableDCA) {
    initializeDCA(dcaConfig);
  }
  // ... other initializations
}

// Deferred call entry points (self-callable only)
export function executeDeferredDCA(): void {
  AutomationEngine.validateDeferredExecution();
  DCAStrategy.executeDCAPurchase(Context.callee());
}

export function executeDeferredDeposit(): void {
  AutomationEngine.validateDeferredExecution();
  ScheduledDepositStrategy.executeScheduledDeposit(Context.callee());
}

export function executeDeferredStrategy(): void {
  AutomationEngine.validateDeferredExecution();
  SavingsStrategy.executeStrategy(Context.callee());
}

// Management functions
export function pauseAutomation(): void {
  onlyOwner();
  // Pause all automation
}

export function resumeAutomation(): void {
  onlyOwner();
  // Resume automation
}

export function updateAutomationConfig(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  // Update configuration and reschedule
}

export function addGasReserve(binaryArgs: StaticArray<u8>): void {
  // Add gas to reserve
}

export function getAutomationStatus(): StaticArray<u8> {
  // Return current automation status
}
```

## Data Models

### Storage Keys

```typescript
// Automation configuration keys
const DCA_ENABLED_KEY = stringToBytes("dca_enabled");
const DCA_CONFIG_KEY = stringToBytes("dca_config");
const SCHEDULED_DEPOSIT_ENABLED_KEY = stringToBytes("sd_enabled");
const SCHEDULED_DEPOSIT_CONFIG_KEY = stringToBytes("sd_config");
const SAVINGS_STRATEGY_ENABLED_KEY = stringToBytes("ss_enabled");
const SAVINGS_STRATEGY_CONFIG_KEY = stringToBytes("ss_config");
const GAS_RESERVE_KEY = stringToBytes("gas_reserve");
const AUTOMATION_PAUSED_KEY = stringToBytes("automation_paused");

// Execution tracking keys
const LAST_DCA_EXECUTION_KEY = stringToBytes("last_dca_exec");
const LAST_DEPOSIT_EXECUTION_KEY = stringToBytes("last_deposit_exec");
const LAST_STRATEGY_EXECUTION_KEY = stringToBytes("last_strategy_exec");
const DCA_PURCHASE_COUNT_KEY = stringToBytes("dca_purchase_count");
const DEPOSIT_FAILURE_COUNT_KEY = stringToBytes("deposit_failure_count");
```

### Configuration Structures

```typescript
// DCA Configuration
class DCAConfig {
  amount: u256;
  frequency: u8; // AutomationFrequency enum
  startTime: u64;
  endTime: u64;
  gasPerExecution: u64;

  serialize(): StaticArray<u8>;
  static deserialize(data: StaticArray<u8>): DCAConfig;
}

// Scheduled Deposit Configuration
class ScheduledDepositConfig {
  depositAmount: u256;
  frequency: u8;
  sourceWallet: string;
  startTime: u64;
  endTime: u64;
  maxRetries: u8;
  gasPerExecution: u64;

  serialize(): StaticArray<u8>;
  static deserialize(data: StaticArray<u8>): ScheduledDepositConfig;
}

// Savings Strategy Configuration
class SavingsStrategyConfig {
  strategyType: u8; // StrategyType enum
  baseAmount: u256;
  growthRate: u8;
  frequency: u8;
  distributionAddress: string;
  phaseTransitionTime: u64;
  startTime: u64;
  endTime: u64;
  gasPerExecution: u64;

  serialize(): StaticArray<u8>;
  static deserialize(data: StaticArray<u8>): SavingsStrategyConfig;
}

// Automation Status (for queries)
class AutomationStatus {
  dcaEnabled: bool;
  dcaNextExecution: u64;
  dcaPurchasesCompleted: u32;
  scheduledDepositEnabled: bool;
  scheduledDepositNextExecution: u64;
  savingsStrategyEnabled: bool;
  savingsStrategyNextExecution: u64;
  gasReserve: u64;
  isPaused: bool;

  serialize(): StaticArray<u8>;
}
```

## Error Handling

### Error Types

```typescript
enum AutomationError {
  INSUFFICIENT_GAS = "INSUFFICIENT_GAS_RESERVE",
  UNAUTHORIZED_CALLER = "UNAUTHORIZED_DEFERRED_CALL",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_VAULT_BALANCE",
  SWAP_FAILED = "TOKEN_SWAP_FAILED",
  DEPOSIT_FAILED = "SCHEDULED_DEPOSIT_FAILED",
  INVALID_CONFIG = "INVALID_AUTOMATION_CONFIG",
  ALREADY_PAUSED = "AUTOMATION_ALREADY_PAUSED",
  NOT_PAUSED = "AUTOMATION_NOT_PAUSED",
}
```

### Error Handling Strategy

1. **Deferred Call Validation**: Verify caller is contract itself
2. **Gas Checks**: Validate sufficient gas before operations
3. **Balance Checks**: Ensure sufficient funds before swaps/transfers
4. **Retry Logic**: Implement exponential backoff for transient failures
5. **Event Emission**: Emit detailed error events for monitoring
6. **Graceful Degradation**: Pause automation on critical failures

### Event Definitions

```typescript
// Success events
createEvent("DCA_PURCHASE_EXECUTED", [vaultAddress, amount, timestamp]);
createEvent("SCHEDULED_DEPOSIT_EXECUTED", [vaultAddress, amount, timestamp]);
createEvent("SAVINGS_STRATEGY_EXECUTED", [
  vaultAddress,
  action,
  amount,
  timestamp,
]);
createEvent("AUTOMATION_SCHEDULED", [
  vaultAddress,
  operationType,
  nextExecution,
]);

// Error events
createEvent("AUTOMATION_ERROR", [
  vaultAddress,
  errorType,
  errorMessage,
  timestamp,
]);
createEvent("LOW_GAS_WARNING", [vaultAddress, currentGas, requiredGas]);
createEvent("DEPOSIT_RETRY_SCHEDULED", [vaultAddress, retryCount, nextRetry]);

// Management events
createEvent("AUTOMATION_PAUSED", [vaultAddress, timestamp]);
createEvent("AUTOMATION_RESUMED", [vaultAddress, timestamp]);
createEvent("AUTOMATION_CONFIG_UPDATED", [vaultAddress, configType, timestamp]);
createEvent("GAS_RESERVE_ADDED", [vaultAddress, amount, newBalance]);
```

## Testing Strategy

### Unit Tests

**File**: `contracts/assembly/__tests__/automation.spec.ts`

1. **AutomationEngine Tests**

   - Test deferred call scheduling
   - Test execution validation
   - Test next execution calculation

2. **DCA Strategy Tests**

   - Test purchase execution
   - Test scheduling logic
   - Test completion conditions

3. **Scheduled Deposit Tests**

   - Test deposit execution
   - Test retry logic
   - Test failure handling

4. **Savings Strategy Tests**

   - Test accumulation logic
   - Test distribution logic
   - Test phase transitions

5. **Gas Manager Tests**
   - Test gas reserve management
   - Test gas consumption
   - Test low gas warnings

### Integration Tests

**File**: `contracts/src/tests/automation-integration.test.ts`

1. **End-to-End DCA Flow**

   - Create vault with DCA enabled
   - Verify first purchase scheduled
   - Simulate time passage and execution
   - Verify token balances updated

2. **Scheduled Deposit Flow**

   - Configure scheduled deposits
   - Approve token allowance
   - Execute deposit
   - Verify vault distribution

3. **Multi-Strategy Vault**

   - Enable multiple strategies
   - Verify independent execution
   - Test gas management across strategies

4. **Failure Recovery**
   - Test insufficient balance handling
   - Test retry mechanism
   - Test pause/resume functionality

### Frontend Testing

1. **Automation Configuration UI**

   - Test form validation
   - Test gas estimation display
   - Test configuration preview

2. **Automation Monitoring**

   - Test status display
   - Test countdown timers
   - Test execution history

3. **Gas Management UI**
   - Test low gas warnings
   - Test gas addition flow

## Implementation Notes

### Massa Deferred Call Usage

```typescript
import { sendMessage } from "@massalabs/massa-as-sdk";

// Schedule a deferred call
function scheduleDeferredCall(
  targetFunction: string,
  args: Args,
  executeAt: u64,
  gasLimit: u64,
  coins: u64
): void {
  const calleeAddress = Context.callee();

  sendMessage(
    calleeAddress, // Target contract (self)
    targetFunction, // Function to call
    Coins.fromU64(coins), // Coins to send
    args.serialize(), // Function arguments
    executeAt, // Execution timestamp
    gasLimit // Gas limit
  );
}
```

### Security Considerations

1. **Self-Call Validation**: All deferred entry points must validate caller is contract itself
2. **Owner-Only Management**: Configuration changes restricted to vault owner
3. **Gas Reserve Protection**: Prevent gas reserve depletion attacks
4. **Reentrancy Protection**: Maintain reentrancy guards on all entry points
5. **Integer Overflow**: Use SafeMath for all arithmetic operations

### Gas Optimization

1. **Batch Operations**: Combine multiple swaps when possible
2. **Minimal Storage**: Use efficient data structures
3. **Event Optimization**: Emit only essential event data
4. **Lazy Evaluation**: Calculate values only when needed

### Upgrade Path

1. **Factory Versioning**: Factory can deploy new vault versions
2. **Migration Support**: Users can migrate to new vault versions
3. **Backward Compatibility**: Maintain support for non-automated vaults

## Frontend Integration

### New Components

1. **AutomationConfigPanel**: Configure automation settings
2. **AutomationStatusCard**: Display active automations
3. **GasReserveWidget**: Manage gas reserves
4. **ExecutionHistoryTable**: Show past executions
5. **ScheduleTimeline**: Visual timeline of upcoming operations

### API Integration

```typescript
// Create vault with automation
async function createAutomatedVault(
  config: AutomatedVaultConfig
): Promise<string> {
  const args = new Args()
    .addSerializableObjectArray(config.tokens)
    .addBool(config.enableDCA)
    .addSerializable(config.dcaConfig)
    .addBool(config.enableScheduledDeposits)
    .addSerializable(config.scheduledDepositConfig)
    .addBool(config.enableSavingsStrategy)
    .addSerializable(config.savingsStrategyConfig)
    .addU64(config.initialGasReserve);

  // Call factory contract
  return await factoryContract.createAutomatedVault(args);
}

// Get automation status
async function getAutomationStatus(
  vaultAddress: string
): Promise<AutomationStatus> {
  const result = await vaultContract.getAutomationStatus();
  return AutomationStatus.deserialize(result);
}

// Add gas reserve
async function addGasReserve(vaultAddress: string, amount: u64): Promise<void> {
  const args = new Args().addU64(amount);
  await vaultContract.addGasReserve(args);
}
```

### State Management

```typescript
// Automation context
interface AutomationContext {
  vaults: Map<string, AutomationStatus>;
  updateInterval: number;
  gasWarningThreshold: u64;
}

// Hooks
function useAutomationStatus(vaultAddress: string): AutomationStatus;
function useGasReserve(vaultAddress: string): { balance: u64; isLow: boolean };
function useExecutionHistory(vaultAddress: string): ExecutionRecord[];
```

## Migration Strategy

### Phase 1: Core Infrastructure

- Implement AutomationEngine
- Implement GasManager
- Add deferred call support to splitter contract

### Phase 2: DCA Strategy

- Implement DCA strategy module
- Add DCA configuration to factory
- Build DCA UI components

### Phase 3: Scheduled Deposits

- Implement scheduled deposit strategy
- Add retry logic
- Build deposit management UI

### Phase 4: Savings Strategies

- Implement savings strategy module
- Add phase transition logic
- Build strategy configuration UI

### Phase 5: Integration & Testing

- End-to-end testing
- Gas optimization
- Documentation and deployment
