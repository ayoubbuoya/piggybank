import {
  Args,
  bytesToU256,
  bytesToU32,
  bytesToU64,
  NoArg,
  stringToBytes,
  u64ToBytes,
  u8toByte,
} from '@massalabs/as-types';
import {
  Address,
  Context,
  createEvent,
  generateEvent,
  Storage,
} from '@massalabs/massa-as-sdk';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { _setOwner } from './lib/ownership-internal';
import { IDusaPair } from './interfaces/IDusaPair';
import { IMRC20 } from './interfaces/IMRC20';
import { u256 } from 'as-bignum/assembly';
import { PairInformation } from './structs/dusa/PairInfo';
import { LiquidityParameters } from './structs/dusa/LiquidityParameters';
import { SafeMath256 } from './lib/safeMath';
import { PRECISION } from './lib/constants';
import { arrayToString, u256ToString } from './lib/utils';
import { FeeParameters } from './structs/dusa/FeeParameters';
import { IDusaRouter } from './interfaces/IdusaRouter';
import { getBalanceEntryCost } from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20-external';
import {
  mrc20Constructor,
  totalSupply as _totalSupply,
} from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20';
import { _mint } from '@massalabs/sc-standards/assembly/contracts/MRC20/mintable/mint-internal';
import { _burn } from '@massalabs/sc-standards/assembly/contracts/MRC20/burnable/burn-internal';
import { _balance } from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20-internals';
import { BinHelper } from './lib/binHelper';

// Storage Keys
export const PAIR_ADDRESS_KEY = 'pa';
export const PAIR_BIN_STEP_KEY: StaticArray<u8> = stringToBytes('pbs');
export const PAIR_TOKEN_X_KEY = 'ptx';
export const PAIR_TOKEN_Y_KEY = 'pty';
export const PAIR_TOKEN_X_DECIMALS_KEY: StaticArray<u8> = stringToBytes('ptxd');
export const PAIR_TOKEN_Y_DECIMALS_KEY: StaticArray<u8> = stringToBytes('ptyd');
export const INTERVALS_MS_KEY: StaticArray<u8> = stringToBytes('ims');
export const ROUTER_ADDRESS_KEY = 'ra';

export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract());

  const args = new Args(binaryArgs);

  const pairAddress = args
    .nextString()
    .expect('pairAddress argument is missing');

  const routerAddress = args
    .nextString()
    .expect('routerAddress argument is missing');

  const intervalsMs = args.nextU64().expect('intervalsMs argument is missing');

  // Get Pair X and Y tokens
  const pair = new IDusaPair(new Address(pairAddress));

  const tokenX: IMRC20 = pair.getTokenX();
  const tokenY: IMRC20 = pair.getTokenY();

  // Get Pair X and Y tokens decimals
  const tokenXDecimals = tokenX.decimals();
  const tokenYDecimals = tokenY.decimals();

  // Get token bin step
  const feeParameters: FeeParameters = pair.feeParameters();

  const binStep: u64 = feeParameters.binStep;

  // Set Owner of the contract
  _setOwner(Context.caller().toString());

  // Store the pair address
  Storage.set(PAIR_ADDRESS_KEY, pairAddress);

  // Store the pair bin step
  Storage.set(PAIR_BIN_STEP_KEY, u64ToBytes(binStep));

  // Store the pair tokens
  Storage.set(PAIR_TOKEN_X_KEY, tokenX._origin.toString());
  Storage.set(PAIR_TOKEN_Y_KEY, tokenY._origin.toString());

  // Store the pair tokens decimals
  Storage.set(PAIR_TOKEN_X_DECIMALS_KEY, u8toByte(tokenXDecimals));
  Storage.set(PAIR_TOKEN_Y_DECIMALS_KEY, u8toByte(tokenYDecimals));

  // Store the intervals in milliseconds
  Storage.set(INTERVALS_MS_KEY, u64ToBytes(intervalsMs));

  // Store the router address
  Storage.set(ROUTER_ADDRESS_KEY, routerAddress);

  // Intialize Vault LP Positions Token
  mrc20Constructor('PiggyBank LP Positions', 'PBLP', 18, u256.Zero);

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

