import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountStore } from "@massalabs/react-ui-kit";
import Stepper from "../components/Stepper.tsx";
import {
  TokenSelection,
  AVAILABLE_TOKENS,
  TokenWithPercentage,
  AutomationConfig,
} from "../lib/types";
import { createSplitterVault } from "../lib/massa";
import { createAutomatedVault } from "../lib/automationService";
import AutomationConfigPanel from "../components/AutomationConfigPanel";

export default function CreateVault() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [vaultName, setVaultName] = useState("My Splitter Vault");
  const [tokens, setTokens] = useState<TokenSelection[]>(() =>
    AVAILABLE_TOKENS.map((token) => ({
      ...token,
      percentage: 0,
      isSelected: false,
    }))
  );

  // Check if automation is enabled in environment
  const isAutomationEnabled = import.meta.env.VITE_ENABLE_AUTOMATION === "true";

  // Automation configuration state
  const [enableAutomation, setEnableAutomation] = useState(false);
  const [automationConfig, setAutomationConfig] =
    useState<AutomationConfig | null>(null);
  const [isAutomationValid, setIsAutomationValid] = useState(true);

  const { connectedAccount } = useAccountStore();
  const navigate = useNavigate();

  // Calculate total percentage
  const totalPercentage = tokens
    .filter((token) => token.isSelected)
    .reduce((sum, token) => sum + token.percentage, 0);

  const isValidPercentages = totalPercentage === 100;
  const hasSelectedTokens = tokens.some((token) => token.isSelected);

  const handleTokenToggle = (index: number) => {
    setTokens((prev) =>
      prev.map((token, i) =>
        i === index
          ? {
              ...token,
              isSelected: !token.isSelected,
              percentage: token.isSelected ? 0 : 25,
            }
          : token
      )
    );
  };

  const handlePercentageChange = (index: number, percentage: number) => {
    if (percentage < 0 || percentage > 100) return;

    setTokens((prev) =>
      prev.map((token, i) => (i === index ? { ...token, percentage } : token))
    );
  };

  const autoBalancePercentages = () => {
    const selectedTokens = tokens.filter((token) => token.isSelected);
    if (selectedTokens.length === 0) return;

    const equalPercentage = Math.floor(100 / selectedTokens.length);
    const remainder = 100 % selectedTokens.length;

    setTokens((prev) =>
      prev.map((token) => {
        if (!token.isSelected) return token;

        const index = selectedTokens.findIndex(
          (st) => st.address === token.address
        );
        const percentage = equalPercentage + (index < remainder ? 1 : 0);

        return { ...token, percentage };
      })
    );
  };

  const handleCreateVault = async () => {
    if (!connectedAccount || !hasSelectedTokens || !isValidPercentages) {
      return;
    }

    // If automation is enabled, validate automation config
    if (enableAutomation && !isAutomationValid) {
      return;
    }

    setLoading(true);

    try {
      // Convert selected tokens to TokenWithPercentage format for smart contract
      const tokensWithPercentage = tokens
        .filter((token) => token.isSelected)
        .map(
          (token) =>
            new TokenWithPercentage(token.address, BigInt(token.percentage))
        );

      let result;

      if (enableAutomation && automationConfig) {
        // Create automated vault
        console.log("Creating automated vault with config:", automationConfig);
        result = await createAutomatedVault(
          connectedAccount,
          tokensWithPercentage,
          automationConfig
        );
      } else {
        // Create regular vault
        console.log("Creating regular vault");
        result = await createSplitterVault(
          connectedAccount,
          tokensWithPercentage
        );
      }

      if (result.success) {
        console.log("Vault created successfully:", result.vaultAddress);

        // Navigate directly to the vault if we have its address
        if (result.vaultAddress) {
          console.log("New vault address:", result.vaultAddress);
          navigate(`/vault/${result.vaultAddress}`);
        } else {
          // Fallback to dashboard
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error("Error creating vault:", err);
    } finally {
      setLoading(false);
    }
  };

  const next = () => setStep((s) => Math.min(3, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="brut-card bg-white p-6 max-w-4xl">
      <h1 className="text-3xl font-black mb-4">Create Splitter Vault</h1>
      <Stepper
        steps={["Setup", "Configure", "Automation", "Review"]}
        current={step}
      />

      {/* Step 1: Basic Setup */}
      {step === 0 && (
        <div className="space-y-4">
          <label className="block">
            <span className="font-bold">Vault Name</span>
            <input
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3"
              placeholder="Enter vault name"
            />
          </label>

          <div className="brut-card bg-blue-50 p-4">
            <h3 className="font-bold mb-2">About Splitter Vaults</h3>
            <p className="text-sm">
              A splitter vault automatically distributes your deposits across
              multiple tokens based on the percentages you configure. Each
              deposit will be split and swapped into your chosen tokens via
              EagleFi DEX.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Token Selection and Percentage Allocation */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-bold">Select Tokens & Set Percentages</span>
            <button
              onClick={autoBalancePercentages}
              className="brut-btn bg-blue-200 text-sm"
              disabled={!hasSelectedTokens}
            >
              Auto Balance
            </button>
          </div>

          <div className="space-y-3">
            {tokens.map((token, index) => (
              <div key={token.address} className="brut-card bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={token.isSelected}
                      onChange={() => handleTokenToggle(index)}
                      className="w-4 h-4 border-2 border-ink-950"
                    />
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        {token.symbol}
                      </div>
                      <div className="text-sm text-gray-600">{token.name}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {token.address.slice(0, 8)}...{token.address.slice(-6)}
                      </div>
                    </div>
                  </div>

                  {token.isSelected && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={token.percentage}
                        onChange={(e) =>
                          handlePercentageChange(
                            index,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-20 border-2 border-ink-950 rounded-lg p-2 text-center"
                      />
                      <span className="font-bold">%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="brut-card bg-lime-100 p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">Total Percentage:</span>
              <span
                className={`font-bold text-lg ${
                  totalPercentage === 100
                    ? "text-green-600"
                    : totalPercentage > 100
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {totalPercentage}%
              </span>
            </div>
            {totalPercentage !== 100 && hasSelectedTokens && (
              <p className="text-sm text-gray-600 mt-2">
                {totalPercentage < 100
                  ? `Need ${100 - totalPercentage}% more to reach 100%`
                  : `Reduce by ${totalPercentage - 100}% to reach 100%`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Automation Configuration */}
      {step === 2 &&
        (isAutomationEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">
                  Automation Features (Optional)
                </h3>
                <p className="text-sm text-gray-600">
                  Enable autonomous vault operations using Massa's deferred
                  calls
                </p>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enableAutomation}
                  onChange={(e) => setEnableAutomation(e.target.checked)}
                  className="w-5 h-5 border-2 border-ink-950"
                />
                <span className="font-bold">Enable Automation</span>
              </label>
            </div>

            {enableAutomation ? (
              <AutomationConfigPanel
                onConfigChange={setAutomationConfig}
                onValidationChange={setIsAutomationValid}
              />
            ) : (
              <div className="brut-card bg-gray-50 p-6 text-center">
                <p className="text-gray-600">
                  Automation is disabled. Your vault will function as a standard
                  splitter vault.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  You can enable automation features like DCA, scheduled
                  deposits, and savings strategies by checking the box above.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="brut-card bg-blue-50 p-4 border-2 border-blue-300">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Note:</strong> Automation features are not available
              with the current factory contract. Your vault will function as a
              standard splitter vault with manual deposits and withdrawals.
            </p>
          </div>
        ))}

      {/* Step 3: Review and Deploy */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="font-bold">Review Vault Configuration</p>

          <div className="brut-card bg-gray-50 p-4">
            <div className="mb-3">
              <span className="font-bold">Vault Name:</span> {vaultName}
            </div>

            <div className="mb-3">
              <span className="font-bold">Selected Tokens:</span>
              <div className="mt-2 space-y-2">
                {tokens
                  .filter((token) => token.isSelected)
                  .map((token) => (
                    <div
                      key={token.address}
                      className="flex justify-between items-center"
                    >
                      <span>
                        {token.symbol} ({token.name})
                      </span>
                      <span className="font-bold">{token.percentage}%</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Automation Summary */}
            {enableAutomation && automationConfig && (
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <span className="font-bold">Automation Features:</span>
                <div className="mt-2 space-y-2">
                  {automationConfig.dca.enabled && (
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <div className="text-sm">
                        <span className="font-bold">DCA:</span>{" "}
                        {automationConfig.dca.amount} WMAS{" "}
                        {automationConfig.dca.frequency === 0
                          ? "daily"
                          : automationConfig.dca.frequency === 1
                          ? "weekly"
                          : automationConfig.dca.frequency === 2
                          ? "bi-weekly"
                          : "monthly"}
                      </div>
                    </div>
                  )}
                  {automationConfig.scheduledDeposit.enabled && (
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <div className="text-sm">
                        <span className="font-bold">Scheduled Deposits:</span>{" "}
                        {automationConfig.scheduledDeposit.depositAmount} WMAS{" "}
                        {automationConfig.scheduledDeposit.frequency === 0
                          ? "daily"
                          : automationConfig.scheduledDeposit.frequency === 1
                          ? "weekly"
                          : automationConfig.scheduledDeposit.frequency === 2
                          ? "bi-weekly"
                          : "monthly"}
                      </div>
                    </div>
                  )}
                  {automationConfig.savingsStrategy.enabled && (
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <div className="text-sm">
                        <span className="font-bold">Savings Strategy:</span>{" "}
                        {automationConfig.savingsStrategy.strategyType === 0
                          ? "Accumulation"
                          : automationConfig.savingsStrategy.strategyType === 1
                          ? "Distribution"
                          : "Hybrid"}{" "}
                        ({automationConfig.savingsStrategy.baseAmount} WMAS
                        base)
                      </div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">Initial Gas Reserve:</span>
                      <span className="text-green-600 font-bold">
                        {automationConfig.initialGasReserve} MAS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="brut-card bg-yellow-100 p-4">
            <h3 className="font-bold mb-2">⚠️ Important Information</h3>
            <ul className="text-sm space-y-1">
              <li>• This will create a new vault on the Massa blockchain</li>
              <li>
                • Initial deployment cost: ~{enableAutomation ? "7" : "5"} MAS
                {enableAutomation && automationConfig && (
                  <span>
                    {" "}
                    + {automationConfig.initialGasReserve} MAS gas reserve
                  </span>
                )}
              </li>
              <li>• Tokens will be swapped via EagleFi DEX</li>
              <li>• You will be the owner of this vault</li>
              {enableAutomation && (
                <li>
                  • Automation will execute autonomously using deferred calls
                </li>
              )}
            </ul>
          </div>

          {!connectedAccount && (
            <div className="brut-card bg-red-100 p-4">
              <p className="text-red-700 font-bold">
                Please connect your wallet to deploy the vault
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={prev}
          className="brut-btn bg-white"
          disabled={step === 0 || loading}
        >
          Back
        </button>

        {step < 3 ? (
          <button
            onClick={next}
            className="brut-btn bg-lime-300"
            disabled={
              (step === 1 && (!hasSelectedTokens || !isValidPercentages)) ||
              (step === 2 && enableAutomation && !isAutomationValid) ||
              loading
            }
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleCreateVault}
            className="brut-btn bg-yellow-300"
            disabled={
              !connectedAccount ||
              !hasSelectedTokens ||
              !isValidPercentages ||
              (enableAutomation && !isAutomationValid) ||
              loading
            }
          >
            {loading ? "Creating Vault..." : "Deploy Vault"}
          </button>
        )}
      </div>
    </div>
  );
}
