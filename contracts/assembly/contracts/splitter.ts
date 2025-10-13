// The entry file of your WebAssembly module.
import {
  Address,
  Context,
  createEvent,
  generateEvent,
  Storage,
} from '@massalabs/massa-as-sdk';
import { Args, SafeMath, stringToBytes, u64ToBytes } from '@massalabs/as-types';
import { TokenWithPercentage } from './structs/token';
import { _setOwner } from './lib/ownership-internal';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { wrapMasToWMAS } from './lib/wrapping';
import { WMAS_TOKEN_ADDRESS } from './storage';
import { IMRC20 } from './interfaces/IMRC20';
import { getBalanceEntryCost } from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20-external';
import { deserializeStringArray, serializeStringArray } from './lib/utils';
import { u256 } from 'as-bignum/assembly';
import { SafeMath256 } from './lib/safeMath';
import { PersistentMap } from './lib/PersistentMap';
import { IFactory } from './interfaces/IFactory';
import { IEagleSwapRouter } from './interfaces/IEagleSwapRouter';
import { SwapPath } from './structs/eaglefi/swapPath';
import { onlyOwner } from './lib/ownership';

const FACTORY_ADDRESS_KEY = 'factoryAddress';
const tokensPercentagesMap = new PersistentMap<string, u64>('tpm');
const allTokensAddressesKey: StaticArray<u8> =
  stringToBytes('allTokensAddresses');
const createdAtKey: StaticArray<u8> = stringToBytes('createdAt');

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract());

  // If no args provided (template deployment), just initialize reentrancy guard
  if (binaryArgs.length == 0) {
    ReentrancyGuard.__ReentrancyGuard_init();
    return;
  }

  const args = new Args(binaryArgs);

  const tokenWithPercentage = args
    .nextSerializableObjectArray<TokenWithPercentage>()
    .expect('token with percentage expected');

  const vaultCreatorAddress = args
    .nextString()
    .expect('vault creator address expected');

  const allTokensAddresses = new Array<string>();

  // Store the tokens and their percentages in the persistent map
  for (let i = 0; i < tokenWithPercentage.length; i++) {
    const token = tokenWithPercentage[i];
    tokensPercentagesMap.set(token.address.toString(), token.percentage);
    allTokensAddresses.push(token.address.toString());
  }

  // Store all token addresses in the storage
  Storage.set(allTokensAddressesKey, serializeStringArray(allTokensAddresses));

  // Set the contract owner to the vault creator address
  _setOwner(vaultCreatorAddress);

  const caller = Context.caller();

  // Store the factory address
  Storage.set(FACTORY_ADDRESS_KEY, caller.toString());

  // Store the creation timestamp
  Storage.set(createdAtKey, u64ToBytes(Context.timestamp()));

  // INcrease Max allownace of WMAS for the eaglefi router
  const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));

  const factoryContract = new IFactory(caller);

  const eaglefiRouterAddress = factoryContract.getEagleSwapRouterAddress();

  wmasToken.increaseAllowance(
    new Address(eaglefiRouterAddress),
    u256.fromU64(u64.MAX_VALUE),
    getBalanceEntryCost(WMAS_TOKEN_ADDRESS, Context.callee().toString()),
  );

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

