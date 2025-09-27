import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3';

export class TokenWithPercentage implements Serializable<TokenWithPercentage> {
  constructor(public address: string = '', public percentage: bigint = 0n) {}

  serialize(): Uint8Array {
    const args = new Args()
      .addString(this.address)
      .addU64(this.percentage)
      .serialize();

    return new Uint8Array(args);
  }

  deserialize(
    data: Uint8Array,
    offset: number,
  ): DeserializedResult<TokenWithPercentage> {
    const args = new Args(data, offset);

    this.address = args.nextString();
    this.percentage = args.nextU64();

    return { instance: this, offset: args.getOffset() };
  }

  toString(): string {
    return `TokenWithPercentage { address: ${this.address}, percentage: ${this.percentage} }`;
  }
}