export function deposit(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const amountX: u256 = args.nextU256().expect('amountX argument is missing');
  const amountY: u256 = args.nextU256().expect('amountY argument is missing');

  // Transfer tokens to the contract
  const tokenXAddress = Storage.get(PAIR_TOKEN_X_KEY);
  const tokenYAddress = Storage.get(PAIR_TOKEN_Y_KEY);
  const tokenX: IMRC20 = new IMRC20(new Address(tokenXAddress));
  const tokenY: IMRC20 = new IMRC20(new Address(tokenYAddress));

  const callerAddress = Context.caller();
  const currentContractAddress = Context.callee();

  // Transfer token X
  tokenX.transferFrom(
    callerAddress,
    currentContractAddress,
    amountX,
    getBalanceEntryCost(tokenXAddress, currentContractAddress.toString()),
  );

  // Transfer token Y
  tokenY.transferFrom(
    callerAddress,
    currentContractAddress,
    amountY,
    getBalanceEntryCost(tokenYAddress, currentContractAddress.toString()),
  );

  // Claulcate User share and store it
  const spotPrice = _fetchPairSpotPrice();

  const depositXPricedInTokenY = SafeMath256.div(
    SafeMath256.mul(amountX, spotPrice),
    PRECISION,
  );

  // shares = depositXPricedInTokenY + amountY
  let shares: u256 = SafeMath256.add(depositXPricedInTokenY, amountY);

  // Get the total supply
  const totalSupply: u256 = bytesToU256(_totalSupply(new Args().serialize()));

  // Get toal amounts in the vault
  const totals = _getVaultTotalTokensAmounts();

  const totalX = totals[0];
  const totalY = totals[1];

  if (totalSupply > u256.Zero) {
    const vaultXPricedInTokenY = SafeMath256.div(
      SafeMath256.mul(totalX, spotPrice),
      PRECISION,
    );
    shares = SafeMath256.div(
      SafeMath256.mul(shares, totalSupply),
      SafeMath256.add(vaultXPricedInTokenY, totalY),
    );
  }

  // Mint LP Tokens to the user representing their share in the vault
  _mint(new Args().add(callerAddress.toString()).add(shares).serialize());

  // TODO: Increase liquidity in the Current Position instead of just holding tokens until the next deffered call checkpoint

  generateEvent(
    createEvent('TOKENS_DEPOSITED', [
      Context.caller().toString(),
      u256ToString(amountX),
      u256ToString(amountY),
      u256ToString(shares),
      u256ToString(totalSupply),
    ]),
  );

  // End the non-reentrant block
  ReentrancyGuard.endNonReentrant();
}

export function addLiquidity(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  // Amount of bins to add liquidity to on each side of the current bin
  const binsRange: u64 = args.nextU64().expect('binsRange argument is missing');
  const amountX = args.nextU256().expect('amountX argument is missing');
  const amountY = args.nextU256().expect('amountY argument is missing');

  const pairAddress = Storage.get(PAIR_ADDRESS_KEY);

  const pair = new IDusaPair(new Address(pairAddress));

  const pairInfo: PairInformation = pair.getPairInformation();

  const activeBinId: u32 = pairInfo.activeId;

  let deltaIds: i64[] = new Array<i64>();
  let distributionsX: u256[] = new Array<u256>();
  let distributionsY: u256[] = new Array<u256>();

  // Calculate each bin disribtuion percentage
  const eachBinDistributionPercentage: u256 = SafeMath256.div(
    PRECISION,
    u256.fromU64(binsRange),
  );

  // Construct deltaIds by pushing the positive and negative values of each bin
  for (let i: u64 = 1; i < binsRange; i++) {
    // Loop for negative deltas
    deltaIds.push(-i64(i));
    // Add distribution for negative delta
    distributionsY.push(eachBinDistributionPercentage);
    // Add distribution for positive delta
    distributionsX.push(u256.Zero);
  }

  deltaIds.push(0);
  distributionsX.push(eachBinDistributionPercentage);
  distributionsY.push(eachBinDistributionPercentage);

  for (let i: u64 = 1; i < binsRange; i++) {
    // Loop for positive deltas
    deltaIds.push(i);
    // Add distribution for positive delta
    distributionsX.push(eachBinDistributionPercentage);
    // Add distribution for negative delta
    distributionsY.push(u256.Zero);
  }

  assert(
    distributionsX.length == deltaIds.length,
    'distributionsX and deltaIds length mismatch',
  );

  assert(
    distributionsY.length == deltaIds.length,
    'distributionsY and deltaIds length mismatch',
  );

  // Get pair tokens and bin step
  const tokenX: IMRC20 = pair.getTokenX();
  const tokenY: IMRC20 = pair.getTokenY();
  const binStep: u64 = bytesToU64(Storage.get(PAIR_BIN_STEP_KEY));

  const currentContractAddress = Context.callee();

  // Construct liq parameter
  const liqParams = new LiquidityParameters(
    tokenX,
    tokenY,
    binStep,
    amountX,
    amountY,
    u256.Zero,
    u256.Zero,
    activeBinId,
    5,
    deltaIds,
    distributionsX,
    distributionsY,
    currentContractAddress,
    u64.MAX_VALUE,
  );

  const router = new IDusaRouter(new Address(Storage.get(ROUTER_ADDRESS_KEY)));

  router.addLiquidity(liqParams, 20000000);

  generateEvent(
    createEvent('LIQUIDITY_ADDED', [
      Context.caller().toString(),
      amountX.toString(),
      amountY.toString(),
    ]),
  );

  // End the non-reentrant block
  ReentrancyGuard.endNonReentrant();
}

