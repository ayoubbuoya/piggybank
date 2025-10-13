import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';
import { AutomationFrequency } from '../lib/automation/AutomationTypes';

/**
 * Strategy type for savings strategies
 */
export enum StrategyType {
    ACCUMULATION = 0,  // Increasing deposits over time
    DISTRIBUTION = 1,  // Scheduled withdrawals
    HYBRID = 2,        // Both phases
}

/**
 * DCA (Dollar-Cost Averaging) Configuration
 * 
 * Stores configuration for automated periodic token purchases
 */
export class DCAConfig implements Serializable {
    constructor(
        public amount: u256 = u256.Zero,
        public frequency: u8 = <u8>AutomationFrequency.DAILY,
        public startTime: u64 = 0,
        public endTime: u64 = 0,
        public gasPerExecution: u64 = 0,
    ) { }

    serialize(): StaticArray<u8> {
        return new Args()
            .add(this.amount)
            .add(this.frequency)
            .add(this.startTime)
            .add(this.endTime)
            .add(this.gasPerExecution)
            .serialize();
    }

    deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
        const args = new Args(data, offset);

        this.amount = args.nextU256().expect('DCA amount expected');
        this.frequency = args.nextU8().expect('DCA frequency expected');
        this.startTime = args.nextU64().expect('DCA startTime expected');
        this.endTime = args.nextU64().expect('DCA endTime expected');
        this.gasPerExecution = args.nextU64().expect('DCA gasPerExecution expected');

        return new Result(args.offset);
    }
}

/**
 * Scheduled Deposit Configuration
 * 
 * Stores configuration for automated recurring deposits from user wallet
 */
export class ScheduledDepositConfig implements Serializable {
    constructor(
        public depositAmount: u256 = u256.Zero,
        public frequency: u8 = <u8>AutomationFrequency.DAILY,
        public sourceWallet: Address = new Address(),
        public startTime: u64 = 0,
        public endTime: u64 = 0,
        public maxRetries: u8 = 3,
        public gasPerExecution: u64 = 0,
    ) { }

    serialize(): StaticArray<u8> {
        return new Args()
            .add(this.depositAmount)
            .add(this.frequency)
            .add(this.sourceWallet)
            .add(this.startTime)
            .add(this.endTime)
            .add(this.maxRetries)
            .add(this.gasPerExecution)
            .serialize();
    }

    deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
        const args = new Args(data, offset);

        this.depositAmount = args.nextU256().expect('Deposit amount expected');
        this.frequency = args.nextU8().expect('Deposit frequency expected');
        this.sourceWallet = new Address(
            args.nextString().expect('Source wallet address expected')
        );
        this.startTime = args.nextU64().expect('Deposit startTime expected');
        this.endTime = args.nextU64().expect('Deposit endTime expected');
        this.maxRetries = args.nextU8().expect('Deposit maxRetries expected');
        this.gasPerExecution = args.nextU64().expect('Deposit gasPerExecution expected');

        return new Result(args.offset);
    }
}

/**
 * Savings Strategy Configuration
 * 
 * Stores configuration for custom savings strategies with accumulation/distribution phases
 */
export class SavingsStrategyConfig implements Serializable {
    constructor(
        public strategyType: u8 = <u8>StrategyType.ACCUMULATION,
        public baseAmount: u256 = u256.Zero,
        public growthRate: u8 = 0,
        public frequency: u8 = <u8>AutomationFrequency.MONTHLY,
        public distributionAddress: Address = new Address(),
        public phaseTransitionTime: u64 = 0,
        public startTime: u64 = 0,
        public endTime: u64 = 0,
        public gasPerExecution: u64 = 0,
    ) { }

    serialize(): StaticArray<u8> {
        return new Args()
            .add(this.strategyType)
            .add(this.baseAmount)
            .add(this.growthRate)
            .add(this.frequency)
            .add(this.distributionAddress)
            .add(this.phaseTransitionTime)
            .add(this.startTime)
            .add(this.endTime)
            .add(this.gasPerExecution)
            .serialize();
    }

    deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
        const args = new Args(data, offset);

        this.strategyType = args.nextU8().expect('Strategy type expected');
        this.baseAmount = args.nextU256().expect('Base amount expected');
        this.growthRate = args.nextU8().expect('Growth rate expected');
        this.frequency = args.nextU8().expect('Strategy frequency expected');
        this.distributionAddress = new Address(
            args.nextString().expect('Distribution address expected')
        );
        this.phaseTransitionTime = args.nextU64().expect('Phase transition time expected');
        this.startTime = args.nextU64().expect('Strategy startTime expected');
        this.endTime = args.nextU64().expect('Strategy endTime expected');
        this.gasPerExecution = args.nextU64().expect('Strategy gasPerExecution expected');

        return new Result(args.offset);
    }
}

/**
 * Automation Status
 * 
 * Provides a snapshot of current automation state for status queries
 */
export class AutomationStatus implements Serializable {
    constructor(
        public dcaEnabled: bool = false,
        public dcaNextExecution: u64 = 0,
        public dcaPurchasesCompleted: u32 = 0,
        public scheduledDepositEnabled: bool = false,
        public scheduledDepositNextExecution: u64 = 0,
        public savingsStrategyEnabled: bool = false,
        public savingsStrategyNextExecution: u64 = 0,
        public gasReserve: u64 = 0,
        public isPaused: bool = false,
    ) { }

    serialize(): StaticArray<u8> {
        return new Args()
            .add(this.dcaEnabled)
            .add(this.dcaNextExecution)
            .add(this.dcaPurchasesCompleted)
            .add(this.scheduledDepositEnabled)
            .add(this.scheduledDepositNextExecution)
            .add(this.savingsStrategyEnabled)
            .add(this.savingsStrategyNextExecution)
            .add(this.gasReserve)
            .add(this.isPaused)
            .serialize();
    }

    deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
        const args = new Args(data, offset);

        this.dcaEnabled = args.nextBool().expect('DCA enabled flag expected');
        this.dcaNextExecution = args.nextU64().expect('DCA next execution expected');
        this.dcaPurchasesCompleted = args.nextU32().expect('DCA purchases completed expected');
        this.scheduledDepositEnabled = args.nextBool().expect('Scheduled deposit enabled flag expected');
        this.scheduledDepositNextExecution = args.nextU64().expect('Scheduled deposit next execution expected');
        this.savingsStrategyEnabled = args.nextBool().expect('Savings strategy enabled flag expected');
        this.savingsStrategyNextExecution = args.nextU64().expect('Savings strategy next execution expected');
        this.gasReserve = args.nextU64().expect('Gas reserve expected');
        this.isPaused = args.nextBool().expect('Paused flag expected');

        return new Result(args.offset);
    }
}
