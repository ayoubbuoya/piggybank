// This is a simplified factory that only supports basic splitter vaults (no automation)
// Use this for initial deployment and testing

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
import { wrapMasToWMAS } from './lib/wrapping';
import {
    USDC_TOKEN_ADDRESS,
    WETH_TOKEN_ADDRESS,
    WMAS_TOKEN_ADDRESS,
} from './storage';
import { ISplitter } from './interfaces/ISplitter';
import { u256 } from 'as-bignum/assembly';
import { PersistentMap } from '@massalabs/massa-as-sdk/assembly/collections';
import { onlyOwner } from './lib/ownership';
import { generateSplitterUserKey } from './lib/utils';
import { IMRC20 } from './interfaces/IMRC20';
import { getBalanceEntryCost } from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20-external';

// Mapping from token address to its corresponding eaglefi pool address
const tokensPoolsMap = new PersistentMap<string, string>('tpools');
// Storage key for eaglefi swap router address
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

export function createSplitterVault(binaryArgs: StaticArray<u8>): void {
    ReentrancyGuard.nonReentrant();

    const args = new Args(binaryArgs);

    const tokensWithPercentage = args
        .nextSerializableObjectArray<TokenWithPercentage>()
        .expect('tokens with percentage expected');

    const initCoins = args.nextU64().expect('Splitter initial coins expected');

    const caller = Context.caller();

    const splitterVaultByteCode: StaticArray<u8> = fileToByteArray(
        'build/splitter.wasm',
    );

    const vaultAddress = createSC(splitterVaultByteCode);

    const splitterContract = new ISplitter(vaultAddress);

    splitterContract.init(tokensWithPercentage, caller, initCoins);

    const userVaultKey = generateSplitterUserKey(
        caller.toString(),
        vaultAddress.toString(),
    );
    Storage.set(userVaultKey, '1');

    generateEvent(
        createEvent('CREATE_SPLITTER_VAULT', [
            vaultAddress.toString(),
            caller.toString(),
        ]),
    );

    ReentrancyGuard.endNonReentrant();
}

export function createAndDepositSplitterVault(
    binaryArgs: StaticArray<u8>,
): void {
    ReentrancyGuard.nonReentrant();

    const args = new Args(binaryArgs);

    const tokensWithPercentage = args
        .nextSerializableObjectArray<TokenWithPercentage>()
        .expect('tokens with percentage expected');

    const initCoins = args.nextU64().expect('Splitter initial coins expected');
    const depositCoins = args.nextU64().expect('Deposit coins expected');
    const depositAmount = args.nextU256().expect('Deposit amount expected');
    const isNative = args.nextBool().expect('isNative expected');
    const coinsToUse = args.nextU64().expect('coinsToUse expected');
    const deadline = args.nextU64().expect('deadline expected');

    const caller = Context.caller();

    const splitterVaultByteCode: StaticArray<u8> = fileToByteArray(
        'build/splitter.wasm',
    );

    const vaultAddress = createSC(splitterVaultByteCode);

    const splitterContract = new ISplitter(vaultAddress);

    splitterContract.init(tokensWithPercentage, caller, initCoins);

    const userVaultKey = generateSplitterUserKey(
        caller.toString(),
        vaultAddress.toString(),
    );
    Storage.set(userVaultKey, '1');

    generateEvent(
        createEvent('CREATE_SPLITTER_VAULT', [
            vaultAddress.toString(),
            caller.toString(),
        ]),
    );

    const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));

    if (isNative) {
        wrapMasToWMAS(depositAmount, new Address(WMAS_TOKEN_ADDRESS));
        wmasToken.transfer(
            vaultAddress,
            depositAmount,
            getBalanceEntryCost(WMAS_TOKEN_ADDRESS, vaultAddress.toString()),
        );
    } else {
        wmasToken.transferFrom(
            Context.caller(),
            vaultAddress,
            depositAmount,
            getBalanceEntryCost(WMAS_TOKEN_ADDRESS, vaultAddress.toString()),
        );
    }

    splitterContract.deposit(
        depositAmount,
        isNative,
        coinsToUse,
        deadline,
        depositCoins,
    );

    generateEvent(
        createEvent('CREATE_AND_DEPOSIT_SPLITTER_VAULT', [
            vaultAddress.toString(),
            caller.toString(),
            depositAmount.toString(),
            isNative.toString(),
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
