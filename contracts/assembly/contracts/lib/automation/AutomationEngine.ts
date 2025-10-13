import {
    Context,
    createEvent,
    generateEvent,
    deferredCallRegister,
    deferredCallCancel,
    deferredCallExists,
    Slot,
    currentPeriod,
    currentThread
} from '@massalabs/massa-as-sdk';
import { Args } from '@massalabs/as-types';
import { AutomationFrequency, AutomationError } from './AutomationTypes';
import { emitAutomationError, emitAutomationScheduled } from './AutomationEvents';

// Time constants in milliseconds
const MILLISECONDS_PER_DAY: u64 = 86400000;
const MILLISECONDS_PER_WEEK: u64 = 604800000;
const MILLISECONDS_PER_MONTH: u64 = 2592000000; // Approximate 30 days

// Massa blockchain constants
const MILLISECONDS_PER_PERIOD: u64 = 16000; // 16 seconds per period
const THREADS_PER_PERIOD: u8 = 32;

/**
 * Automation Engine module for managing deferred call lifecycle
 * 
 * This module handles scheduling, validation, and cancellation of autonomous
 * operations using Massa's deferred call mechanism.
 */
export class AutomationEngine {
    /**
     * Convert a timestamp in milliseconds to a Massa slot
     * 
     * @param timestampMs - Timestamp in milliseconds
     * @returns Slot object with period and thread
     */
    static timestampToSlot(timestampMs: u64): Slot {
        const currentTimestamp = Context.timestamp();
        const currentPer = currentPeriod();
        const currentThr = currentThread();

        // Calculate periods from now
        const timeDiff = timestampMs - currentTimestamp;
        const periodsFromNow = timeDiff / MILLISECONDS_PER_PERIOD;

        // Calculate target period
        const targetPeriod = currentPer + periodsFromNow;

        // Use current thread or default to 0 for simplicity
        // In production, you might want to find the cheapest slot
        const targetThread: u8 = 0;

        return new Slot(targetPeriod, targetThread);
    }

    /**
     * Schedule a deferred call to execute at a future time
     * 
     * @param targetFunction - Name of the function to call
     * @param args - Serialized arguments for the function
     * @param executeAt - Timestamp when the call should execute (in milliseconds)
     * @param gasLimit - Gas limit for the execution
     * @param coins - Amount of coins to send with the call (in nanoMAS)
     * @returns The ID of the scheduled deferred call
     */
    static scheduleCall(
        targetFunction: string,
        args: Args,
        executeAt: u64,
        gasLimit: u64,
        coins: u64 = 0
    ): string {
        // Get the current contract address (self)
        const calleeAddress = Context.callee();

        // Validate that executeAt is in the future
        const currentTime = Context.timestamp();
        if (executeAt <= currentTime) {
            emitAutomationError(
                calleeAddress.toString(),
                AutomationError.INVALID_CONFIG,
                'Execution time must be in the future',
                currentTime.toString()
            );
            return '';
        }

        // Convert timestamp to slot
        const targetSlot = this.timestampToSlot(executeAt);

        // Schedule the deferred call using Massa's deferredCallRegister
        const deferredCallId = deferredCallRegister(
            calleeAddress.toString(),  // Target contract (self)
            targetFunction,            // Function to call
            targetSlot,                // When to execute
            gasLimit,                  // Gas limit
            args.serialize(),          // Function arguments
            coins                      // Coins to send
        );

        // Emit scheduling event with operation type derived from function name
        let operationType = 'UNKNOWN';
        if (targetFunction.includes('DCA')) {
            operationType = 'DCA';
        } else if (targetFunction.includes('Deposit')) {
            operationType = 'DEPOSIT';
        } else if (targetFunction.includes('Strategy')) {
            operationType = 'STRATEGY';
        }

        emitAutomationScheduled(
            calleeAddress.toString(),
            operationType,
            executeAt.toString()
        );

        return deferredCallId;
    }

