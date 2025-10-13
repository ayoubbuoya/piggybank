import { useState, useEffect, useCallback } from "react";
import { GasConsumptionRecord } from "../components/GasReserveWidget";

interface UseGasReserveOptions {
  vaultAddress: string;
  pollingInterval?: number; // in milliseconds, default 30000 (30 seconds)
  enabled?: boolean;
  warningThreshold?: number; // Default 0.5 MAS
  criticalThreshold?: number; // Default 0.25 MAS
}

interface UseGasReserveReturn {
  balance: number;
  isLow: boolean;
  isCritical: boolean;
  consumptionHistory: GasConsumptionRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addGas: (amount: number) => Promise<void>;
}

/**
 * Hook for managing gas reserve data and operations
 *
 * This hook fetches gas reserve balance, consumption history, and provides
 * functions to add gas to the reserve.
 *
 * @param options Configuration options
 * @returns Gas reserve data, status flags, and management functions
 */
export function useGasReserve({
  vaultAddress,
  pollingInterval = 30000,
  enabled = true,
  warningThreshold = 0.5,
  criticalThreshold = 0.25,
}: UseGasReserveOptions): UseGasReserveReturn {
  const [balance, setBalance] = useState(0);
  const [consumptionHistory, setConsumptionHistory] = useState<
    GasConsumptionRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate status flags
  const isLow = balance < warningThreshold;
  const isCritical = balance < criticalThreshold;

  // Fetch gas reserve data
  const fetchGasReserve = useCallback(async () => {
    if (!vaultAddress || !enabled) {
      return;
    }

    try {
      setError(null);

      // TODO: Replace with actual contract call
      // This is a placeholder implementation
      // In production, this should:
      // 1. Call the vault's getAutomationStatus() to get gas reserve
      // 2. Query events for GAS_RESERVE_ADDED and operation executions
      // 3. Build consumption history from events

      // Example implementation:
      // const status = await vaultContract.getAutomationStatus();
      // const gasReserve = status.gasReserve;
      // const events = await queryGasEvents(vaultAddress);
      // const history = buildConsumptionHistory(events);

      console.log(`Fetching gas reserve for vault: ${vaultAddress}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data - replace with actual contract call
      const mockBalance = 0;
      const mockHistory: GasConsumptionRecord[] = [];

      setBalance(mockBalance);
      setConsumptionHistory(mockHistory);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching gas reserve:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch gas reserve"
      );
      setLoading(false);
    }
  }, [vaultAddress, enabled]);

  // Add gas to reserve
  const addGas = useCallback(
    async (amount: number) => {
      if (!vaultAddress) {
        throw new Error("Vault address not provided");
      }

      if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      try {
        // TODO: Replace with actual contract call
        // This should call the vault's addGasReserve() function

        // Example implementation:
        // const args = new Args().addU64(amount);
        // await vaultContract.addGasReserve(args);

        console.log(`Adding ${amount} MAS gas to vault: ${vaultAddress}`);

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Refetch data after adding gas
        await fetchGasReserve();
      } catch (err) {
        console.error("Error adding gas reserve:", err);
        throw err;
      }
    },
    [vaultAddress, fetchGasReserve]
  );

  // Initial fetch
  useEffect(() => {
    fetchGasReserve();
  }, [fetchGasReserve]);

  // Set up polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      fetchGasReserve();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchGasReserve, pollingInterval, enabled]);

  return {
    balance,
    isLow,
    isCritical,
    consumptionHistory,
    loading,
    error,
    refetch: fetchGasReserve,
    addGas,
  };
}
