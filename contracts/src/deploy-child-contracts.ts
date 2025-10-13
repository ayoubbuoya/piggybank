import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    SmartContract,
    JsonRpcProvider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';
import * as fs from 'fs';
import * as path from 'path';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('='.repeat(60));
console.log('STEP 1: Deploying Child Contracts');
console.log('='.repeat(60));

// Deploy Splitter Contract
console.log('\n1. Deploying Splitter Contract...');
const splitterByteCode = getScByteCode('build', 'splitter.wasm');

// Splitter constructor: tokens array, swap router, initial coins
const splitterArgs = new Args()
    .addSerializableObjectArray([]) // Empty tokens array
    .addString('AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo') // EagleFi router
    .addU64(0n); // No initial coins

const splitterContract = await SmartContract.deploy(
    provider,
    splitterByteCode,
    splitterArgs,
    {
        coins: Mas.fromString('0.1'),
    },
);

console.log('✅ Splitter Contract deployed at:', splitterContract.address);

// Deploy Automated Splitter Contract
console.log('\n2. Deploying Automated Splitter Contract...');
const automatedSplitterByteCode = getScByteCode('build', 'automated-splitter.wasm');

// Automated splitter constructor: tokens array, swap router, automation configs, initial coins
const automatedSplitterArgs = new Args()
    .addSerializableObjectArray([]) // Empty tokens array
    .addString('AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo') // EagleFi router
    // DCA config (disabled)
    .addBool(false)
    .addU256(0n)
    .addU8(0n)
    .addU64(0n)
    .addU64(0n)
    .addU64(0n)
    // Scheduled deposit config (disabled)
    .addBool(false)
    .addU256(0n)
    .addU8(0n)
    .addString('')
    .addU64(0n)
    .addU64(0n)
    .addU8(0n)
    .addU64(0n)
    // Savings strategy config (disabled)
    .addBool(false)
    .addU8(0n)
    .addU256(0n)
    .addU8(0n)
    .addU8(0n)
    .addString('')
    .addU64(0n)
    .addU64(0n)
    .addU64(0n)
    .addU64(0n)
    // Initial gas reserve
    .addU64(0n)
    // Initial coins
    .addU64(0n);

const automatedSplitterContract = await SmartContract.deploy(
    provider,
    automatedSplitterByteCode,
    automatedSplitterArgs,
    {
        coins: Mas.fromString('0.1'),
    },
);

console.log('✅ Automated Splitter Contract deployed at:', automatedSplitterContract.address);

// Save addresses to a file
const addresses = {
    splitterTemplate: splitterContract.address,
    automatedSplitterTemplate: automatedSplitterContract.address,
    network: 'buildnet',
    deployedAt: new Date().toISOString(),
};

const addressesPath = path.join(process.cwd(), 'deployed-templates.json');
fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

console.log('\n' + '='.repeat(60));
console.log('Child Contracts Deployed Successfully!');
console.log('='.repeat(60));
console.log('\nAddresses saved to: deployed-templates.json');
console.log('\nNext step: Run "npm run deploy:factory" to deploy the factory');
console.log('The factory will use these template addresses to create vaults.');
