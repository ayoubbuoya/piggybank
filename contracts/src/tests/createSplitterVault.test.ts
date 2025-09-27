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
import { createSplitterVault } from '../calls/factory';

dotenv.config();

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

const factoryContract = new SmartContract(
  provider,
  'AS12hMqjynhwvHctShqYbLMTEsv4HDKn3r52qTY2YygP7Geb88w5J',
);

const usdcTokenPercentage = new TokenWithPercentage(USDC_TOKEN_ADDRESS, 50n);
const wethTokenPercentage = new TokenWithPercentage(WETH_TOKEN_ADDRESS, 50n);

const tokensWithPercentage = [usdcTokenPercentage, wethTokenPercentage];

console.log('Account address:', account.address.toString());
console.log('Factory contract address:', factoryContract.address.toString());

// Create
await createSplitterVault(factoryContract, tokensWithPercentage);
