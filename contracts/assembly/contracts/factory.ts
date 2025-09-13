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
import { WMAS_TOKEN_ADDRESS } from './storage';
import { ISplitter } from './interfaces/ISplitter';
import { u256 } from 'as-bignum/assembly';
import { PersistentMap } from '@massalabs/massa-as-sdk/assembly/collections';
import { onlyOwner } from './lib/ownership';

// Mapping from token address to its corresponding eaglefi pool address
const tokensPoolsMap = new PersistentMap<string, string>('tpools');

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract());

  // Set the contract owner
  _setOwner(Context.caller().toString());

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

/**
 * Create a splitter vault that will split the deposited amount between the provided tokens according to their percentage.
 * @param binaryArgs - Arguments serialized with Args
 * - tokensWithPercentage: TokenWithPercentage[]
 *  - deposit_amount: u256 - amount to deposit
 *  - isNative: bool - true if the deposit is in native token (MAS), false if it WMAS
 */
export function createSplitterVault(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const tokensWithPercentage = args
    .nextSerializableObjectArray<TokenWithPercentage>()
    .expect('tokens with percentage expected');

  const splitterVaultByteCode: StaticArray<u8> = fileToByteArray(
    'build/splitter.wasm',
  );

  const vaultAddress = createSC(splitterVaultByteCode);

  // Call the constructor of the splitter contract
  const splitterContract = new ISplitter(vaultAddress);

  splitterContract.init(tokensWithPercentage, Context.caller());

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
