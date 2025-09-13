// The entry file of your WebAssembly module.
import {
  Address,
  Context,
  generateEvent,
  Storage,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { TokenWithPercentage } from './structs/token';
import { _setOwner } from './lib/ownership-internal';
import { PersistentMap } from '@massalabs/massa-as-sdk/assembly/collections';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { wrapMasToWMAS } from './lib/wrapping';
import { WMAS_TOKEN_ADDRESS } from './storage';
import { IMRC20 } from './interfaces/IMRC20';
import { getBalanceEntryCost } from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20-external';

const tokensPercentagesMap = new PersistentMap<String, u64>('tpm');

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

  const tokenWithPercentage = args
    .nextSerializableObjectArray<TokenWithPercentage>()
    .expect('token with percentage expected');

  const vaultCreatorAddress = args
    .nextString()
    .expect('vault creator address expected');

  // Store the tokens and their percentages in the persistent map
  for (let i = 0; i < tokenWithPercentage.length; i++) {
    const token = tokenWithPercentage[i];
    tokensPercentagesMap.set(token.address.toString(), token.percentage);
  }

  // Set the contract owner to the vault creator address
  _setOwner(vaultCreatorAddress);

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

export function deposit(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const amount = args.nextU256().expect('amount expected');
  const isNative = args.nextBool().expect('isNative expected');

  const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));

  // If isNative is true, Wrap the native token (MAS) into WMAS
  if (isNative) {
    wrapMasToWMAS(amount, new Address(WMAS_TOKEN_ADDRESS));
  } else {
    // Transfer the tokens from the sender to this contract

    wmasToken.transferFrom(
      Context.caller(),
      Context.callee(),
      amount,
      getBalanceEntryCost(WMAS_TOKEN_ADDRESS, Context.callee().toString()),
    );
  }

  // TODO: Distribute the  WMAS amount to the tokens according to their percentages

  // End Reentrancy Guard
  ReentrancyGuard.endNonReentrant();
}
