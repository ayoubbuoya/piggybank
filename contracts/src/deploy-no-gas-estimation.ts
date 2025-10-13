import 'dotenv/config';
import {
    Account,
    Args,
    Mas,
    JsonRpcProvider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';
import * as fs from 'fs';
import * as path from 'path';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Deploying Automation Factory (bypassing gas estimation)...\n');

const byteCode = getScByteCode('build', 'factory.wasm');
console.log('Contract size:', (byteCode.length / 1024).toFixed(2), 'KB');

const constructorArgs = new Args()
    .addString('AS1Kf2KVdYghv9PeVcgQKVBpuVAqdvfwwMbGuffByxJbSMLqLvVo')
    .serialize();

try {
    // Deploy without gas estimation by using deploySC directly
    const result = await provider.deploySC({
        byteCode: byteCode,
        maxCoins: Mas.fromString('2.0'),
        maxGas: 3_000_000_000n, // Set manually to avoid estimation
        args: constructorArgs,
    });

    console.log('✅ Automation Factory deployed at:', result.address);

    // Save address
    const addresses = {
        automationFactory: result.address,
        network: 'buildnet',
        deployedAt: new Date().toISOString(),
    };

    const addressesPath = path.join(process.cwd(), 'deployed-automation-factory.json');
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

    console.log('\n🎉 SUCCESS! Update your frontend/.env:');
    console.log(`VITE_AUTOMATION_FACTORY=${result.address}`);

} catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
}
