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
import { BASE_TOKEN_ADDRESS, WMAS_TOKEN_ADDRESS } from './storage';
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
const processedUSDCBalanceKey: StaticArray<u8> = stringToBytes('processedUSDCBalance');

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract());

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
  const baseToken = new IMRC20(new Address(BASE_TOKEN_ADDRESS));

  const factoryContract = new IFactory(caller);

  const eaglefiRouterAddress = factoryContract.getEagleSwapRouterAddress();

  baseToken.increaseAllowance(
    new Address(eaglefiRouterAddress),
    u256.fromU64(u64.MAX_VALUE),
    getBalanceEntryCost(BASE_TOKEN_ADDRESS, Context.callee().toString()),
  );

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

export function deposit(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const amount = args.nextU256().expect('amount expected');
  const coinsToUse = args.nextU64().expect('coinsToUse expected');
  const deadline = args.nextU64().expect('deadline expected');

  const baseToken = new IMRC20(new Address(BASE_TOKEN_ADDRESS));

  const calleeAddress = Context.callee();
  const callerAddress = Context.caller();

  // Factory address was stored as caller.toString(), retrieve it as string
  const factoryAddressBytes = Storage.get(FACTORY_ADDRESS_KEY);
  const factoryAddressString = factoryAddressBytes.length > 0
    ? String.UTF8.decodeUnsafe(changetype<usize>(factoryAddressBytes), factoryAddressBytes.length)
    : '';

  const isFromFactory = callerAddress.toString() == factoryAddressString;

  // Do the transfer only if the call is not from the factory (createAndDepositSplitterVault)
  if (!isFromFactory) {
    // Transfer the tokens from the sender to this contract
    baseToken.transferFrom(
      Context.caller(),
      calleeAddress,
      amount,
      getBalanceEntryCost(BASE_TOKEN_ADDRESS, calleeAddress.toString()),
    );
  }

  // Distribute the  USDC amount to the tokens according to their percentages

  // Get all tokens and their corresponding percentages from the persistent map
  const tokens: string[] = deserializeStringArray(
    Storage.get(allTokensAddressesKey),
  );

  const factory = new IFactory(new Address(factoryAddressString));
  const eagleSwapRouterAddress = factory.getEagleSwapRouterAddress();

  assert(eagleSwapRouterAddress.length > 0, 'SWAP_ROUTER_NOT_SET');

  const eagleSwapRouter = new IEagleSwapRouter(
    new Address(eagleSwapRouterAddress),
  );

  for (let i = 0; i < tokens.length; i++) {
    const tokenAddress = tokens[i];

    if (tokenAddress == BASE_TOKEN_ADDRESS) {
      // If the token is BASE_TOKEN, just Keep their percentage in the vault, do nothing
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

    let swapRoute: SwapPath[];

    const basepoolAddress = factory.getTokenPoolAddress(BASE_TOKEN_ADDRESS);

    assert(basepoolAddress.length > 0, 'BASE_POOL_NOT_FOUND');

    // if token Address is wmas, swap with one route only, else two routes (WMAS as intermediary) BASE -> WMAS -> TOKEN
    if (tokenAddress == WMAS_TOKEN_ADDRESS) {
      // The actual swap on eaglefi DEX
      const swapPath = new SwapPath(
        new Address(basepoolAddress),
        new Address(BASE_TOKEN_ADDRESS),
        new Address(tokenAddress),
        calleeAddress,
        tokenAmount,
        u256.One, // amountOutMin set to 1 for simplicity, should be handled properly in a real scenario
        true,
      );

      swapRoute = [swapPath];
    } else {
      const poolAddress = factory.getTokenPoolAddress(tokenAddress);

      assert(poolAddress.length > 0, 'POOL_NOT_FOUND_FOR_' + tokenAddress);

      const swapPath1 = new SwapPath(
        new Address(basepoolAddress),
        new Address(BASE_TOKEN_ADDRESS),
        new Address(WMAS_TOKEN_ADDRESS),
        new Address(poolAddress),
        tokenAmount,
        u256.One, // amountOutMin set to 1 for simplicity, should be handled properly in a real scenario
        true,
      );

      const swapPath2 = new SwapPath(
        new Address(poolAddress),
        new Address(WMAS_TOKEN_ADDRESS),
        new Address(tokenAddress),
        calleeAddress,
        u256.Zero, // amountIn will be determined by the previous swap
        u256.One, // amountOutMin set to 1 for simplicity, should be handled properly in a real scenario
        false,
      );

      swapRoute = [swapPath1, swapPath2];
    }

    const customDeadline = u64.MAX_VALUE;

    const amountOut: u256 = eagleSwapRouter.swap(
      swapRoute,
      coinsToUse,
      customDeadline,
      coinsToUse,
    );

    assert(amountOut > u256.Zero, 'SWAP_FAILED_FOR_' + tokenAddress);
  }

  // Update the processed USDC balance to track this deposit
  const baseTokenBalance = baseToken.balanceOf(calleeAddress);
  const args2 = new Args();
  args2.add(baseTokenBalance);
  Storage.set(processedUSDCBalanceKey, args2.serialize());

  if (!isFromFactory) {
    // Emit an event indicating the deposit was successful only if the call is not from the factory
    generateEvent(
      createEvent('DEOSIT', [
        callerAddress.toString(),
        amount.toString(),
        deadline.toString(),
      ]),
    );
  }

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

/**
 * Process any unallocated USDC in the vault.
 * This function checks for USDC that has been sent to the vault (e.g., via DCA)
 * but not yet processed/split across tokens.
 * Anyone can call this function to trigger the processing.
 * 
 * @param binaryArgs - Arguments serialized with Args
 * - coinsToUse: u64 - Amount of coins to use for swaps
 * - deadline: u64 - Deadline for swap transactions
 */
export function processUnallocatedUSDC(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const coinsToUse = args.nextU64().expect('coinsToUse expected');
  const deadline = args.nextU64().expect('deadline expected');

  const baseToken = new IMRC20(new Address(BASE_TOKEN_ADDRESS));
  const calleeAddress = Context.callee();

  // Get current USDC balance of the vault
  const currentBalance = baseToken.balanceOf(calleeAddress);

  // Get the last processed balance from storage (defaults to 0 if not set)
  const processedBalanceBytes = Storage.get(processedUSDCBalanceKey);

  let unallocatedAmount: u256;
  if (processedBalanceBytes.length > 0) {
    // Parse the stored processed balance
    const storedArgs = new Args(processedBalanceBytes);
    const storedBalance = storedArgs.nextU256().expect('processed balance expected');

    // Convert current balance to bytes and back to ensure same u256 type
    const currentArgs = new Args();
    currentArgs.add(currentBalance);
    const currentBalanceBytes = currentArgs.serialize();
    const currentArgs2 = new Args(currentBalanceBytes);
    const currentBalanceParsed = currentArgs2.nextU256().expect('current balance expected');

    // Now both are the same u256 type (from as-types)
    // Calculate unallocated amount using SafeMath256
    unallocatedAmount = SafeMath256.sub(currentBalanceParsed, storedBalance);
  } else {
    // No processed balance stored, all current balance is unallocated
    // Convert to the same type for consistency
    const currentArgs = new Args();
    currentArgs.add(currentBalance);
    const currentBalanceBytes = currentArgs.serialize();
    const currentArgs2 = new Args(currentBalanceBytes);
    unallocatedAmount = currentArgs2.nextU256().expect('current balance expected');
  }

  // If there's no unallocated USDC, nothing to do
  assert(unallocatedAmount > u256.Zero, 'NO_UNALLOCATED_USDC');

  // Process the unallocated USDC by distributing it across tokens
  // This is similar to the deposit function, but we don't need to transfer tokens in

  // Get all tokens and their corresponding percentages from the persistent map
  const tokens: string[] = deserializeStringArray(
    Storage.get(allTokensAddressesKey),
  );

  const factoryAddress = Storage.get(FACTORY_ADDRESS_KEY);
  const factory = new IFactory(new Address(factoryAddress));
  const eagleSwapRouterAddress = factory.getEagleSwapRouterAddress();

  assert(eagleSwapRouterAddress.length > 0, 'SWAP_ROUTER_NOT_SET');

  const eagleSwapRouter = new IEagleSwapRouter(
    new Address(eagleSwapRouterAddress),
  );

  for (let i = 0; i < tokens.length; i++) {
    const tokenAddress = tokens[i];

    if (tokenAddress == BASE_TOKEN_ADDRESS) {
      // If the token is BASE_TOKEN (USDC), just keep their percentage in the vault
      continue;
    }

    assert(
      tokensPercentagesMap.contains(tokenAddress),
      'TOKEN_PERC_NOT_FOUND: ' + tokenAddress,
    );
    const percentage = tokensPercentagesMap.get(tokenAddress, 0);

    // Calculate the amount to swap for each token based on its percentage
    const tokenAmount = SafeMath256.div(
      SafeMath256.mul(unallocatedAmount, u256.fromU64(percentage)),
      u256.fromU64(100),
    );

    // Get the corresponding pool address from the factory
    const poolAddress = factory.getTokenPoolAddress(tokenAddress);
    assert(poolAddress.length > 0, 'POOL_NOT_FOUND: ' + tokenAddress);

    // Determine swap route based on token
    let swapRoute: SwapPath[] = [];

    if (tokenAddress == WMAS_TOKEN_ADDRESS) {
      // Direct swap: USDC → WMAS
      const swapPath = new SwapPath(
        new Address(poolAddress),
        new Address(BASE_TOKEN_ADDRESS),
        new Address(tokenAddress),
        calleeAddress,
        tokenAmount,
        u256.One,
        false,
      );
      swapRoute = [swapPath];
    } else {
      // Two-hop swap: USDC → WMAS → Token (e.g., WETH)
      const usdcWmasPoolAddress = factory.getTokenPoolAddress(BASE_TOKEN_ADDRESS);
      assert(usdcWmasPoolAddress.length > 0, 'USDC_WMAS_POOL_NOT_FOUND');

      const swapPath1 = new SwapPath(
        new Address(usdcWmasPoolAddress),
        new Address(BASE_TOKEN_ADDRESS),
        new Address(WMAS_TOKEN_ADDRESS),
        calleeAddress,
        tokenAmount,
        u256.One,
        true,
      );

      const swapPath2 = new SwapPath(
        new Address(poolAddress),
        new Address(WMAS_TOKEN_ADDRESS),
        new Address(tokenAddress),
        calleeAddress,
        u256.Zero,
        u256.One,
        false,
      );

      swapRoute = [swapPath1, swapPath2];
    }

    const customDeadline = u64.MAX_VALUE;

    const amountOut: u256 = eagleSwapRouter.swap(
      swapRoute,
      coinsToUse,
      customDeadline,
      coinsToUse,
    );

    assert(amountOut > u256.Zero, 'SWAP_FAILED_FOR_' + tokenAddress);
  }

  // Update the processed balance to current balance
  const args2 = new Args();
  args2.add(currentBalance);
  Storage.set(processedUSDCBalanceKey, args2.serialize());

  // Emit an event indicating the unallocated USDC was processed
  generateEvent(
    createEvent('PROCESS_UNALLOCATED_USDC', [
      Context.caller().toString(),
      unallocatedAmount.toString(),
      deadline.toString(),
    ]),
  );

  ReentrancyGuard.endNonReentrant();
}

/**
 * Get the amount of unallocated USDC in the vault.
 * This is USDC that has been sent to the vault but not yet processed/split.
 * 
 * @returns The amount of unallocated USDC as a serialized u256
 */
export function getUnallocatedUSDC(): StaticArray<u8> {
  const baseToken = new IMRC20(new Address(BASE_TOKEN_ADDRESS));
  const calleeAddress = Context.callee();

  // Get current USDC balance of the vault
  const currentBalance = baseToken.balanceOf(calleeAddress);

  // Get the last processed balance from storage (defaults to 0 if not set)
  const processedBalanceBytes = Storage.get(processedUSDCBalanceKey);
  const processedBalance = processedBalanceBytes.length > 0
    ? new Args(processedBalanceBytes).nextU256().expect('processed balance expected')
    : u256.Zero;

  // Calculate and return unallocated amount
  const unallocatedAmount = currentBalance >= processedBalance
    ? SafeMath256.sub(currentBalance, processedBalance)
    : u256.Zero;

  const args = new Args();
  args.add(unallocatedAmount);
  return args.serialize();
}
