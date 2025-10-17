import { SmartContract, Args, parseUnits, OperationStatus } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import { USDC_DECIMALS } from './types';

// Factory contract address - get from environment variable
const CONTRACT_ADDRESS = import.meta.env.VITE_SMART_CONTRACT as string;
export const FACTORY_CONTRACT_ADDRESS = CONTRACT_ADDRESS || 'AS12vGvFmU1m4PNW6oNTgQaLVu8V5NzRC9BuSrvE5CMEEJxhp2jdH';

export interface AutoDepositConfig {
    vaultAddress: string;
    amount: string; // Human-readable amount (e.g., "10")
    intervalSeconds: number; // In seconds
}

export interface AutoDepositSchedule {
    id: number;
    owner: string;
    vaultAddress: string;
    amount: bigint;
    intervalSeconds: number;
    nextExecutionTime: number;
    isActive: boolean;
    totalDeposits: number;
    createdAt: number;
}

/**
 * Schedule recurring deposits to a vault
 */
export async function scheduleRecurringDeposit(
    connectedAccount: any,
    config: AutoDepositConfig
): Promise<{ success: boolean; scheduleId?: number; error?: string }> {
    const toastId = toast.loading('Setting up automated deposits...');

    try {
        const factoryContract = new SmartContract(connectedAccount, FACTORY_CONTRACT_ADDRESS);

        // Convert amount to smallest unit
        const amountBigInt = parseUnits(config.amount, USDC_DECIMALS);

        const args = new Args()
            .addString(config.vaultAddress)
            .addU256(amountBigInt)
            .addU64(BigInt(config.intervalSeconds))
            .serialize();

        console.log(`Scheduling auto-deposit: ${config.amount} USDC every ${config.intervalSeconds}s to vault ${config.vaultAddress}`);

        // Deferred calls require coins to pay for future execution
        // The contract will calculate the exact cost using deferredCallQuote
        // Provide generous coins to cover the deferred call costs
        const operation = await factoryContract.call('scheduleRecurringDeposit', args, {
            coins: parseUnits('20', 9), // 10 MAS to cover deferred call costs
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            // Get schedule ID from operation result
            const events = await operation.getSpeculativeEvents();
            console.log('Schedule created, events:', events);

            toast.update(toastId, {
                render: '✅ Automated deposits scheduled successfully!',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true, scheduleId: 1 }; // We'll parse the actual ID from events
        } else {
            toast.update(toastId, {
                render: 'Failed to schedule automated deposits',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Transaction failed' };
        }
    } catch (error) {
        console.error('Error scheduling auto-deposit:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Failed to schedule: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Cancel an active auto-deposit schedule
 * 
 * NOTE: Deposits are executed AUTOMATICALLY by Massa's deferred call system.
 * Users never need to manually trigger execution - it happens on-chain at the scheduled time.
 */
export async function cancelDepositSchedule(
    connectedAccount: any,
    scheduleId: number
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading('Cancelling automated deposits...');

    try {
        const factoryContract = new SmartContract(connectedAccount, FACTORY_CONTRACT_ADDRESS);

        const args = new Args()
            .addU64(BigInt(scheduleId))
            .serialize();

        console.log(`Cancelling schedule ${scheduleId}`);

        const operation = await factoryContract.call('cancelDepositSchedule', args, {
            coins: 0n,
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            toast.update(toastId, {
                render: '🛑 Automated deposits cancelled',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            toast.update(toastId, {
                render: 'Failed to cancel',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Transaction failed' };
        }
    } catch (error) {
        console.error('Error cancelling schedule:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Failed to cancel: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Update an existing auto-deposit schedule
 */
export async function updateDepositSchedule(
    connectedAccount: any,
    scheduleId: number,
    newAmount: string,
    newIntervalSeconds: number
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading('Updating schedule...');

    try {
        const factoryContract = new SmartContract(connectedAccount, FACTORY_CONTRACT_ADDRESS);

        const amountBigInt = parseUnits(newAmount, USDC_DECIMALS);

        const args = new Args()
            .addU64(BigInt(scheduleId))
            .addU256(amountBigInt)
            .addU64(BigInt(newIntervalSeconds))
            .serialize();

        console.log(`Updating schedule ${scheduleId}: ${newAmount} USDC every ${newIntervalSeconds}s`);

        const operation = await factoryContract.call('updateDepositSchedule', args, {
            coins: 0n,
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            toast.update(toastId, {
                render: '✅ Schedule updated successfully',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            toast.update(toastId, {
                render: 'Failed to update schedule',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Transaction failed' };
        }
    } catch (error) {
        console.error('Error updating schedule:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Failed to update: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Get all auto-deposit schedules for a user
 */
export async function getUserDepositSchedules(
    connectedAccount: any,
    userAddress: string
): Promise<AutoDepositSchedule[]> {
    try {
        const storagePrefix = `ADS::${userAddress}::`;

        const keys = await connectedAccount.getStorageKeys(
            FACTORY_CONTRACT_ADDRESS,
            storagePrefix,
            false
        );

        const schedules: AutoDepositSchedule[] = [];

        for (const key of keys) {
            try {
                const keyStr = new TextDecoder().decode(key);
                const parts = keyStr.split('::');
                if (parts.length < 3) continue;

                const scheduleId = parseInt(parts[2]);
                if (isNaN(scheduleId)) continue;

                const data = await connectedAccount.readStorage(
                    FACTORY_CONTRACT_ADDRESS,
                    [keyStr],
                    false
                );

                if (!data || !data[0] || data[0].length === 0) continue;

                // Data is already in bytes format (Uint8Array)
                const args = new Args(data[0]);

                // Deserialize according to AutoDepositSchedule structure
                const owner = args.nextString();
                const vaultAddress = args.nextString();
                const amount = args.nextU256();
                const intervalSeconds = Number(args.nextU64());
                const nextExecutionTime = Number(args.nextU64());
                const isActive = args.nextBool();
                args.nextString(); // deferredCallId - skip it
                const totalDeposits = Number(args.nextU64());
                const createdAt = Number(args.nextU64());

                schedules.push({
                    id: scheduleId,
                    owner,
                    vaultAddress,
                    amount,
                    intervalSeconds,
                    nextExecutionTime,
                    isActive,
                    totalDeposits,
                    createdAt,
                });
            } catch (error) {
                console.error('Error processing schedule:', error);
                continue;
            }
        }

        return schedules;
    } catch (error) {
        console.error('Error fetching user schedules:', error);
        return [];
    }
}