export function deposit(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const amount = args.nextU256().expect('amount expected');
  const isNative = args.nextBool().expect('isNative expected');
  const coinsToUse = args.nextU64().expect('coinsToUse expected');
  const deadline = args.nextU64().expect('deadline expected');

  const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));

  const calleeAddress = Context.callee();
  const callerAddress = Context.caller();

  const factoryAddress = Storage.get(FACTORY_ADDRESS_KEY);

  const isFromFactory = callerAddress.toString() == factoryAddress;

  // Do the transfer only if the call is not from the factory (createAndDepositSplitterVault)
  if (!isFromFactory) {
    // If isNative is true, Wrap the native token (MAS) into WMAS
    if (isNative) {
      wrapMasToWMAS(amount, new Address(WMAS_TOKEN_ADDRESS));
    } else {
      // Transfer the tokens from the sender to this contract
      wmasToken.transferFrom(
        Context.caller(),
        calleeAddress,
        amount,
        getBalanceEntryCost(WMAS_TOKEN_ADDRESS, calleeAddress.toString()),
      );
    }
  }

  // Distribute the  WMAS amount to the tokens according to their percentages

  // Get all tokens and their corresponding percentages from the persistent map
  const tokens: string[] = deserializeStringArray(
    Storage.get(allTokensAddressesKey),
  );

  const factory = new IFactory(new Address(factoryAddress));
  const eagleSwapRouterAddress = factory.getEagleSwapRouterAddress();

  assert(eagleSwapRouterAddress.length > 0, 'SWAP_ROUTER_NOT_SET');

  const eagleSwapRouter = new IEagleSwapRouter(
    new Address(eagleSwapRouterAddress),
  );

  for (let i = 0; i < tokens.length; i++) {
    const tokenAddress = tokens[i];

    if (tokenAddress == WMAS_TOKEN_ADDRESS) {
      // If the token is WMAS, just Keep their percentage in the vault, do nothing
      continue;
    }

    assert(
      tokensPercentagesMap.contains(tokenAddress),
      'TOKEN_PERC_NOT_FOUND: ' + tokenAddress,
    );
    const percentage = tokensPercentagesMap.get(tokenAddress, 0);

    // Calculate the amount to send to each token based on its percentage
    // tokenAmount  = amount * percentage / 100
    const tokenAmount = SafeMath256.div(
      SafeMath256.mul(amount, u256.fromU64(percentage)),
      u256.fromU64(100),
    );

    // Get the corresponding pool address from the factory
    const poolAddress = factory.getTokenPoolAddress(tokenAddress);

    assert(poolAddress.length > 0, 'POOL_NOT_FOUND: ' + tokenAddress);

    // The actual swap on eaglefi DEX
    const swapPath = new SwapPath(
      new Address(poolAddress),
      new Address(WMAS_TOKEN_ADDRESS),
      new Address(tokenAddress),
      calleeAddress,
      tokenAmount,
      u256.One, // amountOutMin set to 1 for simplicity, should be handled properly in a real scenario
      true,
    );

    const customDeadline = u64.MAX_VALUE;

    const amountOut: u256 = eagleSwapRouter.swap(
      [swapPath],
      coinsToUse,
      customDeadline,
      coinsToUse,
    );

    assert(amountOut > u256.Zero, 'SWAP_FAILED_FOR_' + tokenAddress);
  }

  // Emit an event indicating the deposit was successful
  generateEvent(
    createEvent('DEOSIT', [
      callerAddress.toString(),
      amount.toString(),
      isNative.toString(),
      deadline.toString(),
    ]),
  );

  // End Reentrancy Guard
  ReentrancyGuard.endNonReentrant();
}

export function withdraw(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  onlyOwner();

  const args = new Args(binaryArgs);

  const tokenAddress = args.nextString().expect('token address expected');
  const amount = args.nextU256().expect('amount expected');
  const toAddress = args.nextString().expect('to address expected');

  // Only the owner of the vault can withdraw

  const token = new IMRC20(new Address(tokenAddress));

  // Transfer the tokens to the specified address
  token.transfer(
    new Address(toAddress),
    amount,
    getBalanceEntryCost(tokenAddress, Context.callee().toString()),
  );

  // Emit an event indicating the withdrawal was successful
  generateEvent(
    createEvent('WITHDRAW', [
      toAddress,
      tokenAddress,
      amount.toString(),
      Context.caller().toString(),
    ]),
  );

  ReentrancyGuard.endNonReentrant();
}


// ============================================
// AUTOMATION FUNCTIONS
// ============================================

