import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

export class Token implements Serializable {
  constructor(
    public address: Address = new Address(),
    public balance: u256 = u256.Zero,
    public percentage: u64 = u64(0),
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.address)
      .add(this.balance)
      .add(this.percentage)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.address = new Address(
      args.nextString().expect('token address expected'),
    );
    this.balance = args.nextU256().expect('token balance expected');
    this.percentage = args.nextU64().expect('token percentage expected');

    return new Result(args.offset);
  }
}

export class TokenWithPercentage implements Serializable {
  constructor(
    public address: Address = new Address(),
    public percentage: u64 = u64(0),
  ) {}

  serialize(): StaticArray<u8> {
    return new Args().add(this.address).add(this.percentage).serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.address = new Address(
      args.nextString().expect('token address expected'),
    );
    this.percentage = args.nextU64().expect('token percentage expected');

    return new Result(args.offset);
  }
}
