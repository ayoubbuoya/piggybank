import { Address, call } from '@massalabs/massa-as-sdk';
import { TokenWithPercentage } from '../structs/token';
import { Args } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';
import {
    DCAConfig,
    ScheduledDepositConfig,
    SavingsStrategyConfig,
} from '../structs/automation-config';

/**
 * Interface for interacting with automated splitter vaults
 * 
 * Provides methods to initialize automated vaults with automation configurations
 */
export class IAutomatedSplitter {
    _origin: Address;

    constructor(origin: Address) {
        this._origin = origin;
    }

    /**
     * Initialize an automated splitter vault
     * 
     * @param tokensWithPercentage - Array of tokens and their allocation percentages
     * @param vaultCreatorAddress - Address of the vault owner
     * @param enableDCA - Whether to enable DCA automation
     * @param dcaConfig - DCA configuration
     * @param enableScheduledDeposits - Whether to enable scheduled deposits
     * @param scheduledDepositConfig - Scheduled deposit configuration
     * @param enableSavingsStrategy - Whether to enable savings strategy
     * @param savingsStrategyConfig - Savings strategy configuration
     * @param initialGasReserve - Initial gas reserve for deferred operations
     * @param coins - Coins to send with the call
     */
    init(
        tokensWithPercentage: TokenWithPercentage[],
        vaultCreatorAddress: Address,
        enableDCA: bool,
        dcaConfig: DCAConfig,
        enableScheduledDeposits: bool,
        scheduledDepositConfig: ScheduledDepositConfig,
        enableSavingsStrategy: bool,
        savingsStrategyConfig: SavingsStrategyConfig,
        initialGasReserve: u64,
        coins: u64 = 0,
    ): void {
        const args = new Args();

        args.addSerializableObjectArray(tokensWithPercentage);
        args.add(vaultCreatorAddress.toString());
        args.add(enableDCA);
        args.add(dcaConfig);
        args.add(enableScheduledDeposits);
        args.add(scheduledDepositConfig);
        args.add(enableSavingsStrategy);
        args.add(savingsStrategyConfig);
        args.add(initialGasReserve);

        call(this._origin, 'constructor', args, coins);
    }

    /**
     * Initialize an automated splitter vault - LITE VERSION (No DCA)
     * For use with optimized automated-splitter-lite contract
     * Sends individual parameters instead of config objects
     */
    initLite(
        tokensWithPercentage: TokenWithPercentage[],
        vaultCreatorAddress: Address,
        enableScheduledDeposits: bool,
        sdDepositAmount: u256,
        sdFrequency: u8,
        sdSourceWallet: string,
        sdStartTime: u64,
        sdEndTime: u64,
        sdMaxRetries: u8,
        sdGasPerExecution: u64,
        enableSavingsStrategy: bool,
        svStrategyType: u8,
        svBaseAmount: u256,
        svGrowthRate: u8,
        svFrequency: u8,
        svDistributionAddress: string,
        svPhaseTransitionTime: u64,
        svStartTime: u64,
        svEndTime: u64,
        svGasPerExecution: u64,
        initialGasReserve: u64,
        coins: u64 = 0,
    ): void {
        const args = new Args();

        args.addSerializableObjectArray(tokensWithPercentage);
        args.add(vaultCreatorAddress.toString());
        args.add(enableScheduledDeposits);
        args.add(sdDepositAmount);
        args.add(sdFrequency);
        args.add(sdSourceWallet);
        args.add(sdStartTime);
        args.add(sdEndTime);
        args.add(sdMaxRetries);
        args.add(sdGasPerExecution);
        args.add(enableSavingsStrategy);
        args.add(svStrategyType);
        args.add(svBaseAmount);
        args.add(svGrowthRate);
        args.add(svFrequency);
        args.add(svDistributionAddress);
        args.add(svPhaseTransitionTime);
        args.add(svStartTime);
        args.add(svEndTime);
        args.add(svGasPerExecution);
        args.add(initialGasReserve);

        call(this._origin, 'constructor', args, coins);
    }
}