// Storage keys for scheduled deposits
const SD_ENABLED = stringToBytes('sd_enabled');
const SD_AMOUNT = stringToBytes('sd_amount');
const SD_FREQUENCY = stringToBytes('sd_frequency');
const SD_SOURCE_WALLET = stringToBytes('sd_source');
const SD_START_TIME = stringToBytes('sd_start');
const SD_END_TIME = stringToBytes('sd_end');
const SD_NEXT_EXECUTION = stringToBytes('sd_next');
const SD_MAX_RETRIES = stringToBytes('sd_retries');
const SD_GAS_PER_EXECUTION = stringToBytes('sd_gas');
const GAS_RESERVE = stringToBytes('gas_reserve');

/**
 * Enable scheduled deposits for this vault
 * Can only be called by vault owner
 */
export function enableScheduledDeposits(binaryArgs: StaticArray<u8>): void {
  onlyOwner();

  const args = new Args(binaryArgs);

  const depositAmount = args.nextU256().expect('deposit amount expected');
  const frequency = args.nextU8().expect('frequency expected');
  const sourceWallet = args.nextString().expect('source wallet expected');
  const startTime = args.nextU64().expect('start time expected');
  const endTime = args.nextU64().expect('end time expected');
  const maxRetries = args.nextU8().expect('max retries expected');
  const gasPerExecution = args.nextU64().expect('gas per execution expected');

  // Store configuration
  Storage.set(SD_ENABLED, stringToBytes('1'));
  Storage.set(SD_AMOUNT, stringToBytes(depositAmount.toString()));
  Storage.set(SD_FREQUENCY, u64ToBytes(frequency));
  Storage.set(SD_SOURCE_WALLET, stringToBytes(sourceWallet));
  Storage.set(SD_START_TIME, u64ToBytes(startTime));
  Storage.set(SD_END_TIME, u64ToBytes(endTime));
  Storage.set(SD_NEXT_EXECUTION, u64ToBytes(startTime));
  Storage.set(SD_MAX_RETRIES, u64ToBytes(maxRetries));
  Storage.set(SD_GAS_PER_EXECUTION, u64ToBytes(gasPerExecution));

  generateEvent(createEvent('SCHEDULED_DEPOSITS_ENABLED', [
    depositAmount.toString(),
    frequency.toString(),
    sourceWallet,
    startTime.toString(),
    endTime.toString()
  ]));
}

/**
 * Disable scheduled deposits
 * Can only be called by vault owner
 */
export function disableScheduledDeposits(): void {
  onlyOwner();
  Storage.set(SD_ENABLED, stringToBytes('0'));
  generateEvent(createEvent('SCHEDULED_DEPOSITS_DISABLED', []));
}

/**
 * Add gas reserve for automation
 * Anyone can add gas to help fund automation
 */
export function addGas(): void {
  const amount = Context.transferredCoins();
  const currentGas = Storage.has(GAS_RESERVE)
    ? SafeMath.add(Context.transferredCoins(), Storage.get(GAS_RESERVE).length > 0 ? u64(Storage.get(GAS_RESERVE)[0]) : 0)
    : amount;

  Storage.set(GAS_RESERVE, u64ToBytes(currentGas));

  generateEvent(createEvent('GAS_ADDED', [
    amount.toString(),
    currentGas.toString()
  ]));
}

/**
 * Get scheduled deposits status
 */
export function getScheduledDepositsStatus(): StaticArray<u8> {
  const enabled = Storage.has(SD_ENABLED) && Storage.get(SD_ENABLED) == stringToBytes('1');

  const result = new Args();
  result.add(enabled);

  if (enabled) {
    result.add(Storage.has(SD_NEXT_EXECUTION) ? Storage.get(SD_NEXT_EXECUTION)[0] : 0);
    result.add(Storage.has(GAS_RESERVE) ? Storage.get(GAS_RESERVE)[0] : 0);
  } else {
    result.add(0);
    result.add(0);
  }

  return result.serialize();
}
