import { useParams } from "react-router-dom";
import { useAccountStore } from "@massalabs/react-ui-kit";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import VaultDeposit from "../components/VaultDeposit";
import { AVAILABLE_TOKENS, TokenSelection } from "../lib/types";
import { getVaultTokenBalances } from "../lib/massa";

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

  useEffect(() => {
    // For now, create a mock vault based on the id (address)
    // In a real implementation, this would fetch vault data from the blockchain
    if (id) {
      // Mock vault data - in real implementation, this would fetch from smart contract
      const mockVault: VaultData = {
        address: id,
        name: "Splitter Vault",
        tokens: AVAILABLE_TOKENS.map((token, index) => ({
          ...token,
          percentage: index === 0 ? 50 : index === 1 ? 30 : 20,
          isSelected: true
        })),
        balance: "0.00",
        status: "Active",
        createdAt: new Date().toLocaleDateString()
      };
      
      setVault(mockVault);
      setLoading(false);
    }
  }, [id]);

  const fetchTokenBalances = async (showToast = false) => {
    if (!vault || !connectedAccount) return;

    setBalancesLoading(true);
    
    let toastId: any = null;
    if (showToast) {
      toastId = toast.loading('Refreshing token balances...');
    }

    try {
      console.log('Fetching token balances for vault:', vault.address);
      
      const tokenAddresses = vault.tokens.map(token => token.address);
      const balances = await getVaultTokenBalances(
        connectedAccount,
        vault.address,
        tokenAddresses
      );
      
      console.log('Token balances received:', balances);
      setTokenBalances(balances);

      if (toastId) {
        const nonZeroBalances = Object.values(balances).filter(balance => balance !== '0').length;
        toast.update(toastId, {
          render: `💰 Updated balances for ${nonZeroBalances} token${nonZeroBalances === 1 ? '' : 's'}`,
          type: 'success',
          isLoading: false,
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error('Error fetching token balances:', err);
      
      if (toastId) {
        toast.update(toastId, {
          render: 'Failed to fetch token balances',
          type: 'error',
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
    return <div className="brut-card bg-white p-6">Loading vault details...</div>;
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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Vault Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="brut-card bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-black">{vault.name}</h1>
            <div className="brut-btn bg-lime-300">
              {vault.status}
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Vault Address:</p>
            <p className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
              {vault.address}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="brut-card bg-lime-200 p-4">
              <p className="text-sm font-bold">Total Balance</p>
              <p className="text-2xl font-black">{vault.balance} MAS</p>
            </div>
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
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div>
                      <div className="font-bold">{token.symbol}</div>
                      <div className="text-sm text-gray-600">{token.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{token.address.slice(0, 8)}...{token.address.slice(-6)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{token.percentage}%</div>
                    <div className="text-sm text-gray-600">of deposits</div>
                    <div className="mt-2 p-2 bg-white rounded-lg border">
                      <div className="text-xs text-gray-500">Balance:</div>
                      <div className="font-bold text-sm">
                        {balancesLoading ? (
                          <span className="text-gray-400">Loading...</span>
                        ) : (
                          `${tokenBalances[token.address] || '0'} ${token.symbol}`
                        )}
                      </div>
                    </div>
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
              {vault.tokens.map(token => {
                const balance = tokenBalances[token.address] || '0';
                return balance !== '0' ? (
                  <div key={token.address} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-5 h-5 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="font-medium">{token.symbol}</span>
                    </div>
                    <span className="font-bold">{balance}</span>
                  </div>
                ) : null;
              })}
              {Object.values(tokenBalances).every(balance => balance === '0') && (
                <p className="text-gray-600 text-center">No tokens in vault yet</p>
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
            <p className="text-sm">Connect your wallet to deposit to this vault and see balances.</p>
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
    </div>
  );
}
