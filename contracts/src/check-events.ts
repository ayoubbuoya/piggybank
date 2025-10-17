
import 'dotenv/config';
import { Account, Web3Provider } from '@massalabs/massa-web3';

// Update this with your deployed factory contract address
const FACTORY_ADDRESS = 'AS12ENSeHMvQdkkceh6DEgGnpUy6DbApMgGrU7VMPGGJHdubVKoU5';

const account = await Account.fromEnv();
const provider = Web3Provider.buildnet(account);

console.log('Fetching events from factory:', FACTORY_ADDRESS);
console.log('');

try {
    const events = await provider.getEvents({
        smartContractAddress: FACTORY_ADDRESS,
    });

    console.log(`Found ${events.length} events\n`);

    // Group by event type
    const grouped: Record<string, any[]> = {};

    events.forEach((event) => {
        const type = event.data.split(':')[0];
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(event);
    });

    // Show summary
    console.log('═══════════════════════════════════════');
    console.log('EVENT SUMMARY');
    console.log('═══════════════════════════════════════');
    Object.keys(grouped).forEach((type) => {
        console.log(`${type}: ${grouped[type].length} events`);
    });
    console.log('');

    // Show last 5 events of each type
    Object.keys(grouped).forEach((type) => {
        console.log(`\n📌 ${type} (showing last 5):`);
        console.log('─'.repeat(60));
        const last5 = grouped[type].slice(-5);
        last5.forEach((event, i) => {
            console.log(`\n${i + 1}. ${event.data}`);
            console.log(`   Block: ${event.context.block}`);
            console.log(`   Slot: Period ${event.context.slot.period}, Thread ${event.context.slot.thread}`);
            if (event.context.call_stack) {
                console.log(`   Call Stack:`, event.context.call_stack);
            }
        });
    });

    console.log('\n\n═══════════════════════════════════════');
    console.log('KEY FINDINGS:');
    console.log('═══════════════════════════════════════');

    const registrations = grouped['AUTO_DEPOSIT_DEFERRED_CALL_REGISTERED'] || [];
    const attempts = grouped['AUTO_DEPOSIT_EXECUTION_ATTEMPT'] || [];
    const executed = grouped['AUTO_DEPOSIT_EXECUTED'] || [];

    console.log(`✅ Registrations: ${registrations.length}`);
    console.log(`🔄 Execution Attempts: ${attempts.length}`);
    console.log(`✓  Successful Executions: ${executed.length}`);
    console.log('');

    if (registrations.length > 0 && attempts.length === 0) {
        console.log('⚠️  PROBLEM: Deferred calls registered but NEVER attempted!');
        console.log('   → The Massa scheduler is not triggering them.');
        console.log('   → Check slot/thread/period configuration.');
    } else if (attempts.length > 0 && executed.length === 0) {
        console.log('⚠️  PROBLEM: Execution attempts happening but all failing!');
        console.log('   → Check allowance/balance in AUTO_DEPOSIT_ALLOWANCE_CHECK events.');
    } else if (executed.length > 0) {
        console.log('✅ SUCCESS: Auto-deposits are executing!');
    }

} catch (error: any) {
    console.error('Error:', error.message || error);
}
