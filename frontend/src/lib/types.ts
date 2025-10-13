import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3';

// TokenWithPercentage class for smart contract interaction
export class TokenWithPercentage implements Serializable<TokenWithPercentage> {
  constructor(public address: string = '', public percentage: bigint = 0n) { }

  serialize(): Uint8Array {
    const args = new Args()
      .addString(this.address)
      .addU64(this.percentage)
      .serialize();

    return new Uint8Array(args);
  }

  deserialize(
    data: Uint8Array,
    offset: number,
  ): DeserializedResult<TokenWithPercentage> {
    const args = new Args(data, offset);

    this.address = args.nextString();
    this.percentage = args.nextU64();

    return { instance: this, offset: args.getOffset() };
  }

  toString(): string {
    return `TokenWithPercentage { address: ${this.address}, percentage: ${this.percentage} }`;
  }
}

// Frontend types for form handling
export interface TokenSelection {
  address: string;
  symbol: string;
  name: string;
  logo: string;
  percentage: number;
  isSelected: boolean;
}

export interface VaultFormData {
  name: string;
  tokens: TokenSelection[];
}

export interface VaultInfo {
  address: string;
  name: string;
  tokens: TokenSelection[];
  createdAt: Date;
  totalDeposited: string;
}

// Predefined tokens for Massa network
export const AVAILABLE_TOKENS: Omit<TokenSelection, 'percentage' | 'isSelected'>[] = [
  {
    address: 'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU',
    symbol: 'WMAS',
    name: 'Wrapped MAS',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/23862.png'
  },
  {
    address: 'AS12N76WPYB3QNYKGhV2jZuQs1djdhNJLQgnm7m52pHWecvvj1fCQ',
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png'
  },
  {
    address: 'AS12rcqHGQ3bPPhnjBZsYiANv9TZxYp96M7r49iTMUrX8XCJQ8Wrk',
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png'
  }
];

// Automation-related types
export enum AutomationFrequency {
  DAILY = 0,
  WEEKLY = 1,
  BIWEEKLY = 2,
  MONTHLY = 3,
}

export enum StrategyType {
  ACCUMULATION = 0,
  DISTRIBUTION = 1,
  HYBRID = 2,
}

export interface DCAConfigData {
  enabled: boolean;
  amount: string;
  frequency: AutomationFrequency;
  startTime: Date;
  endTime: Date;
  gasPerExecution: string;
}

export interface ScheduledDepositConfigData {
  enabled: boolean;
  depositAmount: string;
  frequency: AutomationFrequency;
  sourceWallet: string;
  startTime: Date;
  endTime: Date;
  maxRetries: number;
  gasPerExecution: string;
}

export interface SavingsStrategyConfigData {
  enabled: boolean;
  strategyType: StrategyType;
  baseAmount: string;
  growthRate: number;
  frequency: AutomationFrequency;
  distributionAddress: string;
  phaseTransitionTime: Date;
  startTime: Date;
  endTime: Date;
  gasPerExecution: string;
}

export interface AutomationConfig {
  dca: DCAConfigData;
  scheduledDeposit: ScheduledDepositConfigData;
  savingsStrategy: SavingsStrategyConfigData;
  initialGasReserve: string;
}
