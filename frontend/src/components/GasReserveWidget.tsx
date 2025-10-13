import { useState } from "react";

export interface GasReserveData {
  balance: number; // Current gas balance in MAS
  estimatedOperations: number; // Estimated number of operations remaining
  lastUpdated: number; // Unix timestamp
}

export interface GasConsumptionRecord {
  timestamp: number;
  operationType: string;
  gasUsed: number;
}

interface GasReserveWidgetProps {
  gasReserve: number; // Current gas balance in MAS
  consumptionHistory?: GasConsumptionRecord[];
  estimatedGasPerOperation?: number; // Estimated gas per operation
  onAddGas?: () => void;
  showHistory?: boolean;
  warningThreshold?: number; // Threshold for low gas warning (default 0.5 MAS)
}

export default function GasReserveWidget({
  gasReserve,
  consumptionHistory = [],
  estimatedGasPerOperation = 0.1,
  onAddGas,
  showHistory = true,
  warningThreshold = 0.5,
}: GasReserveWidgetProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate estimated operations remaining
  const estimatedOperations = Math.floor(gasReserve / estimatedGasPerOperation);

  // Determine gas level status
  const isLow = gasReserve < warningThreshold;
  const isCritical = gasReserve < warningThreshold / 2;

  // Calculate average consumption if history available
  const avgConsumption =
    consumptionHistory.length > 0
      ? consumptionHistory.reduce((sum, record) => sum + record.gasUsed, 0) /
        consumptionHistory.length
      : estimatedGasPerOperation;

  // Calculate projected days remaining (assuming daily operations)
  const projectedDays = Math.floor(gasReserve / avgConsumption);

  // Get status color and message
  const getStatusColor = () => {
    if (isCritical) return "bg-red-100 border-red-500";
    if (isLow) return "bg-yellow-100 border-yellow-500";
    return "bg-green-100 border-green-500";
  };

  const getStatusIcon = () => {
    if (isCritical) return "🔴";
    if (isLow) return "⚠️";
    return "✅";
  };

  const getStatusText = () => {
    if (isCritical) return "Critical - Add gas immediately";
    if (isLow) return "Low - Consider adding gas";
    return "Healthy";
  };

  return (
    <div className={`brut-card ${getStatusColor()} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm">⛽ Gas Reserve</h4>
        <span className="text-xs">{getStatusIcon()}</span>
      </div>

      {/* Main Balance Display */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{gasReserve.toFixed(4)}</span>
          <span className="text-sm text-gray-600">MAS</span>
        </div>
        <p className="text-xs text-gray-600">{getStatusText()}</p>
      </div>

      {/* Estimated Operations */}
      <div className="brut-card bg-white p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Estimated Operations:</span>
          <span className="font-bold">{estimatedOperations}</span>
        </div>
        {consumptionHistory.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Projected Days:</span>
            <span className="font-bold">
              {projectedDays > 0 ? `~${projectedDays} days` : "< 1 day"}
            </span>
          </div>
        )}
      </div>

      {/* Add Gas Button */}
      {onAddGas && (
        <button
          onClick={onAddGas}
          className={`w-full brut-btn ${
            isCritical ? "bg-red-300" : isLow ? "bg-yellow-300" : "bg-blue-200"
          }`}
        >
          ➕ Add Gas Reserve
        </button>
      )}

      {/* Show Details Toggle */}
      {showHistory && consumptionHistory.length > 0 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-xs text-gray-600 hover:text-gray-800 underline"
        >
          {showDetails ? "Hide" : "Show"} Consumption History
        </button>
      )}

      {/* Consumption History */}
      {showDetails && showHistory && consumptionHistory.length > 0 && (
        <div className="brut-card bg-white p-3 space-y-2">
          <h5 className="font-bold text-xs text-gray-700">
            Recent Consumption
          </h5>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {consumptionHistory.slice(0, 10).map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs py-1 border-b border-gray-200 last:border-0"
              >
                <div>
                  <span className="font-semibold">{record.operationType}</span>
                  <span className="text-gray-500 ml-2">
                    {new Date(record.timestamp * 1000).toLocaleDateString()}
                  </span>
                </div>
                <span className="font-mono">
                  {record.gasUsed.toFixed(4)} MAS
                </span>
              </div>
            ))}
          </div>
          {consumptionHistory.length > 10 && (
            <p className="text-xs text-gray-500 text-center">
              Showing 10 of {consumptionHistory.length} records
            </p>
          )}
        </div>
      )}

      {/* Average Consumption */}
      {consumptionHistory.length > 0 && (
        <div className="text-xs text-gray-600 text-center">
          Avg: {avgConsumption.toFixed(4)} MAS per operation
        </div>
      )}
    </div>
  );
}