export function withdraw(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const toAddress = args.nextString().expect('toAddress argument is missing');
  const shares: u256 = args.nextU256().expect('shares argument is missing');

  assert(shares > u256.Zero, 'ZERO_SHARES');

  const userTotalShares: u256 = _balance(new Address(toAddress));

  assert(userTotalShares >= shares, 'INSUFFICIENT_SHARES');

  const tokenXAddress = Storage.get(PAIR_TOKEN_X_KEY);
  const tokenYAddress = Storage.get(PAIR_TOKEN_Y_KEY);
  const tokenX: IMRC20 = new IMRC20(new Address(tokenXAddress));
  const tokenY: IMRC20 = new IMRC20(new Address(tokenYAddress));

  // Calc the unused balances shares of teh user
  const totalSupply: u256 = bytesToU256(_totalSupply(new Args().serialize()));

  const balanceX: u256 = tokenX.balanceOf(Context.callee());
  const balanceY: u256 = tokenY.balanceOf(Context.callee());

  const unusedX = SafeMath256.div(
    SafeMath256.mul(balanceX, shares),
    totalSupply,
  );

  const unusedY = SafeMath256.div(
    SafeMath256.mul(balanceY, shares),
    totalSupply,
  );

  // TODO:  Withdraw the user liquiidity shares friom the current position, burn them and collect them to this address, for now we just withdraw the unused balances
  const posX = u256.Zero;
  const posY = u256.Zero;

  const totalX = SafeMath256.add(unusedX, posX);
  const totalY = SafeMath256.add(unusedY, posY);

  // Transfer tokens to the user
  tokenX.transfer(new Address(toAddress), totalX);
  tokenY.transfer(new Address(toAddress), totalY);

  // Burn the user shares
  _burn(new Address(toAddress), shares);

  generateEvent(
    createEvent('TOKENS_WITHDRAWN', [
      toAddress,
      u256ToString(totalX),
      u256ToString(totalY),
      u256ToString(shares),
    ]),
  );

  // End the non-reentrant block
  ReentrancyGuard.endNonReentrant();
}

/////////////////////// Getters ///////////////////////

export function getPairAddress(): StaticArray<u8> {
  return stringToBytes(Storage.get(PAIR_ADDRESS_KEY));
}

export function getIntervalsMs(): StaticArray<u8> {
  return Storage.get(INTERVALS_MS_KEY);
}

export function getTokenXAddress(): StaticArray<u8> {
  return stringToBytes(Storage.get(PAIR_TOKEN_X_KEY));
}

export function getTokenYAddress(): StaticArray<u8> {
  return stringToBytes(Storage.get(PAIR_TOKEN_Y_KEY));
}

export function getTokenXDecimals(): u8 {
  const bytes = Storage.get(PAIR_TOKEN_X_DECIMALS_KEY);
  return bytes[0];
}

export function getTokenYDecimals(): u8 {
  const bytes = Storage.get(PAIR_TOKEN_Y_DECIMALS_KEY);
  return bytes[0];
}

export function _fetchPairSpotPrice(): u256 {
  const pairAddress = Storage.get(PAIR_ADDRESS_KEY);
  const pair = new IDusaPair(new Address(pairAddress));

  const pairInfo = pair.getPairInformation();

  return BinHelper.getPriceFromId(
    pairInfo.activeId as u64,
    bytesToU32(Storage.get(PAIR_BIN_STEP_KEY)) as u64,
  );
}

export function _getVaultTotalTokensAmounts(): u256[] {
  const tokenXAddress = Storage.get(PAIR_TOKEN_X_KEY);
  const tokenYAddress = Storage.get(PAIR_TOKEN_Y_KEY);

  const tokenX: IMRC20 = new IMRC20(new Address(tokenXAddress));
  const tokenY: IMRC20 = new IMRC20(new Address(tokenYAddress));

  const currentContractAddress = Context.callee();

  const balanceX = tokenX.balanceOf(currentContractAddress);
  const balanceY = tokenY.balanceOf(currentContractAddress);

  // TODO: get amounts locked in the pair liquidity positions AND add them to the balances

  return new Array<u256>(2).fill(u256.Zero).map((_, i) => {
    if (i == 0) {
      return balanceX;
    } else {
      return balanceY;
    }
  });
}

// Re-export MRC721 enumerable functions
export * from '@massalabs/sc-standards/assembly/contracts/MRC721/enumerable';
