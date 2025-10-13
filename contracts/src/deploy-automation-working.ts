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

console.log('='.repeat(70));
console.log('DEPLOYING FACTORY WITH AUTOMATION SUPPORT');
console.log('='.repeat(70));
console.log('\nStrategy: Deploy factory with only splitter bytecode embedded.');
console.log('Automated vaults will be created by deploying automated-splitter');
console.log('bytecode directly from the factory at creation time.\n');

// Step 1: Deploy Factory
console.log('Step 1: Deploying Factory Contract...');
const factoryByteCode = getScByteCode('build', 'factory.wasm');

const constructorArgs = new Args()
    .addString('AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo') // EagleFi Swap Router
    .addString('') // Splitter template (empty, will use embedded)
    .addString(''); // Automated splitter template (empty, will use embedded)

try {
    const factoryContract = await SmartContract.deploy(
        provider,
        factoryByteCode,
        constructorArgs,
        {
            coins: Mas.fromString('1.0'), // Increased coins for larger contract
            maxGas: 4_000_000_000n, // Increased gas limit
        },
    );

    console.log('✅ Factory Contract deployed at:', factoryContract.address);

    // Save address
    const addresses = {
        factory: factoryContract.address,
        network: 'buildnet',
        deployedAt: new Date().toISOString(),
        note: 'Factory with embedded bytecode for both splitter and automated-splitter',
    };

    const addressesPath = path.join(process.cwd(), 'deployed-factory.json');
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('DEPLOYMENT SUCCESSFUL!');
    console.log('='.repeat(70));
    console.log('\nFactory Address:', factoryContract.address);
    console.log('\nNext Steps:');
    console.log('1. Update frontend/.env:');
    console.log(`   VITE_SMART_CONTRACT=${factoryContract.address}`);
    console.log('   VITE_ENABLE_AUTOMATION=true');
    console.log('\n2. Restart frontend: cd ../frontend && npm run dev');
    console.log('\n3. Test creating an automated vault!');

} catch (error: any) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error('Error:', error.message);

    if (error.message.includes('Maximum call stack size exceeded')) {
        console.error('\n📋 The contract is still too large to deploy.');
        console.error('\nPossible solutions:');
        console.error('1. Remove automated-splitter from factory temporarily');
        console.error('2. Deploy automated-splitter separately and reference it');
        console.error('3. Optimize contract code to reduce size');
        console.error('4. Use Massa\'s contract upgrade mechanism');
    }

    process.exit(1);
}
