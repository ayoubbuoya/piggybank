# Implementation Plan

- [x] 1. Set up automation infrastructure and core utilities

  - Create directory structure for automation modules (`contracts/assembly/contracts/lib/automation/` and `contracts/assembly/contracts/lib/strategies/`)
  - Implement AutomationFrequency enum with DAILY, WEEKLY, BIWEEKLY, MONTHLY values
  - Implement AutomationError enum with error constants
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement Gas Manager module

  - Create `GasManager.ts` with gas reserve storage and management functions
  - Implement `getGasReserve()`, `depositGas()`, `consumeGas()` functions
  - Implement `estimateGasForOperation()` with operation-specific gas calculations
  - Implement `hasSufficientGas()` validation and `emitLowGasWarning()` event emission
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Implement Automation Engine core

  - Create `AutomationEngine.ts` with deferred call scheduling logic
  - Implement `scheduleCall()` using Massa's `sendMessage()` function
  - Implement `validateDeferredExecution()` to verify caller is contract itself
  - Implement `calculateNextExecution()` for frequency-based scheduling
  - Implement `cancelScheduledCall()` for operation cancellation
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 4. Implement configuration data structures

  - Create `DCAConfig` class with serialization/deserialization methods
  - Create `ScheduledDepositConfig` class with serialization/deserialization methods
  - Create `SavingsStrategyConfig` class with serialization/deserialization methods
  - Create `AutomationStatus` class for status queries
  - _Requirements: 2.1, 3.1, 4.1_

- [x] 5. Implement DCA Strategy module

  - Create `DCAStrategy.ts` with DCA configuration storage
  - Implement `executeDCAPurchase()` to perform token swaps according to vault percentages
  - Implement `scheduleNextPurchase()` using AutomationEngine
  - Implement `shouldContinue()` to check duration and purchase count limits
  - Add DCA purchase counter and completion tracking
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6. Implement Scheduled Deposit Strategy module

  - Create `ScheduledDepositStrategy.ts` with deposit configuration storage
  - Implement `executeScheduledDeposit()` to transfer tokens from user wallet to vault
  - Implement `handleDepositFailure()` with retry logic and exponential backoff
  - Implement `scheduleNextDeposit()` using AutomationEngine
  - Add failure counter and retry tracking
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 7. Implement Savings Strategy module

  - Create `SavingsStrategy.ts` with StrategyType enum (ACCUMULATION, DISTRIBUTION, HYBRID)
  - Implement `executeStrategy()` with logic for each strategy type
  - Implement `calculateCurrentAmount()` with growth rate calculations using SafeMath
  - Implement `transitionPhase()` for hybrid strategy phase changes
  - Add phase tracking and transition timestamp storage
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 8. Create automated splitter contract

  - Create `automated-splitter.ts` extending existing splitter functionality
  - Update constructor to accept automation configuration parameters
  - Initialize automation modules based on enabled flags
  - Set up initial gas reserve from constructor parameter
  - Store automation configurations in contract storage
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.2_

- [x] 9. Implement deferred call entry points

  - Create `executeDeferredDCA()` function with validation and DCA execution
  - Create `executeDeferredDeposit()` function with validation and deposit execution
  - Create `executeDeferredStrategy()` function with validation and strategy execution
  - Add self-call validation to all deferred entry points
  - Implement gas consumption tracking for each execution
  - _Requirements: 1.3, 2.3, 3.3, 4.5_

- [x] 10. Implement automation management functions

  - Create `pauseAutomation()` with owner-only access control
  - Create `resumeAutomation()` with rescheduling logic
  - Create `updateAutomationConfig()` to modify settings and reschedule operations
  - Create `addGasReserve()` to accept gas deposits
  - Create `getAutomationStatus()` to return current automation state
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.4_

- [x] 11. Implement event emission system

  - Add success events (DCA_PURCHASE_EXECUTED, SCHEDULED_DEPOSIT_EXECUTED, SAVINGS_STRATEGY_EXECUTED, AUTOMATION_SCHEDULED)
  - Add error events (AUTOMATION_ERROR, LOW_GAS_WARNING, DEPOSIT_RETRY_SCHEDULED)
  - Add management events (AUTOMATION_PAUSED, AUTOMATION_RESUMED, AUTOMATION_CONFIG_UPDATED, GAS_RESERVE_ADDED)
  - Emit events at appropriate points in all automation functions
  - _Requirements: 1.4, 2.5, 3.5, 6.3_

