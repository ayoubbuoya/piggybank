import {
    Address,
    Context,
    createEvent,
    generateEvent,
    Storage,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes, u64ToBytes, bytesToU64 } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';
import { ScheduledDepositConfig } from '../../structs/automation-config';
import { AutomationEngine } from '../automation/AutomationEngine';
import { GasManager } from '../automation/GasManager';
import { AutomationError, AutomationFrequency } from '../automation/AutomationTypes';
import { IMRC20 } from '../../interfaces/IMRC20';
import {
    emitScheduledDepositExecuted,
    emitAutomationError,
    emitDepositRetryScheduled,
    emitAutomationConfigUpdated
} from '../automation/AutomationEvents';

// Storage keys for scheduled deposit configuration and tracking
const SCHEDULED_DEPOSIT_ENABLED_KEY: StaticArray<u8> = stringToBytes('sd_enabled');
const SCHEDULED_DEPOSIT_CONFIG_KEY: StaticArray<u8> = stringToBytes('sd_config');
const SCHEDULED_DEPOSIT_NEXT_EXECUTION_KEY: StaticArray<u8> = stringToBytes('sd_next_execution');
const SCHEDULED_DEPOSIT_DEFERRED_CALL_ID_KEY: StaticArray<u8> = stringToBytes('sd_deferred_call_id');
const LAST_DEPOSIT_EXECUTION_KEY: StaticArray<u8> = stringToBytes('last_deposit_exec');
const DEPOSIT_FAILURE_COUNT_KEY: StaticArray<u8> = stringToBytes('deposit_failure_count');

// External storage keys
const WMAS_TOKEN_ADDRESS = 'AS12U4TZfNK7qoLyEERBBRDMu8nm5MKoRzPXDXans4v9wdATZedz9';

// Retry configuration
const BASE_RETRY_DELAY_MS: u64 = 3600000; // 1 hour in milliseconds

/**
 * Result of a validation check
 */
class ValidationResult {
    isValid: bool;
    errorType: string;
    errorMessage: string;

    constructor(isValid: bool, errorType: string = '', errorMessage: string = '') {
        this.isValid = isValid;
        this.errorType = errorType;
        this.errorMessage = errorMessage;
    }
}

/**
 * Result of a deposit operation
 */
class DepositResult {
    success: bool;
    errorMessage: string;

    constructor(success: bool, errorMessage: string = '') {
        this.success = success;
        this.errorMessage = errorMessage;
    }
}

/**
 * Scheduled Deposit Strategy Module
 * 
 * Implements automated recurring deposits from user wallet to vault using deferred calls.
 * Includes retry logic with exponential backoff for failed deposits.
 */
export class ScheduledDepositStrategy {
    /**
     * Initialize scheduled deposit strategy with configuration
     * 
     * @param config - Scheduled deposit configuration parameters
     */
    static initialize(config: ScheduledDepositConfig): void {
        // Store configuration
        Storage.set(SCHEDULED_DEPOSIT_CONFIG_KEY, config.serialize());
        Storage.set(SCHEDULED_DEPOSIT_ENABLED_KEY, [1]); // true
        Storage.set(DEPOSIT_FAILURE_COUNT_KEY, [0]);

        // Schedule the first deposit
        this.scheduleNextDeposit();

        generateEvent(
            createEvent('SCHEDULED_DEPOSIT_INITIALIZED', [
                Context.callee().toString(),
                config.depositAmount.toString(),
                config.frequency.toString(),
                config.sourceWallet.toString(),
                config.startTime.toString(),
                config.endTime.toString(),
            ])
        );
    }

