// Template-based Factory - References deployed splitter template
// Much smaller than embedding bytecode!

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
import { ISplitter } from './interfaces/ISplitter';

function generateSplitterUserKey(userAddress: string, vaultAddress: string): StaticArray<u8> {
    return stringToBytes(`splitter_user_${userAddress}_${vaultAddress}`);
}

export function constructor(binaryArgs: StaticArray<u8>): void {
    assert(Context.isDeployingContract());
    const args = new Args(binaryArgs);
    const eagleSwapRouterAddress = args.nextString().expect('EagleSwap router address expected');
    Storage.set(stringToBytes('eagleSwapRouterAddress'), stringToBytes(eagleSwapRouterAddress));
    _setOwner(Context.caller().toString());
    ReentrancyGuard.__ReentrancyGuard_init();
}

/**
 * Create a new splitter vault by cloning the template
 */
export function createSplitterVault(binaryArgs: StaticArray<u8>): void {
    ReentrancyGuard.nonReentrant();
    const args = new Args(binaryArgs);

    const tokensWithPercentage = args
        .nextSerializableObjectArray<TokenWithPercentage>()
        .expect('tokens expected');
    const initCoins = args.nextU64().expect('Splitter initial coins expected');

    const caller = Context.caller();

    // Load the splitter bytecode from file
    const splitterByteCode: StaticArray<u8> = fileToByteArray('build/splitter.wasm');

    // Deploy new splitter instance
    const vaultAddress = createSC(splitterByteCode);

    // Initialize the splitter through interface
    const splitterContract = new ISplitter(vaultAddress);
    splitterContract.init(tokensWithPercentage, caller, initCoins);

    // Store user-vault mapping
    const userVaultKey = generateSplitterUserKey(caller.toString(), vaultAddress.toString());
    Storage.set(userVaultKey, stringToBytes('1'));

    generateEvent(
        createEvent('CREATE_SPLITTER_VAULT', [
            vaultAddress.toString(),
            caller.toString(),
            tokensWithPercentage.length.toString(),
        ]),
    );

    ReentrancyGuard.endNonReentrant();
}

export function getEagleSwapRouterAddress(): StaticArray<u8> {
    return Storage.get(stringToBytes('eagleSwapRouterAddress'));
}
