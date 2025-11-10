import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountStore } from "@massalabs/react-ui-kit";
import { toast } from "react-toastify";
import { createMultiSigVault } from "../lib/multiSigVault";
import { TokenWithPercentage, AVAILABLE_TOKENS } from "../lib/types";

export default function CreateMultiSigVault() {
  const navigate = useNavigate();
  const { connectedAccount } = useAccountStore();

  const [vaultName, setVaultName] = useState("");
  const [signers, setSigners] = useState<string[]>([""]);
  const [threshold, setThreshold] = useState(2);
  const [tokenSelections, setTokenSelections] = useState<
    { token: string; percentage: number }[]
  >([{ token: AVAILABLE_TOKENS[0].address, percentage: 100 }]);
  const [loading, setLoading] = useState(false);

  // Add a new signer input
  const addSigner = () => {
    if (signers.length < 5) {
      setSigners([...signers, ""]);
    } else {
      toast.warning("Maximum 5 signers allowed");
    }
  };

  // Remove a signer
  const removeSigner = (index: number) => {
    if (signers.length > 2) {
      const newSigners = signers.filter((_, i) => i !== index);
      setSigners(newSigners);
      // Adjust threshold if needed
      if (threshold > newSigners.length) {
        setThreshold(newSigners.length);
      }
    } else {
      toast.warning("Minimum 2 signers required");
    }
  };

  // Update signer address
  const updateSigner = (index: number, value: string) => {
    const newSigners = [...signers];
    newSigners[index] = value;
    setSigners(newSigners);
  };

  // Add token selection
  const addToken = () => {
    setTokenSelections([
      ...tokenSelections,
      { token: AVAILABLE_TOKENS[0].address, percentage: 0 },
    ]);
  };

  // Remove token selection
  const removeToken = (index: number) => {
    if (tokenSelections.length > 1) {
      setTokenSelections(tokenSelections.filter((_, i) => i !== index));
    }
  };

  // Update token selection
  const updateToken = (index: number, field: string, value: any) => {
    const newSelections = [...tokenSelections];
    newSelections[index] = { ...newSelections[index], [field]: value };
    setTokenSelections(newSelections);
  };

  // Calculate total percentage
  const totalPercentage = tokenSelections.reduce(
    (sum, t) => sum + t.percentage,
    0
  );

  // Validate and create vault
  const handleCreate = async () => {
    // Validation
    if (!vaultName.trim()) {
      toast.error("Please enter a vault name");
      return;
    }

    // Validate signers
    const validSigners = signers.filter((s) => s.trim().length > 0);
    if (validSigners.length < 2) {
      toast.error("At least 2 signers required");
      return;
    }

    // Check for duplicate signers
    const uniqueSigners = new Set(validSigners);
    if (uniqueSigners.size !== validSigners.length) {
      toast.error("Duplicate signer addresses detected");
      return;
    }

    // Validate threshold
    if (threshold < 2 || threshold > validSigners.length) {
      toast.error(
        `Threshold must be between 2 and ${validSigners.length}`
      );
      return;
    }

    // Validate percentages
    if (totalPercentage !== 100) {
      toast.error("Token percentages must sum to 100%");
      return;
    }

    if (!connectedAccount) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);

    try {
      // Convert to TokenWithPercentage format - must instantiate the class properly
      const tokensWithPercentage: TokenWithPercentage[] =
        tokenSelections.map((t) => new TokenWithPercentage(
          t.token,
          BigInt(t.percentage)
        ));

      const result = await createMultiSigVault(
        connectedAccount,
        validSigners,
        threshold,
        tokensWithPercentage,
        vaultName
      );

      if (result.success) {
        toast.success("Multi-sig vault created successfully!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error creating vault:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="brut-card bg-white p-8">
        <h1 className="text-3xl font-black mb-2">
          Create Multi-Sig Savings Vault
        </h1>
        <p className="text-gray-600">
          Create a vault that requires multiple signatures for withdrawals.
          Perfect for families, couples, or teams managing shared funds.
        </p>
      </div>

      {/* Vault Name */}
      <div className="brut-card bg-white p-6">
        <h2 className="text-xl font-bold mb-4">Vault Name</h2>
        <input
          type="text"
          value={vaultName}
          onChange={(e) => setVaultName(e.target.value)}
          placeholder="e.g., Family Savings, College Fund"
          className="w-full border-3 border-ink-950 rounded-2xl px-4 py-3 font-semibold"
        />
      </div>

      {/* Signers */}
      <div className="brut-card bg-white p-6">
        <h2 className="text-xl font-bold mb-4">
          Signers ({signers.length})
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Add wallet addresses of all signers. Minimum 2, maximum 5.
        </p>

        <div className="space-y-3">
          {signers.map((signer, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={signer}
                onChange={(e) => updateSigner(index, e.target.value)}
                placeholder={`Signer ${index + 1} address (AS1...)`}
                className="flex-1 border-3 border-ink-950 rounded-2xl px-4 py-3 font-mono text-sm"
              />
              {signers.length > 2 && (
                <button
                  onClick={() => removeSigner(index)}
                  className="brut-btn bg-red-300 px-4"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {signers.length < 5 && (
          <button
            onClick={addSigner}
            className="brut-btn bg-blue-300 mt-4"
          >
            + Add Signer
          </button>
        )}
      </div>

      {/* Threshold */}
      <div className="brut-card bg-white p-6">
        <h2 className="text-xl font-bold mb-4">Approval Threshold</h2>
        <p className="text-sm text-gray-600 mb-4">
          Number of approvals required to execute a withdrawal
        </p>

        <div className="flex items-center gap-4">
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="border-3 border-ink-950 rounded-2xl px-4 py-3 font-bold"
          >
            {Array.from(
              { length: Math.max(0, signers.length - 1) },
              (_, i) => i + 2
            ).map((num) => (
              <option key={num} value={num}>
                {num} of {signers.length}
              </option>
            ))}
          </select>

          <div className="brut-card bg-yellow-100 p-3 flex-1">
            <p className="text-sm font-semibold">
              {threshold} out of {signers.length} signers must approve
              withdrawals
            </p>
          </div>
        </div>
      </div>

      {/* Token Allocations */}
      <div className="brut-card bg-white p-6">
        <h2 className="text-xl font-bold mb-4">Token Allocation</h2>
        <p className="text-sm text-gray-600 mb-4">
          Deposits will be automatically split across these tokens
        </p>

        <div className="space-y-3">
          {tokenSelections.map((selection, index) => (
            <div key={index} className="flex gap-2 items-center">
              <select
                value={selection.token}
                onChange={(e) =>
                  updateToken(index, "token", e.target.value)
                }
                className="flex-1 border-3 border-ink-950 rounded-2xl px-4 py-3 font-bold"
              >
                {AVAILABLE_TOKENS.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={selection.percentage}
                onChange={(e) =>
                  updateToken(index, "percentage", Number(e.target.value))
                }
                min="0"
                max="100"
                className="w-24 border-3 border-ink-950 rounded-2xl px-4 py-3 font-bold text-center"
              />
              <span className="font-bold">%</span>

              {tokenSelections.length > 1 && (
                <button
                  onClick={() => removeToken(index)}
                  className="brut-btn bg-red-300 px-4"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-4">
          <button onClick={addToken} className="brut-btn bg-lime-300">
            + Add Token
          </button>

          <div
            className={`brut-card p-3 ${
              totalPercentage === 100 ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <p className="font-bold">
              Total: {totalPercentage}%{" "}
              {totalPercentage === 100 ? "✓" : "✗"}
            </p>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="brut-card bg-gradient-to-r from-purple-400 to-pink-400 p-6">
        <button
          onClick={handleCreate}
          disabled={loading || totalPercentage !== 100}
          className="brut-btn bg-white w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "🔐 Create Multi-Sig Vault"}
        </button>
      </div>
    </div>
  );
}

