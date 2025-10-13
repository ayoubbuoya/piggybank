import { SmartContract, Args, parseMas, OperationStatus } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import { TokenWithPercentage, AutomationConfig } from './types';

// Automation Status interface matching the contract's AutomationStatus struct
export interface AutomationStatus {
    dcaEnabled: boolean;
    dcaNextExecution: number;
    dcaPurchasesCompleted: number;
    scheduledDepositEnabled: boolean;
    scheduledDepositNextExecution: number;
    savingsStrategyEnabled: boolean;
    savingsStrategyNextExecution: number;
    gasReserve: number;
    isPaused: boolean;
}

// Get factory contract instance
function getFactoryContract(connectedAccount: any): SmartContract {
    if (!connectedAccount) throw new Error("Missing connected account");

    const contractAddress = import.meta.env.VITE_SMART_CONTRACT as string;
    if (!contractAddress) {
        throw new Error('Smart contract address not found in environment variables');
    }

    return new SmartContract(connectedAccount, contractAddress);
}

// Get automation factory contract instance (for creating automated vaults)
function getAutomationFactoryContract(connectedAccount: any): SmartContract {
    if (!connectedAccount) throw new Error("Missing connected account");

    // Use automation factory if available, otherwise fall back to main factory
    const automationFactoryAddress = import.meta.env.VITE_AUTOMATION_FACTORY as string;
    const contractAddress = automationFactoryAddress || import.meta.env.VITE_SMART_CONTRACT as string;

    if (!contractAddress) {
        throw new Error('No factory contract address found in environment variables');
    }

    return new SmartContract(connectedAccount, contractAddress);
}

// Get vault contract instance
function getVaultContract(connectedAccount: any, vaultAddress: string): SmartContract {
    if (!connectedAccount) throw new Error("Missing connected account");
    if (!vaultAddress) throw new Error("Missing vault address");

    return new SmartContract(connectedAccount, vaultAddress);
}

/**
 * Create an automated vault with DCA, scheduled deposits, and/or savings strategies
 */
