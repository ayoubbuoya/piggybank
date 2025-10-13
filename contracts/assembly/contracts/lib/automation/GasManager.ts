import { Storage, Context } from '@massalabs/massa-as-sdk';
import { stringToBytes, u64ToBytes, bytesToU64 } from '@massalabs/as-types';
import { AutomationError } from './AutomationTypes';
import { emitGasReserveAdded, emitLowGasWarning } from './AutomationEvents';

// Storage keys for gas management
const GAS_RESERVE_KEY: StaticArray<u8> = stringToBytes('gas_reserve');

/**
 * Gas Manager module for managing gas reserves for deferred operations
 * 
 * This module handles gas reserve storage, consumption tracking, and warnings
 * for autonomous vault operations.
 */
export class GasManager {
    /**
     * Get the current gas reserve balance
     * @returns Current gas reserve in nanoMAS
     */
    static getGasReserve(): u64 {
        if (!Storage.has(GAS_RESERVE_KEY)) {
            return 0;
        }
        return bytesToU64(Storage.get(GAS_RESERVE_KEY));
    }

    /**
     * Deposit gas into the reserve
     * @param amount - Amount of gas to deposit in nanoMAS
     */
    static depositGas(amount: u64): void {
        const currentReserve = this.getGasReserve();
        const newReserve = currentReserve + amount;
        Storage.set(GAS_RESERVE_KEY, u64ToBytes(newReserve));

        // Emit gas reserve added event
        emitGasReserveAdded(
            Context.callee().toString(),
            amount.toString(),
            newReserve.toString()
        );
    }

    /**
     * Consume gas from the reserve for an operation
     * @param amount - Amount of gas to consume in nanoMAS
     * @returns true if gas was successfully consumed, false if insufficient
     */
    static consumeGas(amount: u64): bool {
        const currentReserve = this.getGasReserve();

        if (currentReserve < amount) {
            return false;
        }

        const newReserve = currentReserve - amount;
        Storage.set(GAS_RESERVE_KEY, u64ToBytes(newReserve));

        return true;
    }

    /**
     * Estimate gas required for a specific operation type
     * @param operationType - Type of operation (DCA, DEPOSIT, STRATEGY)
     * @returns Estimated gas cost in nanoMAS
     */
    static estimateGasForOperation(operationType: string): u64 {
        // Base gas costs for different operation types
        // These are estimates and should be calibrated based on actual execution costs

        if (operationType == 'DCA') {
            // DCA involves token swaps which are gas-intensive
            // Estimate: ~500,000 gas units
            return 500000000000; // 500,000 nanoMAS
        } else if (operationType == 'DEPOSIT') {
            // Scheduled deposits involve token transfers
            // Estimate: ~200,000 gas units
            return 200000000000; // 200,000 nanoMAS
        } else if (operationType == 'STRATEGY') {
            // Strategy execution varies but typically involves calculations and transfers
            // Estimate: ~300,000 gas units
            return 300000000000; // 300,000 nanoMAS
        } else {
            // Default estimate for unknown operations
            return 100000000000; // 100,000 nanoMAS
        }
    }

    /**
     * Check if there is sufficient gas for an operation
     * @param requiredGas - Required gas amount in nanoMAS
     * @returns true if sufficient gas is available
     */
    static hasSufficientGas(requiredGas: u64): bool {
        const currentReserve = this.getGasReserve();
        return currentReserve >= requiredGas;
    }

    /**
     * Emit a low gas warning event
     * @param requiredGas - Required gas for upcoming operation
     */
    static emitLowGasWarning(requiredGas: u64): void {
        const currentReserve = this.getGasReserve();

        emitLowGasWarning(
            Context.callee().toString(),
            currentReserve.toString(),
            requiredGas.toString()
        );
    }

    /**
     * Validate and consume gas for an operation, emitting warnings if needed
     * @param operationType - Type of operation
     * @returns true if gas was successfully reserved, false otherwise
     */
    static reserveGasForOperation(operationType: string): bool {
        const requiredGas = this.estimateGasForOperation(operationType);

        if (!this.hasSufficientGas(requiredGas)) {
            this.emitLowGasWarning(requiredGas);
            return false;
        }

        return this.consumeGas(requiredGas);
    }

    /**
     * Get the minimum recommended gas reserve for continuous operations
     * @param operationType - Type of operation
     * @param executionCount - Number of executions to reserve for
     * @returns Recommended minimum gas reserve
     */
    static getMinimumReserve(operationType: string, executionCount: u32): u64 {
        const gasPerExecution = this.estimateGasForOperation(operationType);
        return gasPerExecution * u64(executionCount);
    }
}
