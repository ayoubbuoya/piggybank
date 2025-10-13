// LITE AUTOMATION FACTORY - Optimized for deployment
// Features: Scheduled Deposits + Savings Strategy (NO DCA to reduce size)

import {
    Address,
    Context,
    createEvent,
    createSC,
    fileToByteArray,
    generateEvent,
    Storage,
    call,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { _setOwner } from './lib/ownership-internal';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { TokenWithPercentage } from './structs/token';
import {
    USDC_TOKEN_ADDRESS,
    WETH_TOKEN_ADDRESS,
} from './storage';
import { IAutomatedSplitter } from './interfaces/IAutomatedSplitter';
import { PersistentMap } from '@massalabs/massa-as-sdk/assembly/collections';
import { onlyOwner } from './lib/ownership';
import { generateSplitterUserKey } from './lib/utils';
import {
    ScheduledDepositConfig,
    SavingsStrategyConfig,
} from './structs/automation-config';

const tokensPoolsMap = new PersistentMap<string, string>('tpools');
const EAGLE_SWAP_ROUTER_ADDRESS = 'ESAPR';

export function constructor(binaryArgs: StaticArray<u8>): void {
    assert(Context.isDeployingContract());
    const args = new Args(binaryArgs);
    const swapRouterAddress = args.nextString().expect('swap router address expected');
    Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, swapRouterAddress);
    tokensPoolsMap.set(USDC_TOKEN_ADDRESS, 'AS1p6ULD2dWxJ7G1U3D3dX95jHwgfXieRnLFRNRr4Hfq7XvA1qZf');
    tokensPoolsMap.set(WETH_TOKEN_ADDRESS, 'AS184uE7Eq11Sg3KeQBD7jV9DkC75T3U5P6UEU1WEEZ7FHiesjsh');
    _setOwner(Context.caller().toString());
    ReentrancyGuard.__ReentrancyGuard_init();
}

/**
 * Create automated vault - LITE VERSION (No DCA)
 * Supports: Scheduled Deposits + Savings Strategy
 */
export function createAutomatedVault(binaryArgs: StaticArray<u8>): void {
    ReentrancyGuard.nonReentrant();
    const args = new Args(binaryArgs);

    const tokensWithPercentage = args
        .nextSerializableObjectArray<TokenWithPercentage>()
        .expect('tokens expected');
    const initCoins = args.nextU64().expect('coins expected');

    // Skip DCA config (not supported in lite version)
    const enableDCA = args.nextBool().expect('enableDCA expected');
    if (enableDCA) {
        // Skip DCA config parameters
        args.nextU256(); // amount
        args.nextU8();   // frequency
        args.nextU64();  // startTime
        args.nextU64();  // endTime
        args.nextU64();  // gasPerExecution
    }

    const enableScheduledDeposits = args.nextBool().expect('enableScheduledDeposits expected');

    // Read scheduled deposit config parameters individually
    const sdDepositAmount = args.nextU256().expect('sd depositAmount expected');
    const sdFrequency = args.nextU8().expect('sd frequency expected');
    const sdSourceWallet = args.nextString().expect('sd sourceWallet expected');
    const sdStartTime = args.nextU64().expect('sd startTime expected');
    const sdEndTime = args.nextU64().expect('sd endTime expected');
    const sdMaxRetries = args.nextU8().expect('sd maxRetries expected');
    const sdGasPerExecution = args.nextU64().expect('sd gasPerExecution expected');

    const enableSavingsStrategy = args.nextBool().expect('enableSavingsStrategy expected');

    // Read savings strategy config parameters individually
    const svStrategyType = args.nextU8().expect('sv strategyType expected');
    const svBaseAmount = args.nextU256().expect('sv baseAmount expected');
    const svGrowthRate = args.nextU8().expect('sv growthRate expected');
    const svFrequency = args.nextU8().expect('sv frequency expected');
    const svDistributionAddress = args.nextString().expect('sv distributionAddress expected');
    const svPhaseTransitionTime = args.nextU64().expect('sv phaseTransitionTime expected');
    const svStartTime = args.nextU64().expect('sv startTime expected');
    const svEndTime = args.nextU64().expect('sv endTime expected');
    const svGasPerExecution = args.nextU64().expect('sv gasPerExecution expected');

    const initialGasReserve = args.nextU64().expect('initialGasReserve expected');
    const caller = Context.caller();

    // Deploy automated-splitter-lite bytecode
    const automatedSplitterByteCode: StaticArray<u8> = fileToByteArray(
        'build/automated-splitter-lite.wasm',
    );

    // Deploy the contract
    const vaultAddress = createSC(automatedSplitterByteCode);

    // Create interface instance
    const automatedSplitterContract = new IAutomatedSplitter(vaultAddress);

    // Call init through interface with all individual parameters
    automatedSplitterContract.initLite(
        tokensWithPercentage,
        caller,
        enableScheduledDeposits,
        sdDepositAmount,
        sdFrequency,
        sdSourceWallet,
        sdStartTime,
        sdEndTime,
        sdMaxRetries,
        sdGasPerExecution,
        enableSavingsStrategy,
        svStrategyType,
        svBaseAmount,
        svGrowthRate,
        svFrequency,
        svDistributionAddress,
        svPhaseTransitionTime,
        svStartTime,
        svEndTime,
        svGasPerExecution,
        initialGasReserve,
        initCoins
    );

    const userVaultKey = generateSplitterUserKey(caller.toString(), vaultAddress.toString());
    Storage.set(userVaultKey, '1');

    generateEvent(
        createEvent('CREATE_AUTOMATED_VAULT', [
            vaultAddress.toString(),
            caller.toString(),
            'false', // DCA disabled
            enableScheduledDeposits.toString(),
            enableSavingsStrategy.toString(),
            initialGasReserve.toString(),
        ]),
    );

    ReentrancyGuard.endNonReentrant();
}

export function getTokenPoolAddress(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const tokenAddress = args.nextString().expect('token address expected');
    const pool = tokensPoolsMap.get(tokenAddress, null);
    return pool ? stringToBytes(pool) : stringToBytes('');
}

export function setTokenPoolAddress(binaryArgs: StaticArray<u8>): void {
    onlyOwner();
    const args = new Args(binaryArgs);
    const tokenAddress = args.nextString().expect('token address expected');
    const poolAddress = args.nextString().expect('pool address expected');
    tokensPoolsMap.set(tokenAddress, poolAddress);
    generateEvent('Token pool set: ' + tokenAddress + ' -> ' + poolAddress);
}

export function setEagleSwapRouterAddress(binaryArgs: StaticArray<u8>): void {
    onlyOwner();
    const args = new Args(binaryArgs);
    const routerAddress = args.nextString().expect('router address expected');
    Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, routerAddress);
    generateEvent('Router set: ' + routerAddress);
}

export function getEagleSwapRouterAddress(): StaticArray<u8> {
    const address = Storage.get(EAGLE_SWAP_ROUTER_ADDRESS);
    assert(address != null, 'SWAP_ROUTER_NOT_SET');
    return stringToBytes(address);
}
