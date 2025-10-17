import {
  Address,
  Context,
  createEvent,
  createSC,
  fileToByteArray,
  generateEvent,
  Storage,
  balance,
  deferredCallRegister,
  deferredCallCancel,
  deferredCallExists,
  Slot,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import { Args, boolToByte, stringToBytes } from '@massalabs/as-types';
import { _setOwner } from './lib/ownership-internal';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { TokenWithPercentage } from './structs/token';
import { wrapMasToWMAS } from './lib/wrapping';
import {
  BASE_TOKEN_ADDRESS,
  USDC_TOKEN_ADDRESS,
  WETH_TOKEN_ADDRESS,
  WMAS_TOKEN_ADDRESS,
} from './storage';
import { ISplitter } from './interfaces/ISplitter';
import { u256 } from 'as-bignum/assembly';
import { PersistentMap } from '@massalabs/massa-as-sdk/assembly/collections';
import { onlyOwner } from './lib/ownership';
import { generateSplitterUserKey } from './lib/utils';
import { getBalanceEntryCost } from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20-external';
import { IMRC20 } from './interfaces/IMRC20';
import { AutoDepositSchedule } from './structs/autoDeposit';

// Mapping from token address to its corresponding eaglefi pool address
const tokensPoolsMap = new PersistentMap<string, string>('tpools');
// Storage key for eaglefi swap router address
const EAGLE_SWAP_ROUTER_ADDRESS = 'ESAPR';

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

  const swapRouterAddress = args
    .nextString()
    .expect('swap router address expected');

  // Set the eaglefi swap router address
  Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, swapRouterAddress);

  // Set default tokens pools of eaglefi
  tokensPoolsMap.set(
    USDC_TOKEN_ADDRESS,
    'AS1p6ULD2dWxJ7G1U3D3dX95jHwgfXieRnLFRNRr4Hfq7XvA1qZf', // USDC/WMAS pool
  );

  tokensPoolsMap.set(
    WETH_TOKEN_ADDRESS,
    'AS184uE7Eq11Sg3KeQBD7jV9DkC75T3U5P6UEU1WEEZ7FHiesjsh', // WETH/WMAS pool
  );

  // Set the contract owner
  _setOwner(Context.caller().toString());

  // Initialize the reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

/**
 * Create a splitter vault that will split the deposited amount between the provided tokens according to their percentage.
 * @param binaryArgs - Arguments serialized with Args
 * - tokensWithPercentage: TokenWithPercentage[]
 */
export function createSplitterVault(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const tokensWithPercentage = args
    .nextSerializableObjectArray<TokenWithPercentage>()
    .expect('tokens with percentage expected');

  const initCoins = args.nextU64().expect('Splitter initial coins expected');

  const caller = Context.caller();

  const splitterVaultByteCode: StaticArray<u8> = fileToByteArray(
    'build/splitter.wasm',
  );

  const vaultAddress = createSC(splitterVaultByteCode);

  // Call the constructor of the splitter contract
  const splitterContract = new ISplitter(vaultAddress);

  splitterContract.init(tokensWithPercentage, caller, initCoins);

  // Store the unique key for the user and the vault
  const userVaultKey = generateSplitterUserKey(
    caller.toString(),
    vaultAddress.toString(),
  );
  Storage.set(userVaultKey, '1');

  // Emit an event with the address of the newly created splitter vault
  generateEvent(
    createEvent('CREATE_SPLITTER_VAULT', [
      vaultAddress.toString(),
      caller.toString(),
    ]),
  );

  ReentrancyGuard.endNonReentrant();
}

