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
console.log('DEPLOYING FACTORY WITH FULL AUTOMATION SUPPORT');
console.log('='.repeat(70));
console.log('\nThis factory includes:');
console.log('✅ Basic splitter vaults (embedded bytecode)');
console.log('✅ Automated vaults with DCA, scheduled deposits, savings');
console.log('✅ createAutomatedVault function');
console.log('\nDeploying...\n');

const byteCode = getScByteCode('build', 'factory.wasm');

const constructorArgs = new Args().addString(
    'AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo', // EagleFi Swap Router Address
);

try {
    const contract = await SmartContract.deploy(
        provider,
        byteCode,
        constructorArgs,
        {
            coins: Mas.fromString('5.0'), // Increased for large contract
            maxGas: 4_000_000_000n,
        },
    );

    console.log('✅ Factory Contract deployed at:', contract.address);

    const events = await provider.getEvents({
        smartContractAddress: contract.address,
    });

    for (const event of events) {
        console.log('Event message:', event.data);
    }

    // Save address
    const addresses = {
        factory: contract.address,
        network: 'buildnet',
        deployedAt: new Date().toISOString(),
        features: ['splitter', 'automated-splitter', 'DCA', 'scheduled-deposits', 'savings-strategy'],
    };

    const addressesPath = path.join(process.cwd(), 'deployed-factory-automation.json');
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('🎉 DEPLOYMENT SUCCESSFUL!');
    console.log('='.repeat(70));
    console.log('\nFactory Address:', contract.address);
    console.log('Saved to: deployed-factory-automation.json');
    console.log('\n📝 Next Steps:');
    console.log('1. Update frontend/.env:');
    console.log(`   VITE_SMART_CONTRACT=${contract.address}`);
    console.log('   VITE_ENABLE_AUTOMATION=true');
    console.log('\n2. Restart frontend:');
    console.log('   cd ../frontend');
    console.log('   npm run dev');
    console.log('\n3. Test creating an automated vault with DCA, scheduled deposits, or savings!');
    console.log('\n✨ All automation features are now available!');

} catch (error: any) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error('Error:', error.message);

    if (error.message.includes('Maximum call stack size exceeded')) {
        console.error('\n📋 The contract is still too large.');
        console.error('\nThe factory embeds both splitter.wasm and automated-splitter.wasm');
        console.error('which makes it ~200KB+ total.');
        console.error('\n💡 Possible solutions:');
        console.error('1. Optimize contract code (remove unused functions)');
        console.error('2. Split into two factories (basic + automation)');
        console.error('3. Use Massa contract upgrade mechanism');
        console.error('4. Deploy automated-splitter separately and reference it');
    } else if (error.message.includes('Insufficient funds')) {
        console.error('\n💰 Not enough MAS in wallet.');
        console.error('You need at least 5 MAS for deployment.');
        console.error('Current wallet:', account.address);
    }

    process.exit(1);
}
