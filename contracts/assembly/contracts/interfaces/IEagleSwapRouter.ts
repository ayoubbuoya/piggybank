import { Args, bytesToU256 } from '@massalabs/as-types';
import { Address, call } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';
import { SwapPath } from '../structs/eaglefi/swapPath';

export class IEagleSwapRouter {
  _origin: Address;

  constructor(origin: Address) {
    this._origin = origin;
  }

  swap(
    swapPathArray: SwapPath[],
    coinsOnEachSwap: u64,
    deadline: u64,
    coins: u64 = 0,
  ): u256 {
    const args = new Args()
      .addSerializableObjectArray(swapPathArray)
      .add(coinsOnEachSwap)
      .add(deadline);
    const res = call(this._origin, 'swap', args, coins);
    return bytesToU256(res);
  }
}
