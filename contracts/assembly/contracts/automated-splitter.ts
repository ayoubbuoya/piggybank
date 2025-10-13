// Automated Splitter Contract - Extends splitter with autonomous automation capabilities
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

// Import automation modules
import { AutomationEngine } from './lib/automation/AutomationEngine';
import { GasManager } from './lib/automation/GasManager';
import { DCAStrategy } from './lib/strategies/DCAStrategy';
import { ScheduledDepositStrategy } from './lib/strategies/ScheduledDepositStrategy';
import { SavingsStrategy } from './lib/strategies/SavingsStrategy';
import {
    DCAConfig,
    ScheduledDepositConfig,
    SavingsStrategyConfig,
    AutomationStatus,
} from './structs/automation-config';
import { AutomationError } from './lib/automation/AutomationTypes';
import {
    emitAutomationPaused,
    emitAutomationResumed,
    emitAutomationConfigUpdated,
    emitAutomationError
} from './lib/automation/AutomationEvents';

// Storage keys
const FACTORY_ADDRESS_KEY = 'factoryAddress';
const tokensPercentagesMap = new PersistentMap<string, u64>('tpm');
const allTokensAddressesKey: StaticArray<u8> =
    stringToBytes('allTokensAddresses');
const createdAtKey: StaticArray<u8> = stringToBytes('createdAt');

// Automation storage keys
const AUTOMATION_PAUSED_KEY: StaticArray<u8> = stringToBytes('automation_paused');

/**
 * Constructor for automated splitter vault
 * 
 * Creates a vault with optional automation capabilities including DCA,
 * scheduled deposits, and savings strategies.
 * 
 * @param binaryArgs - Serialized arguments containing:
 *   - tokenWithPercentage: Array of tokens and their allocation percentages
 *   - vaultCreatorAddress: Address of the vault owner
 *   - enableDCA: Boolean flag to enable DCA automation
 *   - dcaConfig: DCA configuration (if enabled)
 *   - enableScheduledDeposits: Boolean flag to enable scheduled deposits
 *   - scheduledDepositConfig: Scheduled deposit configuration (if enabled)
 *   - enableSavingsStrategy: Boolean flag to enable savings strategy
 *   - savingsStrategyConfig: Savings strategy configuration (if enabled)
 *   - initialGasReserve: Initial gas reserve for deferred operations
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
    // Ensure this function can only be called during deployment
    assert(Context.isDeployingContract());

    const args = new Args(binaryArgs);

    // Parse base vault parameters
    const tokenWithPercentage = args
        .nextSerializableObjectArray<TokenWithPercentage>()
        .expect('token with percentage expected');

    const vaultCreatorAddress = args
        .nextString()
        .expect('vault creator address expected');

    // Parse automation parameters
    const enableDCA = args.nextBool().expect('enableDCA flag expected');
    const dcaConfig = args
        .nextSerializable<DCAConfig>()
        .expect('DCA config expected');

    const enableScheduledDeposits = args
        .nextBool()
        .expect('enableScheduledDeposits flag expected');
    const scheduledDepositConfig = args
        .nextSerializable<ScheduledDepositConfig>()
        .expect('Scheduled deposit config expected');

    const enableSavingsStrategy = args
        .nextBool()
        .expect('enableSavingsStrategy flag expected');
    const savingsStrategyConfig = args
        .nextSerializable<SavingsStrategyConfig>()
        .expect('Savings strategy config expected');

    const initialGasReserve = args
        .nextU64()
        .expect('initialGasReserve expected');

    // Initialize base vault functionality
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

    // Increase max allowance of WMAS for the eaglefi router
    const wmasToken = new IMRC20(new Address(WMAS_TOKEN_ADDRESS));
    const factoryContract = new IFactory(caller);
    const eaglefiRouterAddress = factoryContract.getEagleSwapRouterAddress();

    // Create a u256 max value for allowance using Args serialization
    const maxAllowanceArgs = new Args().add(u64.MAX_VALUE);
    const maxAllowance = maxAllowanceArgs.nextU256().expect('max allowance');

    wmasToken.increaseAllowance(
        new Address(eaglefiRouterAddress),
        maxAllowance,
        getBalanceEntryCost(WMAS_TOKEN_ADDRESS, Context.callee().toString()),
    );

    // Initialize the reentrancy guard
    ReentrancyGuard.__ReentrancyGuard_init();

    // Initialize automation modules based on enabled flags

    // Set up initial gas reserve
    if (initialGasReserve > 0) {
        GasManager.depositGas(initialGasReserve);
    }

    // Initialize DCA if enabled
    if (enableDCA) {
        DCAStrategy.initialize(dcaConfig);
    }

    // Initialize scheduled deposits if enabled
    if (enableScheduledDeposits) {
        ScheduledDepositStrategy.initialize(scheduledDepositConfig);
    }

    // Initialize savings strategy if enabled
    if (enableSavingsStrategy) {
        SavingsStrategy.initialize(savingsStrategyConfig);
    }

    // Initialize automation as not paused
    Storage.set(AUTOMATION_PAUSED_KEY, [0]); // false

    // Emit vault creation event with automation info
    generateEvent(
        createEvent('AUTOMATED_VAULT_CREATED', [
            Context.callee().toString(),
            vaultCreatorAddress,
            enableDCA.toString(),
            enableScheduledDeposits.toString(),
            enableSavingsStrategy.toString(),
            initialGasReserve.toString(),
            Context.timestamp().toString(),
        ])
    );
}

/**
 * Deposit function - inherited from base splitter
 * 
 * Accepts deposits and distributes funds across configured tokens
 */
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
            // Convert amount to ensure type compatibility with wrapMasToWMAS
            const amountToWrap = u256.fromBytes(amount.toBytes());
            wrapMasToWMAS(amountToWrap, new Address(WMAS_TOKEN_ADDRESS));
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

    // Distribute the WMAS amount to the tokens according to their percentages

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
        // Convert amount to ensure type compatibility
        const amountConverted = u256.fromBytes(amount.toBytes());
        const tokenAmount = SafeMath256.div(
            SafeMath256.mul(amountConverted, u256.fromU64(percentage)),
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
        createEvent('DEPOSIT', [
            callerAddress.toString(),
            amount.toString(),
            isNative.toString(),
            deadline.toString(),
        ]),
    );

    // End Reentrancy Guard
    ReentrancyGuard.endNonReentrant();
}

