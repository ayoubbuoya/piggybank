import { useState } from "react";
import { useAccountStore } from "@massalabs/react-ui-kit";
import { depositToVault, approveWMASSpending } from "../lib/massa";

interface VaultDepositProps {
  vaultAddress: string;
  vaultName: string;
  onSuccess?: () => void;
}

export default function VaultDeposit({ vaultAddress, vaultName, onSuccess }: VaultDepositProps) {
  const [amount, setAmount] = useState("");
  const [isNative, setIsNative] = useState(true);
  const [loading, setLoading] = useState(false);

  const { connectedAccount } = useAccountStore();

  const handleDeposit = async () => {
    if (!connectedAccount) {
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    setLoading(true);

    try {
      // If depositing WMAS tokens (not native), approve spending first
      if (!isNative) {
        console.log("Approving WMAS spending...");
        const approvalResult = await approveWMASSpending(connectedAccount, vaultAddress, amount);
        
        if (!approvalResult.success) {
          setLoading(false);
          return;
        }
        
        console.log("WMAS spending approved successfully");
      }

      // Now proceed with the deposit
      const result = await depositToVault(connectedAccount, vaultAddress, amount, isNative);

      if (result.success) {
        setAmount("");
        onSuccess?.();
      }
    } catch (err) {
      console.error("Error depositing:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brut-card bg-white p-4">
      <h3 className="font-bold text-lg mb-3">Deposit to {vaultName}</h3>
      
      <div className="space-y-3">
        <label className="block">
          <span className="font-bold text-sm">Amount</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount to deposit"
            className="mt-1 w-full border-2 border-ink-950 rounded-lg p-2"
            min="0"
            step="0.001"
          />
        </label>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="depositType"
              checked={isNative}
              onChange={() => setIsNative(true)}
              className="w-4 h-4"
            />
            <span className="text-sm">
              Deposit native MAS (will be wrapped to WMAS)
            </span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="depositType"
              checked={!isNative}
              onChange={() => setIsNative(false)}
              className="w-4 h-4"
            />
            <span className="text-sm">
              Deposit WMAS tokens (requires approval)
            </span>
          </label>
        </div>

        <button
          onClick={handleDeposit}
          disabled={!connectedAccount || !amount || parseFloat(amount) <= 0 || loading}
          className="w-full brut-btn bg-lime-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading
            ? "Processing..."
            : (isNative ? "Deposit MAS" : "Approve & Deposit WMAS")
          }
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-600">
        <p>• Your deposit will be automatically split across configured tokens</p>
        <p>• Swapping happens via EagleFi DEX</p>
        <p>• Gas fees will be deducted from the deposit</p>
        {!isNative && (
          <p>• WMAS deposits require two transactions: approval + deposit</p>
        )}
      </div>
    </div>
  );
}