    /**
     * Execute a scheduled deposit
     * 
     * Transfers tokens from the user's wallet to the vault.
     * This function should only be called via deferred execution.
     */
    static executeScheduledDeposit(): void {
        const vaultAddress = Context.callee();

        // Load configuration
        if (!Storage.has(SCHEDULED_DEPOSIT_CONFIG_KEY)) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INVALID_CONFIG,
                'Scheduled deposit configuration not found',
                Context.timestamp().toString()
            );
            this.handleCriticalFailure('Configuration not found');
            return;
        }

        const configData = Storage.get(SCHEDULED_DEPOSIT_CONFIG_KEY);
        const config = new ScheduledDepositConfig();
        config.deserialize(configData, 0);

        // Check if deposits should continue
        if (!this.shouldContinue(config)) {
            this.completeScheduledDeposits();
            return;
        }

        // Check gas reserve
        if (!GasManager.reserveGasForOperation('DEPOSIT')) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INSUFFICIENT_GAS,
                'Insufficient gas reserve for scheduled deposit execution',
                Context.timestamp().toString()
            );
            this.handleCriticalFailure('Insufficient gas reserve');
            return;
        }

        // Validate balance and allowance before attempting deposit
        const validationResult = this.validateDepositPreconditions(config);

        if (!validationResult.isValid) {
            emitAutomationError(
                vaultAddress.toString(),
                validationResult.errorType,
                validationResult.errorMessage,
                Context.timestamp().toString()
            );

            // Handle validation failure with retry logic
            this.handleDepositFailure(validationResult.errorMessage);
            return;
        }

        // Execute the deposit with error handling
        const depositResult = this.performDepositWithErrorHandling(config);

        if (depositResult.success) {
            // Reset failure counter on success
            Storage.set(DEPOSIT_FAILURE_COUNT_KEY, [0]);

            // Update last execution time
            Storage.set(LAST_DEPOSIT_EXECUTION_KEY, u64ToBytes(Context.timestamp()));

            // Emit success event
            emitScheduledDepositExecuted(
                vaultAddress.toString(),
                config.depositAmount.toString(),
                Context.timestamp().toString()
            );

            // Schedule next deposit if should continue
            if (this.shouldContinue(config)) {
                this.scheduleNextDeposit();
            } else {
                this.completeScheduledDeposits();
            }
        } else {
            // Handle deposit failure with detailed error
            this.handleDepositFailure(depositResult.errorMessage);
        }
    }

    /**
     * Validate preconditions for deposit (balance and allowance)
     * 
     * @param config - Scheduled deposit configuration
     * @returns ValidationResult with validation status and error details
     */
    private static validateDepositPreconditions(config: ScheduledDepositConfig): ValidationResult {
        const vaultAddress = Context.callee();
        const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));

        const depositAmount = config.depositAmount;
        const depositAmountStr = depositAmount.toString();

        // Check if source wallet has sufficient balance
        const balance = wmasToken.balanceOf(config.sourceWallet);
        const balanceStr = balance.toString();

        const balanceIsLess = balanceStr.length < depositAmountStr.length ||
            (balanceStr.length == depositAmountStr.length && balanceStr < depositAmountStr);

        if (balanceIsLess) {
            return new ValidationResult(
                false,
                AutomationError.INSUFFICIENT_BALANCE,
                'Insufficient balance in source wallet: has ' + balanceStr + ', needs ' + depositAmountStr
            );
        }

        // Check if vault has sufficient allowance
        const allowance = wmasToken.allowance(config.sourceWallet, vaultAddress);
        const allowanceStr = allowance.toString();

        const allowanceIsLess = allowanceStr.length < depositAmountStr.length ||
            (allowanceStr.length == depositAmountStr.length && allowanceStr < depositAmountStr);

        if (allowanceIsLess) {
            return new ValidationResult(
                false,
                AutomationError.DEPOSIT_FAILED,
                'Insufficient allowance for vault: has ' + allowanceStr + ', needs ' + depositAmountStr
            );
        }

        return new ValidationResult(true);
    }

    /**
     * Perform the actual token deposit with error handling
     * 
     * @param config - Scheduled deposit configuration
     * @returns DepositResult with success status and error details
     */
    private static performDepositWithErrorHandling(config: ScheduledDepositConfig): DepositResult {
        const vaultAddress = Context.callee();

        // Get WMAS token contract
        const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));

        // Perform the transfer
        // Note: AssemblyScript doesn't have traditional try-catch
        // We rely on the validation done before this call
        wmasToken.transferFrom(
            config.sourceWallet,
            vaultAddress,
            config.depositAmount,
            0 // No storage cost for existing balance entry
        );

        // If we reach here, the transfer succeeded
        return new DepositResult(true);
    }

    /**
     * Handle deposit failure with retry logic and exponential backoff
     * 
     * @param errorMessage - Description of the failure
     */
    static handleDepositFailure(errorMessage: string): void {
        const vaultAddress = Context.callee();

        // Load configuration
        if (!Storage.has(SCHEDULED_DEPOSIT_CONFIG_KEY)) {
            return;
        }

        const configData = Storage.get(SCHEDULED_DEPOSIT_CONFIG_KEY);
        const config = new ScheduledDepositConfig();
        config.deserialize(configData, 0);

        // Increment failure counter
        const currentFailureCount = this.getFailureCount();
        const newFailureCount = currentFailureCount + 1;
        Storage.set(DEPOSIT_FAILURE_COUNT_KEY, [newFailureCount]);

        // Emit detailed error event
        emitAutomationError(
            vaultAddress.toString(),
            AutomationError.DEPOSIT_FAILED,
            'Deposit failure #' + newFailureCount.toString() + ': ' + errorMessage,
            Context.timestamp().toString()
        );

        // Check if max retries exceeded
        if (newFailureCount >= config.maxRetries) {
            generateEvent(
                createEvent('SCHEDULED_DEPOSIT_MAX_RETRIES_EXCEEDED', [
                    vaultAddress.toString(),
                    newFailureCount.toString(),
                    errorMessage,
                    Context.timestamp().toString(),
                ])
            );

            // Pause scheduled deposits after max retries (critical failure)
            this.handleCriticalFailure('Max retries exceeded: ' + errorMessage);
            return;
        }

        // Calculate retry delay with exponential backoff
        // Delay = BASE_RETRY_DELAY * 2^(failureCount)
        // Cap the exponent to prevent overflow
        const exponent = newFailureCount > 10 ? 10 : newFailureCount;
        const multiplier: u64 = 1 << exponent;
        const retryDelay = BASE_RETRY_DELAY_MS * multiplier;
        const nextRetryTime = Context.timestamp() + retryDelay;

        // Emit retry scheduled event with detailed information
        emitDepositRetryScheduled(
            vaultAddress.toString(),
            newFailureCount.toString(),
            nextRetryTime.toString()
        );

        generateEvent(
            createEvent('SCHEDULED_DEPOSIT_RETRY_INFO', [
                vaultAddress.toString(),
                newFailureCount.toString(),
                config.maxRetries.toString(),
                retryDelay.toString(),
                nextRetryTime.toString(),
                errorMessage,
            ])
        );

        // Schedule retry
        const args = new Args();
        const deferredCallId = AutomationEngine.scheduleCall(
            'executeDeferredDeposit',
            args,
            nextRetryTime,
            config.gasPerExecution,
            0 // no coins to send
        );

        // Store deferred call ID
        Storage.set(SCHEDULED_DEPOSIT_DEFERRED_CALL_ID_KEY, stringToBytes(deferredCallId));
    }

    /**
     * Handle critical failures by pausing automation
     * 
     * @param reason - Reason for the critical failure
     */
    private static handleCriticalFailure(reason: string): void {
        const vaultAddress = Context.callee();

        // Pause scheduled deposit automation
        this.pause();

        // Emit critical failure event
        generateEvent(
            createEvent('SCHEDULED_DEPOSIT_CRITICAL_FAILURE', [
                vaultAddress.toString(),
                reason,
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Schedule the next deposit using AutomationEngine
     */
    static scheduleNextDeposit(): void {
        if (!Storage.has(SCHEDULED_DEPOSIT_CONFIG_KEY)) {
            return;
        }

        const configData = Storage.get(SCHEDULED_DEPOSIT_CONFIG_KEY);
        const config = new ScheduledDepositConfig();
        config.deserialize(configData, 0);

        // Calculate next execution time
        const currentTime = Context.timestamp();
        const nextExecution = AutomationEngine.calculateNextExecution(
            config.frequency as AutomationFrequency,
            currentTime
        );

        // Store next execution time
        Storage.set(SCHEDULED_DEPOSIT_NEXT_EXECUTION_KEY, u64ToBytes(nextExecution));

        // Schedule the deferred call
        const args = new Args();
        const deferredCallId = AutomationEngine.scheduleCall(
            'executeDeferredDeposit',
            args,
            nextExecution,
            config.gasPerExecution,
            0 // no coins to send
        );

        // Store deferred call ID for potential cancellation
        Storage.set(SCHEDULED_DEPOSIT_DEFERRED_CALL_ID_KEY, stringToBytes(deferredCallId));
    }

    /**
     * Check if scheduled deposits should continue executing
     * 
     * @param config - Scheduled deposit configuration
     * @returns true if deposits should continue, false if they should stop
     */
    static shouldContinue(config: ScheduledDepositConfig): bool {
        const currentTime = Context.timestamp();

        // Check if end time has been reached
        if (config.endTime > 0 && currentTime >= config.endTime) {
            return false;
        }

        // Check if start time has been reached
        if (currentTime < config.startTime) {
            return false;
        }

        return true;
    }

    /**
     * Get the current failure count
     * 
     * @returns Number of consecutive failures
     */
    static getFailureCount(): u8 {
        if (!Storage.has(DEPOSIT_FAILURE_COUNT_KEY)) {
            return 0;
        }
        const value = Storage.get(DEPOSIT_FAILURE_COUNT_KEY);
        return value[0];
    }

    /**
     * Get the next scheduled execution time
     * 
     * @returns Timestamp of next execution, or 0 if not scheduled
     */
    static getNextExecution(): u64 {
        if (!Storage.has(SCHEDULED_DEPOSIT_NEXT_EXECUTION_KEY)) {
            return 0;
        }
        return bytesToU64(Storage.get(SCHEDULED_DEPOSIT_NEXT_EXECUTION_KEY));
    }

    /**
     * Check if scheduled deposits are enabled
     * 
     * @returns true if scheduled deposits are enabled
     */
    static isEnabled(): bool {
        if (!Storage.has(SCHEDULED_DEPOSIT_ENABLED_KEY)) {
            return false;
        }
        const value = Storage.get(SCHEDULED_DEPOSIT_ENABLED_KEY);
        return value[0] == 1;
    }

    /**
     * Pause scheduled deposit execution
     */
    static pause(): void {
        Storage.set(SCHEDULED_DEPOSIT_ENABLED_KEY, [0]); // false

        // Cancel scheduled deferred call if exists
        if (Storage.has(SCHEDULED_DEPOSIT_DEFERRED_CALL_ID_KEY)) {
            const deferredCallIdBytes = Storage.get(SCHEDULED_DEPOSIT_DEFERRED_CALL_ID_KEY);
            const deferredCallId = String.UTF8.decode(changetype<ArrayBuffer>(deferredCallIdBytes));
            AutomationEngine.cancelScheduledCall(deferredCallId);
        }

        generateEvent(
            createEvent('SCHEDULED_DEPOSIT_PAUSED', [
                Context.callee().toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Resume scheduled deposit execution
     */
    static resume(): void {
        Storage.set(SCHEDULED_DEPOSIT_ENABLED_KEY, [1]); // true

        // Reset failure counter on resume
        Storage.set(DEPOSIT_FAILURE_COUNT_KEY, [0]);

        // Reschedule next deposit
        this.scheduleNextDeposit();

        generateEvent(
            createEvent('SCHEDULED_DEPOSIT_RESUMED', [
                Context.callee().toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Complete scheduled deposits and emit completion event
     */
    private static completeScheduledDeposits(): void {
        Storage.set(SCHEDULED_DEPOSIT_ENABLED_KEY, [0]); // false

        generateEvent(
            createEvent('SCHEDULED_DEPOSIT_COMPLETED', [
                Context.callee().toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Update scheduled deposit configuration
     * 
     * @param config - New scheduled deposit configuration
     */
    static updateConfig(config: ScheduledDepositConfig): void {
        // Cancel existing scheduled call
        if (Storage.has(SCHEDULED_DEPOSIT_DEFERRED_CALL_ID_KEY)) {
            const deferredCallIdBytes = Storage.get(SCHEDULED_DEPOSIT_DEFERRED_CALL_ID_KEY);
            const deferredCallId = String.UTF8.decode(changetype<ArrayBuffer>(deferredCallIdBytes));
            AutomationEngine.cancelScheduledCall(deferredCallId);
        }

        // Store new configuration
        Storage.set(SCHEDULED_DEPOSIT_CONFIG_KEY, config.serialize());

        // Reset failure counter
        Storage.set(DEPOSIT_FAILURE_COUNT_KEY, [0]);

        // Reschedule with new configuration
        if (this.isEnabled()) {
            this.scheduleNextDeposit();
        }

        emitAutomationConfigUpdated(
            Context.callee().toString(),
            'DEPOSIT',
            Context.timestamp().toString()
        );
    }
}