export function createAndDepositSplitterVault(
  binaryArgs: StaticArray<u8>,
): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  const tokensWithPercentage = args
    .nextSerializableObjectArray<TokenWithPercentage>()
    .expect('tokens with percentage expected');

  const initCoins = args.nextU64().expect('Splitter initial coins expected');

  const depositCoins = args.nextU64().expect('Deposit coins expected');

  const depositAmount = args.nextU256().expect('Deposit amount expected');

  const coinsToUse = args.nextU64().expect('coinsToUse expected');

  const deadline = args.nextU64().expect('deadline expected');

  const caller = Context.caller();

  const splitterVaultByteCode: StaticArray<u8> = fileToByteArray(
    'build/splitter.wasm',
  );

  const vaultAddress = createSC(splitterVaultByteCode);

  // Call the constructor of the splitter contract
  const splitterContract = new ISplitter(vaultAddress);

  splitterContract.init(tokensWithPercentage, caller, initCoins);

  // Store the unique key for the user and the vault
  const userVaultKey = generateSplitterUserKey(
    caller.toString(),
    vaultAddress.toString(),
  );
  Storage.set(userVaultKey, '1');

  // Start the deposit process
  const baseToken = new IMRC20(new Address(BASE_TOKEN_ADDRESS));

  // Transfer the tokens from the sender to this vault contract
  baseToken.transferFrom(
    Context.caller(),
    vaultAddress,
    depositAmount,
    getBalanceEntryCost(BASE_TOKEN_ADDRESS, vaultAddress.toString()),
  );

  // Call the deposit function of the splitter contract
  splitterContract.deposit(depositAmount, coinsToUse, deadline, depositCoins);

  // Emit an event with the address of the newly created splitter vault
  generateEvent(
    createEvent('CREATE_AND_DEPOSIT_SPLITTER_VAULT', [
      vaultAddress.toString(),
      caller.toString(),
      depositAmount.toString(),
    ]),
  );

  ReentrancyGuard.endNonReentrant();
}

export function getTokenPoolAddress(
  binaryArgs: StaticArray<u8>,
): StaticArray<u8> {
  const args = new Args(binaryArgs);

  const tokenAddress = args.nextString().expect('token address expected');

  const pool = tokensPoolsMap.get(tokenAddress, null);
  return pool ? stringToBytes(pool) : stringToBytes('');
}

export function setTokenPoolAddress(binaryArgs: StaticArray<u8>): void {
  // Only the owner can set the token pool address
  onlyOwner();

  const args = new Args(binaryArgs);

  const tokenAddress = args.nextString().expect('token address expected');
  const poolAddress = args.nextString().expect('pool address expected');

  tokensPoolsMap.set(tokenAddress, poolAddress);

  generateEvent(
    'Token pool address set: ' +
    tokenAddress +
    ' -> ' +
    poolAddress +
    ' by ' +
    Context.caller().toString(),
  );
}

export function setEagleSwapRouterAddress(binaryArgs: StaticArray<u8>): void {
  // Only the owner can set the eaglefi swap router address
  onlyOwner();

  const args = new Args(binaryArgs);

  const routerAddress = args.nextString().expect('router address expected');

  Storage.set(EAGLE_SWAP_ROUTER_ADDRESS, routerAddress);

  generateEvent(
    'EagleFi Swap Router address set to: ' +
    routerAddress +
    ' by ' +
    Context.caller().toString(),
  );
}

export function getEagleSwapRouterAddress(): StaticArray<u8> {
  const address = Storage.get(EAGLE_SWAP_ROUTER_ADDRESS);
  assert(address != null, 'SWAP_ROUTER_NOT_SET');
  return stringToBytes(address);
}

// ==================================
// AUTO-DEPOSIT FUNCTIONALITY
// ==================================

// Counter for generating unique schedule IDs
const AUTO_DEPOSIT_COUNTER_KEY = 'ADC';

/**
 * Generate a unique schedule ID
 */
function generateScheduleId(): u64 {
  // Use timestamp-based ID to avoid storage reads during gas estimation
  return Context.timestamp();
}

/**
 * Generate storage key for auto-deposit schedule
 * Format: ADS::{userAddress}::{scheduleId}
 */
function getScheduleKey(userAddress: string, scheduleId: u64): string {
  return 'ADS::' + userAddress + '::' + scheduleId.toString();
}

/**
 * Schedule recurring deposits to a vault
 * User approves the factory contract to spend tokens on their behalf
 * 
 * @param binaryArgs - Serialized args containing:
 *   - vaultAddress: string - Address of the vault to deposit to
 *   - amount: u256 - Amount to deposit each time (in base token smallest units)
 *   - intervalSeconds: u64 - Time between deposits in seconds (minimum 86400 = 24h)
 */
