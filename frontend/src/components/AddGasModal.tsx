import { useState, useEffect } from "react";

interface AddGasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
  currentBalance: number;
  estimatedGasPerOperation?: number;
  minAmount?: number;
  maxAmount?: number;
}

export default function AddGasModal({
  isOpen,
  onClose,
  onConfirm,
  currentBalance,
  estimatedGasPerOperation = 0.1,
  minAmount = 0.1,
  maxAmount = 100,
}: AddGasModalProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Calculate new balance and estimated operations
  const amountNum = parseFloat(amount) || 0;
  const newBalance = currentBalance + amountNum;
  const estimatedOperations = Math.floor(newBalance / estimatedGasPerOperation);

  // Validate amount
  const validateAmount = (): boolean => {
    if (!amount || amountNum <= 0) {
      setError("Please enter a valid amount");
      return false;
    }
    if (amountNum < minAmount) {
      setError(`Minimum amount is ${minAmount} MAS`);
      return false;
    }
    if (amountNum > maxAmount) {
      setError(`Maximum amount is ${maxAmount} MAS`);
      return false;
    }
    setError("");
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAmount()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm(amountNum);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add gas reserve"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = [0.5, 1, 2, 5];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="brut-card bg-white max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">⛽ Add Gas Reserve</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Current Balance */}
        <div className="brut-card bg-blue-50 p-3">
          <p className="text-sm text-gray-600">Current Gas Reserve</p>
          <p className="text-2xl font-bold">{currentBalance.toFixed(4)} MAS</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Amount to Add (MAS)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={validateAmount}
              placeholder="0.00"
              step="0.01"
              min={minAmount}
              max={maxAmount}
              className="w-full brut-input text-lg"
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Min: {minAmount} MAS | Max: {maxAmount} MAS
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-semibold mb-2">Quick Select</p>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="brut-btn bg-gray-100 text-sm"
                  disabled={isSubmitting}
                >
                  {quickAmount} MAS
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {amountNum > 0 && (
            <div className="brut-card bg-green-50 p-3 space-y-2">
              <h3 className="font-bold text-sm">Preview</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className="font-mono">
                    {currentBalance.toFixed(4)} MAS
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Adding:</span>
                  <span className="font-mono text-green-600">
                    +{amountNum.toFixed(4)} MAS
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-1 mt-1"></div>
                <div className="flex items-center justify-between font-bold">
                  <span>New Balance:</span>
                  <span className="font-mono">{newBalance.toFixed(4)} MAS</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Estimated Operations:</span>
                  <span>~{estimatedOperations}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="brut-card bg-red-100 border-red-500 p-3">
              <p className="text-sm text-red-700">⚠️ {error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 brut-btn bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 brut-btn bg-lime-300"
              disabled={isSubmitting || !amount || amountNum <= 0}
            >
              {isSubmitting ? "Adding..." : "Confirm"}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="text-xs text-gray-500 text-center">
          💡 Gas reserves are used to pay for automated operations. Add enough
          to cover multiple operations.
        </div>
      </div>
    </div>
  );
}
