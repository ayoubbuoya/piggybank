import { useState, useEffect, useCallback } from "react";
import { useAccountStore } from "@massalabs/react-ui-kit";
import { AutomationStatusData } from "../components/AutomationStatusCard";

interface UseAutomationStatusOptions {
  vaultAddress: string;
  pollingInterval?: number; // in milliseconds, default 30000 (30 seconds)
  enabled?: boolean;
}

interface UseAutomationStatusReturn {
  status: AutomationStatusData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and polling automation status
 *
 * This hook will automatically poll the vault's automation status at regular intervals
 * and provide real-time updates to the UI.
 *
 * @param options Configuration options
 * @returns Automation status data, loading state, error, and refetch function
 */
export function useAutomationStatus({
  vaultAddress,
  pollingInterval = 30000,
  enabled = true,
}: UseAutomationStatusOptions): UseAutomationStatusReturn {
  const [status, setStatus] = useState<AutomationStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connectedAccount } = useAccountStore();

  const fetchStatus = useCallback(async () => {
    if (!vaultAddress || !enabled || !connectedAccount) {
      return;
    }

    try {
      setError(null);

      console.log(`Fetching automation status for vault: ${vaultAddress}`);

      // Import the automation service dynamically to avoid circular dependencies
      const { getAutomationStatus } = await import("../lib/automationService");

      // Call the actual contract
      const statusData = await getAutomationStatus(
        connectedAccount,
        vaultAddress
      );

      if (statusData) {
        setStatus(statusData);
      } else {
        // If no automation status returned, vault might not have automation enabled
        setStatus({
          dcaEnabled: false,
          dcaNextExecution: 0,
          dcaPurchasesCompleted: 0,
          scheduledDepositEnabled: false,
          scheduledDepositNextExecution: 0,
          savingsStrategyEnabled: false,
          savingsStrategyNextExecution: 0,
          gasReserve: 0,
          isPaused: false,
        });
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching automation status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch automation status"
      );
      setLoading(false);
    }
  }, [vaultAddress, enabled, connectedAccount]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Set up polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      fetchStatus();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchStatus, pollingInterval, enabled]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
  };
}
