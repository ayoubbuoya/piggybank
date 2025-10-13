import {
    Address,
    Context,
    createEvent,
    generateEvent,
    Storage,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes, u64ToBytes, bytesToU64, u32ToBytes, bytesToU32 } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';
import { DCAConfig } from '../../structs/automation-config';
import { AutomationEngine } from '../automation/AutomationEngine';
import { GasManager } from '../automation/GasManager';
import { AutomationError, AutomationFrequency } from '../automation/AutomationTypes';
import { IFactory } from '../../interfaces/IFactory';
import { IEagleSwapRouter } from '../../interfaces/IEagleSwapRouter';
import { SwapPath } from '../../structs/eaglefi/swapPath';
import { SafeMath256 } from '../../lib/safeMath';
import { deserializeStringArray } from '../../lib/utils';
import { PersistentMap } from '../../lib/PersistentMap';
import { IMRC20 } from '../../interfaces/IMRC20';
import {
    emitDCAPurchaseExecuted,
    emitAutomationError,
    emitAutomationConfigUpdated
} from '../automation/AutomationEvents';

// Storage keys for DCA configuration and tracking
const DCA_ENABLED_KEY: StaticArray<u8> = stringToBytes('dca_enabled');
const DCA_CONFIG_KEY: StaticArray<u8> = stringToBytes('dca_config');
const DCA_PURCHASE_COUNT_KEY: StaticArray<u8> = stringToBytes('dca_purchase_count');
const DCA_NEXT_EXECUTION_KEY: StaticArray<u8> = stringToBytes('dca_next_execution');
const DCA_DEFERRED_CALL_ID_KEY: StaticArray<u8> = stringToBytes('dca_deferred_call_id');
const LAST_DCA_EXECUTION_KEY: StaticArray<u8> = stringToBytes('last_dca_exec');

// External storage keys from splitter contract
const FACTORY_ADDRESS_KEY = 'factoryAddress';
const WMAS_TOKEN_ADDRESS = 'AS12U4TZfNK7qoLyEERBBRDMu8nm5MKoRzPXDXans4v9wdATZedz9';
const ALL_TOKENS_ADDRESSES_KEY: StaticArray<u8> = stringToBytes('allTokensAddresses');

/**
 * Result of a swap operation with error details
 */
class SwapResult {
    success: bool;
    errorMessage: string;
    isCritical: bool;

    constructor(success: bool, errorMessage: string = '', isCritical: bool = false) {
        this.success = success;
        this.errorMessage = errorMessage;
        this.isCritical = isCritical;
    }
}

/**
 * DCA (Dollar-Cost Averaging) Strategy Module
 * 
 * Implements automated periodic token purchases using deferred calls.
 * Purchases are executed according to vault token percentages.
 */
export class DCAStrategy {
    /**
     * Initialize DCA strategy with configuration
     * 
     * @param config - DCA configuration parameters
     */
    static initialize(config: DCAConfig): void {
        // Store configuration
        Storage.set(DCA_CONFIG_KEY, config.serialize());
        Storage.set(DCA_ENABLED_KEY, [1]); // true
        Storage.set(DCA_PURCHASE_COUNT_KEY, u32ToBytes(0));

        // Schedule the first purchase
        this.scheduleNextPurchase();

        generateEvent(
            createEvent('DCA_INITIALIZED', [
                Context.callee().toString(),
                config.amount.toString(),
                config.frequency.toString(),
                config.startTime.toString(),
                config.endTime.toString(),
            ])
        );
    }

