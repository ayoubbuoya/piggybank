import 'dotenv/config';
import {
    Account,
    Mas,
    JsonRpcProvider,
    IAccount,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';
import * as fs from 'fs';
import * as path from 'path';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('='.repeat(60));
console.log('STEP 1: Deploying Child Contracts (Templates)');
console.log('='.repeat(60));
console.log('\nNote: These are template contracts that will be cloned by the factory.');
console.log('They are deployed as bytecode only, without initialization.\n');

// Deploy Splitter Contract Template
console.log('1. Deploying Splitter Template...');
const splitterByteCode = getScByteCode('build', 'splitter.wasm');

try {
    // Deploy bytecode without calling constructor
    // Use deploySC which allows deploying without constructor args
    const splitterResult = await provider.deploySC({
        bytecode: new Uint8Array(splitterByteCode),
        maxCoins: Mas.fromString('0.5'),
        maxGas: 4_000_000_000n,
    });

    console.log('✅ Splitter Template deployed at:', splitterResult.address);

    // Deploy Automated Splitter Contract Template
    console.log('\n2. Deploying Automated Splitter Template...');
    const automatedSplitterByteCode = getScByteCode('build', 'automated-splitter.wasm');

    const automatedResult = await provider.deploySC({
        bytecode: new Uint8Array(automatedSplitterByteCode),
        maxCoins: Mas.fromString('1.0'),
        maxGas: 4_000_000_000n,
    });

    console.log('✅ Automated Splitter Template deployed at:', automatedResult.address);

    // Save addresses to a file
    const addresses = {
        splitterTemplate: splitterResult.address,
        automatedSplitterTemplate: automatedResult.address,
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
} catch (error) {
    console.error('\n❌ Deployment failed:', error);
    console.error('\nThis might be because:');
    console.error('1. Insufficient funds in wallet');
    console.error('2. Network connectivity issues');
    console.error('3. Contract bytecode issues');
    process.exit(1);
}
