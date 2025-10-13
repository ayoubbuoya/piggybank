import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    SmartContract,
    JsonRpcProvider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Deploying simple splitter contract for testing...');

// Deploy a simple splitter directly (not through factory)
const byteCode = getScByteCode('build', 'splitter.wasm');

// Splitter constructor args: tokens array, swap router, initial coins
const constructorArgs = new Args()
    .addSerializableObjectArray([]) // Empty tokens array for now
    .addString('AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo') // EagleFi router
    .addU64(0n); // No initial coins

const contract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    {
        coins: Mas.fromString('0.1'),
    },
);

console.log('Simple Splitter Contract deployed at:', contract.address);
console.log('\nYou can use this address for testing the frontend.');
console.log('Note: This is a simple splitter without automation features.');

const events = await provider.getEvents({
    smartContractAddress: contract.address,
});

for (const event of events) {
    console.log('Event message:', event.data);
}
