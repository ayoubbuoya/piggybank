import { useParams } from "react-router-dom";
import { useAccountStore } from "@massalabs/react-ui-kit";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import VaultDeposit from "../components/VaultDeposit";
import VaultWithdraw from "../components/VaultWithdraw";
import VaultAutoDeposit from "../components/VaultAutoDeposit";
import CountdownTimer from "../components/CountdownTimer";
import { AVAILABLE_TOKENS, TokenSelection } from "../lib/types";
import {
  getVaultTokenBalances,
  getVaultTokenSelections,
  getAutoDepositConfig,
  isAutoDepositEnabled,
} from "../lib/massa";
import {
  isMultiSigVault,
  getVaultName,
  getMultiSigVaultInfo,
  getPendingProposals,
  getProposal,
  MultiSigVaultInfo,
  Proposal
} from "../lib/multiSigVault";

interface VaultData {
  address: string;
  name: string;
  tokens: TokenSelection[];
  balance: string;
  status: string;
  createdAt: string;
}

interface TokenBalances {
  [tokenAddress: string]: string;
}

export default function VaultDetails() {
  const { id } = useParams<{ id: string }>();
  const { connectedAccount } = useAccountStore();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalances>({});
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAutoDepositModal, setShowAutoDepositModal] = useState(false);
  const [isMultiSig, setIsMultiSig] = useState(false);
  const [checkingMultiSig, setCheckingMultiSig] = useState(true);
  const [multiSigInfo, setMultiSigInfo] = useState<MultiSigVaultInfo | null>(null);
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);

  // Auto deposit state
  const [autoDepositActive, setAutoDepositActive] = useState(false);
  const [autoDepositNextExecution, setAutoDepositNextExecution] = useState<
    number | null
  >(null);
  const [checkingAutoDeposit, setCheckingAutoDeposit] = useState(true);

  useEffect(() => {
    const fetchVaultData = async () => {
      if (!id || !connectedAccount) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching real vault data for:", id);

        // Fetch vault name from blockchain
        let vaultName = "Splitter Vault";
        try {
          vaultName = await getVaultName(connectedAccount, id);
          console.log("Vault name from blockchain:", vaultName);
        } catch (error) {
          console.error("Error fetching vault name:", error);
        }

        // Fetch real token allocation and creation timestamp
        let tokens: TokenSelection[] = [];
        let creationTimestamp: number | null = null;

        try {
          tokens = await getVaultTokenSelections(connectedAccount, id);
          console.log("Real tokens:", tokens);
        } catch (error) {
          console.error("Error fetching tokens:", error);
          tokens = [];
        }

        // For now, skip timestamp fetching due to API complexities
        creationTimestamp = null;

        if (!tokens || tokens.length === 0) {
          // Fallback to mock data if no tokens found
          console.log("No tokens found in vault storage, using fallback");
          setVault({
            address: id,
            name: vaultName,
            tokens: AVAILABLE_TOKENS.map((token, index) => ({
              ...token,
              percentage: index === 0 ? 50 : index === 1 ? 30 : 20,
              isSelected: true,
            })),
            balance: "0.00",
            status: "Active",
            createdAt: new Date().toLocaleDateString(),
          });
        } else {
          // Use real vault data
          console.log("Using real vault data");
          const createdDate = new Date().toLocaleDateString(); // Use current date as fallback

          setVault({
            address: id,
            name: vaultName,
            tokens: tokens || [],
            balance: "0.00",
            status: "Active",
            createdAt: createdDate,
          });
        }
      } catch (error) {
        console.error("Error fetching vault data:", error);
        setError("Failed to fetch vault data");
      } finally {
        setLoading(false);
      }
    };

    fetchVaultData();
  }, [id, connectedAccount]);

  // Check if vault is multi-sig and fetch multi-sig info
  useEffect(() => {
    const checkMultiSig = async () => {
      if (!vault || !connectedAccount) {
        setCheckingMultiSig(false);
        return;
      }

      try {
        const isMS = await isMultiSigVault(connectedAccount, vault.address);
        setIsMultiSig(isMS);
        console.log(`Vault ${vault.address} is multi-sig:`, isMS);

        if (isMS) {
          // Fetch multi-sig vault info
          const info = await getMultiSigVaultInfo(connectedAccount, vault.address);
          setMultiSigInfo(info);
          console.log('Multi-sig vault info:', info);

          // Fetch pending proposals
          const proposalIds = await getPendingProposals(connectedAccount, vault.address);
          console.log('Pending proposal IDs:', proposalIds);

          // Fetch details for each proposal
          const proposals: Proposal[] = [];
          for (const proposalId of proposalIds) {
            const proposal = await getProposal(connectedAccount, vault.address, proposalId);
            if (proposal) {
              proposals.push(proposal);
            }
          }
          setPendingProposals(proposals);
          console.log('Pending proposals:', proposals);
        }
      } catch (error) {
        console.error("Error checking multi-sig status:", error);
        setIsMultiSig(false);
      } finally {
        setCheckingMultiSig(false);
      }
    };

    checkMultiSig();
  }, [vault, connectedAccount]);

  // Check auto deposit status
  useEffect(() => {
    const checkAutoDepositStatus = async () => {
      if (!vault || !connectedAccount) {
        setCheckingAutoDeposit(false);
        return;
      }

      try {
        const isEnabled = await isAutoDepositEnabled(
          connectedAccount,
          vault.address
        );
        setAutoDepositActive(isEnabled);

        if (isEnabled) {
          // Fetch auto deposit config to get next execution time
          const config = await getAutoDepositConfig(
            connectedAccount,
            vault.address
          );
          if (config?.nextExecutionTime) {
            setAutoDepositNextExecution(config.nextExecutionTime);
          }
        }
      } catch (error) {
        console.error("Error checking auto deposit status:", error);
      } finally {
        setCheckingAutoDeposit(false);
      }
    };

    checkAutoDepositStatus();
  }, [vault, connectedAccount]);

  const fetchTokenBalances = async (showToast = false) => {
    if (!vault || !connectedAccount) return;

    setBalancesLoading(true);

    let toastId: any = null;
    if (showToast) {
      toastId = toast.loading("Refreshing token balances...");
    }

    try {
      console.log("Fetching token balances for vault:", vault.address);

      const tokenAddresses = vault.tokens.map((token) => token.address);
      const balances = await getVaultTokenBalances(
        connectedAccount,
        vault.address,
        tokenAddresses
      );

      console.log("Token balances received:", balances);
      setTokenBalances(balances);

      if (toastId) {
        const nonZeroBalances = Object.values(balances).filter(
          (balance) => balance !== "0"
        ).length;
        toast.update(toastId, {
          render: `💰 Updated balances for ${nonZeroBalances} token${
            nonZeroBalances === 1 ? "" : "s"
          }`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error("Error fetching token balances:", err);

      if (toastId) {
        toast.update(toastId, {
          render: "Failed to fetch token balances",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (vault && connectedAccount) {
      fetchTokenBalances();
    }
  }, [vault, connectedAccount]);

  if (loading) {
    return (
      <div className="brut-card bg-white p-6">Loading vault details...</div>
    );
  }

  if (error || !vault) {
    return (
      <div className="brut-card bg-white p-6">
        <p className="text-red-600">Error: {error || "Vault not found"}</p>
      </div>
    );
  }

  const handleDepositSuccess = () => {
    // Refresh token balances after successful deposit
    console.log("Deposit successful, refreshing token balances...");
    setTimeout(() => {
      fetchTokenBalances(false); // Don't show toast for auto-refresh after deposit
    }, 2000); // Wait 2 seconds for the transaction to be processed
  };

  const handleWithdrawSuccess = async () => {
    // Refresh token balances after successful withdrawal/proposal
    console.log("Withdrawal/Proposal successful, refreshing data...");
    setShowWithdrawModal(false); // Close modal on success

    // If multi-sig, refresh proposals
    if (isMultiSig && vault && connectedAccount) {
      setTimeout(async () => {
        try {
          const proposalIds = await getPendingProposals(connectedAccount, vault.address);
          const proposals: Proposal[] = [];
          for (const proposalId of proposalIds) {
            const proposal = await getProposal(connectedAccount, vault.address, proposalId);
            if (proposal) {
              proposals.push(proposal);
            }
          }
          setPendingProposals(proposals);
          console.log('Refreshed proposals:', proposals);
        } catch (error) {
          console.error('Error refreshing proposals:', error);
        }
      }, 2000);
    }

    setTimeout(() => {
      fetchTokenBalances(false); // Don't show toast for auto-refresh after withdrawal
    }, 2000); // Wait 2 seconds for the transaction to be processed
  };

  const hasTokenBalances = Object.values(tokenBalances).some(
    (balance) => parseFloat(balance) > 0
  );

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Vault Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="brut-card bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-black">{vault.name}</h1>
              <div className="flex items-center space-x-2">
                <div className="brut-btn bg-lime-300">{vault.status}</div>

                {connectedAccount && hasTokenBalances && !checkingMultiSig && (
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="brut-btn bg-red-300 border-red-500"
                  >
                    {isMultiSig ? "Propose Withdrawal" : "Withdraw"}
                  </button>
                )}
              </div>
            </div>

            {/* Multi-Sig Info */}
            {isMultiSig && multiSigInfo && (
              <div className="mb-4 brut-card bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-2 border-blue-400">
                <h3 className="font-bold text-sm text-blue-900 mb-3">
                  🔐 Multi-Signature Vault
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Signers</p>
                    <p className="font-bold text-blue-900">{multiSigInfo.signers.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Threshold</p>
                    <p className="font-bold text-blue-900">
                      {multiSigInfo.threshold} of {multiSigInfo.signers.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Total Proposals</p>
                    <p className="font-bold text-blue-900">{multiSigInfo.proposalCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Pending</p>
                    <p className="font-bold text-blue-900">{pendingProposals.length}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-gray-600 text-xs mb-1">Signers:</p>
                  <div className="space-y-1">
                    {multiSigInfo.signers.map((signer, index) => (
                      <p key={index} className="font-mono text-xs bg-white px-2 py-1 rounded border border-blue-200">
                        {signer}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Auto Deposit Countdown - Compact Display */}
            {!checkingAutoDeposit && autoDepositActive && (
              <div className="mb-4 brut-card bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 p-3 border-2 border-purple-400">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {autoDepositNextExecution ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-purple-900">
                          ⏰ Next Auto Deposit In:
                        </span>
                        <CountdownTimer
                          targetTimestamp={autoDepositNextExecution}
                          compact={true}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-purple-900 mb-1">
                          Auto Deposit Active
                        </p>
                        <p className="text-xs text-gray-600">
                          Automatic weekly deposits are enabled for this vault
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAutoDepositModal(true)}
                    className="brut-btn bg-white text-sm px-4 py-2 hover:bg-purple-50 ml-3"
                  >
                    ⚙️ Manage
                  </button>
                </div>
              </div>
            )}

            {/* Auto Deposit CTA - When Not Active */}
            {!checkingAutoDeposit && !autoDepositActive && connectedAccount && (
              <div className="mb-4 brut-card bg-gradient-to-r from-lime-50 to-green-50 p-4 border-2 border-lime-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-green-900 mb-1">
                      🚀 Automate Your Deposits
                    </p>
                    <p className="text-xs text-gray-600">
                      Set up weekly recurring deposits to this vault
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAutoDepositModal(true)}
                    className="brut-btn bg-lime-300 text-sm px-4 py-2 font-bold hover:bg-lime-400"
                  >
                    Enable Auto Deposit
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Vault Address:</p>
              <p className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
                {vault.address}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* <div className="brut-card bg-lime-200 p-4">
              <p className="text-sm font-bold">Total Balance</p>
              <p className="text-2xl font-black">{vault.balance} MAS</p>
            </div> */}
              <div className="brut-card bg-yellow-200 p-4">
                <p className="text-sm font-bold">Tokens</p>
                <p className="text-2xl font-black">{vault.tokens.length}</p>
              </div>
              <div className="brut-card bg-blue-200 p-4">
                <p className="text-sm font-bold">Created</p>
                <p className="text-2xl font-black">{vault.createdAt}</p>
              </div>
            </div>
          </div>

          {/* Token Allocation */}
          <div className="brut-card bg-white p-6">
            <h2 className="text-xl font-black mb-4">Token Allocation</h2>
            <div className="space-y-3">
              {vault.tokens.map((token, index) => (
                <div key={token.address} className="brut-card bg-gray-50 p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div>
                        <div className="font-bold">{token.symbol}</div>
                        <div className="text-sm text-gray-600">
                          {token.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {token.address.slice(0, 8)}...
                          {token.address.slice(-6)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {token.percentage}%
                      </div>
                      <div className="text-sm text-gray-600">of deposits</div>
                      {/* <div className="mt-2 p-2 bg-white rounded-lg border">
                      <div className="text-xs text-gray-500">Balance:</div>
                      <div className="font-bold text-sm">
                        {balancesLoading ? (
                          <span className="text-gray-400">Loading...</span>
                        ) : (
                          `${tokenBalances[token.address] || '0'} ${token.symbol}`
                        )}
                      </div>
                    </div> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Total Portfolio Value */}
          <div className="brut-card bg-gradient-to-r from-lime-100 to-yellow-100 p-6">
            <h3 className="text-lg font-bold mb-2">Portfolio Value</h3>
            {balancesLoading ? (
              <p className="text-2xl font-black text-gray-400">Loading...</p>
            ) : (
              <div className="space-y-2">
                {vault.tokens.map((token) => {
                  const balance = tokenBalances[token.address] || "0";
                  return balance !== "0" ? (
                    <div
                      key={token.address}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center space-x-2">
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <span className="font-medium">{token.symbol}</span>
                      </div>
                      <span className="font-bold">{balance}</span>
                    </div>
                  ) : null;
                })}
                {Object.values(tokenBalances).every(
                  (balance) => balance === "0"
                ) && (
                  <p className="text-gray-600 text-center">
                    No tokens in vault yet
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => fetchTokenBalances(true)}
              disabled={balancesLoading}
              className="mt-3 w-full brut-btn bg-white text-sm"
            >
              {balancesLoading ? "Refreshing..." : "Refresh Balances"}
            </button>
          </div>

          {/* Deposit Component */}
          {connectedAccount && (
            <VaultDeposit
              vaultAddress={vault.address}
              vaultName={vault.name}
              onSuccess={handleDepositSuccess}
            />
          )}

          {!connectedAccount && (
            <div className="brut-card bg-yellow-100 p-4">
              <p className="text-sm font-bold mb-2">Connect Wallet</p>
              <p className="text-sm">
                Connect your wallet to deposit to this vault and see balances.
              </p>
            </div>
          )}

          {/* Pending Proposals for Multi-Sig Vaults */}
          {isMultiSig && pendingProposals.length > 0 && (
            <div className="brut-card bg-white p-6">
              <h3 className="text-lg font-bold mb-4">
                📋 Pending Withdrawal Proposals ({pendingProposals.length})
              </h3>
              <div className="space-y-4">
                {pendingProposals.map((proposal) => {
                  const tokenInfo = AVAILABLE_TOKENS.find(t => t.address === proposal.token);
                  const readableAmount = tokenInfo
                    ? (Number(proposal.amount) / Math.pow(10, tokenInfo.decimals)).toFixed(4)
                    : proposal.amount;

                  return (
                    <div
                      key={proposal.id}
                      className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-sm">Proposal #{proposal.id}</p>
                          <p className="text-xs text-gray-600">
                            Created {new Date(proposal.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Approvals</p>
                          <p className="font-bold text-blue-900">
                            {proposal.approvals.length} / {multiSigInfo?.threshold || 0}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Token:</span>
                          <span className="font-bold">{tokenInfo?.symbol || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-bold">{readableAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Recipient:</span>
                          <span className="font-mono text-xs">{proposal.recipient.slice(0, 10)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Proposer:</span>
                          <span className="font-mono text-xs">{proposal.proposer.slice(0, 10)}...</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-gray-600 mb-1">Approved by:</p>
                        <div className="space-y-1">
                          {proposal.approvals.map((signer, index) => (
                            <p key={index} className="font-mono text-xs bg-white px-2 py-1 rounded border border-blue-200">
                              {signer}
                            </p>
                          ))}
                        </div>
                      </div>

                      {connectedAccount && multiSigInfo?.signers.includes(connectedAccount.address) &&
                       !proposal.approvals.includes(connectedAccount.address) && (
                        <button
                          className="mt-3 w-full brut-btn bg-green-300 border-green-500 text-sm"
                          onClick={() => {
                            // TODO: Implement approve proposal
                            toast.info('Approve proposal functionality coming soon!');
                          }}
                        >
                          ✅ Approve Proposal
                        </button>
                      )}

                      {proposal.approvals.length >= (multiSigInfo?.threshold || 0) && (
                        <div className="mt-3 bg-green-100 border border-green-400 rounded p-2">
                          <p className="text-xs text-green-800 font-bold">
                            ✅ Threshold reached! This proposal can be executed.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vault Info */}
          <div className="brut-card bg-white p-6">
            <h3 className="text-lg font-bold mb-3">How It Works</h3>
            <div className="text-sm space-y-2">
              <p>• Deposits are automatically split across configured tokens</p>
              <p>• Each deposit triggers swaps via EagleFi DEX</p>
              <p>• Tokens are held in the vault contract</p>
              <p>• You maintain ownership of the vault</p>
            </div>
          </div>

          {/* Activity  */}
          {/* <div className="brut-card bg-white p-6">
          <h3 className="text-lg font-bold mb-3">Recent Activity</h3>
          <div className="text-sm text-gray-600">
            <p>No recent activity</p>
            <p className="mt-2">Activity will appear here after deposits and swaps.</p>
          </div>
        </div> */}
        </div>

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border-3 border-ink-950 shadow-brut max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black">
                    {isMultiSig ? `Propose Withdrawal from ${vault.name}` : `Withdraw from ${vault.name}`}
                  </h2>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="text-2xl font-bold hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                {isMultiSig ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                      <p className="text-sm text-blue-900 font-bold mb-2">
                        🔐 Multi-Signature Vault
                      </p>
                      <p className="text-xs text-blue-800">
                        This is a multi-sig vault. Withdrawals require approval from multiple signers.
                        Create a proposal below, and other signers can approve it.
                      </p>
                    </div>
                    <VaultWithdraw
                      vaultAddress={vault.address}
                      vaultTokens={vault.tokens}
                      tokenBalances={tokenBalances}
                      onSuccess={handleWithdrawSuccess}
                      isMultiSig={true}
                    />
                  </div>
                ) : (
                  <VaultWithdraw
                    vaultAddress={vault.address}
                    vaultTokens={vault.tokens}
                    tokenBalances={tokenBalances}
                    onSuccess={handleWithdrawSuccess}
                    isMultiSig={false}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auto Deposit Modal */}
        {showAutoDepositModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border-3 border-ink-950 shadow-brut max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black">
                    Auto Deposit Configuration
                  </h2>
                  <button
                    onClick={() => setShowAutoDepositModal(false)}
                    className="text-2xl font-bold hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                <VaultAutoDeposit
                  vaultAddress={vault.address}
                  vaultName={vault.name}
                  onSuccess={() => {
                    setShowAutoDepositModal(false);
                    // Refresh auto deposit status
                    setTimeout(async () => {
                      const isEnabled = await isAutoDepositEnabled(
                        connectedAccount,
                        vault.address
                      );
                      setAutoDepositActive(isEnabled);
                      if (isEnabled) {
                        const config = await getAutoDepositConfig(
                          connectedAccount,
                          vault.address
                        );
                        if (config?.nextExecutionTime) {
                          setAutoDepositNextExecution(config.nextExecutionTime);
                        }
                      } else {
                        setAutoDepositNextExecution(null);
                      }
                    }, 2000);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
