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
import { parse } from 'path';

export async function depositToSplitterVault(
  splitterVaultContract: SmartContract,
  amount: string,
  isNative: boolean,
) {
  console.log('Depositing to splitter vault...');

  //   const deadline = Math.floor(Date.now() / 1000) + 60 * 150; // 20 minutes from the current Unix time
  const deadline = 1758980874184; // A far future timestamp for testing purposes
  console.log('Deadline:', deadline);
  const cointsToUse = '0.02'; // Amount of coins to use for the swap if the deposited token is not native

  const args = new Args()
    .addU256(parseMas(amount))
    .addBool(isNative)
    .addU64(parseMas(cointsToUse))
    .addU64(BigInt(deadline))
    .serialize();

  const coins = isNative ? parseMas(amount) + parseMas('0.1') : parseMas('0.1');

  const operation = await splitterVaultContract.call('deposit', args, {
    coins,
  });

  console.log(`Operation ID: ${operation.id}`);

  console.log('Waiting for the operation to be executed...');
  // Wait for the operation to be executed
  const status = await operation.waitSpeculativeExecution();

  if (status === OperationStatus.SpeculativeSuccess) {
    console.log('Deposit to splitter vault successful');
  } else {
    console.log('Status:', status);
    // Show speculativ events for debugging
    const spec_events = await operation.getSpeculativeEvents();
    console.log('Speculative events:', spec_events);
    throw new Error('Failed to deposit to splitter vault');
  }
}

export async function getSplitterTokensPercentages(
  provider: Web3Provider,
  splitterVaultContract: SmartContract,
): Promise<TokenWithPercentage[]> {
  console.log('Fetching splitter vault tokens and percentages...');

  const keys = await provider.getStorageKeys(
    splitterVaultContract.address,
    'tpm::',
    false,
  );

  const tokensWithPercentage: TokenWithPercentage[] = [];

  for (const key of keys) {
    const deserializedKey = bytesToStr(key);
    console.log('Deserialized key:', deserializedKey);
    const tokenAddress = deserializedKey.split('::')[1];
    // Fetch Key Value from storage
    const value = await provider.readStorage(
      splitterVaultContract.address,
      [deserializedKey],
      false,
    );

    console.log(`Value for key ${deserializedKey}:`, value);

    if (!value || value.length === 0) {
      console.warn(`No value found for key: ${deserializedKey}`);
      continue;
    }

    const tokenPercentage = new Args(value[0]!).nextU64();

    console.log(`Token: ${tokenAddress}, Percentage: ${tokenPercentage}`);

    tokensWithPercentage.push(
      new TokenWithPercentage(tokenAddress, tokenPercentage!),
    );
  }

  return tokensWithPercentage;
}

export async function getSplitterCreationTimestamp(
  provider: Web3Provider,
  splitterVaultContract: SmartContract,
): Promise<number> {
  console.log('Fetching splitter vault creation timestamp...');

  const value = await provider.readStorage(
    splitterVaultContract.address,
    ['createdAt'],
    false,
  );

  if (!value || value.length === 0) {
    throw new Error('No value found for key: createdAt');
  }

  const creationTimestamp = new Args(value[0]!).nextU64();

  if (!creationTimestamp) {
    throw new Error('Failed to parse creation timestamp');
  }

  return Number(creationTimestamp);
}
