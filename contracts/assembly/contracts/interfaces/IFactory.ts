import { Address, call } from '@massalabs/massa-as-sdk';
import { TokenWithPercentage } from '../structs/token';
import { Args, bytesToString } from '@massalabs/as-types';

export class IFactory {
  _origin: Address;

  constructor(origin: Address) {
    this._origin = origin;
  }

  createSplitterVault(
    tokensWithPercentage: TokenWithPercentage[],
    coins: u64 = 0,
  ): void {
    const args = new Args();

    args.addSerializableObjectArray(tokensWithPercentage);

    call(this._origin, 'createSplitterVault', args, coins);
  }

  setTokenPoolAddress(
    tokenAddress: string,
    poolAddress: string,
    coins: u64 = 0,
  ): void {
    const args = new Args();

    args.add(tokenAddress);
    args.add(poolAddress);

    call(this._origin, 'setTokenPoolAddress', args, coins);
  }

  getTokenPoolAddress(tokenAddress: string): string {
    const args = new Args();

    args.add(tokenAddress);

    const result = call(this._origin, 'getTokenPoolAddress', args, 0);

    return bytesToString(result);
  }

  getEagleSwapRouterAddress(): string {
    const args = new Args();

    const result = call(this._origin, 'getEagleSwapRouterAddress', args, 0);

    return bytesToString(result);
  }
}
