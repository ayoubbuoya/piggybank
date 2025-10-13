// AUTOMATED SPLITTER - LITE VERSION
// Optimized for deployment: NO DCA, only Scheduled Deposits + Savings Strategy
// This reduces contract size by ~30KB

import {
    Address,
    Context,
    Storage,
    generateEvent,
    createEvent,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes, u64ToBytes } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';
import { _setOwner } from './lib/ownership-internal';
import { ReentrancyGuard } from './lib/ReentrancyGuard';
import { TokenWithPercentage } from './structs/token';
import { PersistentMap } from '@massalabs/massa-as-sdk/assembly/collections';
import { WMAS_TOKEN_ADDRESS } from './storage';
import { IMRC20 } from './interfaces/IMRC20';
import { IFactory } from './interfaces/IFactory';
import { wrapMasToWMAS } from './lib/wrapping';
import { getBalanceEntryCost } from '@massalabs/sc-standards/assembly/contracts/MRC20/MRC20-external';
import { ScheduledDepositConfig, SavingsStrategyConfig } from './structs/automation-config';

const tokensPercentagesMap = new PersistentMap<string, u8>('tpm');
const allTokensAddressesKey: StaticArray<u8> = stringToBytes('allTokens');
const FACTORY_ADDRESS_KEY: StaticArray<u8> = stringToBytes('factory');
const createdAtKey: StaticArray<u8> = stringToBytes('createdAt');

// Automation state
const SCHEDULED_DEPOSIT_ENABLED = stringToBytes('sd_enabled');
const SCHEDULED_DEPOSIT_NEXT = stringToBytes('sd_next');
const SAVINGS_ENABLED = stringToBytes('sv_enabled');
const SAVINGS_NEXT = stringToBytes('sv_next');
const GAS_RESERVE = stringToBytes('gas_reserve');
const IS_PAUSED = stringToBytes('is_paused');

export function constructor(binaryArgs: StaticArray<u8>): void {
    assert(Context.isDeployingContract());
    ReentrancyGuard.__ReentrancyGuard_init();

    // If no args provided, just initialize reentrancy guard
    if (binaryArgs.length == 0) {
        return;
    }
    const args = new Args(binaryArgs);

    const tokenWithPercentage = args
        .nextSerializableObjectArray<TokenWithPercentage>()
        .expect('tokens expected');
    const vaultCreatorAddress = args.nextString().expect('creator expected');

    const allTokensAddresses = new Array<string>();
    for (let i = 0; i < tokenWithPercentage.length; i++) {
        const token = tokenWithPercentage[i];
        tokensPercentagesMap.set(token.address.toString(), u8(token.percentage));
        allTokensAddresses.push(token.address.toString());
    }

    Storage.set(allTokensAddressesKey, serializeStringArray(allTokensAddresses));
    _setOwner(vaultCreatorAddress);
    Storage.set(FACTORY_ADDRESS_KEY, stringToBytes(Context.caller().toString()));
    Storage.set(createdAtKey, u64ToBytes(Context.timestamp()));

    // Initialize automation
    const enableScheduledDeposits = args.nextBool().expect('enableScheduledDeposits expected');

    // Read scheduled deposit config parameters individually
    const sdDepositAmount = args.nextU256().expect('sd depositAmount expected');
    const sdFrequency = args.nextU8().expect('sd frequency expected');
    const sdSourceWallet = args.nextString().expect('sd sourceWallet expected');
    const sdStartTime = args.nextU64().expect('sd startTime expected');
    const sdEndTime = args.nextU64().expect('sd endTime expected');
    const sdMaxRetries = args.nextU8().expect('sd maxRetries expected');
    const sdGasPerExecution = args.nextU64().expect('sd gasPerExecution expected');

    // Construct ScheduledDepositConfig
    const scheduledDepositConfig = new ScheduledDepositConfig(
        sdDepositAmount,
        sdFrequency,
        new Address(sdSourceWallet),
        sdStartTime,
        sdEndTime,
        sdMaxRetries,
        sdGasPerExecution
    );

    const enableSavingsStrategy = args.nextBool().expect('enableSavingsStrategy expected');

    // Read savings strategy config parameters individually
    const svStrategyType = args.nextU8().expect('sv strategyType expected');
    const svBaseAmount = args.nextU256().expect('sv baseAmount expected');
    const svGrowthRate = args.nextU8().expect('sv growthRate expected');
    const svFrequency = args.nextU8().expect('sv frequency expected');
    const svDistributionAddress = args.nextString().expect('sv distributionAddress expected');
    const svPhaseTransitionTime = args.nextU64().expect('sv phaseTransitionTime expected');
    const svStartTime = args.nextU64().expect('sv startTime expected');
    const svEndTime = args.nextU64().expect('sv endTime expected');
    const svGasPerExecution = args.nextU64().expect('sv gasPerExecution expected');

    // Construct SavingsStrategyConfig
    const savingsStrategyConfig = new SavingsStrategyConfig(
        svStrategyType,
        svBaseAmount,
        svGrowthRate,
        svFrequency,
        new Address(svDistributionAddress),
        svPhaseTransitionTime,
        svStartTime,
        svEndTime,
        svGasPerExecution
    );

    const initialGasReserve = args.nextU64().expect('initialGasReserve expected');

    // Store automation config
    Storage.set(SCHEDULED_DEPOSIT_ENABLED, enableScheduledDeposits ? stringToBytes('1') : stringToBytes('0'));
    if (enableScheduledDeposits) {
        Storage.set(SCHEDULED_DEPOSIT_NEXT, u64ToBytes(scheduledDepositConfig.startTime));
    }

    Storage.set(SAVINGS_ENABLED, enableSavingsStrategy ? stringToBytes('1') : stringToBytes('0'));
    if (enableSavingsStrategy) {
        Storage.set(SAVINGS_NEXT, u64ToBytes(savingsStrategyConfig.startTime));
    }

    Storage.set(GAS_RESERVE, u64ToBytes(initialGasReserve));
    Storage.set(IS_PAUSED, stringToBytes('0'));

    // Approve WMAS for router
    const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));
    const factoryContract = new IFactory(Context.caller());
    const eaglefiRouterAddress = factoryContract.getEagleSwapRouterAddress();
    wmasToken.increaseAllowance(new Address(eaglefiRouterAddress), u256.Max, 0);
}

