import { useState, useEffect } from "react";
import { useAccountStore } from "@massalabs/react-ui-kit";

// Automation frequency options
export enum AutomationFrequency {
  DAILY = 0,
  WEEKLY = 1,
  BIWEEKLY = 2,
  MONTHLY = 3,
}

// Strategy types for savings strategies
export enum StrategyType {
  ACCUMULATION = 0,
  DISTRIBUTION = 1,
  HYBRID = 2,
}

// Configuration interfaces
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

interface AutomationConfigPanelProps {
  onConfigChange: (config: AutomationConfig) => void;
  onValidationChange: (isValid: boolean) => void;
}

const frequencyLabels: Record<AutomationFrequency, string> = {
  [AutomationFrequency.DAILY]: "Daily",
  [AutomationFrequency.WEEKLY]: "Weekly",
  [AutomationFrequency.BIWEEKLY]: "Bi-weekly",
  [AutomationFrequency.MONTHLY]: "Monthly",
};

const strategyTypeLabels: Record<StrategyType, string> = {
  [StrategyType.ACCUMULATION]: "Accumulation (Increasing deposits)",
  [StrategyType.DISTRIBUTION]: "Distribution (Scheduled withdrawals)",
  [StrategyType.HYBRID]: "Hybrid (Both phases)",
};

// Gas estimation constants (in MAS)
const GAS_ESTIMATES = {
  DCA_PER_EXECUTION: "0.1",
  DEPOSIT_PER_EXECUTION: "0.05",
  STRATEGY_PER_EXECUTION: "0.08",
  BASE_RESERVE: "1.0",
};

