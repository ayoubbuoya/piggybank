import {
  Address,
  Context,
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

// Mapping from token address to its corresponding eaglefi pool address
const tokensPoolsMap = new PersistentMap<string, string>('tpools');
// Storage key for eaglefi swap router address
const EAGLE_SWAP_ROUTER_ADDRESS = 'ESAPR';

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract());

  const args = new Args(binaryArgs);

  const swapRouterAddress = args
    .nextString()
    .expect('swap router address expected');

  // Set the eaglefi swap router address
  Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, swapRouterAddress);

  // Set default tokens pools of eaglefi
  tokensPoolsMap.set(
    USDC_TOKEN_ADDRESS,
    'AS1p6ULD2dWxJ7G1U3D3dX95jHwgfXieRnLFRNRr4Hfq7XvA1qZf', // USDC/WMAS pool
  );

  tokensPoolsMap.set(
    WETH_TOKEN_ADDRESS,
    'AS184uE7Eq11Sg3KeQBD7jV9DkC75T3U5P6UEU1WEEZ7FHiesjsh', // WETH/WMAS pool
  );

  // Set the contract owner
  _setOwner(Context.caller().toString());

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

/**
 * Create a splitter vault that will split the deposited amount between the provided tokens according to their percentage.
 * @param binaryArgs - Arguments serialized with Args
 * - tokensWithPercentage: TokenWithPercentage[]
 */
export function createSplitterVault(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const tokensWithPercentage = args
    .nextSerializableObjectArray<TokenWithPercentage>()
    .expect('tokens with percentage expected');

  const initCoins = args.nextU64().expect('Splitter initial coins expected');

  const splitterVaultByteCode: StaticArray<u8> = fileToByteArray(
    'build/splitter.wasm',
  );

  const vaultAddress = createSC(splitterVaultByteCode);

  // Call the constructor of the splitter contract
  const splitterContract = new ISplitter(vaultAddress);

  splitterContract.init(tokensWithPercentage, Context.caller(), initCoins);

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
  // Only the owner can set the token pool address
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
  // Only the owner can set the eaglefi swap router address
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
