/**
 * Example Usage of Automation Monitoring Components
 *
 * This file demonstrates how to use the AutomationStatusCard and ExecutionHistoryTable
 * components together with the custom hooks for real-time updates.
 */

import { useState } from "react";
import AutomationStatusCard, { AutomationConfig } from "./AutomationStatusCard";
import ExecutionHistoryTable from "./ExecutionHistoryTable";
import { useAutomationStatus } from "../hooks/useAutomationStatus";
import { useExecutionHistory } from "../hooks/useExecutionHistory";
import { toast } from "react-toastify";

interface AutomationMonitoringExampleProps {
  vaultAddress: string;
}

export default function AutomationMonitoringExample({
  vaultAddress,
}: AutomationMonitoringExampleProps) {
  // Fetch automation status with polling (updates every 30 seconds)
  const {
    status,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useAutomationStatus({
    vaultAddress,
    pollingInterval: 30000, // 30 seconds
    enabled: true,
  });

  // Fetch execution history with polling (updates every 60 seconds)
  const {
    executions,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useExecutionHistory({
    vaultAddress,
    pollingInterval: 60000, // 60 seconds
    enabled: true,
    maxRecords: 50,
  });

  // Example automation config (this would come from your vault creation/config)
  const [automationConfig] = useState<AutomationConfig>({
    dca: {
      amount: "100 WMAS",
      frequency: 1, // Weekly
    },
    scheduledDeposit: {
      depositAmount: "500 WMAS",
      frequency: 3, // Monthly
    },
    savingsStrategy: {
      strategyType: 0, // Accumulation
      baseAmount: "1000 WMAS",
      frequency: 3, // Monthly
    },
  });

  // Handle pause automation
  const handlePause = async () => {
    try {
      toast.loading("Pausing automation...");

      // TODO: Call contract's pauseAutomation() function
      // await vaultContract.pauseAutomation();

      console.log("Pausing automation for vault:", vaultAddress);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.dismiss();
      toast.success("Automation paused successfully");

      // Refresh status
      await refetchStatus();
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to pause automation");
      console.error("Error pausing automation:", error);
    }
  };

  // Handle resume automation
  const handleResume = async () => {
    try {
      toast.loading("Resuming automation...");

      // TODO: Call contract's resumeAutomation() function
      // await vaultContract.resumeAutomation();

      console.log("Resuming automation for vault:", vaultAddress);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.dismiss();
      toast.success("Automation resumed successfully");

      // Refresh status
      await refetchStatus();
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to resume automation");
      console.error("Error resuming automation:", error);
    }
  };

  // Handle add gas
  const handleAddGas = async () => {
    try {
      // TODO: Show modal to input gas amount
      const gasAmount = prompt("Enter gas amount to add (in MAS):");

      if (!gasAmount || parseFloat(gasAmount) <= 0) {
        return;
      }

      toast.loading("Adding gas reserve...");

      // TODO: Call contract's addGasReserve() function
      // const args = new Args().addU64(parseFloat(gasAmount) * 1e9); // Convert to nanoMAS
      // await vaultContract.addGasReserve(args);

      console.log("Adding gas to vault:", vaultAddress, "Amount:", gasAmount);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.dismiss();
      toast.success(`Added ${gasAmount} MAS to gas reserve`);

      // Refresh status
      await refetchStatus();
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to add gas reserve");
      console.error("Error adding gas:", error);
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    toast.loading("Refreshing automation data...");

    try {
      await Promise.all([refetchStatus(), refetchHistory()]);
      toast.dismiss();
      toast.success("Data refreshed");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to refresh data");
    }
  };

  if (statusLoading && historyLoading) {
    return (
      <div className="space-y-6">
        <div className="brut-card bg-white p-8 text-center">
          <p className="text-gray-600">Loading automation data...</p>
        </div>
      </div>
    );
  }

  if (statusError || historyError) {
    return (
      <div className="space-y-6">
        <div className="brut-card bg-red-100 border-red-500 p-6">
          <h3 className="font-bold text-red-700 mb-2">
            Error Loading Automation Data
          </h3>
          <p className="text-red-600">{statusError || historyError}</p>
          <button onClick={handleRefresh} className="mt-4 brut-btn bg-red-300">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Automation Monitoring</h2>
        <button onClick={handleRefresh} className="brut-btn bg-blue-200">
          🔄 Refresh
        </button>
      </div>

      {/* Automation Status Card */}
      {status && (
        <AutomationStatusCard
          status={status}
          config={automationConfig}
          onPause={handlePause}
          onResume={handleResume}
          onAddGas={handleAddGas}
        />
      )}

      {/* Execution History Table */}
      <ExecutionHistoryTable executions={executions} maxRows={10} />

      {/* Info Card */}
      <div className="brut-card bg-blue-50 p-4">
        <h3 className="font-bold mb-2">ℹ️ About Automation Monitoring</h3>
        <ul className="text-sm space-y-1">
          <li>• Status updates automatically every 30 seconds</li>
          <li>• Execution history updates every 60 seconds</li>
          <li>• Countdown timers update in real-time</li>
          <li>• Click "Refresh" to manually update all data</li>
          <li>• Low gas warnings appear when reserve is below 0.5 MAS</li>
        </ul>
      </div>
    </div>
  );
}