export default function AutomationConfigPanel({
  onConfigChange,
  onValidationChange,
}: AutomationConfigPanelProps) {
  const { connectedAccount } = useAccountStore();
  const [showPreview, setShowPreview] = useState(false);

  // DCA Configuration State
  const [dcaConfig, setDcaConfig] = useState<DCAConfigData>({
    enabled: false,
    amount: "",
    frequency: AutomationFrequency.WEEKLY,
    startTime: new Date(),
    endTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    gasPerExecution: GAS_ESTIMATES.DCA_PER_EXECUTION,
  });

  // Scheduled Deposit Configuration State
  const [depositConfig, setDepositConfig] =
    useState<ScheduledDepositConfigData>({
      enabled: false,
      depositAmount: "",
      frequency: AutomationFrequency.MONTHLY,
      sourceWallet: connectedAccount?.address || "",
      startTime: new Date(),
      endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      maxRetries: 3,
      gasPerExecution: GAS_ESTIMATES.DEPOSIT_PER_EXECUTION,
    });

  // Savings Strategy Configuration State
  const [strategyConfig, setStrategyConfig] =
    useState<SavingsStrategyConfigData>({
      enabled: false,
      strategyType: StrategyType.ACCUMULATION,
      baseAmount: "",
      growthRate: 5,
      frequency: AutomationFrequency.MONTHLY,
      distributionAddress: "",
      phaseTransitionTime: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      startTime: new Date(),
      endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      gasPerExecution: GAS_ESTIMATES.STRATEGY_PER_EXECUTION,
    });

  const [initialGasReserve, setInitialGasReserve] = useState(
    GAS_ESTIMATES.BASE_RESERVE
  );

  // Update source wallet when account changes
  useEffect(() => {
    if (connectedAccount) {
      setDepositConfig((prev) => ({
        ...prev,
        sourceWallet: connectedAccount.address,
      }));
    }
  }, [connectedAccount]);

  // Validation logic
  const validateConfig = (): boolean => {
    // If no automation is enabled, it's valid (user can create non-automated vault)
    if (
      !dcaConfig.enabled &&
      !depositConfig.enabled &&
      !strategyConfig.enabled
    ) {
      return true;
    }

    // DCA validation
    if (dcaConfig.enabled) {
      if (!dcaConfig.amount || parseFloat(dcaConfig.amount) <= 0) return false;
      if (dcaConfig.startTime >= dcaConfig.endTime) return false;
    }

    // Scheduled Deposit validation
    if (depositConfig.enabled) {
      if (
        !depositConfig.depositAmount ||
        parseFloat(depositConfig.depositAmount) <= 0
      )
        return false;
      if (!depositConfig.sourceWallet) return false;
      if (depositConfig.startTime >= depositConfig.endTime) return false;
    }

    // Savings Strategy validation
    if (strategyConfig.enabled) {
      if (
        !strategyConfig.baseAmount ||
        parseFloat(strategyConfig.baseAmount) <= 0
      )
        return false;
      if (strategyConfig.growthRate < 0 || strategyConfig.growthRate > 100)
        return false;
      if (strategyConfig.startTime >= strategyConfig.endTime) return false;

      if (
        strategyConfig.strategyType === StrategyType.DISTRIBUTION ||
        strategyConfig.strategyType === StrategyType.HYBRID
      ) {
        if (!strategyConfig.distributionAddress) return false;
      }
    }

    return true;
  };

  // Calculate total estimated gas cost
  const calculateTotalGasCost = (): string => {
    let total = parseFloat(initialGasReserve);

    if (dcaConfig.enabled) {
      const executions = calculateExecutionCount(
        dcaConfig.startTime,
        dcaConfig.endTime,
        dcaConfig.frequency
      );
      total += executions * parseFloat(dcaConfig.gasPerExecution);
    }

    if (depositConfig.enabled) {
      const executions = calculateExecutionCount(
        depositConfig.startTime,
        depositConfig.endTime,
        depositConfig.frequency
      );
      total += executions * parseFloat(depositConfig.gasPerExecution);
    }

    if (strategyConfig.enabled) {
      const executions = calculateExecutionCount(
        strategyConfig.startTime,
        strategyConfig.endTime,
        strategyConfig.frequency
      );
      total += executions * parseFloat(strategyConfig.gasPerExecution);
    }

    return total.toFixed(2);
  };

  // Calculate number of executions based on frequency
  const calculateExecutionCount = (
    startTime: Date,
    endTime: Date,
    frequency: AutomationFrequency
  ): number => {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (frequency) {
      case AutomationFrequency.DAILY:
        return Math.floor(diffDays);
      case AutomationFrequency.WEEKLY:
        return Math.floor(diffDays / 7);
      case AutomationFrequency.BIWEEKLY:
        return Math.floor(diffDays / 14);
      case AutomationFrequency.MONTHLY:
        return Math.floor(diffDays / 30);
      default:
        return 0;
    }
  };

  // Notify parent of config changes
  useEffect(() => {
    const config: AutomationConfig = {
      dca: dcaConfig,
      scheduledDeposit: depositConfig,
      savingsStrategy: strategyConfig,
      initialGasReserve,
    };
    onConfigChange(config);
    onValidationChange(validateConfig());
  }, [dcaConfig, depositConfig, strategyConfig, initialGasReserve]);

  // Format date for input
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16);
  };

  // Parse date from input
  const parseDateFromInput = (dateString: string): Date => {
    return new Date(dateString);
  };

  return (
    <div className="space-y-6">
      <div className="brut-card bg-blue-50 p-4">
        <h3 className="font-bold mb-2">⚡ Automation Features</h3>
        <p className="text-sm">
          Enable autonomous vault operations using Massa's deferred call
          functionality. Your vault will execute operations automatically
          without manual intervention.
        </p>
      </div>

      {/* DCA Configuration - Hidden in lite version */}
      {import.meta.env.VITE_DCA_ENABLED === "true" && (
        <div className="brut-card bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">Dollar-Cost Averaging (DCA)</h3>
              <p className="text-sm text-gray-600">
                Automatically purchase tokens at regular intervals
              </p>
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={dcaConfig.enabled}
                onChange={(e) =>
                  setDcaConfig({ ...dcaConfig, enabled: e.target.checked })
                }
                className="w-5 h-5 border-2 border-ink-950"
              />
              <span className="font-bold">Enable</span>
            </label>
          </div>

          {dcaConfig.enabled && (
            <div className="space-y-3 mt-4 pt-4 border-t-2 border-gray-200">
              <label className="block">
                <span className="font-bold text-sm">
                  Purchase Amount (WMAS)
                </span>
                <input
                  type="number"
                  value={dcaConfig.amount}
                  onChange={(e) =>
                    setDcaConfig({ ...dcaConfig, amount: e.target.value })
                  }
                  placeholder="e.g., 100"
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                  min="0"
                  step="0.01"
                />
              </label>

              <label className="block">
                <span className="font-bold text-sm">Frequency</span>
                <select
                  value={dcaConfig.frequency}
                  onChange={(e) =>
                    setDcaConfig({
                      ...dcaConfig,
                      frequency: parseInt(
                        e.target.value
                      ) as AutomationFrequency,
                    })
                  }
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                >
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-bold text-sm">Start Date</span>
                  <input
                    type="datetime-local"
                    value={formatDateForInput(dcaConfig.startTime)}
                    onChange={(e) =>
                      setDcaConfig({
                        ...dcaConfig,
                        startTime: parseDateFromInput(e.target.value),
                      })
                    }
                    className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                  />
                </label>

                <label className="block">
                  <span className="font-bold text-sm">End Date</span>
                  <input
                    type="datetime-local"
                    value={formatDateForInput(dcaConfig.endTime)}
                    onChange={(e) =>
                      setDcaConfig({
                        ...dcaConfig,
                        endTime: parseDateFromInput(e.target.value),
                      })
                    }
                    className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                  />
                </label>
              </div>

              <div className="brut-card bg-gray-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Estimated executions:</span>
                  <span className="font-bold">
                    {calculateExecutionCount(
                      dcaConfig.startTime,
                      dcaConfig.endTime,
                      dcaConfig.frequency
                    )}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Gas per execution:</span>
                  <span className="font-bold">
                    {dcaConfig.gasPerExecution} MAS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Deposit Configuration */}
      <div className="brut-card bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold">Scheduled Deposits</h3>
            <p className="text-sm text-gray-600">
              Automatically deposit from your wallet at regular intervals
            </p>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={depositConfig.enabled}
              onChange={(e) =>
                setDepositConfig({
                  ...depositConfig,
                  enabled: e.target.checked,
                })
              }
              className="w-5 h-5 border-2 border-ink-950"
            />
            <span className="font-bold">Enable</span>
          </label>
        </div>

        {depositConfig.enabled && (
          <div className="space-y-3 mt-4 pt-4 border-t-2 border-gray-200">
            <label className="block">
              <span className="font-bold text-sm">Deposit Amount (WMAS)</span>
              <input
                type="number"
                value={depositConfig.depositAmount}
                onChange={(e) =>
                  setDepositConfig({
                    ...depositConfig,
                    depositAmount: e.target.value,
                  })
                }
                placeholder="e.g., 500"
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                min="0"
                step="0.01"
              />
            </label>

            <label className="block">
              <span className="font-bold text-sm">Frequency</span>
              <select
                value={depositConfig.frequency}
                onChange={(e) =>
                  setDepositConfig({
                    ...depositConfig,
                    frequency: parseInt(e.target.value) as AutomationFrequency,
                  })
                }
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
              >
                {Object.entries(frequencyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-bold text-sm">Source Wallet</span>
              <input
                type="text"
                value={depositConfig.sourceWallet}
                onChange={(e) =>
                  setDepositConfig({
                    ...depositConfig,
                    sourceWallet: e.target.value,
                  })
                }
                placeholder="Wallet address"
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2 font-mono text-sm"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Deposits will be transferred from your connected wallet
              </p>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-bold text-sm">Start Date</span>
                <input
                  type="datetime-local"
                  value={formatDateForInput(depositConfig.startTime)}
                  onChange={(e) =>
                    setDepositConfig({
                      ...depositConfig,
                      startTime: parseDateFromInput(e.target.value),
                    })
                  }
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                />
              </label>

              <label className="block">
                <span className="font-bold text-sm">End Date</span>
                <input
                  type="datetime-local"
                  value={formatDateForInput(depositConfig.endTime)}
                  onChange={(e) =>
                    setDepositConfig({
                      ...depositConfig,
                      endTime: parseDateFromInput(e.target.value),
                    })
                  }
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                />
              </label>
            </div>

            <label className="block">
              <span className="font-bold text-sm">Max Retries on Failure</span>
              <input
                type="number"
                value={depositConfig.maxRetries}
                onChange={(e) =>
                  setDepositConfig({
                    ...depositConfig,
                    maxRetries: parseInt(e.target.value) || 0,
                  })
                }
                min="0"
                max="10"
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
              />
            </label>

            <div className="brut-card bg-yellow-50 p-3 text-sm">
              <p className="font-bold mb-1">⚠️ Important:</p>
              <p>
                You must approve the vault contract to spend WMAS tokens from
                your wallet. This approval will be requested during vault
                creation.
              </p>
            </div>

            <div className="brut-card bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Estimated executions:</span>
                <span className="font-bold">
                  {calculateExecutionCount(
                    depositConfig.startTime,
                    depositConfig.endTime,
                    depositConfig.frequency
                  )}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Gas per execution:</span>
                <span className="font-bold">
                  {depositConfig.gasPerExecution} MAS
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Savings Strategy Configuration */}
      <div className="brut-card bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold">Savings Strategy</h3>
            <p className="text-sm text-gray-600">
              Configure custom accumulation or distribution strategies
            </p>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={strategyConfig.enabled}
              onChange={(e) =>
                setStrategyConfig({
                  ...strategyConfig,
                  enabled: e.target.checked,
                })
              }
              className="w-5 h-5 border-2 border-ink-950"
            />
            <span className="font-bold">Enable</span>
          </label>
        </div>

        {strategyConfig.enabled && (
          <div className="space-y-3 mt-4 pt-4 border-t-2 border-gray-200">
            <label className="block">
              <span className="font-bold text-sm">Strategy Type</span>
              <select
                value={strategyConfig.strategyType}
                onChange={(e) =>
                  setStrategyConfig({
                    ...strategyConfig,
                    strategyType: parseInt(e.target.value) as StrategyType,
                  })
                }
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
              >
                {Object.entries(strategyTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-bold text-sm">Base Amount (WMAS)</span>
              <input
                type="number"
                value={strategyConfig.baseAmount}
                onChange={(e) =>
                  setStrategyConfig({
                    ...strategyConfig,
                    baseAmount: e.target.value,
                  })
                }
                placeholder="e.g., 1000"
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                min="0"
                step="0.01"
              />
            </label>

            <label className="block">
              <span className="font-bold text-sm">Growth Rate (%)</span>
              <input
                type="number"
                value={strategyConfig.growthRate}
                onChange={(e) =>
                  setStrategyConfig({
                    ...strategyConfig,
                    growthRate: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="e.g., 5"
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                For accumulation: percentage increase per period
              </p>
            </label>

            <label className="block">
              <span className="font-bold text-sm">Frequency</span>
              <select
                value={strategyConfig.frequency}
                onChange={(e) =>
                  setStrategyConfig({
                    ...strategyConfig,
                    frequency: parseInt(e.target.value) as AutomationFrequency,
                  })
                }
                className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
              >
                {Object.entries(frequencyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {(strategyConfig.strategyType === StrategyType.DISTRIBUTION ||
              strategyConfig.strategyType === StrategyType.HYBRID) && (
              <label className="block">
                <span className="font-bold text-sm">Distribution Address</span>
                <input
                  type="text"
                  value={strategyConfig.distributionAddress}
                  onChange={(e) =>
                    setStrategyConfig({
                      ...strategyConfig,
                      distributionAddress: e.target.value,
                    })
                  }
                  placeholder="AS1..."
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Address to receive distributed funds
                </p>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-bold text-sm">Start Date</span>
                <input
                  type="datetime-local"
                  value={formatDateForInput(strategyConfig.startTime)}
                  onChange={(e) =>
                    setStrategyConfig({
                      ...strategyConfig,
                      startTime: parseDateFromInput(e.target.value),
                    })
                  }
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                />
              </label>

              <label className="block">
                <span className="font-bold text-sm">End Date</span>
                <input
                  type="datetime-local"
                  value={formatDateForInput(strategyConfig.endTime)}
                  onChange={(e) =>
                    setStrategyConfig({
                      ...strategyConfig,
                      endTime: parseDateFromInput(e.target.value),
                    })
                  }
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                />
              </label>
            </div>

            {strategyConfig.strategyType === StrategyType.HYBRID && (
              <label className="block">
                <span className="font-bold text-sm">Phase Transition Date</span>
                <input
                  type="datetime-local"
                  value={formatDateForInput(strategyConfig.phaseTransitionTime)}
                  onChange={(e) =>
                    setStrategyConfig({
                      ...strategyConfig,
                      phaseTransitionTime: parseDateFromInput(e.target.value),
                    })
                  }
                  className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When to switch from accumulation to distribution
                </p>
              </label>
            )}

            <div className="brut-card bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Estimated executions:</span>
                <span className="font-bold">
                  {calculateExecutionCount(
                    strategyConfig.startTime,
                    strategyConfig.endTime,
                    strategyConfig.frequency
                  )}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Gas per execution:</span>
                <span className="font-bold">
                  {strategyConfig.gasPerExecution} MAS
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gas Reserve Configuration */}
      {(dcaConfig.enabled ||
        depositConfig.enabled ||
        strategyConfig.enabled) && (
        <div className="brut-card bg-lime-100 p-4">
          <h3 className="font-bold mb-3">⛽ Gas Reserve</h3>

          <label className="block mb-3">
            <span className="font-bold text-sm">Initial Gas Reserve (MAS)</span>
            <input
              type="number"
              value={initialGasReserve}
              onChange={(e) => setInitialGasReserve(e.target.value)}
              placeholder="e.g., 5.0"
              className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
              min="0"
              step="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Gas reserve for executing automated operations
            </p>
          </label>

          <div className="brut-card bg-white p-3 space-y-2 text-sm">
            <div className="flex justify-between font-bold text-base">
              <span>Total Estimated Gas Cost:</span>
              <span className="text-green-600">
                {calculateTotalGasCost()} MAS
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-200">
              <p>• Base reserve: {initialGasReserve} MAS</p>
              {dcaConfig.enabled && (
                <p>
                  • DCA executions:{" "}
                  {calculateExecutionCount(
                    dcaConfig.startTime,
                    dcaConfig.endTime,
                    dcaConfig.frequency
                  )}{" "}
                  × {dcaConfig.gasPerExecution} MAS
                </p>
              )}
              {depositConfig.enabled && (
                <p>
                  • Deposit executions:{" "}
                  {calculateExecutionCount(
                    depositConfig.startTime,
                    depositConfig.endTime,
                    depositConfig.frequency
                  )}{" "}
                  × {depositConfig.gasPerExecution} MAS
                </p>
              )}
              {strategyConfig.enabled && (
                <p>
                  • Strategy executions:{" "}
                  {calculateExecutionCount(
                    strategyConfig.startTime,
                    strategyConfig.endTime,
                    strategyConfig.frequency
                  )}{" "}
                  × {strategyConfig.gasPerExecution} MAS
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Preview */}
      {(dcaConfig.enabled ||
        depositConfig.enabled ||
        strategyConfig.enabled) && (
        <div className="space-y-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full brut-btn bg-blue-200"
          >
            {showPreview ? "Hide" : "Show"} Configuration Preview
          </button>

          {showPreview && (
            <div className="brut-card bg-white p-4 space-y-4">
              <h3 className="font-bold text-lg">Configuration Summary</h3>

              {dcaConfig.enabled && (
                <div className="brut-card bg-gray-50 p-3">
                  <h4 className="font-bold mb-2">DCA Configuration</h4>
                  <div className="text-sm space-y-1">
                    <p>• Amount: {dcaConfig.amount} WMAS</p>
                    <p>• Frequency: {frequencyLabels[dcaConfig.frequency]}</p>
                    <p>
                      • Duration: {dcaConfig.startTime.toLocaleDateString()} -{" "}
                      {dcaConfig.endTime.toLocaleDateString()}
                    </p>
                    <p>
                      • Total executions:{" "}
                      {calculateExecutionCount(
                        dcaConfig.startTime,
                        dcaConfig.endTime,
                        dcaConfig.frequency
                      )}
                    </p>
                  </div>
                </div>
              )}

              {depositConfig.enabled && (
                <div className="brut-card bg-gray-50 p-3">
                  <h4 className="font-bold mb-2">
                    Scheduled Deposit Configuration
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>• Amount: {depositConfig.depositAmount} WMAS</p>
                    <p>
                      • Frequency: {frequencyLabels[depositConfig.frequency]}
                    </p>
                    <p>
                      • Duration: {depositConfig.startTime.toLocaleDateString()}{" "}
                      - {depositConfig.endTime.toLocaleDateString()}
                    </p>
                    <p>
                      • Source: {depositConfig.sourceWallet.slice(0, 10)}...
                      {depositConfig.sourceWallet.slice(-8)}
                    </p>
                    <p>• Max retries: {depositConfig.maxRetries}</p>
                    <p>
                      • Total executions:{" "}
                      {calculateExecutionCount(
                        depositConfig.startTime,
                        depositConfig.endTime,
                        depositConfig.frequency
                      )}
                    </p>
                  </div>
                </div>
              )}

              {strategyConfig.enabled && (
                <div className="brut-card bg-gray-50 p-3">
                  <h4 className="font-bold mb-2">
                    Savings Strategy Configuration
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      • Type: {strategyTypeLabels[strategyConfig.strategyType]}
                    </p>
                    <p>• Base amount: {strategyConfig.baseAmount} WMAS</p>
                    <p>• Growth rate: {strategyConfig.growthRate}%</p>
                    <p>
                      • Frequency: {frequencyLabels[strategyConfig.frequency]}
                    </p>
                    <p>
                      • Duration:{" "}
                      {strategyConfig.startTime.toLocaleDateString()} -{" "}
                      {strategyConfig.endTime.toLocaleDateString()}
                    </p>
                    {(strategyConfig.strategyType ===
                      StrategyType.DISTRIBUTION ||
                      strategyConfig.strategyType === StrategyType.HYBRID) && (
                      <p>
                        • Distribution to:{" "}
                        {strategyConfig.distributionAddress.slice(0, 10)}...
                        {strategyConfig.distributionAddress.slice(-8)}
                      </p>
                    )}
                    <p>
                      • Total executions:{" "}
                      {calculateExecutionCount(
                        strategyConfig.startTime,
                        strategyConfig.endTime,
                        strategyConfig.frequency
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="brut-card bg-yellow-100 p-3">
                <p className="font-bold text-sm">
                  💰 Total Gas Required: {calculateTotalGasCost()} MAS
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Messages */}
      {!validateConfig() &&
        (dcaConfig.enabled ||
          depositConfig.enabled ||
          strategyConfig.enabled) && (
          <div className="brut-card bg-red-100 p-4">
            <p className="font-bold text-red-700">⚠️ Configuration Issues:</p>
            <ul className="text-sm text-red-600 mt-2 space-y-1">
              {dcaConfig.enabled &&
                (!dcaConfig.amount || parseFloat(dcaConfig.amount) <= 0) && (
                  <li>• DCA: Amount must be greater than 0</li>
                )}
              {dcaConfig.enabled &&
                dcaConfig.startTime >= dcaConfig.endTime && (
                  <li>• DCA: End date must be after start date</li>
                )}
              {depositConfig.enabled &&
                (!depositConfig.depositAmount ||
                  parseFloat(depositConfig.depositAmount) <= 0) && (
                  <li>• Scheduled Deposit: Amount must be greater than 0</li>
                )}
              {depositConfig.enabled &&
                depositConfig.startTime >= depositConfig.endTime && (
                  <li>
                    • Scheduled Deposit: End date must be after start date
                  </li>
                )}
              {strategyConfig.enabled &&
                (!strategyConfig.baseAmount ||
                  parseFloat(strategyConfig.baseAmount) <= 0) && (
                  <li>
                    • Savings Strategy: Base amount must be greater than 0
                  </li>
                )}
              {strategyConfig.enabled &&
                strategyConfig.startTime >= strategyConfig.endTime && (
                  <li>• Savings Strategy: End date must be after start date</li>
                )}
              {strategyConfig.enabled &&
                (strategyConfig.strategyType === StrategyType.DISTRIBUTION ||
                  strategyConfig.strategyType === StrategyType.HYBRID) &&
                !strategyConfig.distributionAddress && (
                  <li>• Savings Strategy: Distribution address is required</li>
                )}
            </ul>
          </div>
        )}
    </div>
  );
}
