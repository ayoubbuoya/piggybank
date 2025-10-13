interface LowGasWarningBannerProps {
  gasReserve: number;
  requiredGas?: number;
  onAddGas?: () => void;
  onDismiss?: () => void;
  criticalThreshold?: number; // Default 0.25 MAS
  warningThreshold?: number; // Default 0.5 MAS
}

export default function LowGasWarningBanner({
  gasReserve,
  requiredGas,
  onAddGas,
  onDismiss,
  criticalThreshold = 0.25,
  warningThreshold = 0.5,
}: LowGasWarningBannerProps) {
  // Don't show if gas is sufficient
  if (gasReserve >= warningThreshold) {
    return null;
  }

  const isCritical = gasReserve < criticalThreshold;

  // Calculate how many operations are left
  const estimatedOpsLeft = requiredGas
    ? Math.floor(gasReserve / requiredGas)
    : null;

  return (
    <div
      className={`brut-card ${
        isCritical
          ? "bg-red-100 border-red-600"
          : "bg-yellow-100 border-yellow-600"
      } p-4 mb-4 animate-pulse`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-3xl flex-shrink-0">{isCritical ? "🚨" : "⚠️"}</div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div>
            <h3
              className={`font-bold text-lg ${
                isCritical ? "text-red-800" : "text-yellow-800"
              }`}
            >
              {isCritical
                ? "Critical: Gas Reserve Depleted"
                : "Warning: Low Gas Reserve"}
            </h3>
            <p
              className={`text-sm ${
                isCritical ? "text-red-700" : "text-yellow-700"
              }`}
            >
              {isCritical
                ? "Your automation will stop working soon. Add gas immediately to continue operations."
                : "Your gas reserve is running low. Add more gas to ensure uninterrupted automation."}
            </p>
          </div>

          {/* Gas Details */}
          <div className="brut-card bg-white p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Current Gas Reserve:</span>
              <span className="font-bold font-mono">
                {gasReserve.toFixed(4)} MAS
              </span>
            </div>
            {requiredGas && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Gas per Operation:</span>
                  <span className="font-mono">
                    {requiredGas.toFixed(4)} MAS
                  </span>
                </div>
                {estimatedOpsLeft !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Operations Remaining:</span>
                    <span
                      className={`font-bold ${
                        estimatedOpsLeft === 0
                          ? "text-red-600"
                          : estimatedOpsLeft < 3
                          ? "text-yellow-600"
                          : "text-gray-800"
                      }`}
                    >
                      ~{estimatedOpsLeft}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recommended Action */}
          <div
            className={`text-sm font-semibold ${
              isCritical ? "text-red-800" : "text-yellow-800"
            }`}
          >
            💡 Recommended: Add at least {(warningThreshold * 2).toFixed(2)} MAS
            to ensure smooth operation
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && !isCritical && (
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
            aria-label="Dismiss warning"
          >
            ✕
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        {onAddGas && (
          <button
            onClick={onAddGas}
            className={`flex-1 brut-btn ${
              isCritical ? "bg-red-400" : "bg-yellow-400"
            } font-bold`}
          >
            ➕ Add Gas Now
          </button>
        )}
      </div>
    </div>
  );
}
