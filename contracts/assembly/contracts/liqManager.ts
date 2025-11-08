import { Args, stringToBytes, u64ToBytes, u8toByte } from '@massalabs/as-types';
import { Address, Context, Storage } from '@massalabs/massa-as-sdk';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { _setOwner } from './lib/ownership-internal';
import { IDusaPair } from './interfaces/IDusaPair';
import { IMRC20 } from './interfaces/IMRC20';

// Storage Keys
export const PAIR_ADDRESS_KEY = 'pa';
export const PAIR_BIN_STEP_KEY: StaticArray<u8> = stringToBytes('pbs');
export const PAIR_TOKEN_X_KEY = 'ptx';
export const PAIR_TOKEN_Y_KEY = 'pty';
export const PAIR_TOKEN_X_DECIMALS_KEY: StaticArray<u8> = stringToBytes('ptxd');
export const PAIR_TOKEN_Y_DECIMALS_KEY: StaticArray<u8> = stringToBytes('ptyd');
export const INTERVALS_MS_KEY: StaticArray<u8> = stringToBytes('ims');

export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract());

  const args = new Args(binaryArgs);

  const pairAddress = args
    .nextString()
    .expect('pairAddress argument is missing');

  const intervalsMs = args.nextU64().expect('intervalsMs argument is missing');

  // Get Pair X and Y tokens
  const pair = new IDusaPair(new Address(pairAddress));

  const tokenX: IMRC20 = pair.getTokenX();
  const tokenY: IMRC20 = pair.getTokenY();

  // Get Pair X and Y tokens decimals
  const tokenXDecimals = tokenX.decimals();
  const tokenYDecimals = tokenY.decimals();

  // Set Owner of the contract
  _setOwner(Context.caller().toString());

  // Store the pair address
  Storage.set(PAIR_ADDRESS_KEY, pairAddress);

  // Store the pair tokens
  Storage.set(PAIR_TOKEN_X_KEY, tokenX._origin.toString());
  Storage.set(PAIR_TOKEN_Y_KEY, tokenY._origin.toString());

  // Store the pair tokens decimals
  Storage.set(PAIR_TOKEN_X_DECIMALS_KEY, u8toByte(tokenXDecimals));
  Storage.set(PAIR_TOKEN_Y_DECIMALS_KEY, u8toByte(tokenYDecimals));

  // Store the intervals in milliseconds
  Storage.set(INTERVALS_MS_KEY, u64ToBytes(intervalsMs));

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

export function deposit(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const amountX = args.nextU256().expect('amountX argument is missing');
  const amountY = args.nextU256().expect('amountY argument is missing');

  // End the non-reentrant block
  ReentrancyGuard.endNonReentrant();
}

/////////////////////// Getters ///////////////////////

export function getPairAddress(): StaticArray<u8> {
  return stringToBytes(Storage.get(PAIR_ADDRESS_KEY));
}

export function getIntervalsMs(): StaticArray<u8> {
  return Storage.get(INTERVALS_MS_KEY);
}

export function getTokenXAddress(): StaticArray<u8> {
  return stringToBytes(Storage.get(PAIR_TOKEN_X_KEY));
}

export function getTokenYAddress(): StaticArray<u8> {
  return stringToBytes(Storage.get(PAIR_TOKEN_Y_KEY));
}

export function getTokenXDecimals(): u8 {
  const bytes = Storage.get(PAIR_TOKEN_X_DECIMALS_KEY);
  return bytes[0];
}

export function getTokenYDecimals(): u8 {
  const bytes = Storage.get(PAIR_TOKEN_Y_DECIMALS_KEY);
  return bytes[0];
}
