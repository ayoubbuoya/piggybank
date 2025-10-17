import 'dotenv/config';
import { Account, Web3Provider } from '@massalabs/massa-web3';

const FACTORY_ADDRESS = 'AS1i1ifHRrDXPfoFJHzVkiN866DLh8JcYBTzkWGdM1v7huqCboSy';

async function debugDeferredCalls() {
    console.log('🔍 Debugging Deferred Calls...\n');

    const baseAccount = await Account.fromEnv();
    const provider = Web3Provider.buildnet(baseAccount);

    console.log('📍 Factory Contract:', FACTORY_ADDRESS);
    console.log('👤 Your Address:', baseAccount.address.toString());
    console.log('');

    // Fetch recent events from the factory
    try {
        console.log('📋 Fetching recent events from factory...\n');

        const events = await provider.getEvents({
            smartContractAddress: FACTORY_ADDRESS,
        });

        if (events.length === 0) {
            console.log('   No events found');
        } else {
            console.log(`   Found ${events.length} recent events:\n`);

            // Group events by type
            const eventsByType: { [key: string]: any[] } = {};

            events.forEach((event: any) => {
                const data = event.data;
                const eventType = data.split(':')[0];

                if (!eventsByType[eventType]) {
                    eventsByType[eventType] = [];
                }
                eventsByType[eventType].push(event);
            });

            // Display events organized by type
            Object.keys(eventsByType).forEach((type) => {
                console.log(`   📌 ${type} (${eventsByType[type].length})`);

                eventsByType[type].slice(-3).forEach((event, idx) => {
                    console.log(`      ${idx + 1}. ${event.data}`);
                    console.log(`         Slot: Period ${event.context.slot.period}, Thread ${event.context.slot.thread}`);
                    console.log(`         Block: ${event.context.block}`);
                    console.log('');
                });
            });

            // Check for execution attempt events
            const executionAttempts = eventsByType['AUTO_DEPOSIT_EXECUTION_ATTEMPT'] || [];
            const executionSuccess = eventsByType['AUTO_DEPOSIT_EXECUTED'] || [];
            const allowanceChecks = eventsByType['AUTO_DEPOSIT_ALLOWANCE_CHECK'] || [];
            const registrations = eventsByType['AUTO_DEPOSIT_DEFERRED_CALL_REGISTERED'] || [];

            console.log('\n📊 Summary:');
            console.log(`   Registrations: ${registrations.length}`);
            console.log(`   Execution Attempts: ${executionAttempts.length}`);
            console.log(`   Allowance Checks: ${allowanceChecks.length}`);
            console.log(`   Successful Executions: ${executionSuccess.length}`);
            console.log('');

            if (registrations.length > 0 && executionAttempts.length === 0) {
                console.log('⚠️  ISSUE DETECTED:');
                console.log('   - Deferred calls are registered');
                console.log('   - But NO execution attempts found');
                console.log('   - This means the scheduler is not triggering them!');
                console.log('');

                // Get the latest registration
                const latestReg = registrations[registrations.length - 1];
                const regData = latestReg.data.split(':')[1].split(',');
                console.log('   Latest Registration:');
                console.log('   - Owner:', regData[0]);
                console.log('   - Schedule ID:', regData[1]);
                console.log('   - Target Period:', regData[2]);
                console.log('   - Target Thread:', regData[3]);
                console.log('   - Max Gas:', regData[4]);
                console.log('   - Contract Balance:', regData[5]);
                console.log('   - Deferred Call ID:', regData[6]);
                console.log('');

                const nodeStatus = await provider.getNodeStatus();
                console.log('   Current Cycle:', nodeStatus.currentCycle);
            }

            if (executionAttempts.length > 0 && executionSuccess.length === 0) {
                console.log('⚠️  ISSUE DETECTED:');
                console.log('   - Execution attempts are happening');
                console.log('   - But executions are failing!');
                console.log('   - Check the allowance check events for details');
                console.log('');
            }
        }
    } catch (error: any) {
        console.error('❌ Error fetching events:', error?.message || error);
    }

    console.log('✅ Debug complete!');
}

debugDeferredCalls().catch(console.error);
