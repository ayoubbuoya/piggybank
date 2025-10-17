
import 'dotenv/config';
import { Account, Web3Provider } from '@massalabs/massa-web3';

const FACTORY_ADDRESS = 'AS12ENSeHMvQdkkceh6DEgGnpUy6DbApMgGrU7VMPGGJHdubVKoU5';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

console.log('Checking for execution errors...\n');

const events = await provider.getEvents({
    smartContractAddress: FACTORY_ADDRESS,
});

const errorEvents = events.filter(e =>
    e.data.includes('error') ||
    e.data.includes('Error') ||
    e.data.includes('massa_execution') ||
    e.data.startsWith('{')
);

console.log(`Found ${errorEvents.length} error-related events:\n`);

errorEvents.forEach((event, i) => {
    console.log(`${i + 1}. ${event.data}`);
    console.log(`   Period ${event.context.slot.period}, Thread ${event.context.slot.thread}`);
    console.log(`   Block: ${event.context.block}\n`);
});

// Also check for vault events
console.log('\n=== Checking vault for DEPOSIT events ===\n');

const vaultAddress = 'AS1eNk3VreMfYi86BNC8rEEZrAH8SbcNQxEGxS17mK1Z9MV6zTAT';
const vaultEvents = await provider.getEvents({
    smartContractAddress: vaultAddress,
});

console.log(`Found ${vaultEvents.length} vault events:\n`);

vaultEvents.forEach((event, i) => {
    console.log(`${i + 1}. ${event.data}`);
    console.log(`   Period ${event.context.slot.period}, Thread ${event.context.slot.thread}\n`);
});
