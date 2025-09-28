import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
  MRC20,
  formatUnits,
  BUILDNET_TOKENS,
} from '@massalabs/massa-web3';
import * as dotenv from 'dotenv';
import { TokenWithPercentage } from '../calls/structs/TokenWithPercentage';
import { USDC_TOKEN_ADDRESS, WETH_TOKEN_ADDRESS } from '../calls/const';
import {
  createAndDepositSplitterVault,
  createSplitterVault,
  getUserSplitterVaults,
} from '../calls/factory';
import {
  depositToSplitterVault,
  getSplitterCreationTimestamp,
  getSplitterTokensPercentages,
} from '../calls/splitter';

dotenv.config();

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

const factoryContract = new SmartContract(
  provider,
  'AS12L2f9urCwMfymfg1c2sCycMVxMSGzbiENiGsxWsw9NZYAdnkWp', // Factory contract address
);

const splitterVaults = await getUserSplitterVaults(
  provider,
  account.address.toString(),
  factoryContract,
);
console.log('User splitter vaults:', splitterVaults);

if (splitterVaults.length === 0) {
  throw new Error('No splitter vaults found for the user');
}

const firstSplitterVault = splitterVaults[0];

// Fetch tokens and percentages from the splitter vault
const tokensWithPercentages = await getSplitterTokensPercentages(
  provider,
  new SmartContract(provider, firstSplitterVault),
);

console.log('Tokens with percentages:', tokensWithPercentages);

// Get the vault created At timestamp
const createdAt = await getSplitterCreationTimestamp(
  provider,
  new SmartContract(provider, firstSplitterVault),
);

console.log('Splitter vault created at (timestamp):', createdAt);
console.log(
  'Splitter vault created at (date):',
  new Date(createdAt).toLocaleString(),
);
