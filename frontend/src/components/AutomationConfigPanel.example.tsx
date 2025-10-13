/**
 * Example integration of AutomationConfigPanel into CreateVault page
 *
 * This file demonstrates how to use the AutomationConfigPanel component
 * in the vault creation flow.
 */

import { useState } from "react";
import AutomationConfigPanel, {
  AutomationConfig,
} from "./AutomationConfigPanel";

export default function CreateVaultWithAutomation() {
  const [automationConfig, setAutomationConfig] =
    useState<AutomationConfig | null>(null);
  const [isAutomationValid, setIsAutomationValid] = useState(true);

  const handleAutomationConfigChange = (config: AutomationConfig) => {
    setAutomationConfig(config);
    console.log("Automation config updated:", config);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsAutomationValid(isValid);
    console.log("Automation validation status:", isValid);
  };

  const handleCreateVault = () => {
    if (!isAutomationValid) {
      console.error("Cannot create vault: automation configuration is invalid");
      return;
    }

    console.log("Creating vault with automation config:", automationConfig);

    // Here you would:
    // 1. Convert the config to the format expected by the smart contract
    // 2. If scheduled deposits are enabled, request token approval
    // 3. Call the factory contract's createAutomatedVault function
    // 4. Pass the automation configuration parameters
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-black mb-6">Create Automated Vault</h1>

      {/* Step 1: Basic vault configuration (name, tokens, percentages) */}
      <div className="brut-card bg-white p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Step 1: Basic Configuration</h2>
        {/* ... existing vault configuration UI ... */}
      </div>

      {/* Step 2: Automation configuration */}
      <div className="brut-card bg-white p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">
          Step 2: Automation (Optional)
        </h2>
        <AutomationConfigPanel
          onConfigChange={handleAutomationConfigChange}
          onValidationChange={handleValidationChange}
        />
      </div>

      {/* Step 3: Review and deploy */}
      <div className="brut-card bg-white p-6">
        <h2 className="text-xl font-bold mb-4">Step 3: Review & Deploy</h2>

        <button
          onClick={handleCreateVault}
          disabled={!isAutomationValid}
          className="brut-btn bg-yellow-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Deploy Vault
        </button>

        {!isAutomationValid && (
          <p className="text-red-600 text-sm mt-2">
            Please fix automation configuration errors before deploying
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Integration Notes:
 *
 * 1. Token Approval for Scheduled Deposits:
 *    - When scheduled deposits are enabled, you must request approval
 *    - Call approveWMASSpending() before creating the vault
 *    - Approve for the total amount: depositAmount × number of executions
 *
 * 2. Converting Config for Smart Contract:
 *    - Convert date strings to Unix timestamps (milliseconds)
 *    - Convert amount strings to u256 (bigint)
 *    - Use Args to serialize the configuration objects
 *
 * 3. Gas Reserve:
 *    - Include initialGasReserve in the vault creation transaction
 *    - This will be used to fund deferred call executions
 *
 * 4. Validation:
 *    - The component handles validation internally
 *    - Listen to onValidationChange to enable/disable the deploy button
 *    - Show validation errors from the component
 */