    /**
     * Execute a DCA purchase
     * 
     * Performs token swaps according to vault percentages using the configured DCA amount.
     * This function should only be called via deferred execution.
     */
    static executeDCAPurchase(): void {
        const vaultAddress = Context.callee();

        // Load configuration
        if (!Storage.has(DCA_CONFIG_KEY)) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INVALID_CONFIG,
                'DCA configuration not found',
                Context.timestamp().toString()
            );
            this.handleCriticalFailure('DCA configuration not found');
            return;
        }

        const configData = Storage.get(DCA_CONFIG_KEY);
        const config = new DCAConfig();
        config.deserialize(configData, 0);

        // Check if DCA should continue
        if (!this.shouldContinue(config)) {
            this.completeDCA();
            return;
        }

        // Check gas reserve
        if (!GasManager.reserveGasForOperation('DCA')) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INSUFFICIENT_GAS,
                'Insufficient gas reserve for DCA execution',
                Context.timestamp().toString()
            );
            this.handleCriticalFailure('Insufficient gas reserve');
            return;
        }

        // Validate balance before executing swaps
        if (!this.validateBalance(config.amount)) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INSUFFICIENT_BALANCE,
                'Insufficient WMAS balance for DCA purchase: required ' + config.amount.toString(),
                Context.timestamp().toString()
            );
            // Don't pause on insufficient balance - user may add funds later
            // Just skip this execution and try again next time
            this.scheduleNextPurchase();
            return;
        }

        // Execute the purchase (swap WMAS to target tokens) with error handling
        const swapResult = this.performSwapsWithErrorHandling(config.amount);

        if (swapResult.success) {
            // Increment purchase counter
            const currentCount = this.getPurchaseCount();
            Storage.set(DCA_PURCHASE_COUNT_KEY, u32ToBytes(currentCount + 1));

            // Update last execution time
            Storage.set(LAST_DCA_EXECUTION_KEY, u64ToBytes(Context.timestamp()));

            // Emit success event
            emitDCAPurchaseExecuted(
                vaultAddress.toString(),
                config.amount.toString(),
                Context.timestamp().toString(),
                (currentCount + 1).toString()
            );

            // Schedule next purchase if should continue
            if (this.shouldContinue(config)) {
                this.scheduleNextPurchase();
            } else {
                this.completeDCA();
            }
        } else {
            // Emit detailed error event
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.SWAP_FAILED,
                'DCA token swap failed: ' + swapResult.errorMessage,
                Context.timestamp().toString()
            );

            // Check if this is a critical failure that should pause automation
            if (swapResult.isCritical) {
                this.handleCriticalFailure(swapResult.errorMessage);
            } else {
                // For non-critical failures, try again next time
                this.scheduleNextPurchase();
            }
        }
    }

    /**
     * Perform token swaps with comprehensive error handling
     * 
     * @param amount - Total amount of WMAS to swap
     * @returns SwapResult with success status and error details
     */
    private static performSwapsWithErrorHandling(amount: u256): SwapResult {
        const vaultAddress = Context.callee();

        // Get factory and router addresses with error handling
        const factoryAddress = Storage.get(FACTORY_ADDRESS_KEY);
        const factory = new IFactory(new Address(factoryAddress));

        const eagleSwapRouterAddress = factory.getEagleSwapRouterAddress();
        if (eagleSwapRouterAddress.length == 0) {
            return new SwapResult(false, 'EagleSwap router address not configured', true);
        }

        const eagleSwapRouter = new IEagleSwapRouter(new Address(eagleSwapRouterAddress));

        // Get all tokens and their percentages
        const tokens: string[] = deserializeStringArray(Storage.get(ALL_TOKENS_ADDRESSES_KEY));

        // Get token percentages map
        const tokensPercentagesMap = new PersistentMap<string, u64>('tpm');

        let successfulSwaps = 0;
        let failedSwaps = 0;
        let lastError = '';

        for (let i = 0; i < tokens.length; i++) {
            const tokenAddress = tokens[i];

            // Skip WMAS token (no swap needed)
            if (tokenAddress == WMAS_TOKEN_ADDRESS) {
                continue;
            }

            const percentage = tokensPercentagesMap.get(tokenAddress, 0);

            if (percentage == 0) {
                continue;
            }

            // Calculate amount for this token: tokenAmount = amount * percentage / 100
            const tokenAmount = SafeMath256.div(
                SafeMath256.mul(amount, u256.fromU64(percentage)),
                u256.fromU64(100)
            );

            if (tokenAmount == u256.Zero) {
                continue;
            }

            // Get pool address for this token
            const poolAddress = factory.getTokenPoolAddress(tokenAddress);

            if (poolAddress.length == 0) {
                failedSwaps++;
                lastError = 'Pool not found for token: ' + tokenAddress;
                continue;
            }

            // Perform the swap with error handling
            // Note: AssemblyScript doesn't have traditional try-catch, so we check return values
            const swapPath = new SwapPath(
                new Address(poolAddress),
                new Address(WMAS_TOKEN_ADDRESS),
                new Address(tokenAddress),
                vaultAddress,
                tokenAmount,
                u256.One, // amountOutMin set to 1 for simplicity
                true,
            );

            // Attempt the swap
            const amountOut: u256 = eagleSwapRouter.swap(
                [swapPath],
                0, // coinsToUse
                u64.MAX_VALUE, // deadline
                0, // coinsToUse
            );

            if (amountOut == u256.Zero) {
                failedSwaps++;
                lastError = 'Swap returned zero output for token: ' + tokenAddress;
            } else {
                successfulSwaps++;
            }
        }

        // Determine if the operation was successful
        if (failedSwaps == 0 && successfulSwaps > 0) {
            return new SwapResult(true);
        } else if (successfulSwaps > 0 && failedSwaps > 0) {
            // Partial success - not critical, can retry
            return new SwapResult(
                false,
                'Partial swap failure: ' + successfulSwaps.toString() + ' succeeded, ' +
                failedSwaps.toString() + ' failed. Last error: ' + lastError,
                false
            );
        } else {
            // Complete failure - could be critical
            return new SwapResult(
                false,
                'All swaps failed. Last error: ' + lastError,
                failedSwaps > 2 // Critical if multiple swaps failed
            );
        }
    }

    /**
     * Validate that the vault has sufficient balance for the operation
     * 
     * @param requiredAmount - Amount of WMAS required
     * @returns true if balance is sufficient
     */
    private static validateBalance(requiredAmount: u256): bool {
        const vaultAddress = Context.callee();
        const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));

        const balance = wmasToken.balanceOf(vaultAddress);

        // Compare balances using string comparison to avoid u256 type issues
        const balanceStr = balance.toString();
        const requiredStr = requiredAmount.toString();

        // Balance is insufficient if it's shorter or lexicographically smaller
        if (balanceStr.length < requiredStr.length) {
            return false;
        }

        if (balanceStr.length == requiredStr.length && balanceStr < requiredStr) {
            return false;
        }

        return true;
    }

    /**
     * Handle critical failures by pausing automation
     * 
     * @param reason - Reason for the critical failure
     */
    private static handleCriticalFailure(reason: string): void {
        const vaultAddress = Context.callee();

        // Pause DCA automation
        this.pause();

        // Emit critical failure event
        generateEvent(
            createEvent('DCA_CRITICAL_FAILURE', [
                vaultAddress.toString(),
                reason,
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Schedule the next DCA purchase using AutomationEngine
     */
    static scheduleNextPurchase(): void {
        if (!Storage.has(DCA_CONFIG_KEY)) {
            return;
        }

        const configData = Storage.get(DCA_CONFIG_KEY);
        const config = new DCAConfig();
        config.deserialize(configData, 0);

        // Calculate next execution time
        const currentTime = Context.timestamp();
        const nextExecution = AutomationEngine.calculateNextExecution(
            config.frequency as AutomationFrequency,
            currentTime
        );

        // Store next execution time
        Storage.set(DCA_NEXT_EXECUTION_KEY, u64ToBytes(nextExecution));

        // Schedule the deferred call
        const args = new Args();
        const deferredCallId = AutomationEngine.scheduleCall(
            'executeDeferredDCA',
            args,
            nextExecution,
            config.gasPerExecution,
            0 // no coins to send
        );

        // Store deferred call ID for potential cancellation
        Storage.set(DCA_DEFERRED_CALL_ID_KEY, stringToBytes(deferredCallId));
    }

    /**
     * Check if DCA should continue executing
     * 
     * @param config - DCA configuration
     * @returns true if DCA should continue, false if it should stop
     */
    static shouldContinue(config: DCAConfig): bool {
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
     * Get the current purchase count
     * 
     * @returns Number of completed purchases
     */
    static getPurchaseCount(): u32 {
        if (!Storage.has(DCA_PURCHASE_COUNT_KEY)) {
            return 0;
        }
        return bytesToU32(Storage.get(DCA_PURCHASE_COUNT_KEY));
    }

    /**
     * Get the next scheduled execution time
     * 
     * @returns Timestamp of next execution, or 0 if not scheduled
     */
    static getNextExecution(): u64 {
        if (!Storage.has(DCA_NEXT_EXECUTION_KEY)) {
            return 0;
        }
        return bytesToU64(Storage.get(DCA_NEXT_EXECUTION_KEY));
    }

    /**
     * Check if DCA is enabled
     * 
     * @returns true if DCA is enabled
     */
    static isEnabled(): bool {
        if (!Storage.has(DCA_ENABLED_KEY)) {
            return false;
        }
        const value = Storage.get(DCA_ENABLED_KEY);
        return value[0] == 1;
    }

    /**
     * Pause DCA execution
     */
    static pause(): void {
        Storage.set(DCA_ENABLED_KEY, [0]); // false

        // Cancel scheduled deferred call if exists
        if (Storage.has(DCA_DEFERRED_CALL_ID_KEY)) {
            const deferredCallIdBytes = Storage.get(DCA_DEFERRED_CALL_ID_KEY);
            const deferredCallId = String.UTF8.decode(changetype<ArrayBuffer>(deferredCallIdBytes));
            AutomationEngine.cancelScheduledCall(deferredCallId);
        }

        generateEvent(
            createEvent('DCA_PAUSED', [
                Context.callee().toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Resume DCA execution
     */
    static resume(): void {
        Storage.set(DCA_ENABLED_KEY, [1]); // true

        // Reschedule next purchase
        this.scheduleNextPurchase();

        generateEvent(
            createEvent('DCA_RESUMED', [
                Context.callee().toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Complete DCA and emit completion event
     */
    private static completeDCA(): void {
        Storage.set(DCA_ENABLED_KEY, [0]); // false

        const purchaseCount = this.getPurchaseCount();

        generateEvent(
            createEvent('DCA_COMPLETED', [
                Context.callee().toString(),
                purchaseCount.toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Update DCA configuration
     * 
     * @param config - New DCA configuration
     */
    static updateConfig(config: DCAConfig): void {
        // Cancel existing scheduled call
        if (Storage.has(DCA_DEFERRED_CALL_ID_KEY)) {
            const deferredCallIdBytes = Storage.get(DCA_DEFERRED_CALL_ID_KEY);
            const deferredCallId = String.UTF8.decode(changetype<ArrayBuffer>(deferredCallIdBytes));
            AutomationEngine.cancelScheduledCall(deferredCallId);
        }

        // Store new configuration
        Storage.set(DCA_CONFIG_KEY, config.serialize());

        // Reschedule with new configuration
        if (this.isEnabled()) {
            this.scheduleNextPurchase();
        }

        emitAutomationConfigUpdated(
            Context.callee().toString(),
            'DCA',
            Context.timestamp().toString()
        );
    }
}
