/**
 * Automation frequency options for scheduling recurring operations
 */
export enum AutomationFrequency {
    DAILY = 0,
    WEEKLY = 1,
    BIWEEKLY = 2,
    MONTHLY = 3,
}

/**
 * Automation error constants for error handling and event emission
 */
export class AutomationError {
    static readonly INSUFFICIENT_GAS: string = "INSUFFICIENT_GAS_RESERVE";
    static readonly UNAUTHORIZED_CALLER: string = "UNAUTHORIZED_DEFERRED_CALL";
    static readonly INSUFFICIENT_BALANCE: string = "INSUFFICIENT_VAULT_BALANCE";
    static readonly SWAP_FAILED: string = "TOKEN_SWAP_FAILED";
    static readonly DEPOSIT_FAILED: string = "SCHEDULED_DEPOSIT_FAILED";
    static readonly INVALID_CONFIG: string = "INVALID_AUTOMATION_CONFIG";
    static readonly ALREADY_PAUSED: string = "AUTOMATION_ALREADY_PAUSED";
    static readonly NOT_PAUSED: string = "AUTOMATION_NOT_PAUSED";
}