/**
 * Withdraw function - inherited from base splitter
 * 
 * Allows owner to withdraw tokens from the vault
 */
export function withdraw(binaryArgs: StaticArray<u8>): void {
    ReentrancyGuard.nonReentrant();

    onlyOwner();

    const args = new Args(binaryArgs);

    const tokenAddress = args.nextString().expect('token address expected');
    const amount = args.nextU256().expect('amount expected');
    const toAddress = args.nextString().expect('to address expected');

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

// ============================================================================
// DEFERRED CALL ENTRY POINTS
// ============================================================================

/**
 * Deferred entry point for DCA execution
 * 
 * This function is called by the contract itself via deferred calls
 * to execute scheduled DCA purchases.
 */
export function executeDeferredDCA(): void {
    // Validate that this is a self-call
    if (!AutomationEngine.validateDeferredExecution()) {
        return;
    }

    // Check if automation is paused
    if (isAutomationPaused()) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.ALREADY_PAUSED,
            'Automation is paused',
            Context.timestamp().toString()
        );
        return;
    }

    // Reserve and consume gas for this operation
    if (!GasManager.reserveGasForOperation('DCA')) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.INSUFFICIENT_GAS,
            'Insufficient gas reserve for DCA execution',
            Context.timestamp().toString()
        );
        return;
    }

    // Execute DCA purchase
    DCAStrategy.executeDCAPurchase();
}

/**
 * Deferred entry point for scheduled deposit execution
 * 
 * This function is called by the contract itself via deferred calls
 * to execute scheduled deposits.
 */
export function executeDeferredDeposit(): void {
    // Validate that this is a self-call
    if (!AutomationEngine.validateDeferredExecution()) {
        return;
    }

    // Check if automation is paused
    if (isAutomationPaused()) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.ALREADY_PAUSED,
            'Automation is paused',
            Context.timestamp().toString()
        );
        return;
    }

    // Reserve and consume gas for this operation
    if (!GasManager.reserveGasForOperation('DEPOSIT')) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.INSUFFICIENT_GAS,
            'Insufficient gas reserve for scheduled deposit execution',
            Context.timestamp().toString()
        );
        return;
    }

    // Execute scheduled deposit
    ScheduledDepositStrategy.executeScheduledDeposit();
}

/**
 * Deferred entry point for savings strategy execution
 * 
 * This function is called by the contract itself via deferred calls
 * to execute savings strategy actions.
 */
export function executeDeferredStrategy(): void {
    // Validate that this is a self-call
    if (!AutomationEngine.validateDeferredExecution()) {
        return;
    }

    // Check if automation is paused
    if (isAutomationPaused()) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.ALREADY_PAUSED,
            'Automation is paused',
            Context.timestamp().toString()
        );
        return;
    }

    // Reserve and consume gas for this operation
    if (!GasManager.reserveGasForOperation('STRATEGY')) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.INSUFFICIENT_GAS,
            'Insufficient gas reserve for savings strategy execution',
            Context.timestamp().toString()
        );
        return;
    }

    // Execute savings strategy
    SavingsStrategy.executeStrategy();
}

// ============================================================================
// AUTOMATION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Pause all automation
 * 
 * Stops all scheduled operations. Only callable by vault owner.
 */
