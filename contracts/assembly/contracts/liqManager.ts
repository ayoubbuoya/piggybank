import {
  Args,
  bytesToU64,
  stringToBytes,
  u64ToBytes,
  u8toByte,
} from '@massalabs/as-types';
import {
  Address,
  Context,
  createEvent,
  generateEvent,
  Storage,
} from '@massalabs/massa-as-sdk';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { _setOwner } from './lib/ownership-internal';
import { IDusaPair } from './interfaces/IDusaPair';
import { IMRC20 } from './interfaces/IMRC20';
import { u256 } from 'as-bignum/assembly';
import { PairInformation } from './structs/dusa/PairInfo';
import { LiquidityParameters } from './structs/dusa/LiquidityParameters';
import { SafeMath256 } from './lib/safeMath';
import { PRECISION } from './lib/constants';
import { arrayToString } from './lib/utils';
import { FeeParameters } from './structs/dusa/FeeParameters';

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

  // Get token bin step
  const feeParameters: FeeParameters = pair.feeParameters();

  const binStep: u64 = feeParameters.binStep;

  // Set Owner of the contract
  _setOwner(Context.caller().toString());

  // Store the pair address
  Storage.set(PAIR_ADDRESS_KEY, pairAddress);

  // Store the pair bin step
  Storage.set(PAIR_BIN_STEP_KEY, u64ToBytes(binStep));

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

export function addLiquidity(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  // Amount of bins to add liquidity to on each side of the current bin
  const binsRange: u64 = args.nextU64().expect('binsRange argument is missing');
  const amountX = args.nextU256().expect('amountX argument is missing');
  const amountY = args.nextU256().expect('amountY argument is missing');

  const pairAddress = Storage.get(PAIR_ADDRESS_KEY);

  const pair = new IDusaPair(new Address(pairAddress));

  const pairInfo: PairInformation = pair.getPairInformation();

  const activeBinId: u32 = pairInfo.activeId;

  let deltaIds: i64[] = new Array<i64>();
  let distributionsX: u256[] = new Array<u256>();
  let distributionsY: u256[] = new Array<u256>();

  // Calculate each bin disribtuion percentage
  const eachBinDistributionPercentage: u256 = SafeMath256.div(
    PRECISION,
    u256.fromU64(binsRange),
  );

  // Construct deltaIds by pushing the positive and negative values of each bin
  for (let i: u64 = 1; i < binsRange; i++) {
    // Loop for negative deltas
    deltaIds.push(-i64(i));
    // Add distribution for negative delta
    distributionsY.push(eachBinDistributionPercentage);
    // Add distribution for positive delta
    distributionsX.push(u256.Zero);
  }

  deltaIds.push(0);
  distributionsX.push(eachBinDistributionPercentage);
  distributionsY.push(eachBinDistributionPercentage);

  for (let i: u64 = 1; i < binsRange; i++) {
    // Loop for positive deltas
    deltaIds.push(i);
    // Add distribution for positive delta
    distributionsX.push(eachBinDistributionPercentage);
    // Add distribution for negative delta
    distributionsY.push(u256.Zero);
  }

  assert(
    distributionsX.length == deltaIds.length,
    'distributionsX and deltaIds length mismatch',
  );

  assert(
    distributionsY.length == deltaIds.length,
    'distributionsY and deltaIds length mismatch',
  );

  // Log distributions and deltaIds

  generateEvent(
    createEvent('DISTRIBUTIONS_AND_DELTAS', [
      arrayToString(distributionsX),
      arrayToString(distributionsY),
      deltaIds.toString(),
    ]),
  );

  // Get pair tokens and bin step
  const tokenX: IMRC20 = pair.getTokenX();
  const tokenY: IMRC20 = pair.getTokenY();
  const binStep: u64 = bytesToU64(Storage.get(PAIR_BIN_STEP_KEY));

  const currentContractAddress = Context.callee();

  // Construct liq parameter
  const liqParams = new LiquidityParameters(
    tokenX,
    tokenY,
    binStep,
    amountX,
    amountY,
    u256.Zero,
    u256.Zero,
    activeBinId,
    5,
    deltaIds,
    distributionsX,
    distributionsY,
    currentContractAddress,
    u64.MAX_VALUE,
  );


  

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
