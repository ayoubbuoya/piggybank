# Automation Event Documentation

This document provides a comprehensive overview of all events emitted by the automation system.

## Event Categories

### 1. Success Events
Events emitted when operations complete successfully.

### 2. Error Events
Events emitted when operations fail or encounter issues.

### 3. Management Events
Events emitted when configuration or state changes occur.

### 4. Scheduling Events
Events emitted when operations are scheduled for future execution.

---

## Success Events

### DCA_PURCHASE_EXECUTED
**Emitted when:** A DCA purchase is successfully executed

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `amount` (string): Amount purchased
- `timestamp` (string): Execution timestamp
- `purchaseCount` (string): Total number of purchases completed

**Emitted by:** `DCAStrategy.executeDCAPurchase()`

**Example:**
```
DCA_PURCHASE_EXECUTED(
    "AS12...",
    "1000000000",
    "1234567890",
    "5"
)
```

---

### SCHEDULED_DEPOSIT_EXECUTED
**Emitted when:** A scheduled deposit is successfully executed

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `amount` (string): Amount deposited
- `timestamp` (string): Execution timestamp

**Emitted by:** `ScheduledDepositStrategy.executeScheduledDeposit()`

**Example:**
```
SCHEDULED_DEPOSIT_EXECUTED(
    "AS12...",
    "5000000000",
    "1234567890"
)
```

---

### SAVINGS_STRATEGY_EXECUTED
**Emitted when:** A savings strategy is successfully executed

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `action` (string): Action performed (ACCUMULATION, DISTRIBUTION)
- `amount` (string): Amount involved in the action
- `timestamp` (string): Execution timestamp

**Emitted by:** `SavingsStrategy.executeStrategy()`

**Example:**
```
SAVINGS_STRATEGY_EXECUTED(
    "AS12...",
    "DISTRIBUTION",
    "2000000000",
    "1234567890"
)
```

---

### AUTOMATION_SCHEDULED
**Emitted when:** An automation operation is scheduled for future execution

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `operationType` (string): Type of operation (DCA, DEPOSIT, STRATEGY)
- `nextExecution` (string): Timestamp of next execution

**Emitted by:** `AutomationEngine.scheduleCall()`

**Example:**
```
AUTOMATION_SCHEDULED(
    "AS12...",
    "DCA",
    "1234567890"
)
```

---

## Error Events

### AUTOMATION_ERROR
**Emitted when:** An automation error occurs

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `errorType` (string): Type of error (from AutomationError enum)
- `errorMessage` (string): Detailed error message
- `timestamp` (string): Error timestamp

**Emitted by:** Multiple modules when errors occur

**Error Types:**
- `INSUFFICIENT_GAS`: Not enough gas reserve for operation
- `UNAUTHORIZED_CALLER`: Deferred call from unauthorized source
- `INSUFFICIENT_BALANCE`: Vault or wallet has insufficient balance
- `SWAP_FAILED`: Token swap operation failed
- `DEPOSIT_FAILED`: Deposit operation failed
- `INVALID_CONFIG`: Configuration is invalid or missing
- `ALREADY_PAUSED`: Automation is already paused
- `NOT_PAUSED`: Automation is not paused
- `DEFERRED_CALL_NOT_FOUND`: Deferred call ID not found

**Example:**
```
AUTOMATION_ERROR(
    "AS12...",
    "INSUFFICIENT_GAS",
    "Insufficient gas reserve for DCA execution",
    "1234567890"
)
```

---

### LOW_GAS_WARNING
**Emitted when:** Gas reserve is running low

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `currentGas` (string): Current gas reserve
- `requiredGas` (string): Required gas for next operation

**Emitted by:** `GasManager.emitLowGasWarning()`

**Example:**
```
LOW_GAS_WARNING(
    "AS12...",
    "100000000",
    "500000000"
)
```

---

### DEPOSIT_RETRY_SCHEDULED
**Emitted when:** A failed deposit is scheduled for retry

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `retryCount` (string): Number of retries attempted
- `nextRetry` (string): Timestamp of next retry

**Emitted by:** `ScheduledDepositStrategy.handleDepositFailure()`

**Example:**
```
DEPOSIT_RETRY_SCHEDULED(
    "AS12...",
    "2",
    "1234571490"
)
```

---

## Management Events

### AUTOMATION_PAUSED
**Emitted when:** Automation is paused

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `timestamp` (string): Pause timestamp

**Emitted by:** `automated-splitter.pauseAutomation()`

**Example:**
```
AUTOMATION_PAUSED(
    "AS12...",
    "1234567890"
)
```

---

### AUTOMATION_RESUMED
**Emitted when:** Automation is resumed

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `timestamp` (string): Resume timestamp

**Emitted by:** `automated-splitter.resumeAutomation()`

**Example:**
```
AUTOMATION_RESUMED(
    "AS12...",
    "1234567890"
)
```

---

### AUTOMATION_CONFIG_UPDATED
**Emitted when:** Automation configuration is updated

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `configType` (string): Type of configuration updated (DCA, DEPOSIT, STRATEGY)
- `timestamp` (string): Update timestamp

**Emitted by:** 
- `DCAStrategy.updateConfig()`
- `ScheduledDepositStrategy.updateConfig()`
- `SavingsStrategy.updateConfig()`
- `automated-splitter.updateAutomationConfig()`

