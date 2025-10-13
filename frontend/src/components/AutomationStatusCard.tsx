import { useState, useEffect } from "react";

// Automation frequency labels
const frequencyLabels: Record<number, string> = {
  0: "Daily",
  1: "Weekly",
  2: "Bi-weekly",
  3: "Monthly",
};

// Strategy type labels
const strategyTypeLabels: Record<number, string> = {
  0: "Accumulation",
  1: "Distribution",
  2: "Hybrid",
};

export interface AutomationStatusData {
  dcaEnabled: boolean;
  dcaNextExecution: number; // Unix timestamp in seconds
  dcaPurchasesCompleted: number;
  scheduledDepositEnabled: boolean;
  scheduledDepositNextExecution: number;
  savingsStrategyEnabled: boolean;
  savingsStrategyNextExecution: number;
  gasReserve: number; // In MAS
  isPaused: boolean;
}

export interface AutomationConfig {
  dca?: {
    amount: string;
    frequency: number;
  };
  scheduledDeposit?: {
    depositAmount: string;
    frequency: number;
  };
  savingsStrategy?: {
    strategyType: number;
    baseAmount: string;
    frequency: number;
  };
}

interface AutomationStatusCardProps {
  status: AutomationStatusData;
  config?: AutomationConfig;
  onPause?: () => void;
  onResume?: () => void;
  onAddGas?: () => void;
}

export default function AutomationStatusCard({
  status,
  config,
  onPause,
  onResume,
  onAddGas,
}: AutomationStatusCardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format countdown timer
  const formatCountdown = (timestamp: number): string => {
    if (timestamp === 0) return "Not scheduled";

    const now = Math.floor(currentTime / 1000);
    const diff = timestamp - now;

    if (diff <= 0) return "Executing soon...";

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return "Not scheduled";
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Check if gas is low (less than 20% of estimated needed)
  const isGasLow = status.gasReserve < 0.5;

  const hasActiveAutomation =
    status.dcaEnabled ||
    status.scheduledDepositEnabled ||
    status.savingsStrategyEnabled;

  if (!hasActiveAutomation) {
    return (
      <div className="brut-card bg-gray-50 p-6">
        <h3 className="font-bold text-lg mb-2">⚙️ Automation Status</h3>
        <p className="text-gray-600">
          No automation configured for this vault.
        </p>
      </div>
    );
  }

  return (
    <div className="brut-card bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">⚙️ Automation Status</h3>
        <div className="flex items-center gap-2">
          {status.isPaused ? (
            <span className="brut-btn bg-yellow-200 text-xs">⏸️ Paused</span>
          ) : (
            <span className="brut-btn bg-lime-200 text-xs">▶️ Active</span>
          )}
        </div>
      </div>

      {/* Gas Reserve Warning */}
      {isGasLow && (
        <div className="brut-card bg-red-100 border-red-500 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-red-700">⚠️ Low Gas Reserve</p>
              <p className="text-sm text-red-600">
                Current: {status.gasReserve.toFixed(4)} MAS
              </p>
            </div>
            {onAddGas && (
              <button
                onClick={onAddGas}
                className="brut-btn bg-red-300 text-sm"
              >
                Add Gas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Gas Reserve Display */}
      <div className="brut-card bg-blue-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Gas Reserve</p>
            <p className="text-xl font-bold">
              {status.gasReserve.toFixed(4)} MAS
            </p>
          </div>
          {onAddGas && !isGasLow && (
            <button onClick={onAddGas} className="brut-btn bg-blue-200 text-sm">
              Add Gas
            </button>
          )}
        </div>
      </div>

      {/* DCA Status */}
      {status.dcaEnabled && (
        <div className="border-2 border-ink-950 rounded-lg p-4 bg-purple-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold">💰 Dollar-Cost Averaging</h4>
            {!status.isPaused && (
              <span className="text-xs bg-purple-200 px-2 py-1 rounded">
                Active
              </span>
            )}
          </div>

          {config?.dca && (
            <div className="text-sm space-y-1 mb-3">
              <p className="text-gray-600">
                <span className="font-semibold">Amount:</span>{" "}
                {config.dca.amount} WMAS
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Frequency:</span>{" "}
                {frequencyLabels[config.dca.frequency] || "Unknown"}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Purchases Completed:</span>{" "}
                {status.dcaPurchasesCompleted}
              </p>
            </div>
          )}

          <div className="brut-card bg-white p-3">
            <p className="text-xs text-gray-500 mb-1">Next Execution</p>
            <p className="font-bold text-purple-700">
              {formatCountdown(status.dcaNextExecution)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(status.dcaNextExecution)}
            </p>
          </div>
        </div>
      )}

      {/* Scheduled Deposit Status */}
      {status.scheduledDepositEnabled && (
        <div className="border-2 border-ink-950 rounded-lg p-4 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold">📅 Scheduled Deposits</h4>
            {!status.isPaused && (
              <span className="text-xs bg-green-200 px-2 py-1 rounded">
                Active
              </span>
            )}
          </div>

          {config?.scheduledDeposit && (
            <div className="text-sm space-y-1 mb-3">
              <p className="text-gray-600">
                <span className="font-semibold">Amount:</span>{" "}
                {config.scheduledDeposit.depositAmount} WMAS
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Frequency:</span>{" "}
                {frequencyLabels[config.scheduledDeposit.frequency] ||
                  "Unknown"}
              </p>
            </div>
          )}

          <div className="brut-card bg-white p-3">
            <p className="text-xs text-gray-500 mb-1">Next Execution</p>
            <p className="font-bold text-green-700">
              {formatCountdown(status.scheduledDepositNextExecution)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(status.scheduledDepositNextExecution)}
            </p>
          </div>
        </div>
      )}

      {/* Savings Strategy Status */}
      {status.savingsStrategyEnabled && (
        <div className="border-2 border-ink-950 rounded-lg p-4 bg-yellow-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold">🎯 Savings Strategy</h4>
            {!status.isPaused && (
              <span className="text-xs bg-yellow-200 px-2 py-1 rounded">
                Active
              </span>
            )}
          </div>

          {config?.savingsStrategy && (
            <div className="text-sm space-y-1 mb-3">
              <p className="text-gray-600">
                <span className="font-semibold">Type:</span>{" "}
                {strategyTypeLabels[config.savingsStrategy.strategyType] ||
                  "Unknown"}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Base Amount:</span>{" "}
                {config.savingsStrategy.baseAmount} WMAS
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Frequency:</span>{" "}
                {frequencyLabels[config.savingsStrategy.frequency] || "Unknown"}
              </p>
            </div>
          )}

          <div className="brut-card bg-white p-3">
            <p className="text-xs text-gray-500 mb-1">Next Execution</p>
            <p className="font-bold text-yellow-700">
              {formatCountdown(status.savingsStrategyNextExecution)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(status.savingsStrategyNextExecution)}
            </p>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 pt-2">
        {status.isPaused
          ? onResume && (
              <button
                onClick={onResume}
                className="flex-1 brut-btn bg-lime-300"
              >
                ▶️ Resume Automation
              </button>
            )
          : onPause && (
              <button
                onClick={onPause}
                className="flex-1 brut-btn bg-yellow-300"
              >
                ⏸️ Pause Automation
              </button>
            )}
      </div>
    </div>
  );
}
