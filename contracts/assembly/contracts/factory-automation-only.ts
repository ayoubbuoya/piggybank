// AUTOMATION-ONLY FACTORY
// This factory ONLY creates automated vaults
// Use this alongside the basic factory for a two-factory setup

import {
    Address,
    Context,
    createEvent,
    createSC,
    fileToByteArray,
    generateEvent,
    Storage,
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
    DCAConfig,
    ScheduledDepositConfig,
    SavingsStrategyConfig,
} from './structs/automation-config';

const tokensPoolsMap = new PersistentMap<string, string>('tpools');
const EAGLE_SWAP_ROUTER_ADDRESS = 'ESAPR';

export function constructor(binaryArgs: StaticArray<u8>): void {
    assert(Context.isDeployingContract());

    const args = new Args(binaryArgs);
    const swapRouterAddress = args
        .nextString()
        .expect('swap router address expected');

    Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, swapRouterAddress);

    tokensPoolsMap.set(
        USDC_TOKEN_ADDRESS,
        'AS1p6ULD2dWxJ7G1U3D3dX95jHwgfXieRnLFRNRr4Hfq7XvA1qZf',
    );

    tokensPoolsMap.set(
        WETH_TOKEN_ADDRESS,
        'AS184uE7Eq11Sg3KeQBD7jV9DkC75T3U5P6UEU1WEEZ7FHiesjsh',
    );

    _setOwner(Context.caller().toString());
    ReentrancyGuard.__ReentrancyGuard_init();
}

/**
 * Create an automated vault with DCA, scheduled deposits, and/or savings strategies
 */
export function createAutomatedVault(binaryArgs: StaticArray<u8>): void {
    ReentrancyGuard.nonReentrant();

    const args = new Args(binaryArgs);
    const tokensWithPercentage = args
        .nextSerializableObjectArray<TokenWithPercentage>()
        .expect('tokens with percentage expected');
    const initCoins = args.nextU64().expect('Vault initial coins expected');

    const enableDCA = args.nextBool().expect('enableDCA flag expected');
    const dcaConfig = args
        .nextSerializable<DCAConfig>()
        .expect('DCA config expected');

    const enableScheduledDeposits = args
        .nextBool()
        .expect('enableScheduledDeposits flag expected');
    const scheduledDepositConfig = args
        .nextSerializable<ScheduledDepositConfig>()
        .expect('Scheduled deposit config expected');

    const enableSavingsStrategy = args
        .nextBool()
        .expect('enableSavingsStrategy flag expected');
    const savingsStrategyConfig = args
        .nextSerializable<SavingsStrategyConfig>()
        .expect('Savings strategy config expected');

    const initialGasReserve = args
        .nextU64()
        .expect('initialGasReserve expected');

    const caller = Context.caller();

    // Deploy automated-splitter bytecode
    const automatedSplitterByteCode: StaticArray<u8> = fileToByteArray(
        'build/automated-splitter.wasm',
    );

    const vaultAddress = createSC(automatedSplitterByteCode);
    const automatedSplitterContract = new IAutomatedSplitter(vaultAddress);

    automatedSplitterContract.init(
        tokensWithPercentage,
        caller,
        enableDCA,
        dcaConfig,
        enableScheduledDeposits,
        scheduledDepositConfig,
        enableSavingsStrategy,
        savingsStrategyConfig,
        initialGasReserve,
        initCoins,
    );

    const userVaultKey = generateSplitterUserKey(
        caller.toString(),
        vaultAddress.toString(),
    );
    Storage.set(userVaultKey, '1');

    generateEvent(
        createEvent('CREATE_AUTOMATED_VAULT', [
            vaultAddress.toString(),
            caller.toString(),
            enableDCA.toString(),
            enableScheduledDeposits.toString(),
            enableSavingsStrategy.toString(),
            initialGasReserve.toString(),
        ]),
    );

    ReentrancyGuard.endNonReentrant();
}

export function getTokenPoolAddress(
    binaryArgs: StaticArray<u8>,
): StaticArray<u8> {
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
    generateEvent(
        'Token pool address set: ' +
        tokenAddress +
        ' -> ' +
        poolAddress +
        ' by ' +
        Context.caller().toString(),
    );
}

export function setEagleSwapRouterAddress(binaryArgs: StaticArray<u8>): void {
    onlyOwner();
    const args = new Args(binaryArgs);
    const routerAddress = args.nextString().expect('router address expected');
    Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, routerAddress);
    generateEvent(
        'EagleFi Swap Router address set to: ' +
        routerAddress +
        ' by ' +
        Context.caller().toString(),
    );
}

export function getEagleSwapRouterAddress(): StaticArray<u8> {
    const address = Storage.get(EAGLE_SWAP_ROUTER_ADDRESS);
    assert(address != null, 'SWAP_ROUTER_NOT_SET');
    return stringToBytes(address);
}