**Example:**
```
AUTOMATION_CONFIG_UPDATED(
    "AS12...",
    "DCA",
    "1234567890"
)
```

---

### GAS_RESERVE_ADDED
**Emitted when:** Gas is added to the reserve

**Parameters:**
- `vaultAddress` (string): Address of the vault
- `amount` (string): Amount of gas added
- `newBalance` (string): New total gas balance

**Emitted by:** `GasManager.depositGas()`

**Example:**
```
GAS_RESERVE_ADDED(
    "AS12...",
    "1000000000",
    "1500000000"
)
```

---

## Event Emission Points

### AutomationEngine
- `AUTOMATION_SCHEDULED`: When a deferred call is scheduled
- `AUTOMATION_ERROR`: When scheduling fails or validation fails
- `AUTOMATION_CANCELLED`: When a deferred call is cancelled

### GasManager
- `GAS_RESERVE_ADDED`: When gas is deposited
- `LOW_GAS_WARNING`: When gas reserve is low

### DCAStrategy
- `DCA_PURCHASE_EXECUTED`: After successful purchase
- `AUTOMATION_ERROR`: When purchase fails or config is invalid
- `AUTOMATION_CONFIG_UPDATED`: When DCA config is updated
- `DCA_INITIALIZED`: When DCA is first initialized
- `DCA_PAUSED`: When DCA is paused
- `DCA_RESUMED`: When DCA is resumed
- `DCA_COMPLETED`: When DCA completes all purchases

### ScheduledDepositStrategy
- `SCHEDULED_DEPOSIT_EXECUTED`: After successful deposit
- `DEPOSIT_RETRY_SCHEDULED`: When a retry is scheduled
- `AUTOMATION_ERROR`: When deposit fails or config is invalid
- `AUTOMATION_CONFIG_UPDATED`: When deposit config is updated
- `SCHEDULED_DEPOSIT_INITIALIZED`: When scheduled deposits are initialized
- `SCHEDULED_DEPOSIT_PAUSED`: When scheduled deposits are paused
- `SCHEDULED_DEPOSIT_RESUMED`: When scheduled deposits are resumed
- `SCHEDULED_DEPOSIT_COMPLETED`: When scheduled deposits complete
- `SCHEDULED_DEPOSIT_MAX_RETRIES_EXCEEDED`: When max retries are exceeded

### SavingsStrategy
- `SAVINGS_STRATEGY_EXECUTED`: After successful strategy execution
- `AUTOMATION_ERROR`: When strategy fails or config is invalid
- `AUTOMATION_CONFIG_UPDATED`: When strategy config is updated
- `SAVINGS_STRATEGY_INITIALIZED`: When strategy is initialized
- `SAVINGS_STRATEGY_PAUSED`: When strategy is paused
- `SAVINGS_STRATEGY_RESUMED`: When strategy is resumed
- `SAVINGS_STRATEGY_COMPLETED`: When strategy completes
- `STRATEGY_PHASE_TRANSITION`: When hybrid strategy transitions phases
- `STRATEGY_ACCUMULATION`: During accumulation phase execution
- `STRATEGY_DISTRIBUTION`: During distribution phase execution

### Automated Splitter
- `AUTOMATED_VAULT_CREATED`: When vault is created with automation
- `AUTOMATION_PAUSED`: When all automation is paused
- `AUTOMATION_RESUMED`: When all automation is resumed
- `AUTOMATION_CONFIG_UPDATED`: When automation config is updated
- `AUTOMATION_ERROR`: When deferred execution encounters errors

---

## Event Monitoring Best Practices

### Frontend Integration
1. **Subscribe to Events**: Use event listeners to monitor automation status
2. **Display Notifications**: Show user-friendly notifications for important events
3. **Update UI**: Refresh automation status when events are received
4. **Error Handling**: Display error messages and suggested actions

### Error Recovery
1. **LOW_GAS_WARNING**: Prompt user to add gas reserve
2. **DEPOSIT_RETRY_SCHEDULED**: Inform user of retry attempt
3. **AUTOMATION_ERROR**: Display error and suggest corrective action
4. **MAX_RETRIES_EXCEEDED**: Notify user that manual intervention is needed

### Status Tracking
1. **Track Execution History**: Store execution events for analytics
2. **Monitor Gas Usage**: Track gas consumption patterns
3. **Calculate Success Rate**: Analyze success vs. error events
4. **Predict Next Execution**: Use AUTOMATION_SCHEDULED events

---

## Event Filtering Examples

### Get All DCA Events
```typescript
const dcaEvents = events.filter(e => 
    e.name.includes('DCA') || 
    (e.name === 'AUTOMATION_SCHEDULED' && e.data.operationType === 'DCA')
);
```

### Get All Error Events
```typescript
const errorEvents = events.filter(e => 
    e.name === 'AUTOMATION_ERROR' || 
    e.name === 'LOW_GAS_WARNING' ||
    e.name === 'DEPOSIT_RETRY_SCHEDULED'
);
```

### Get All Management Events
```typescript
const managementEvents = events.filter(e => 
    e.name === 'AUTOMATION_PAUSED' ||
    e.name === 'AUTOMATION_RESUMED' ||
    e.name === 'AUTOMATION_CONFIG_UPDATED' ||
    e.name === 'GAS_RESERVE_ADDED'
);
```

---

## Changelog

### Version 1.0.0
- Initial implementation of all automation events
- Centralized event emission through AutomationEvents module
- Comprehensive event documentation
