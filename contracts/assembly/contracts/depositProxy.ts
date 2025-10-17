import { Args } from '@massalabs/as-types';
import { Address, call, Context } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

/**
 * Simple proxy contract that forwards deposit calls to vaults
 * This allows the factory to deposit without triggering isFromFactory=true
 */
export function proxyDeposit(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);

    const vaultAddress = args.nextString().expect('vault address expected');
    const amount = args.nextU256().expect('amount expected');
    const coinsToUse = args.nextU64().expect('coinsToUse expected');
    const deadline = args.nextU64().expect('deadline expected');

    // Forward the call to the vault
    // The vault will see THIS proxy as the caller, not the factory
    // So isFromFactory will be false and it will do normal transferFrom flow
    const depositArgs = new Args()
        .add(amount)
        .add(coinsToUse)
        .add(deadline);

    // Forward all received coins to the vault
    const coins = Context.transferredCoins();

    call(new Address(vaultAddress), 'deposit', depositArgs, coins);
}
