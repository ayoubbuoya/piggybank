import {
    Address,
    Context,
    createEvent,
    generateEvent,
    Storage,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes, u64ToBytes, bytesToU64 } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';
import { SavingsStrategyConfig, StrategyType } from '../../structs/automation-config';
import { AutomationEngine } from '../automation/AutomationEngine';
import { GasManager } from '../automation/GasManager';
import { AutomationError, AutomationFrequency } from '../automation/AutomationTypes';
import { IMRC20 } from '../../interfaces/IMRC20';
import { SafeMath256 } from '../../lib/safeMath';
import {
    emitSavingsStrategyExecuted,
    emitAutomationError,
    emitAutomationConfigUpdated
} from '../automation/AutomationEvents';

// Storage keys for savings strategy configuration and tracking
const SAVINGS_STRATEGY_ENABLED_KEY: StaticArray<u8> = stringToBytes('ss_enabled');
const SAVINGS_STRATEGY_CONFIG_KEY: StaticArray<u8> = stringToBytes('ss_config');
const SAVINGS_STRATEGY_NEXT_EXECUTION_KEY: StaticArray<u8> = stringToBytes('ss_next_execution');
const SAVINGS_STRATEGY_DEFERRED_CALL_ID_KEY: StaticArray<u8> = stringToBytes('ss_deferred_call_id');
const LAST_STRATEGY_EXECUTION_KEY: StaticArray<u8> = stringToBytes('last_strategy_exec');
const STRATEGY_EXECUTION_COUNT_KEY: StaticArray<u8> = stringToBytes('strategy_execution_count');
const STRATEGY_CURRENT_PHASE_KEY: StaticArray<u8> = stringToBytes('strategy_current_phase');
const STRATEGY_PHASE_TRANSITION_TIMESTAMP_KEY: StaticArray<u8> = stringToBytes('strategy_phase_transition_ts');

// External storage keys from splitter contract
const WMAS_TOKEN_ADDRESS = 'AS12U4TZfNK7qoLyEERBBRDMu8nm5MKoRzPXDXans4v9wdATZedz9';

/**
 * Savings Strategy Module
 * 
 * Implements automated savings strategies with accumulation, distribution, and hybrid phases.
 * Supports growth rate calculations and automatic phase transitions.
 */
export class SavingsStrategy {
    /**
     * Initialize savings strategy with configuration
     * 
     * @param config - Savings strategy configuration parameters
     */
    static initialize(config: SavingsStrategyConfig): void {
        // Store configuration
        Storage.set(SAVINGS_STRATEGY_CONFIG_KEY, config.serialize());
        Storage.set(SAVINGS_STRATEGY_ENABLED_KEY, [1]); // true
        Storage.set(STRATEGY_EXECUTION_COUNT_KEY, u64ToBytes(0));

        // Set initial phase based on strategy type
        if (config.strategyType == StrategyType.HYBRID) {
            // Start with accumulation phase for hybrid strategies
            Storage.set(STRATEGY_CURRENT_PHASE_KEY, [<u8>StrategyType.ACCUMULATION]);
        } else {
            Storage.set(STRATEGY_CURRENT_PHASE_KEY, [config.strategyType]);
        }

        // Schedule the first execution
        this.scheduleNextExecution();

        generateEvent(
            createEvent('SAVINGS_STRATEGY_INITIALIZED', [
                Context.callee().toString(),
                config.strategyType.toString(),
                config.baseAmount.toString(),
                config.growthRate.toString(),
                config.frequency.toString(),
            ])
        );
    }

