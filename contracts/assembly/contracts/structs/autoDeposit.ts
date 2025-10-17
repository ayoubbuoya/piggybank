import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

/**
 * Auto Deposit Schedule structure
 * Stores configuration for recurring vault deposits
 */
export class AutoDepositSchedule implements Serializable {
  constructor(
    public owner: Address = new Address(),
    public vaultAddress: Address = new Address(),
    public amount: u256 = u256.Zero,
    public intervalSeconds: u64 = u64(0),
    public nextExecutionTime: u64 = u64(0),
    public isActive: bool = false,
    public deferredCallId: string = '',
    public totalDeposits: u64 = u64(0),
    public createdAt: u64 = u64(0),
  ) { }

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.owner)
      .add(this.vaultAddress)
      .add(this.amount)
      .add(this.intervalSeconds)
      .add(this.nextExecutionTime)
      .add(this.isActive)
      .add(this.deferredCallId)
      .add(this.totalDeposits)
      .add(this.createdAt)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.owner = new Address(
      args.nextString().expect('owner address expected'),
    );
    this.vaultAddress = new Address(
      args.nextString().expect('vault address expected'),
    );
    this.amount = args.nextU256().expect('amount expected');
    this.intervalSeconds = args.nextU64().expect('interval expected');
    this.nextExecutionTime = args.nextU64().expect('next execution time expected');
    this.isActive = args.nextBool().expect('isActive expected');
    this.deferredCallId = args.nextString().expect('deferred call id expected');
    this.totalDeposits = args.nextU64().expect('total deposits expected');
    this.createdAt = args.nextU64().expect('created at expected');

    return new Result(args.offset);
  }
}