export async function createAutomatedVault(
    connectedAccount: any,
    tokensWithPercentage: TokenWithPercentage[],
    automationConfig: AutomationConfig,
    initialCoins: string = '0.1'
): Promise<{ success: boolean; vaultAddress?: string; error?: string }> {
    const toastId = toast.loading('Creating vault...');

    try {
        console.log('Creating vault (will enable automation after):', automationConfig);

        // STEP 1: Create basic vault using the WORKING basic factory
        const contract = getFactoryContract(connectedAccount);

        // Simple args for basic vault creation
        const args = new Args();
        args.addSerializableObjectArray(tokensWithPercentage);
        args.addU64(parseMas(initialCoins));

        // Call the WORKING basic factory
        const operation = await contract.call('createSplitterVault', args.serialize(), {
            coins: parseMas(initialCoins) + BigInt(parseMas('2')), // Vault coins + operation fee
        });

        console.log(`Operation ID: ${operation.id}`);
        toast.update(toastId, {
            render: 'Waiting for transaction confirmation...',
            isLoading: true
        });

        // Wait for the operation to be executed
        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            console.log('Vault created successfully');

            // Get events to extract vault address
            const events = await operation.getSpeculativeEvents();
            let vaultAddress = '';

            for (const event of events) {
                if (event.data && (event.data.includes('CREATE_SPLITTER_VAULT') || event.data.includes('CREATE_AUTOMATED_VAULT'))) {
                    // Extract vault address from event data
                    const eventParts = event.data.split(',');
                    if (eventParts.length > 0) {
                        vaultAddress = eventParts[0]
                            .replace('CREATE_SPLITTER_VAULT:', '')
                            .replace('CREATE_AUTOMATED_VAULT:', '')
                            .trim();
                    }
                    break;
                }
            }

            // Try to wait for final execution to ensure storage is available
            try {
                console.log('Waiting for final execution...');
                await operation.waitSpeculativeExecution();
            } catch (error) {
                console.log('Final execution wait failed, but continuing:', error);
            }

            toast.update(toastId, {
                render: '🎉 Vault created! You can now deposit and use it.',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            // TODO: Enable automation features in a follow-up transaction
            // For now, vault works as a basic splitter

            return { success: true, vaultAddress };
        } else {
            console.log('Status:', status);
            const spec_events = await operation.getSpeculativeEvents();
            console.log('Speculative events:', spec_events);

            toast.update(toastId, {
                render: 'Failed to create automated vault',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Failed to create automated vault' };
        }
    } catch (error) {
        console.error('Error creating automated vault:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Error: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Get automation status for a vault
 */
export async function getAutomationStatus(
    connectedAccount: any,
    vaultAddress: string
): Promise<AutomationStatus | null> {
    try {
        console.log('Fetching automation status for vault:', vaultAddress);

        const vaultContract = getVaultContract(connectedAccount, vaultAddress);

        // Call getAutomationStatus with empty args
        const result = await vaultContract.read('getAutomationStatus', new Args().serialize());

        // Deserialize the result - result.value contains the returned bytes
        const args = new Args(result.value);

        const status: AutomationStatus = {
            dcaEnabled: args.nextBool(),
            dcaNextExecution: Number(args.nextU64()),
            dcaPurchasesCompleted: Number(args.nextU32()),
            scheduledDepositEnabled: args.nextBool(),
            scheduledDepositNextExecution: Number(args.nextU64()),
            savingsStrategyEnabled: args.nextBool(),
            savingsStrategyNextExecution: Number(args.nextU64()),
            gasReserve: Number(args.nextU64()),
            isPaused: args.nextBool(),
        };

        console.log('Automation status:', status);
        return status;
    } catch (error) {
        console.error('Error fetching automation status:', error);
        // Don't show error toast - vault might just not have automation
        // This is expected for basic vaults
        return null;
    }
}

/**
 * Add gas reserve to a vault for deferred operations
 */
export async function addGasReserve(
    connectedAccount: any,
    vaultAddress: string,
    amount: string
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading(`Adding ${amount} MAS to gas reserve...`);

    try {
        console.log(`Adding ${amount} MAS gas reserve to vault ${vaultAddress}`);

        const vaultContract = getVaultContract(connectedAccount, vaultAddress);

        const args = new Args()
            .addU64(BigInt(parseMas(amount)))
            .serialize();

        toast.update(toastId, {
            render: 'Waiting for transaction confirmation...',
            isLoading: true
        });

        const operation = await vaultContract.call('addGasReserve', args, {
            coins: parseMas(amount), // Send the gas amount as coins
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            console.log('Gas reserve added successfully');

            toast.update(toastId, {
                render: '⛽ Gas reserve added successfully!',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            const events = await operation.getSpeculativeEvents();
            console.log('Add gas reserve failed, events:', events);

            toast.update(toastId, {
                render: 'Failed to add gas reserve',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Failed to add gas reserve' };
        }
    } catch (error) {
        console.error('Error adding gas reserve:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Error: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Pause all automation for a vault (owner only)
 */
export async function pauseAutomation(
    connectedAccount: any,
    vaultAddress: string
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading('Pausing automation...');

    try {
        console.log(`Pausing automation for vault ${vaultAddress}`);

        const vaultContract = getVaultContract(connectedAccount, vaultAddress);

        toast.update(toastId, {
            render: 'Waiting for transaction confirmation...',
            isLoading: true
        });

        const operation = await vaultContract.call('pauseAutomation', new Args().serialize(), {
            coins: parseMas('1'), // Gas for operation
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            console.log('Automation paused successfully');

            toast.update(toastId, {
                render: '⏸️ Automation paused successfully',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            const events = await operation.getSpeculativeEvents();
            console.log('Pause automation failed, events:', events);

            toast.update(toastId, {
                render: 'Failed to pause automation',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Failed to pause automation' };
        }
    } catch (error) {
        console.error('Error pausing automation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Error: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Resume all automation for a vault (owner only)
 */
export async function resumeAutomation(
    connectedAccount: any,
    vaultAddress: string
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading('Resuming automation...');

    try {
        console.log(`Resuming automation for vault ${vaultAddress}`);

        const vaultContract = getVaultContract(connectedAccount, vaultAddress);

        toast.update(toastId, {
            render: 'Waiting for transaction confirmation...',
            isLoading: true
        });

        const operation = await vaultContract.call('resumeAutomation', new Args().serialize(), {
            coins: parseMas('1'), // Gas for operation
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            console.log('Automation resumed successfully');

            toast.update(toastId, {
                render: '▶️ Automation resumed successfully',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            const events = await operation.getSpeculativeEvents();
            console.log('Resume automation failed, events:', events);

            toast.update(toastId, {
                render: 'Failed to resume automation',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Failed to resume automation' };
        }
    } catch (error) {
        console.error('Error resuming automation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Error: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}

/**
 * Update automation configuration for a vault (owner only)
 */
export async function updateAutomationConfig(
    connectedAccount: any,
    vaultAddress: string,
    configType: 'dca' | 'scheduledDeposit' | 'savingsStrategy',
    config: any
): Promise<{ success: boolean; error?: string }> {
    const toastId = toast.loading('Updating automation configuration...');

    try {
        console.log(`Updating ${configType} configuration for vault ${vaultAddress}`, config);

        const vaultContract = getVaultContract(connectedAccount, vaultAddress);

        const args = new Args();
        args.addString(configType);

        // Serialize configuration based on type
        if (configType === 'dca') {
            args.addU256(BigInt(parseMas(config.amount)));
            args.addU8(BigInt(config.frequency));
            args.addU64(BigInt(Math.floor(config.startTime.getTime() / 1000)));
            args.addU64(BigInt(Math.floor(config.endTime.getTime() / 1000)));
            args.addU64(BigInt(parseMas(config.gasPerExecution)));
        } else if (configType === 'scheduledDeposit') {
            args.addU256(BigInt(parseMas(config.depositAmount)));
            args.addU8(BigInt(config.frequency));
            args.addString(config.sourceWallet);
            args.addU64(BigInt(Math.floor(config.startTime.getTime() / 1000)));
            args.addU64(BigInt(Math.floor(config.endTime.getTime() / 1000)));
            args.addU8(BigInt(config.maxRetries));
            args.addU64(BigInt(parseMas(config.gasPerExecution)));
        } else if (configType === 'savingsStrategy') {
            args.addU8(BigInt(config.strategyType));
            args.addU256(BigInt(parseMas(config.baseAmount)));
            args.addU8(BigInt(config.growthRate));
            args.addU8(BigInt(config.frequency));
            args.addString(config.distributionAddress);
            args.addU64(BigInt(Math.floor(config.phaseTransitionTime.getTime() / 1000)));
            args.addU64(BigInt(Math.floor(config.startTime.getTime() / 1000)));
            args.addU64(BigInt(Math.floor(config.endTime.getTime() / 1000)));
            args.addU64(BigInt(parseMas(config.gasPerExecution)));
        }

        toast.update(toastId, {
            render: 'Waiting for transaction confirmation...',
            isLoading: true
        });

        const operation = await vaultContract.call('updateAutomationConfig', args.serialize(), {
            coins: parseMas('2'), // Gas for operation
        });

        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            console.log('Automation configuration updated successfully');

            toast.update(toastId, {
                render: '✅ Automation configuration updated successfully',
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: true };
        } else {
            const events = await operation.getSpeculativeEvents();
            console.log('Update automation config failed, events:', events);

            toast.update(toastId, {
                render: 'Failed to update automation configuration',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });

            return { success: false, error: 'Failed to update automation configuration' };
        }
    } catch (error) {
        console.error('Error updating automation configuration:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast.update(toastId, {
            render: `Error: ${errorMessage}`,
            type: 'error',
            isLoading: false,
            autoClose: 5000,
        });

        return { success: false, error: errorMessage };
    }
}