    /**
     * Validate that the current execution is a deferred call from the contract itself
     * 
     * This prevents unauthorized external calls to deferred entry points.
     * Should be called at the start of every deferred execution function.
     * 
     * @returns true if validation passes, false otherwise
     */
    static validateDeferredExecution(): bool {
        const caller = Context.caller();
        const callee = Context.callee();

        // Check if caller is the contract itself
        if (caller.toString() != callee.toString()) {
            emitAutomationError(
                callee.toString(),
                AutomationError.UNAUTHORIZED_CALLER,
                'Deferred call must originate from contract itself',
                Context.timestamp().toString()
            );
            return false;
        }

        return true;
    }

    /**
     * Calculate the next execution time based on frequency
     * 
     * @param frequency - Automation frequency (DAILY, WEEKLY, BIWEEKLY, MONTHLY)
     * @param currentTime - Current timestamp in milliseconds
     * @returns Next execution timestamp in milliseconds
     */
    static calculateNextExecution(
        frequency: AutomationFrequency,
        currentTime: u64
    ): u64 {
        let interval: u64 = 0;

        if (frequency == AutomationFrequency.DAILY) {
            interval = MILLISECONDS_PER_DAY;
        } else if (frequency == AutomationFrequency.WEEKLY) {
            interval = MILLISECONDS_PER_WEEK;
        } else if (frequency == AutomationFrequency.BIWEEKLY) {
            interval = MILLISECONDS_PER_WEEK * 2;
        } else if (frequency == AutomationFrequency.MONTHLY) {
            interval = MILLISECONDS_PER_MONTH;
        } else {
            // Default to daily if unknown frequency
            interval = MILLISECONDS_PER_DAY;
        }

        return currentTime + interval;
    }

    /**
     * Cancel a scheduled call
     * 
     * @param deferredCallId - ID of the deferred call to cancel
     * @returns true if the call was successfully cancelled
     */
    static cancelScheduledCall(deferredCallId: string): bool {
        const callee = Context.callee();

        // Check if the deferred call exists
        if (!deferredCallExists(deferredCallId)) {
            emitAutomationError(
                callee.toString(),
                'DEFERRED_CALL_NOT_FOUND',
                'Cannot cancel non-existent deferred call',
                Context.timestamp().toString()
            );
            return false;
        }

        // Cancel the deferred call
        deferredCallCancel(deferredCallId);

        generateEvent(
            createEvent('AUTOMATION_CANCELLED', [
                callee.toString(),
                deferredCallId,
                Context.timestamp().toString(),
            ])
        );

        return true;
    }

    /**
     * Helper function to schedule the next recurring operation
     * 
     * @param targetFunction - Function to call
     * @param args - Function arguments
     * @param frequency - Recurrence frequency
     * @param gasLimit - Gas limit for execution
     * @param coins - Coins to send with call
     * @returns The ID of the scheduled deferred call
     */
    static scheduleRecurring(
        targetFunction: string,
        args: Args,
        frequency: AutomationFrequency,
        gasLimit: u64,
        coins: u64 = 0
    ): string {
        const currentTime = Context.timestamp();
        const nextExecution = this.calculateNextExecution(frequency, currentTime);

        return this.scheduleCall(
            targetFunction,
            args,
            nextExecution,
            gasLimit,
            coins
        );
    }

    /**
     * Check if a timestamp is in the past
     * 
     * @param timestamp - Timestamp to check
     * @returns true if timestamp is in the past
     */
    static isPastDue(timestamp: u64): bool {
        return timestamp <= Context.timestamp();
    }

    /**
     * Get time until next execution
     * 
     * @param nextExecutionTime - Scheduled execution timestamp
     * @returns Milliseconds until execution (0 if past due)
     */
    static getTimeUntilExecution(nextExecutionTime: u64): u64 {
        const currentTime = Context.timestamp();

        if (nextExecutionTime <= currentTime) {
            return 0;
        }

        return nextExecutionTime - currentTime;
    }

    /**
     * Check if a deferred call is still scheduled
     * 
     * @param deferredCallId - ID of the deferred call
     * @returns true if the call is still scheduled
     */
    static isScheduled(deferredCallId: string): bool {
        return deferredCallExists(deferredCallId);
    }
}