export function scheduleRecurringDeposit(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);

  const vaultAddress = new Address(
    args.nextString().expect('vault address expected')
  );
  const amount = args.nextU256().expect('amount expected');
  const intervalSeconds = args.nextU64().expect('interval expected');

  const caller = Context.caller();

  // Validate interval (minimum 5 minutes for testing, 24 hours for production)
  // In production, you may want to enforce 86400 (24 hours) minimum
  assert(
    intervalSeconds >= 300,
    'Interval must be at least 5 minutes (300 seconds)'
  );

  // Validate amount
  assert(amount > u256.Zero, 'Amount must be greater than zero');

  // NOTE: We don't check allowance here because:
  // 1. During gas estimation, approval hasn't happened yet
  // 2. The actual deposit execution will fail naturally if no allowance
  // 3. User should approve before scheduling (handled in frontend)

  // Generate unique schedule ID
  const scheduleId = generateScheduleId();

  // Calculate next execution time (current time + interval)
  // Context.timestamp() returns milliseconds, so convert intervalSeconds to milliseconds
  const currentTime = Context.timestamp();
  const nextExecutionTime = currentTime + (intervalSeconds * 1000);

  // Calculate target slot for deferred call
  // 1 period = 16 seconds = 16000 ms
  let periodsToWait = intervalSeconds / 16;
  const minBufferPeriods = u64(2); // ensure slot is at least ~32s in future
  if (periodsToWait < minBufferPeriods) {
    periodsToWait = minBufferPeriods;
  }

  const targetPeriod = Context.currentPeriod() + periodsToWait;
  const targetThread = Context.currentThread();
  const targetSlot = new Slot(targetPeriod, targetThread);

  const maxGas = 500000000; // 500M gas - increased for complex vault operations

  // Register deferred call for automatic execution
  const callArgs = new Args()
    .add(caller.toString())
    .add(scheduleId)
    .serialize();

  // Register the deferred call
  // The contract must have sufficient balance to pay for execution gas
  // DON'T send coins with the deferred call - use factory's balance instead
  const coinsForSwaps = u64(0); // No coins sent with deferred call

  const deferredCallId = deferredCallRegister(
    Context.callee().toString(),
    'executeScheduledDeposit',
    targetSlot,
    maxGas,
    callArgs,
    coinsForSwaps  // Send 1 MAS for vault deposit swaps
  );

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_DEFERRED_CALL_REGISTERED',
      [
        caller.toString(),
        scheduleId.toString(),
        targetSlot.period.toString(),
        targetSlot.thread.toString(),
        maxGas.toString(),
        balance().toString(),
        deferredCallId,
      ],
    ),
  );

  // Create and store schedule with deferred call ID
  const schedule = new AutoDepositSchedule();
  schedule.owner = caller;
  schedule.vaultAddress = vaultAddress;
  schedule.amount = amount;
  schedule.intervalSeconds = intervalSeconds;
  schedule.nextExecutionTime = nextExecutionTime;
  schedule.isActive = true;
  schedule.totalDeposits = u64(0);
  schedule.deferredCallId = deferredCallId;
  schedule.createdAt = Context.timestamp();

  const scheduleKey = stringToBytes(getScheduleKey(caller.toString(), scheduleId));
  Storage.set(scheduleKey, schedule.serialize());

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_SCHEDULED',
      [
        caller.toString(),
        vaultAddress.toString(),
        amount.toString(),
        intervalSeconds.toString(),
        scheduleId.toString(),
      ],
    ),
  );

  return new Args().add(scheduleId).serialize();
}

/**
 * Execute a scheduled deposit
 * This function is ONLY called automatically by the deferred call system
 * Users cannot call this directly - it's triggered on-chain at the scheduled time
 * 
 * @param binaryArgs - Serialized args containing:
 *   - ownerAddress: string - Address of the schedule owner
 *   - scheduleId: u64 - ID of the schedule to execute
 */
