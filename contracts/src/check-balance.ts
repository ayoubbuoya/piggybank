import 'dotenv/config';
import { Account, Web3Provider } from '@massalabs/massa-web3';

const FACTORY_ADDRESS = 'AS12dJWkVa335rk7U3qZ3J6mAX9wbpgMueFqe8Kq2GEpPUqanGuLE';

async function checkBalance() {
    const account = await Account.fromEnv();
    const provider = Web3Provider.buildnet(account);

    console.log('Checking factory balance...\n');

    const addressInfo = await provider.client.getAddresses([FACTORY_ADDRESS]);

    console.log('Factory address:', FACTORY_ADDRESS);
    console.log('Balance:', addressInfo[0].candidate_balance);
    console.log('Final balance:', addressInfo[0].final_balance);
    console.log('\nIn MAS:');
    console.log('Candidate:', Number(addressInfo[0].candidate_balance) / 1_000_000_000, 'MAS');
    console.log('Final:', Number(addressInfo[0].final_balance) / 1_000_000_000, 'MAS');
}

checkBalance().catch(console.error);