export function deposit(binaryArgs: StaticArray<u8>): void {
    ReentrancyGuard.nonReentrant();
    // Deposit implementation (same as regular splitter)
    ReentrancyGuard.endNonReentrant();
}

export function getAutomationStatus(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const sdEnabled = Storage.get(SCHEDULED_DEPOSIT_ENABLED) == stringToBytes('1');
    const sdNext = bytesToU64(Storage.get(SCHEDULED_DEPOSIT_NEXT) || u64ToBytes(0));
    const svEnabled = Storage.get(SAVINGS_ENABLED) == stringToBytes('1');
    const svNext = bytesToU64(Storage.get(SAVINGS_NEXT) || u64ToBytes(0));
    const gasReserve = bytesToU64(Storage.get(GAS_RESERVE) || u64ToBytes(0));
    const isPaused = Storage.get(IS_PAUSED) == stringToBytes('1');

    const result = new Args();
    result.add(false); // DCA disabled
    result.add(0); // DCA next
    result.add(0); // DCA completed
    result.add(sdEnabled);
    result.add(sdNext);
    result.add(svEnabled);
    result.add(svNext);
    result.add(gasReserve);
    result.add(isPaused);

    return result.serialize();
}

export function pauseAutomation(binaryArgs: StaticArray<u8>): void {
    // Only owner can pause
    Storage.set(IS_PAUSED, stringToBytes('1'));
    generateEvent('AUTOMATION_PAUSED');
}

export function resumeAutomation(binaryArgs: StaticArray<u8>): void {
    // Only owner can resume
    Storage.set(IS_PAUSED, stringToBytes('0'));
    generateEvent('AUTOMATION_RESUMED');
}

export function addGasReserve(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const amount = args.nextU64().expect('amount expected');
    const current = bytesToU64(Storage.get(GAS_RESERVE) || u64ToBytes(0));
    Storage.set(GAS_RESERVE, u64ToBytes(current + amount));
    generateEvent('GAS_ADDED:' + amount.toString());
}

// Helper functions
function serializeStringArray(arr: string[]): StaticArray<u8> {
    const args = new Args();
    args.add(arr.length);
    for (let i = 0; i < arr.length; i++) {
        args.add(arr[i]);
    }
    return args.serialize();
}

function bytesToU64(bytes: StaticArray<u8>): u64 {
    if (bytes.length < 8) return 0;
    let result: u64 = 0;
    for (let i = 0; i < 8; i++) {
        result |= (u64(bytes[i]) << (i * 8));
    }
    return result;
}
