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
  getSplitterTokensPercentages,
} from '../calls/splitter';

dotenv.config();

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

const factoryContract = new SmartContract(
  provider,
  'AS1uck9U7SFpAHZAyYcjcgGq7BoM7UCXsiW6V3DrunmPYVpa6nVh', // Factory contract address
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
