/**
 * Automation Events Module
 * 
 * Centralized event definitions for all automation-related events.
 * This module provides helper functions to emit standardized events
 * across all automation components.
 */

import { Context, createEvent, generateEvent } from '@massalabs/massa-as-sdk';

/**
 * Event Categories:
 * 1. Success Events - Emitted when operations complete successfully
 * 2. Error Events - Emitted when operations fail or encounter issues
 * 3. Management Events - Emitted when configuration or state changes
 * 4. Scheduling Events - Emitted when operations are scheduled
 */

// ============================================================================
// SUCCESS EVENTS
// ============================================================================

/**
 * Emit event when a DCA purchase is successfully executed
 * 
 * @param vaultAddress - Address of the vault
 * @param amount - Amount purchased
 * @param timestamp - Execution timestamp
 * @param purchaseCount - Total number of purchases completed
 */
export function emitDCAPurchaseExecuted(
    vaultAddress: string,
    amount: string,
    timestamp: string,
    purchaseCount: string
): void {
    generateEvent(
        createEvent('DCA_PURCHASE_EXECUTED', [
            vaultAddress,
            amount,
            timestamp,
            purchaseCount,
        ])
    );
}

/**
 * Emit event when a scheduled deposit is successfully executed
 * 
 * @param vaultAddress - Address of the vault
 * @param amount - Amount deposited
 * @param timestamp - Execution timestamp
 */
export function emitScheduledDepositExecuted(
    vaultAddress: string,
    amount: string,
    timestamp: string
): void {
    generateEvent(
        createEvent('SCHEDULED_DEPOSIT_EXECUTED', [
            vaultAddress,
            amount,
            timestamp,
        ])
    );
}

/**
 * Emit event when a savings strategy is successfully executed
 * 
 * @param vaultAddress - Address of the vault
 * @param action - Action performed (ACCUMULATION, DISTRIBUTION)
 * @param amount - Amount involved in the action
 * @param timestamp - Execution timestamp
 */
export function emitSavingsStrategyExecuted(
    vaultAddress: string,
    action: string,
    amount: string,
    timestamp: string
): void {
    generateEvent(
        createEvent('SAVINGS_STRATEGY_EXECUTED', [
            vaultAddress,
            action,
            amount,
            timestamp,
        ])
    );
}

/**
 * Emit event when an automation operation is scheduled
 * 
 * @param vaultAddress - Address of the vault
 * @param operationType - Type of operation (DCA, DEPOSIT, STRATEGY)
 * @param nextExecution - Timestamp of next execution
 */
export function emitAutomationScheduled(
    vaultAddress: string,
    operationType: string,
    nextExecution: string
): void {
    generateEvent(
        createEvent('AUTOMATION_SCHEDULED', [
            vaultAddress,
            operationType,
            nextExecution,
        ])
    );
}

// ============================================================================
// ERROR EVENTS
// ============================================================================

/**
 * Emit event when an automation error occurs
 * 
 * @param vaultAddress - Address of the vault
 * @param errorType - Type of error (from AutomationError enum)
 * @param errorMessage - Detailed error message
 * @param timestamp - Error timestamp
 */
export function emitAutomationError(
    vaultAddress: string,
    errorType: string,
    errorMessage: string,
    timestamp: string
): void {
    generateEvent(
        createEvent('AUTOMATION_ERROR', [
            vaultAddress,
            errorType,
            errorMessage,
            timestamp,
        ])
    );
}

/**
 * Emit event when gas reserve is running low
 * 
 * @param vaultAddress - Address of the vault
 * @param currentGas - Current gas reserve
 * @param requiredGas - Required gas for next operation
 */
export function emitLowGasWarning(
    vaultAddress: string,
    currentGas: string,
    requiredGas: string
): void {
    generateEvent(
        createEvent('LOW_GAS_WARNING', [
            vaultAddress,
            currentGas,
            requiredGas,
        ])
    );
}

/**
 * Emit event when a deposit retry is scheduled
 * 
 * @param vaultAddress - Address of the vault
 * @param retryCount - Number of retries attempted
 * @param nextRetry - Timestamp of next retry
 */
export function emitDepositRetryScheduled(
    vaultAddress: string,
    retryCount: string,
    nextRetry: string
): void {
    generateEvent(
        createEvent('DEPOSIT_RETRY_SCHEDULED', [
            vaultAddress,
            retryCount,
            nextRetry,
        ])
    );
}

// ============================================================================
// MANAGEMENT EVENTS
// ============================================================================

/**
 * Emit event when automation is paused
 * 
 * @param vaultAddress - Address of the vault
 * @param timestamp - Pause timestamp
 */
export function emitAutomationPaused(
    vaultAddress: string,
    timestamp: string
): void {
    generateEvent(
        createEvent('AUTOMATION_PAUSED', [
            vaultAddress,
            timestamp,
        ])
    );
}

/**
 * Emit event when automation is resumed
 * 
 * @param vaultAddress - Address of the vault
 * @param timestamp - Resume timestamp
 */
export function emitAutomationResumed(
    vaultAddress: string,
    timestamp: string
): void {
    generateEvent(
        createEvent('AUTOMATION_RESUMED', [
            vaultAddress,
            timestamp,
        ])
    );
}

/**
 * Emit event when automation configuration is updated
 * 
 * @param vaultAddress - Address of the vault
 * @param configType - Type of configuration updated (DCA, DEPOSIT, STRATEGY)
 * @param timestamp - Update timestamp
 */
export function emitAutomationConfigUpdated(
    vaultAddress: string,
    configType: string,
    timestamp: string
): void {
    generateEvent(
        createEvent('AUTOMATION_CONFIG_UPDATED', [
            vaultAddress,
            configType,
            timestamp,
        ])
    );
}

/**
 * Emit event when gas reserve is added
 * 
 * @param vaultAddress - Address of the vault
 * @param amount - Amount of gas added
 * @param newBalance - New total gas balance
 */
export function emitGasReserveAdded(
    vaultAddress: string,
    amount: string,
    newBalance: string
): void {
    generateEvent(
        createEvent('GAS_RESERVE_ADDED', [
            vaultAddress,
            amount,
            newBalance,
        ])
    );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current vault address as string
 * 
 * @returns Current contract address as string
 */
export function getCurrentVaultAddress(): string {
    return Context.callee().toString();
}

/**
 * Get current timestamp as string
 * 
 * @returns Current timestamp as string
 */
export function getCurrentTimestamp(): string {
    return Context.timestamp().toString();
}