- [x] 12. Update factory contract for automated vaults

  - Add `createAutomatedVault()` function to factory contract
  - Update factory to accept automation configuration parameters
  - Deploy automated-splitter bytecode instead of regular splitter when automation enabled
  - Pass automation configs to automated vault constructor
  - Emit factory events for automated vault creation
  - _Requirements: 2.2, 3.2, 4.1_

- [x] 13. Implement error handling and retry logic

  - Add try-catch blocks around swap operations in DCA execution
  - Implement exponential backoff for scheduled deposit retries
  - Add balance validation before executing operations
  - Implement automatic pause on critical failures
  - Add error event emission with detailed error information
  - _Requirements: 1.4, 2.5, 3.5_

- [ ]\* 14. Write unit tests for automation modules

  - Write tests for AutomationEngine (scheduling, validation, calculation)
  - Write tests for GasManager (reserve management, consumption, warnings)
  - Write tests for DCAStrategy (purchase execution, scheduling, completion)
  - Write tests for ScheduledDepositStrategy (deposit execution, retry logic, failure handling)
  - Write tests for SavingsStrategy (accumulation, distribution, phase transitions)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 3.1, 3.3, 4.1, 4.5, 6.1_

- [x] 15. Create frontend automation configuration components

  - Create `AutomationConfigPanel.tsx` component with form for DCA, scheduled deposits, and savings strategy settings
  - Add form validation for automation parameters (amounts, frequencies, dates)
  - Implement gas estimation display showing estimated costs
  - Add configuration preview before submission
  - Integrate with wallet provider for token approvals
  - _Requirements: 7.1, 7.2, 7.6_

- [x] 16. Create frontend automation monitoring components

  - Create `AutomationStatusCard.tsx` to display active automations
  - Implement countdown timers for next execution times
  - Create `ExecutionHistoryTable.tsx` to show past executions with timestamps and results
  - Add real-time status updates using polling or event listeners
  - _Requirements: 7.3, 7.4_

- [x] 17. Create frontend gas management components

  - Create `GasReserveWidget.tsx` to display current gas balance
  - Implement low gas warning banner with prominent styling
  - Add gas addition modal with amount input and confirmation
  - Show gas consumption history and projections
  - _Requirements: 7.5, 6.3, 6.4_

- [x] 18. Implement frontend automation API integration

  - Create `automationService.ts` with functions for creating automated vaults
  - Implement `getAutomationStatus()` API call with status deserialization
  - Implement `addGasReserve()` API call
  - Implement `pauseAutomation()` and `resumeAutomation()` API calls
  - Implement `updateAutomationConfig()` API call
  - Add error handling and toast notifications for all API calls
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 19. Update vault creation flow for automation

  - Update `CreateVault.tsx` page to include automation configuration options
  - Add toggle switches for enabling DCA, scheduled deposits, and savings strategies
  - Show/hide configuration sections based on enabled features
  - Calculate and display total initial gas reserve needed
  - Update vault creation API call to include automation parameters
  - _Requirements: 7.1, 7.2_

- [x] 20. Update vault details page for automation management

  - Update `VaultDetails.tsx` to display automation status
  - Add automation control buttons (pause, resume, update config)
  - Integrate AutomationStatusCard and GasReserveWidget components
  - Add ExecutionHistoryTable to show automation history
  - Implement real-time updates for automation status
  - _Requirements: 7.3, 7.4, 7.5, 5.1, 5.2, 5.3_

- [ ]\* 21. Write integration tests for automated vaults

  - Write end-to-end test for DCA vault creation and execution
  - Write test for scheduled deposit flow with token approval
  - Write test for multi-strategy vault with independent executions
  - Write test for failure recovery and retry mechanism
  - Write test for pause/resume functionality
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3, 5.4, 5.5_

- [ ] 22. Implement deployment scripts for automated vaults

  - Create deployment script for automated factory contract
  - Update existing deployment scripts to support automation parameters
  - Add script to test automated vault creation
  - Add script to monitor automation executions
  - _Requirements: 2.2, 3.2_

- [ ] 23. Add automation documentation and examples
  - Document automation configuration parameters and their effects
  - Create example configurations for common use cases (weekly DCA, monthly savings)
  - Document gas estimation methodology
  - Add troubleshooting guide for common automation issues
  - _Requirements: 7.1, 7.2, 6.1_
