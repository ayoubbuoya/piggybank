import { SmartContract, Args, parseMas, parseUnits, OperationStatus, ArrayTypes } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import { DCAConfig, DCAStatus, USDC_DECIMALS } from './types';

// Dusa DCA contract address on Massa Buildnet
export const DUSA_DCA_CONTRACT_ADDRESS = 'AS12Sm9oqH2C26fx7v8ZYCwyKs9LmrmRGX2WRJT3aK7KnYtrMhq8n';

/**
 * Start a new DCA (generic - any token pair)
 */
export async function startDCA(
    connectedAccount: any,
    config: DCAConfig
): Promise<{ success: boolean; dcaId?: string; error?: string }> {
    const toastId = toast.loading('Setting up DCA...');

    try {
        const dcaContract = new SmartContract(connectedAccount, DUSA_DCA_CONTRACT_ADDRESS);

        // Convert amount to smallest unit (assuming 6 decimals for now)
        const amountPerDCA = parseUnits(config.amountEachDCA, USDC_DECIMALS);

        const args = new Args()
            .addU256(amountPerDCA)
            .addU64(BigInt(config.interval))
            .addU64(BigInt(config.nbOfDCA))
            .addArray(config.tokenPath, ArrayTypes.STRING)
            .addU32(BigInt(config.threshold))
            .addBool(config.moreGas)
            .addU64(BigInt(config.startIn))
            .serialize();

        // Calculate total coins needed for storage and gas
        const storagePerExecution = parseMas('0.3');
        const setupCoins = parseMas('1.5');
        const totalCoins = BigInt(storagePerExecution) * BigInt(config.nbOfDCA) + BigInt(setupCoins);

        console.log(`Starting DCA: ${config.amountEachDCA} every ${config.interval}s for ${config.nbOfDCA} times`);
        console.log(`Token path: ${config.tokenPath.join(' → ')}`);

        const operation = await dcaContract.call('startDCA', args, {
            coins: totalCoins,
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            toast.update(toastId, {
                render: '✅ DCA setup successful! Automated swaps will start soon.',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true, dcaId: 'success' };
        } else {
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
 * Get all user's DCAs
 */
export async function getUserDCAs(
    connectedAccount: any
): Promise<DCAStatus[]> {
    try {
        const userAddress = connectedAccount.address;
        const storagePrefix = `D::${userAddress}:`;

        const keys = await connectedAccount.getStorageKeys(
            DUSA_DCA_CONTRACT_ADDRESS,
            storagePrefix,
            false
        );

        const dcas: DCAStatus[] = [];

        for (const key of keys) {
            try {
                const keyStr = new TextDecoder().decode(key);
                const parts = keyStr.split(':');
                if (parts.length < 4) continue;

                const dcaId = parseInt(parts[parts.length - 1]);
                if (isNaN(dcaId)) continue;

                const data = await connectedAccount.readStorage(
                    DUSA_DCA_CONTRACT_ADDRESS,
                    [keyStr],
                    false
                );

                if (!data || !data[0] || data[0].length === 0) continue;

                const args = new Args(data[0]);
                const amountEachDCA = args.nextU256();
                const interval = Number(args.nextU64());
                const nbOfDCA = Number(args.nextU64());
                const tokenPath = args.nextArray(ArrayTypes.STRING);
                const threshold = Number(args.nextU32());
                const moreGas = args.nextBool();
                const startTimeMs = Number(args.nextU64());
                const executedCount = Number(args.nextU64());
                const deferredCallId = args.nextString();

                const startTime = Math.floor(startTimeMs / 1000);
                const endTime = startTime + (interval * nbOfDCA);

                dcas.push({
                    id: dcaId,
                    amountEachDCA,
                    interval,
                    nbOfDCA,
                    tokenPath: tokenPath as string[],
                    threshold,
                    moreGas,
                    startTime,
                    endTime,
                    executedCount,
                    deferredCallId,
                });
            } catch (error) {
                console.error('Error processing DCA:', error);
                continue;
            }
        }

        return dcas;
    } catch (error) {
        console.error('Error fetching user DCAs:', error);
        return [];
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
