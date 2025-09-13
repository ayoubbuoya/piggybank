import { Address, call } from '@massalabs/massa-as-sdk';
import { TokenWithPercentage } from '../structs/token';
import { u256 } from 'as-bignum/assembly';
import { Args } from '@massalabs/as-types';

export class ISplitter {
  _origin: Address;

  constructor(origin: Address) {
    this._origin = origin;
  }

  init(
    tokensWithPercentage: TokenWithPercentage[],
    vaultCreatorAddress: Address,
    coins: u64 = 0,
  ): void {
    const args = new Args();

    args.addSerializableObjectArray(tokensWithPercentage);
    args.add(vaultCreatorAddress);

    call(this._origin, 'constructor', args, coins);
  }

  deposit(amount: u256, isNative: bool, coins: u64 = 0): void {
    const args = new Args();

    args.add(amount);
    args.add(isNative);

    call(this._origin, 'deposit', args, coins);
  }
}