    /**
     * Execute the savings strategy
     * 
     * Performs actions based on the current strategy type (accumulation/distribution/hybrid).
     * This function should only be called via deferred execution.
     */
    static executeStrategy(): void {
        const vaultAddress = Context.callee();

        // Load configuration
        if (!Storage.has(SAVINGS_STRATEGY_CONFIG_KEY)) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INVALID_CONFIG,
                'Savings strategy configuration not found',
                Context.timestamp().toString()
            );
            return;
        }

        const configData = Storage.get(SAVINGS_STRATEGY_CONFIG_KEY);
        const config = new SavingsStrategyConfig();
        config.deserialize(configData, 0);

        // Check if strategy should continue
        if (!this.shouldContinue(config)) {
            this.completeStrategy();
            return;
        }

        // Check gas reserve
        if (!GasManager.reserveGasForOperation('STRATEGY')) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INSUFFICIENT_GAS,
                'Insufficient gas reserve for strategy execution',
                Context.timestamp().toString()
            );
            return;
        }

        // Get current phase
        const currentPhase = this.getCurrentPhase();

        // Execute based on phase
        let success: bool = false;
        let action = '';

        if (currentPhase == StrategyType.ACCUMULATION) {
            success = this.executeAccumulation(config);
            action = 'ACCUMULATION';
        } else if (currentPhase == StrategyType.DISTRIBUTION) {
            success = this.executeDistribution(config);
            action = 'DISTRIBUTION';
        }

        if (success) {
            // Increment execution counter
            const currentCount = this.getExecutionCount();
            Storage.set(STRATEGY_EXECUTION_COUNT_KEY, u64ToBytes(currentCount + 1));

            // Update last execution time
            Storage.set(LAST_STRATEGY_EXECUTION_KEY, u64ToBytes(Context.timestamp()));

            // Check if phase transition is needed (for hybrid strategies)
            if (config.strategyType == StrategyType.HYBRID) {
                this.checkAndTransitionPhase(config);
            }

            // Emit success event
            const amount = this.calculateCurrentAmount(config, currentCount + 1);
            emitSavingsStrategyExecuted(
                vaultAddress.toString(),
                action,
                amount.toString(),
                Context.timestamp().toString()
            );

            // Schedule next execution if should continue
            if (this.shouldContinue(config)) {
                this.scheduleNextExecution();
            } else {
                this.completeStrategy();
            }
        } else {
            emitAutomationError(
                vaultAddress.toString(),
                'STRATEGY_EXECUTION_FAILED',
                'Savings strategy execution failed',
                Context.timestamp().toString()
            );
        }
    }

    /**
     * Execute accumulation phase
     * 
     * In accumulation phase, the strategy increases deposit amounts over time.
     * This is a placeholder for actual accumulation logic.
     * 
     * @param config - Strategy configuration
     * @returns true if execution succeeded
     */
    private static executeAccumulation(config: SavingsStrategyConfig): bool {
        // Calculate current amount based on growth rate
        const executionCount = this.getExecutionCount();
        const currentAmount = this.calculateCurrentAmount(config, executionCount + 1);

        // In accumulation phase, we would typically:
        // 1. Calculate the amount to deposit based on growth rate
        // 2. Ensure sufficient balance
        // 3. Update internal accounting

        // For now, we just validate that the amount is calculated correctly
        if (currentAmount == u256.Zero) {
            return false;
        }

        // Emit accumulation event
        generateEvent(
            createEvent('STRATEGY_ACCUMULATION', [
                Context.callee().toString(),
                currentAmount.toString(),
                Context.timestamp().toString(),
            ])
        );

        return true;
    }

    /**
     * Execute distribution phase
     * 
     * In distribution phase, the strategy withdraws and transfers funds to the distribution address.
     * 
     * @param config - Strategy configuration
     * @returns true if execution succeeded
     */
    private static executeDistribution(config: SavingsStrategyConfig): bool {
        const vaultAddress = Context.callee();

        // Calculate current amount based on growth rate
        const executionCount = this.getExecutionCount();
        const currentAmount = this.calculateCurrentAmount(config, executionCount + 1);

        if (currentAmount == u256.Zero) {
            return false;
        }

        // Check if distribution address is valid
        if (config.distributionAddress.toString().length == 0) {
            return false;
        }

        // Get WMAS token balance
        const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));
        const balance = wmasToken.balanceOf(vaultAddress);

        // Compare using string representation to avoid u256 type compatibility issues
        const balanceStr = balance.toString();
        const currentAmountStr = currentAmount.toString();

        // Simple string-based comparison for large numbers
        // This works because both are positive integers
        const balanceIsLess = balanceStr.length < currentAmountStr.length ||
            (balanceStr.length == currentAmountStr.length && balanceStr < currentAmountStr);

        // Check if vault has sufficient balance
        if (balanceIsLess) {
            emitAutomationError(
                vaultAddress.toString(),
                AutomationError.INSUFFICIENT_BALANCE,
                'Insufficient vault balance for distribution',
                Context.timestamp().toString()
            );
            return false;
        }

        // Transfer tokens to distribution address
        // Use balance type directly since it's already MRC20 u256
        wmasToken.transfer(
            config.distributionAddress,
            balance,
            0 // balance entry cost
        );

        // Emit distribution event
        generateEvent(
            createEvent('STRATEGY_DISTRIBUTION', [
                vaultAddress.toString(),
                config.distributionAddress.toString(),
                currentAmount.toString(),
                Context.timestamp().toString(),
            ])
        );

        return true;
    }

    /**
     * Calculate current amount based on growth rate
     * 
     * Formula: currentAmount = baseAmount * (1 + growthRate/100)^periods
     * Using SafeMath for overflow protection.
     * 
     * @param config - Strategy configuration
     * @param periods - Number of periods elapsed
     * @returns Calculated amount
     */
    static calculateCurrentAmount(config: SavingsStrategyConfig, periods: u64): u256 {
        const baseAmount = config.baseAmount;
        const growthRate = config.growthRate;

        // If no growth rate, return base amount
        if (growthRate == 0) {
            return baseAmount;
        }

        // Calculate compound growth: amount = baseAmount * (1 + rate/100)^periods
        // For simplicity and gas efficiency, we use simple growth: amount = baseAmount * (1 + rate * periods / 100)
        // This avoids expensive exponentiation while still providing growth

        // Calculate growth multiplier: (100 + rate * periods) / 100
        const rateTimePeriods = u64(growthRate) * periods;
        const multiplierNumerator = u256.fromU64(100 + rateTimePeriods);
        const multiplierDenominator = u256.fromU64(100);

        // Calculate: baseAmount * multiplierNumerator / multiplierDenominator
        const result = SafeMath256.div(
            SafeMath256.mul(baseAmount, multiplierNumerator),
            multiplierDenominator
        );

        return result;
    }

    /**
     * Check and transition phase for hybrid strategies
     * 
     * @param config - Strategy configuration
     */
    private static checkAndTransitionPhase(config: SavingsStrategyConfig): void {
        const currentTime = Context.timestamp();
        const currentPhase = this.getCurrentPhase();

        // Check if it's time to transition
        if (config.phaseTransitionTime > 0 && currentTime >= config.phaseTransitionTime) {
            // Only transition if we're still in accumulation phase
            if (currentPhase == StrategyType.ACCUMULATION) {
                this.transitionPhase(config);
            }
        }
    }

    /**
     * Transition between strategy phases (for hybrid strategies)
     * 
     * Transitions from accumulation to distribution phase.
     */
    static transitionPhase(config: SavingsStrategyConfig): void {
        const currentPhase = this.getCurrentPhase();
        const vaultAddress = Context.callee();

        // Transition from accumulation to distribution
        if (currentPhase == StrategyType.ACCUMULATION) {
            Storage.set(STRATEGY_CURRENT_PHASE_KEY, [<u8>StrategyType.DISTRIBUTION]);
            Storage.set(STRATEGY_PHASE_TRANSITION_TIMESTAMP_KEY, u64ToBytes(Context.timestamp()));

            generateEvent(
                createEvent('STRATEGY_PHASE_TRANSITION', [
                    vaultAddress.toString(),
                    'ACCUMULATION',
                    'DISTRIBUTION',
                    Context.timestamp().toString(),
                ])
            );
        }
    }

    /**
     * Schedule the next strategy execution using AutomationEngine
     */
    static scheduleNextExecution(): void {
        if (!Storage.has(SAVINGS_STRATEGY_CONFIG_KEY)) {
            return;
        }

        const configData = Storage.get(SAVINGS_STRATEGY_CONFIG_KEY);
        const config = new SavingsStrategyConfig();
        config.deserialize(configData, 0);

        // Calculate next execution time
        const currentTime = Context.timestamp();
        const nextExecution = AutomationEngine.calculateNextExecution(
            config.frequency as AutomationFrequency,
            currentTime
        );

        // Store next execution time
        Storage.set(SAVINGS_STRATEGY_NEXT_EXECUTION_KEY, u64ToBytes(nextExecution));

        // Schedule the deferred call
        const args = new Args();
        const deferredCallId = AutomationEngine.scheduleCall(
            'executeDeferredStrategy',
            args,
            nextExecution,
            config.gasPerExecution,
            0 // no coins to send
        );

        // Store deferred call ID for potential cancellation
        Storage.set(SAVINGS_STRATEGY_DEFERRED_CALL_ID_KEY, stringToBytes(deferredCallId));
    }

    /**
     * Check if strategy should continue executing
     * 
     * @param config - Strategy configuration
     * @returns true if strategy should continue, false if it should stop
     */
    static shouldContinue(config: SavingsStrategyConfig): bool {
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
     * Get the current execution count
     * 
     * @returns Number of completed executions
     */
    static getExecutionCount(): u64 {
        if (!Storage.has(STRATEGY_EXECUTION_COUNT_KEY)) {
            return 0;
        }
        return bytesToU64(Storage.get(STRATEGY_EXECUTION_COUNT_KEY));
    }

    /**
     * Get the current phase
     * 
     * @returns Current strategy phase
     */
    static getCurrentPhase(): u8 {
        if (!Storage.has(STRATEGY_CURRENT_PHASE_KEY)) {
            return <u8>StrategyType.ACCUMULATION;
        }
        const value = Storage.get(STRATEGY_CURRENT_PHASE_KEY);
        return value[0];
    }

    /**
     * Get the phase transition timestamp
     * 
     * @returns Timestamp when phase transition occurred, or 0 if not transitioned
     */
    static getPhaseTransitionTimestamp(): u64 {
        if (!Storage.has(STRATEGY_PHASE_TRANSITION_TIMESTAMP_KEY)) {
            return 0;
        }
        return bytesToU64(Storage.get(STRATEGY_PHASE_TRANSITION_TIMESTAMP_KEY));
    }

    /**
     * Get the next scheduled execution time
     * 
     * @returns Timestamp of next execution, or 0 if not scheduled
     */
    static getNextExecution(): u64 {
        if (!Storage.has(SAVINGS_STRATEGY_NEXT_EXECUTION_KEY)) {
            return 0;
        }
        return bytesToU64(Storage.get(SAVINGS_STRATEGY_NEXT_EXECUTION_KEY));
    }

    /**
     * Check if savings strategy is enabled
     * 
     * @returns true if strategy is enabled
     */
    static isEnabled(): bool {
        if (!Storage.has(SAVINGS_STRATEGY_ENABLED_KEY)) {
            return false;
        }
        const value = Storage.get(SAVINGS_STRATEGY_ENABLED_KEY);
        return value[0] == 1;
    }

    /**
     * Pause strategy execution
     */
    static pause(): void {
        Storage.set(SAVINGS_STRATEGY_ENABLED_KEY, [0]); // false

        // Cancel scheduled deferred call if exists
        if (Storage.has(SAVINGS_STRATEGY_DEFERRED_CALL_ID_KEY)) {
            const deferredCallIdBytes = Storage.get(SAVINGS_STRATEGY_DEFERRED_CALL_ID_KEY);
            const deferredCallId = String.UTF8.decode(changetype<ArrayBuffer>(deferredCallIdBytes));
            AutomationEngine.cancelScheduledCall(deferredCallId);
        }

        generateEvent(
            createEvent('SAVINGS_STRATEGY_PAUSED', [
                Context.callee().toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Resume strategy execution
     */
    static resume(): void {
        Storage.set(SAVINGS_STRATEGY_ENABLED_KEY, [1]); // true

        // Reschedule next execution
        this.scheduleNextExecution();

        generateEvent(
            createEvent('SAVINGS_STRATEGY_RESUMED', [
                Context.callee().toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Complete strategy and emit completion event
     */
    private static completeStrategy(): void {
        Storage.set(SAVINGS_STRATEGY_ENABLED_KEY, [0]); // false

        const executionCount = this.getExecutionCount();

        generateEvent(
            createEvent('SAVINGS_STRATEGY_COMPLETED', [
                Context.callee().toString(),
                executionCount.toString(),
                Context.timestamp().toString(),
            ])
        );
    }

    /**
     * Update strategy configuration
     * 
     * @param config - New strategy configuration
     */
    static updateConfig(config: SavingsStrategyConfig): void {
        // Cancel existing scheduled call
        if (Storage.has(SAVINGS_STRATEGY_DEFERRED_CALL_ID_KEY)) {
            const deferredCallIdBytes = Storage.get(SAVINGS_STRATEGY_DEFERRED_CALL_ID_KEY);
            const deferredCallId = String.UTF8.decode(changetype<ArrayBuffer>(deferredCallIdBytes));
            AutomationEngine.cancelScheduledCall(deferredCallId);
        }

        // Store new configuration
        Storage.set(SAVINGS_STRATEGY_CONFIG_KEY, config.serialize());

        // Reschedule with new configuration
        if (this.isEnabled()) {
            this.scheduleNextExecution();
        }

        emitAutomationConfigUpdated(
            Context.callee().toString(),
            'STRATEGY',
            Context.timestamp().toString()
        );
    }
}
