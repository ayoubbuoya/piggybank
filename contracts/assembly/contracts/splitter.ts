// The entry file of your WebAssembly module.
import {
  Address,
  Context,
  createEvent,
  generateEvent,
  Storage,
} from '@massalabs/massa-as-sdk';
import { Args, SafeMath, stringToBytes } from '@massalabs/as-types';
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

const FACTORY_ADDRESS_KEY = 'factoryAddress';
const tokensPercentagesMap = new PersistentMap<string, u64>('tpm');
const allTokensAddressesKey: StaticArray<u8> =
  stringToBytes('allTokensAddresses');

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
