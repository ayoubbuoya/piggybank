/**
 * Gas Management Components - Usage Examples
 *
 * This file demonstrates how to use the gas management components
 * in your vault details page or automation dashboard.
 */

import { useState } from "react";
import GasReserveWidget from "./GasReserveWidget";
import LowGasWarningBanner from "./LowGasWarningBanner";
import AddGasModal from "./AddGasModal";
import { useGasReserve } from "../hooks/useGasReserve";

// ============================================================================
// Example 1: Basic Gas Reserve Widget
// ============================================================================

export function BasicGasReserveExample() {
  const [showAddGasModal, setShowAddGasModal] = useState(false);

  const handleAddGas = async (amount: number) => {
    console.log(`Adding ${amount} MAS to gas reserve`);
    // Implement actual gas addition logic here
  };

  return (
    <div className="max-w-md">
      <GasReserveWidget
        gasReserve={1.5}
        estimatedGasPerOperation={0.1}
        onAddGas={() => setShowAddGasModal(true)}
      />

      <AddGasModal
        isOpen={showAddGasModal}
        onClose={() => setShowAddGasModal(false)}
        onConfirm={handleAddGas}
        currentBalance={1.5}
        estimatedGasPerOperation={0.1}
      />
    </div>
  );
}

// ============================================================================
// Example 2: Gas Widget with Consumption History
// ============================================================================

export function GasWidgetWithHistoryExample() {
  const consumptionHistory = [
    {
      timestamp: Math.floor(Date.now() / 1000) - 86400,
      operationType: "DCA Purchase",
      gasUsed: 0.08,
    },
    {
      timestamp: Math.floor(Date.now() / 1000) - 172800,
      operationType: "Scheduled Deposit",
      gasUsed: 0.12,
    },
    {
      timestamp: Math.floor(Date.now() / 1000) - 259200,
      operationType: "DCA Purchase",
      gasUsed: 0.09,
    },
  ];

  return (
    <div className="max-w-md">
      <GasReserveWidget
        gasReserve={2.5}
        consumptionHistory={consumptionHistory}
        estimatedGasPerOperation={0.1}
        showHistory={true}
        onAddGas={() => console.log("Add gas clicked")}
      />
    </div>
  );
}

// ============================================================================
// Example 3: Low Gas Warning Banner
// ============================================================================

export function LowGasWarningExample() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return <p className="text-gray-500">Warning dismissed</p>;
  }

  return (
    <div className="max-w-2xl">
      <LowGasWarningBanner
        gasReserve={0.3}
        requiredGas={0.1}
        onAddGas={() => console.log("Add gas clicked")}
        onDismiss={() => setDismissed(true)}
      />
    </div>
  );
}

// ============================================================================
// Example 4: Critical Gas Warning (No Dismiss)
// ============================================================================

export function CriticalGasWarningExample() {
  return (
    <div className="max-w-2xl">
      <LowGasWarningBanner
        gasReserve={0.15}
        requiredGas={0.1}
        criticalThreshold={0.25}
        onAddGas={() => console.log("Add gas clicked")}
      />
    </div>
  );
}

// ============================================================================
// Example 5: Complete Integration with useGasReserve Hook
// ============================================================================

export function CompleteGasManagementExample() {
  const vaultAddress = "AS12..."; // Your vault address
  const [showAddGasModal, setShowAddGasModal] = useState(false);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  const {
    balance,
    isLow,
    isCritical,
    consumptionHistory,
    loading,
    error,
    addGas,
  } = useGasReserve({
    vaultAddress,
    pollingInterval: 30000,
    enabled: true,
  });

  const handleAddGas = async (amount: number) => {
    try {
      await addGas(amount);
      setShowAddGasModal(false);
      setDismissedWarning(false); // Reset warning dismissal
    } catch (err) {
      console.error("Failed to add gas:", err);
      throw err;
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading gas reserve data...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Warning Banner - Show if low and not dismissed (or if critical) */}
      {(isLow && !dismissedWarning) || isCritical ? (
        <LowGasWarningBanner
          gasReserve={balance}
          requiredGas={0.1}
          onAddGas={() => setShowAddGasModal(true)}
          onDismiss={isCritical ? undefined : () => setDismissedWarning(true)}
        />
      ) : null}

      {/* Gas Reserve Widget */}
      <GasReserveWidget
        gasReserve={balance}
        consumptionHistory={consumptionHistory}
        estimatedGasPerOperation={0.1}
        onAddGas={() => setShowAddGasModal(true)}
        showHistory={true}
      />

      {/* Add Gas Modal */}
      <AddGasModal
        isOpen={showAddGasModal}
        onClose={() => setShowAddGasModal(false)}
        onConfirm={handleAddGas}
        currentBalance={balance}
        estimatedGasPerOperation={0.1}
      />
    </div>
  );
}

// ============================================================================
// Example 6: Vault Details Page Integration
// ============================================================================

export function VaultDetailsWithGasManagement() {
  const vaultAddress = "AS12...";
  const [showAddGasModal, setShowAddGasModal] = useState(false);

  const { balance, isLow, consumptionHistory, addGas } = useGasReserve({
    vaultAddress,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <h1 className="text-3xl font-bold">Vault Details</h1>

      {/* Low Gas Warning at Top */}
      {isLow && (
        <LowGasWarningBanner
          gasReserve={balance}
          requiredGas={0.1}
          onAddGas={() => setShowAddGasModal(true)}
        />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Vault Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="brut-card bg-white p-6">
            <h2 className="text-xl font-bold mb-4">Vault Information</h2>
            {/* Vault details here */}
          </div>
        </div>

        {/* Right Column - Gas Management */}
        <div className="space-y-6">
          <GasReserveWidget
            gasReserve={balance}
            consumptionHistory={consumptionHistory}
            estimatedGasPerOperation={0.1}
            onAddGas={() => setShowAddGasModal(true)}
            showHistory={true}
          />

          {/* Other sidebar widgets */}
        </div>
      </div>

      {/* Add Gas Modal */}
      <AddGasModal
        isOpen={showAddGasModal}
        onClose={() => setShowAddGasModal(false)}
        onConfirm={async (amount) => {
          await addGas(amount);
          setShowAddGasModal(false);
        }}
        currentBalance={balance}
        estimatedGasPerOperation={0.1}
      />
    </div>
  );
}