export function pauseAutomation(): void {
    onlyOwner();

    // Check if already paused
    if (isAutomationPaused()) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.ALREADY_PAUSED,
            'Automation is already paused',
            Context.timestamp().toString()
        );
        return;
    }

    // Set paused flag
    Storage.set(AUTOMATION_PAUSED_KEY, [1]); // true

    // Pause individual strategies
    if (DCAStrategy.isEnabled()) {
        DCAStrategy.pause();
    }

    if (ScheduledDepositStrategy.isEnabled()) {
        ScheduledDepositStrategy.pause();
    }

    if (SavingsStrategy.isEnabled()) {
        SavingsStrategy.pause();
    }

    // Emit paused event
    emitAutomationPaused(
        Context.callee().toString(),
        Context.timestamp().toString()
    );
}

/**
 * Resume all automation
 * 
 * Restarts all scheduled operations. Only callable by vault owner.
 */
export function resumeAutomation(): void {
    onlyOwner();

    // Check if not paused
    if (!isAutomationPaused()) {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.NOT_PAUSED,
            'Automation is not paused',
            Context.timestamp().toString()
        );
        return;
    }

    // Clear paused flag
    Storage.set(AUTOMATION_PAUSED_KEY, [0]); // false

    // Resume individual strategies
    if (DCAStrategy.isEnabled()) {
        DCAStrategy.resume();
    }

    if (ScheduledDepositStrategy.isEnabled()) {
        ScheduledDepositStrategy.resume();
    }

    if (SavingsStrategy.isEnabled()) {
        SavingsStrategy.resume();
    }

    // Emit resumed event
    emitAutomationResumed(
        Context.callee().toString(),
        Context.timestamp().toString()
    );
}

/**
 * Update automation configuration
 * 
 * Modifies automation settings and reschedules operations. Only callable by vault owner.
 * 
 * @param binaryArgs - Serialized arguments containing:
 *   - configType: Type of config to update ('DCA', 'DEPOSIT', 'STRATEGY')
 *   - config: New configuration object
 */
export function updateAutomationConfig(binaryArgs: StaticArray<u8>): void {
    onlyOwner();

    const args = new Args(binaryArgs);

    const configType = args.nextString().expect('config type expected');

    if (configType == 'DCA') {
        const dcaConfig = args
            .nextSerializable<DCAConfig>()
            .expect('DCA config expected');
        DCAStrategy.updateConfig(dcaConfig);
    } else if (configType == 'DEPOSIT') {
        const depositConfig = args
            .nextSerializable<ScheduledDepositConfig>()
            .expect('Scheduled deposit config expected');
        ScheduledDepositStrategy.updateConfig(depositConfig);
    } else if (configType == 'STRATEGY') {
        const strategyConfig = args
            .nextSerializable<SavingsStrategyConfig>()
            .expect('Savings strategy config expected');
        SavingsStrategy.updateConfig(strategyConfig);
    } else {
        emitAutomationError(
            Context.callee().toString(),
            AutomationError.INVALID_CONFIG,
            'Invalid config type: ' + configType,
            Context.timestamp().toString()
        );
        return;
    }

    // Emit config updated event
    emitAutomationConfigUpdated(
        Context.callee().toString(),
        configType,
        Context.timestamp().toString()
    );
}

/**
 * Add gas to the reserve
 * 
 * Deposits gas for future deferred operations.
 * 
 * @param binaryArgs - Serialized arguments containing:
 *   - amount: Amount of gas to add (in nanoMAS)
 */
export function addGasReserve(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);

    const amount = args.nextU64().expect('gas amount expected');

    // Deposit gas to reserve
    GasManager.depositGas(amount);

    // Emit gas added event (already emitted by GasManager)
}

/**
 * Get automation status
 * 
 * Returns the current state of all automation features.
 * 
 * @returns Serialized AutomationStatus object
 */
export function getAutomationStatus(): StaticArray<u8> {
    const status = new AutomationStatus();

    // DCA status
    status.dcaEnabled = DCAStrategy.isEnabled();
    status.dcaNextExecution = DCAStrategy.getNextExecution();
    status.dcaPurchasesCompleted = DCAStrategy.getPurchaseCount();

    // Scheduled deposit status
    status.scheduledDepositEnabled = ScheduledDepositStrategy.isEnabled();
    status.scheduledDepositNextExecution =
        ScheduledDepositStrategy.getNextExecution();

    // Savings strategy status
    status.savingsStrategyEnabled = SavingsStrategy.isEnabled();
    status.savingsStrategyNextExecution = SavingsStrategy.getNextExecution();

    // Gas reserve
    status.gasReserve = GasManager.getGasReserve();

    // Paused status
    status.isPaused = isAutomationPaused();

    return status.serialize();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if automation is paused
 * 
 * @returns true if automation is paused, false otherwise
 */
function isAutomationPaused(): bool {
    if (!Storage.has(AUTOMATION_PAUSED_KEY)) {
        return false;
    }
    const value = Storage.get(AUTOMATION_PAUSED_KEY);
    return value[0] == 1;
}
