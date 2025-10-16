// DCA (Dollar Cost Averaging) types for Dusa integration

export interface DCAConfig {
    amountEachDCA: string; // Amount in USDC per DCA execution
    interval: number; // Interval in seconds between executions
    nbOfDCA: number; // Total number of DCA executions
    tokenPath: string[]; // For USDC transfer, this would be [USDC_ADDRESS, VAULT_ADDRESS]
    threshold: number; // Slippage threshold (percentage * 100, e.g., 100 = 1%)
    moreGas: boolean; // Whether to use more gas for execution
    startIn: number; // Delay in seconds before first execution (0 = start immediately)
}

export interface DCAStatus {
    id: number;
    amountEachDCA: bigint;
    interval: number; // seconds
    nbOfDCA: number;
    tokenPath: string[];
    threshold: number;
    moreGas: boolean;
    startTime: number; // Unix timestamp
    endTime: number; // Unix timestamp
    executedCount: number;
    deferredCallId: string;
}

export interface DCAFormData {
    amount: string; // Amount per DCA
    frequency: 'daily' | 'weekly' | 'monthly';
    customInterval?: number; // For custom intervals in hours
    totalExecutions: number;
    startDelay: number; // Delay in hours (minimum 24 hours)
}

// Frequency presets in seconds (Dusa DCA requires minimum 24 hours)
export const DCA_FREQUENCIES = {
    daily: 86400, // 24 hours - minimum allowed
    weekly: 604800, // 7 days
    monthly: 2592000, // 30 days
} as const;

export interface DCAAnalytics {
    totalAmount: string; // Total USDC that will be DCA'd
    duration: string; // Human-readable duration
    nextExecution: Date | null;
    completionDate: Date | null;
    progress: number; // Percentage (0-100)
    averageAmount: string; // Average per execution
}