export function executeScheduledDeposit(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);

  const ownerAddress = args.nextString().expect('owner address expected');
  const scheduleId = args.nextU64().expect('schedule ID expected');

  const callerAddress = Context.caller().toString();
  const calleeAddress = Context.callee().toString();

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_EXECUTION_ATTEMPT',
      [
        ownerAddress,
        scheduleId.toString(),
        callerAddress,
        calleeAddress,
        Context.timestamp().toString(),
      ],
    ),
  );

  // CRITICAL: Only the contract itself can execute scheduled deposits (via deferred calls)
  assert(
    callerAddress == calleeAddress,
    'Only automated execution allowed - this function is called by deferred calls'
  );

  // Load schedule from storage
  const storageKey = stringToBytes(getScheduleKey(ownerAddress, scheduleId));
  const scheduleData = Storage.get(storageKey);

  assert(scheduleData != null, 'Schedule not found');

  const schedule = new AutoDepositSchedule();
  schedule.deserialize(scheduleData, 0);

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_DEBUG_SCHEDULE_LOADED',
      [
        ownerAddress,
        schedule.isActive.toString(),
        schedule.nextExecutionTime.toString(),
        Context.timestamp().toString(),
      ],
    ),
  );

  // Check if schedule is still active
  assert(schedule.isActive, 'Schedule is not active');

  // Check if it's time to execute (allow 30 second buffer for timing differences)
  const currentTime = Context.timestamp();
  const bufferMs = u64(30000); // 30 seconds buffer
  assert(
    currentTime + bufferMs >= schedule.nextExecutionTime,
    'Not yet time to execute this deposit'
  );

  // Transfer tokens from user to vault first
  // The vault will see isFromFactory=true and skip its own transferFrom
  // So we must do it here
  const baseToken = new IMRC20(new Address(BASE_TOKEN_ADDRESS));
  const vault = new ISplitter(schedule.vaultAddress);

  // CRITICAL: Must pay for balance entry storage cost!
  baseToken.transferFrom(
    schedule.owner,
    schedule.vaultAddress,
    schedule.amount,
    getBalanceEntryCost(BASE_TOKEN_ADDRESS, schedule.vaultAddress.toString())
  );

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_DEBUG_AFTER_TRANSFER',
      [ownerAddress, 'transferFrom_success'],
    ),
  );

  // CRITICAL: Transfer MAS directly to vault's balance so it can pay for swaps!
  // The vault needs MAS in its balance to forward to the EagleSwap router
  const coinsForVault = u64(500000000); // 0.5 MAS seed for upcoming swaps
  transferCoins(schedule.vaultAddress, coinsForVault);

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_DEBUG_AFTER_MAS_TRANSFER',
      [ownerAddress, coinsForVault.toString(), 'mas_transferred_to_vault'],
    ),
  );

  // Call vault's deposit function - vault will see isFromFactory=true and skip transferFrom
  // deposit(amount, coinsToUse, deadline, coins)
  const deadline = currentTime + 3600; // 1 hour deadline

  // CRITICAL: coinsToUse is the MAS amount PER SWAP (should be small like 0.02 MAS)
  const coinsToUsePerSwap = u64(20000000); // 0.02 MAS per swap (same as frontend)

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_DEBUG_BEFORE_VAULT_DEPOSIT',
      [
        ownerAddress,
        coinsForVault.toString(),
        coinsToUsePerSwap.toString(),
        deadline.toString(),
      ],
    ),
  );

  // Pass: amount, coinsToUse (per swap), deadline, coins (already transferred separately)
  vault.deposit(schedule.amount, coinsToUsePerSwap, deadline, u64(0));

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_DEBUG_AFTER_VAULT_DEPOSIT',
      [ownerAddress, 'vault_deposit_completed'],
    ),
  );

  // Update schedule for next execution
  schedule.totalDeposits += 1;
  schedule.nextExecutionTime = currentTime + (schedule.intervalSeconds * 1000); // Convert seconds to milliseconds

  // Register next deferred call for continued automation
  // Use same pattern as initial registration
  let periodsToWait = schedule.intervalSeconds / 16;
  const minBufferPeriods = u64(2);
  if (periodsToWait < minBufferPeriods) {
    periodsToWait = minBufferPeriods;
  }

  const nextPeriod = Context.currentPeriod() + periodsToWait;
  const nextThread = Context.currentThread();
  const nextSlot = new Slot(nextPeriod, nextThread);

  const nextMaxGas = 500000000; // 500M gas - increased for complex vault operations

  const nextCallArgs = new Args()
    .add(ownerAddress)
    .add(scheduleId)
    .serialize();

  const nextCoinsForSwaps = u64(0); // No coins sent with deferred call - use factory balance

  schedule.deferredCallId = deferredCallRegister(
    Context.callee().toString(),
    'executeScheduledDeposit',
    nextSlot,
    nextMaxGas,
    nextCallArgs,
    nextCoinsForSwaps  // Send 1 MAS for vault deposit swaps
  );

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_DEFERRED_CALL_REFRESHED',
      [
        ownerAddress,
        scheduleId.toString(),
        nextSlot.period.toString(),
        nextSlot.thread.toString(),
        nextMaxGas.toString(),
        balance().toString(),
        schedule.deferredCallId,
      ],
    ),
  );

  // Save updated schedule
  Storage.set(storageKey, schedule.serialize());

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_EXECUTED',
      [
        ownerAddress,
        schedule.vaultAddress.toString(),
        schedule.amount.toString(),
        schedule.totalDeposits.toString(),
      ],
    ),
  );
}

