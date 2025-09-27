import {
  Account,
  Args,
  bytesToStr,
  Mas,
  OperationStatus,
  parseMas,
  parseUnits,
  Provider,
  SmartContract,
  Web3Provider,
} from '@massalabs/massa-web3';
import { TokenWithPercentage } from './structs/TokenWithPercentage';

export async function createSplitterVault(
  factoryContract: SmartContract,
  tokensWithPercentage: TokenWithPercentage[],
) {
  console.log('Creating splitter vault...');

  const initCoins = '0.1'; // Initial coins to send to the splitter vault

  const args = new Args()
    .addSerializableObjectArray(tokensWithPercentage)
    .addU64(parseMas(initCoins))
    .serialize();

  const operation = await factoryContract.call('createSplitterVault', args, {
    coins: parseMas('5'),
  });
  console.log(`Operation ID: ${operation.id}`);
  console.log('Waiting for the operation to be executed...');

  // Wait for the operation to be executed
  const status = await operation.waitSpeculativeExecution();

  if (status === OperationStatus.SpeculativeSuccess) {
    console.log('Splitter vault created successfully');
  } else {
    console.log('Status:', status);
    // Show speculativ events for debugging
    const spec_events = await operation.getSpeculativeEvents();
    console.log('Speculative events:', spec_events);
    throw new Error('Failed to create new splitter vault');
  }
}
