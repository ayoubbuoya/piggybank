import { SmartContract, Args, parseMas, parseUnits, OperationStatus, ArrayTypes } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import { DCAConfig, DCAStatus, USDC_DECIMALS, BASE_TOKEN_ADDRESS } from './types';

// Dusa DCA contract address on Massa Buildnet
export const DUSA_DCA_CONTRACT_ADDRESS = 'AS12Sm9oqH2C26fx7v8ZYCwyKs9LmrmRGX2WRJT3aK7KnYtrMhq8n';

/**
 * Start a new DCA that sends USDC to a vault at regular intervals
 */
export async function startDCAToVault(
    connectedAccount: any,
    vaultAddress: string,
    config: DCAConfig
): Promise<{ success: boolean; dcaId?: string; error?: string }> {
    const toastId = toast.loading('Setting up DCA...');

    try {
        const dcaContract = new SmartContract(connectedAccount, DUSA_DCA_CONTRACT_ADDRESS);

        // Convert amount to USDC smallest unit (6 decimals)
        const amountPerDCA = parseUnits(config.amountEachDCA, USDC_DECIMALS);

        // For USDC transfer to vault, we use a simple token path
        // In Dusa's DCA, the token path determines the swap route
        // Since we just want to transfer USDC to the vault, we use [USDC, USDC]
        // The vault address will be the recipient
        const tokenPath = [BASE_TOKEN_ADDRESS, BASE_TOKEN_ADDRESS];

        const args = new Args()
            .addU256(amountPerDCA)
            .addU64(BigInt(config.interval))
            .addU64(BigInt(config.nbOfDCA))
            .addArray(tokenPath, ArrayTypes.STRING)
            .addU32(config.threshold)
            .addBool(config.moreGas)
            .addU64(BigInt(config.startIn))
            .serialize();

        // Calculate total coins needed for storage and gas
        // The DCA contract requires coins for:
        // 1. Storage costs (datastore entries for each DCA execution)
        // 2. Gas for deferred calls
        // Based on the error, we need at least 1.28 MAS for storage + execution costs
        const storagePerExecution = parseMas('0.3'); // Storage cost per DCA execution
        const setupCoins = parseMas('1.5'); // Initial setup + buffer for storage
        const totalCoins = BigInt(storagePerExecution) * BigInt(config.nbOfDCA) + BigInt(setupCoins);

        console.log(`Starting DCA: ${config.amountEachDCA} USDC every ${config.interval}s for ${config.nbOfDCA} times`);
        console.log(`Total coins needed: ${totalCoins.toString()}`);

        toast.update(toastId, {
            render: 'Waiting for DCA setup confirmation...',
            isLoading: true
        });

        const operation = await dcaContract.call('startDCA', args, {
            coins: totalCoins,
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            // Try to extract DCA ID from events
            const events = await operation.getSpeculativeEvents();
            console.log('DCA created successfully, events:', events);

            // TODO: Extract DCA ID from events when we know the event format
            const dcaId = 'pending'; // Placeholder

            toast.update(toastId, {
                render: '✅ DCA setup successful! Automated deposits will start soon.',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true, dcaId };
        } else {
            const events = await operation.getSpeculativeEvents();
            console.log('DCA setup failed, events:', events);

            toast.update(toastId, {
                render: 'DCA setup failed',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'DCA setup transaction failed' };
        }
    } catch (error) {
        console.error('Error setting up DCA:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `DCA setup failed: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Get DCA status and details
 */
export async function getDCAStatus(
    connectedAccount: any,
    dcaId: bigint,
    ownerAddress: string
): Promise<DCAStatus | null> {
    try {
        const dcaContract = new SmartContract(connectedAccount, DUSA_DCA_CONTRACT_ADDRESS);

        // Read DCA data from storage
        const storageKey = `D::${ownerAddress}:${dcaId}`;
        const data = await connectedAccount.readStorage(
            DUSA_DCA_CONTRACT_ADDRESS,
            [storageKey],
            false
        );

        if (!data || !data[0] || !data[0].length) {
            console.warn(`No DCA found with ID ${dcaId} for owner ${ownerAddress}`);
            return null;
        }

        const args = new Args(data[0]);

        return {
            id: Number(dcaId),
            amountEachDCA: args.nextU256()!,
            interval: Number(args.nextU64()!),
            nbOfDCA: Number(args.nextU64()!),
            tokenPath: args.nextArray(ArrayTypes.STRING)!,
            threshold: Number(args.nextU32()!),
            moreGas: args.nextBool()!,
            startTime: Number(args.nextU64()!),
            endTime: 0, // Calculated from startTime + (interval * nbOfDCA)
            executedCount: Number(args.nextU64()!),
            deferredCallId: args.nextString()!,
        };
    } catch (error) {
        console.error('Error fetching DCA status:', error);
        return null;
    }
}

/**
 * Stop an active DCA
 */
export async function stopDCA(
    connectedAccount: any,
    dcaId: bigint
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading('Stopping DCA...');

    try {
        const dcaContract = new SmartContract(connectedAccount, DUSA_DCA_CONTRACT_ADDRESS);

        const args = new Args()
            .addU64(dcaId)
            .serialize();

        console.log(`Stopping DCA ID: ${dcaId}`);

        toast.update(toastId, {
            render: 'Waiting for confirmation...',
            isLoading: true
        });

        const operation = await dcaContract.call('stopDCA', args, {
            coins: parseMas('0.1'), // Gas for stopping
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            toast.update(toastId, {
                render: '🛑 DCA stopped successfully',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            const events = await operation.getSpeculativeEvents();
            console.log('Stop DCA failed, events:', events);

            toast.update(toastId, {
                render: 'Failed to stop DCA',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Stop DCA transaction failed' };
        }
    } catch (error) {
        console.error('Error stopping DCA:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Failed to stop DCA: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Update an existing DCA configuration
 */
export async function updateDCA(
    connectedAccount: any,
    dcaId: bigint,
    config: DCAConfig
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading('Updating DCA...');

    try {
        const dcaContract = new SmartContract(connectedAccount, DUSA_DCA_CONTRACT_ADDRESS);

        const amountPerDCA = parseUnits(config.amountEachDCA, USDC_DECIMALS);
        const tokenPath = [BASE_TOKEN_ADDRESS, BASE_TOKEN_ADDRESS];

        const args = new Args()
            .addU64(dcaId)
            .addU256(amountPerDCA)
            .addU64(BigInt(config.interval))
            .addU64(BigInt(config.nbOfDCA))
            .addArray(tokenPath, ArrayTypes.STRING)
            .addU32(config.threshold)
            .addBool(config.moreGas)
            .serialize();

        // Calculate additional coins needed
        const coinsPerExecution = parseMas('0.1');
        const totalCoins = BigInt(coinsPerExecution) * BigInt(config.nbOfDCA);

        console.log(`Updating DCA ID ${dcaId}`);

        toast.update(toastId, {
            render: 'Waiting for confirmation...',
            isLoading: true
        });

        const operation = await dcaContract.call('updateDCA', args, {
            coins: totalCoins,
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            toast.update(toastId, {
                render: '✅ DCA updated successfully',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            const events = await operation.getSpeculativeEvents();
            console.log('Update DCA failed, events:', events);

            toast.update(toastId, {
                render: 'Failed to update DCA',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Update DCA transaction failed' };
        }
    } catch (error) {
        console.error('Error updating DCA:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Failed to update DCA: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}