/**
 * Cancel an active auto-deposit schedule
 * 
 * @param binaryArgs - Serialized args containing:
 *   - scheduleId: u64 - ID of the schedule to cancel
 */
export function cancelDepositSchedule(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const scheduleId = args.nextU64().expect('schedule ID expected');

  const caller = Context.caller();
  const storageKey = stringToBytes(getScheduleKey(caller.toString(), scheduleId));
  const scheduleData = Storage.get(storageKey);

  assert(scheduleData != null, 'Schedule not found');

  const schedule = new AutoDepositSchedule();
  schedule.deserialize(scheduleData, 0);

  // Verify caller is the owner
  assert(
    schedule.owner.toString() == caller.toString(),
    'Only schedule owner can cancel'
  );

  // Cancel the deferred call if it exists
  if (schedule.deferredCallId.length > 0) {
    // Only attempt cancel if the deferred call still exists
    if (deferredCallExists(schedule.deferredCallId)) {
      deferredCallCancel(schedule.deferredCallId);
      generateEvent('Deferred call canceled: ' + schedule.deferredCallId);
    } else {
      // If it doesn't exist, emit an event and continue
      generateEvent('Deferred call does not exist (already executed or removed): ' + schedule.deferredCallId);
    }

    // Clear stored deferred call id to avoid future cancels
    schedule.deferredCallId = '';
  }

  // Mark as inactive
  schedule.isActive = false;
  Storage.set(storageKey, schedule.serialize());

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_CANCELLED',
      [caller.toString(), scheduleId.toString()],
    ),
  );
}

/**
 * Update an existing auto-deposit schedule
 * 
 * @param binaryArgs - Serialized args containing:
 *   - scheduleId: u64 - ID of the schedule to update
 *   - newAmount: u256 - New amount to deposit each time
 *   - newIntervalSeconds: u64 - New interval between deposits
 */
export function updateDepositSchedule(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const scheduleId = args.nextU64().expect('schedule ID expected');
  const newAmount = args.nextU256().expect('new amount expected');
  const newIntervalSeconds = args.nextU64().expect('new interval expected');

  const caller = Context.caller();
  const storageKey = stringToBytes(getScheduleKey(caller.toString(), scheduleId));
  const scheduleData = Storage.get(storageKey);

  assert(scheduleData != null, 'Schedule not found');

  const schedule = new AutoDepositSchedule();
  schedule.deserialize(scheduleData, 0);

  // Verify caller is the owner
  assert(
    schedule.owner.toString() == caller.toString(),
    'Only schedule owner can update'
  );

  // Validate new values
  assert(newAmount > u256.Zero, 'Amount must be greater than zero');
  assert(
    newIntervalSeconds >= 86400,
    'Interval must be at least 24 hours (86400 seconds)'
  );

  // Update schedule
  schedule.amount = newAmount;
  schedule.intervalSeconds = newIntervalSeconds;

  // Save updated schedule
  Storage.set(storageKey, schedule.serialize());

  generateEvent(
    createEvent(
      'AUTO_DEPOSIT_UPDATED',
      [
        caller.toString(),
        scheduleId.toString(),
        newAmount.toString(),
        newIntervalSeconds.toString(),
      ],
    ),
  );
}
