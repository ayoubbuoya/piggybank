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

console.log('Deploying splitter template contract...');

const byteCode = getScByteCode('build', 'splitter.wasm');

// Deploy with empty constructor (will be initialized by factory)
const constructorArgs = new Args();

const contract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    {
        coins: Mas.fromString('0.1'),
    },
);

console.log('Splitter Template deployed at:', contract.address);
console.log('Use this address in the factory configuration');
