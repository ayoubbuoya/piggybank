import { useState, useEffect } from "react";
import { useAccountStore } from "@massalabs/react-ui-kit";
import {
  enableAutoDeposit,
  disableAutoDeposit,
  isAutoDepositEnabled,
  getUserUSDCBalance,
} from "../lib/massa";

interface VaultAutoDepositProps {
  vaultAddress: string;
  vaultName: string;
}

// Fixed time period - ONLY 1 week is supported due to Massa blockchain's deferred calls limitation
// Period value: 37675 Massa periods
// When multiplied by 16 seconds per period: 602,800 seconds (approximately 1 week minus 1 second)
const FIXED_AUTO_DEPOSIT_PERIOD = 37675; // Massa periods
const FIXED_AUTO_DEPOSIT_INTERVAL = 602800; // seconds (37675 * 16)

export default function VaultAutoDeposit({
  vaultAddress,
}: VaultAutoDepositProps) {
  const { connectedAccount } = useAccountStore();
  const [loading, setLoading] = useState(false);
  const [autoDepositActive, setAutoDepositActive] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Form state
  const [amountPerDeposit, setAmountPerDeposit] = useState("");
  const [userBalance, setUserBalance] = useState("0");

  // Check auto deposit status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!connectedAccount) {
        setCheckingStatus(false);
        return;
      }

      try {
        const isEnabled = await isAutoDepositEnabled(
          connectedAccount,
          vaultAddress
        );
        setAutoDepositActive(isEnabled);
      } catch (error) {
        console.error("Error checking auto deposit status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [connectedAccount, vaultAddress]);

  // Fetch user USDC balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (connectedAccount) {
        const balance = await getUserUSDCBalance(
          connectedAccount,
          connectedAccount.address
        );
        setUserBalance(balance);
      }
    };
    fetchBalance();
  }, [connectedAccount]);

  const handleEnableAutoDeposit = async () => {
    if (!connectedAccount || !amountPerDeposit) return;

    setLoading(true);

    try {
      // Calculate total amount needed for approval
      // Approve a large amount since auto deposit runs indefinitely
      const totalAmount = (parseFloat(amountPerDeposit) * 1000).toString();

      // First approve USDC spending
      const { approveUSDCSpending } = await import("../lib/massa");
      const approveResult = await approveUSDCSpending(
        connectedAccount,
        vaultAddress,
        totalAmount
      );

      if (!approveResult.success) {
        setLoading(false);
        return;
      }

      // Then enable auto deposit with fixed 1-week interval
      const result = await enableAutoDeposit(
        connectedAccount,
        vaultAddress,
        amountPerDeposit,
        FIXED_AUTO_DEPOSIT_INTERVAL,
        connectedAccount.address
      );

      if (result.success) {
        setAutoDepositActive(true);
        setShowConfig(false);
        setAmountPerDeposit("");
      }
    } catch (error) {
      console.error("Error enabling auto deposit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableAutoDeposit = async () => {
    if (!connectedAccount) return;

    setLoading(true);

    try {
      const result = await disableAutoDeposit(connectedAccount, vaultAddress);

      if (result.success) {
        setAutoDepositActive(false);
      }
    } catch (error) {
      console.error("Error disabling auto deposit:", error);
    } finally {
      setLoading(false);
    }
  };

  const isValidAmount = parseFloat(amountPerDeposit || "0") > 0;
  const hasBalance =
    parseFloat(amountPerDeposit || "0") <= parseFloat(userBalance);

  if (checkingStatus) {
    return (
      <div className="brut-card bg-white p-6">
        <p className="text-gray-600">Checking auto deposit status...</p>
      </div>
    );
  }

  return (
    <div className="brut-card bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🔄 Auto Deposit</h3>
        {autoDepositActive && (
          <div className="brut-btn bg-lime-300 text-xs">Active</div>
        )}
      </div>

      {!autoDepositActive && !showConfig && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Set up automatic recurring deposits to your vault. Deposits will be
            executed automatically at your chosen interval.
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="w-full brut-btn bg-lime-300"
          >
            Enable Auto Deposit
          </button>
        </div>
      )}

      {!autoDepositActive && showConfig && (
        <div className="space-y-4">
          <div>
            <label className="block mb-2">
              <span className="font-bold text-sm">
                Amount Per Deposit (USDC)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountPerDeposit}
                onChange={(e) => setAmountPerDeposit(e.target.value)}
                className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3"
                placeholder="Amount in USDC"
              />
            </label>
            <p className="text-xs text-gray-600 mt-1">
              Your balance: {userBalance} USDC
            </p>
            {!hasBalance && parseFloat(amountPerDeposit || "0") > 0 && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Insufficient balance
              </p>
            )}
          </div>

          <div className="brut-card bg-gradient-to-r from-lime-100 to-green-100 p-4 border-2 border-lime-400">
            <p className="font-bold text-sm mb-2">📅 Deposit Schedule</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Frequency:</span>
              <span className="bg-lime-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                Every 1 Week
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Fixed interval due to Massa blockchain's deferred calls
              limitation. Period value: 37675 (≈ 1 week minus 1 second)
            </p>
          </div>

          <div className="brut-card bg-blue-100 p-3">
            <p className="text-xs font-bold mb-1">Summary</p>
            <p className="text-xs">
              • Deposit {amountPerDeposit || "0"} USDC every week
            </p>
            <p className="text-xs">• Requires ~20 MAS for deferred calls</p>
            <p className="text-xs">• Can be disabled at any time</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowConfig(false)}
              className="flex-1 brut-btn bg-white"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleEnableAutoDeposit}
              className="flex-1 brut-btn bg-lime-300"
              disabled={!isValidAmount || !hasBalance || loading}
            >
              {loading ? "Enabling..." : "Enable"}
            </button>
          </div>
        </div>
      )}

      {autoDepositActive && (
        <div className="space-y-3">
          <div className="brut-card bg-lime-100 p-3">
            <p className="text-sm font-bold mb-1">✅ Auto Deposit Active</p>
            <p className="text-xs text-gray-600">
              Automatic deposits are running for this vault. Deposits will be
              executed at the configured interval.
            </p>
          </div>

          <div className="brut-card bg-yellow-100 p-3">
            <p className="text-xs font-bold mb-1">⚠️ Important</p>
            <p className="text-xs text-gray-600">
              Ensure you maintain sufficient USDC balance for upcoming deposits.
            </p>
          </div>

          <button
            onClick={handleDisableAutoDeposit}
            className="w-full brut-btn bg-red-300 border-red-500"
            disabled={loading}
          >
            {loading ? "Disabling..." : "Disable Auto Deposit"}
          </button>
        </div>
      )}
    </div>
  );
}
