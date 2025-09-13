import {
  Address,
  Context,
  generateEvent,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import { IMRC20 } from '../interfaces/IMRC20';
import { u256 } from 'as-bignum/assembly';
import { IWMAS } from '@massalabs/sc-standards/assembly/contracts/MRC20/IWMAS';
import { SafeMath256 } from './safeMath';

export function _computeMintStorageCost(receiver: Address): u64 {
  const STORAGE_BYTE_COST = 100_000;
  const STORAGE_PREFIX_LENGTH = 4;
  const BALANCE_KEY_PREFIX_LENGTH = 7;

  const baseLength = STORAGE_PREFIX_LENGTH;
  const keyLength = BALANCE_KEY_PREFIX_LENGTH + receiver.toString().length;
  const valueLength = 4 * sizeof<u64>();
  return (baseLength + keyLength + valueLength) * STORAGE_BYTE_COST;
}

export function getTokenBalance(address: Address): u256 {
  const token = new IMRC20(address);
  return token.balanceOf(Context.callee());
}

/**
 * Wraps a specified amount of MAS coins into WMAS tokens.
 *
 * @param amount - The amount of MAS coins to be wrapped into WMAS tokens.
 * @param wmasAddress - The address of the WMAS token contract.
 * @throws Will throw an error if the transferred MAS coins are insufficient.
 */
export function wrapMasToWMAS(amount: u256, wmasAddress: Address): void {
  // Get the transferred coins from the operation
  const transferredCoins = Context.transferredCoins();

  // Get the wmas contract instance
  const wmasToken = new IWMAS(wmasAddress);

  const mintStorageCost = u256.fromU64(
    _computeMintStorageCost(Context.callee()),
  );

  const amountToWrap = SafeMath256.add(amount, mintStorageCost);

  // Ensure that transferred coins are greater than or equal to the amount to wrap
  assert(
    u256.fromU64(transferredCoins) >= amountToWrap,
    'INSUFFICIENT MAS COINS TRANSFERRED',
  );

  // Wrap MAS coins into WMAS
  wmasToken.deposit(amountToWrap.toU64());

  // Generate an event to indicate that MAS coins have been wrapped into WMAS
  generateEvent(`WRAP_MAS: ${amount.toString()} of MAS wrapped into WMAS`);
}
