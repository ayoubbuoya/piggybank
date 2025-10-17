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

console.log('Deploying contract...');

const byteCode = getScByteCode('build', 'factory.wasm');

const constructorArgs = new Args().addString(
  'AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo', // EagleFi Swap Router Address
);

const contract = await SmartContract.deploy(
  provider,
  byteCode,
  constructorArgs,
  {
    coins: Mas.fromString('50'), // Fund the factory with 50 MAS for auto-deposit operations
    maxGas: 3_900_000_000n, // Manual gas limit to bypass estimation (below MAX_GAS_EXECUTE)
  },
);

console.log('Factory Contract deployed at:', contract.address);

const events = await provider.getEvents({
  smartContractAddress: contract.address,
});

for (const event of events) {
  console.log('Event message:', event.data);
}
