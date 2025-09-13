import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { Token } from './token';

export class Vault implements Serializable {
  constructor(
    public address: Address = new Address(),
    public tokens: Array<Token> = new Array<Token>(),
    public isActive: bool = true,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.address)
      .addSerializableObjectArray(this.tokens)
      .add(this.isActive)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.address = new Address(
      args.nextString().expect('vault address expected'),
    );
    this.tokens = args
      .nextSerializableObjectArray<Token>()
      .expect('vault tokens expected');
    this.isActive = args.nextBool().expect('vault isActive expected');

    return new Result(args.offset);
  }
}
