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
console.log('STEP 2: Deploying Factory Contract');
console.log('='.repeat(60));

// Load template addresses
const addressesPath = path.join(process.cwd(), 'deployed-templates.json');

if (!fs.existsSync(addressesPath)) {
    console.error('\n❌ Error: deployed-templates.json not found!');
    console.error('Please run "npm run deploy:templates" first to deploy child contracts.');
    process.exit(1);
}

const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));

console.log('\nUsing template addresses:');
console.log('  Splitter Template:', addresses.splitterTemplate);
console.log('  Automated Splitter Template:', addresses.automatedSplitterTemplate);

// Deploy Factory Contract
console.log('\nDeploying Factory Contract...');
const factoryByteCode = getScByteCode('build', 'factory.wasm');

const constructorArgs = new Args()
    .addString('AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo') // EagleFi Swap Router
    .addString(addresses.splitterTemplate) // Splitter template address
    .addString(addresses.automatedSplitterTemplate); // Automated splitter template address

const factoryContract = await SmartContract.deploy(
    provider,
    factoryByteCode,
    constructorArgs,
    {
        coins: Mas.fromString('0.1'),
    },
);

console.log('✅ Factory Contract deployed at:', factoryContract.address);

// Update addresses file with factory address
addresses.factory = factoryContract.address;
fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

console.log('\n' + '='.repeat(60));
console.log('Deployment Complete!');
console.log('='.repeat(60));
console.log('\nAll contract addresses:');
console.log('  Factory:', addresses.factory);
console.log('  Splitter Template:', addresses.splitterTemplate);
console.log('  Automated Splitter Template:', addresses.automatedSplitterTemplate);
console.log('\nAddresses saved to: deployed-templates.json');
console.log('\nNext step: Update your frontend .env file with the factory address:');
console.log(`  VITE_SMART_CONTRACT=${addresses.factory}`);
