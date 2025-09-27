import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import * as dotenv from 'dotenv';
import { TokenWithPercentage } from '../calls/structs/TokenWithPercentage';
import { USDC_TOKEN_ADDRESS, WETH_TOKEN_ADDRESS } from '../calls/const';
import { createSplitterVault, getUserSplitterVaults } from '../calls/factory';

dotenv.config();

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

const factoryContract = new SmartContract(
  provider,
  'AS1Rob48rVywGPBkL3yzvwS24nrCvFsCE58PRT9SyW6hT6jQV8W2',
);

const usdcTokenPercentage = new TokenWithPercentage(USDC_TOKEN_ADDRESS, 50n);
const wethTokenPercentage = new TokenWithPercentage(WETH_TOKEN_ADDRESS, 50n);

const tokensWithPercentage = [usdcTokenPercentage, wethTokenPercentage];

console.log('Account address:', account.address.toString());
console.log('Factory contract address:', factoryContract.address.toString());

// Create
await createSplitterVault(factoryContract, tokensWithPercentage);

// Get teh user splitter vaults
const splitterVaults = await getUserSplitterVaults(
  provider,
  account.address.toString(),
  factoryContract,
);

console.log('User splitter vaults:', splitterVaults);

if (splitterVaults.length === 0) {
  throw new Error('No splitter vaults found for the user');
}
console.log('Test passed successfully');