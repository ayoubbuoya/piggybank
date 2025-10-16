import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAccountStore } from '@massalabs/react-ui-kit';
import { 
  startDCAToVault, 
  stopDCA 
} from '../lib/dca';
import { 
  getUnallocatedUSDC, 
  processUnallocatedUSDC, 
  getUserUSDCBalance,
  approveUSDCSpending 
} from '../lib/massa';
import { 
  DCAConfig, 
  DCAStatus, 
  DCAFormData, 
  DCA_FREQUENCIES,
  USDC_DECIMALS,
  USDC_TOKEN_ADDRESS,
  DUSA_DCA_CONTRACT_ADDRESS 
} from '../lib/types';
import { getUserDCAsForVault } from '../lib/dcaQueries';

interface VaultDCAProps {
  vaultAddress: string;
}

export default function VaultDCA({ vaultAddress }: VaultDCAProps) {
  const { connectedAccount } = useAccountStore();
  const [isLoading, setIsLoading] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [unallocatedUSDC, setUnallocatedUSDC] = useState<string>('0');
  const [activeDCAs, setActiveDCAs] = useState<DCAStatus[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state matching DCAFormData interface
  const [formData, setFormData] = useState<DCAFormData>({
    amount: '',
    frequency: 'daily',
    totalExecutions: 10,
    startDelay: 24, // 24 hours default (Dusa minimum)
  });

  // Fetch balances and DCA status
  useEffect(() => {
    if (connectedAccount) {
      fetchData();
    }
  }, [connectedAccount, vaultAddress]);

  const fetchData = async () => {
    if (!connectedAccount) return;

    try {
      // Get USDC balance
      const balance = await getUserUSDCBalance(connectedAccount, USDC_TOKEN_ADDRESS);
      setUsdcBalance(balance);

      // Get unallocated USDC in vault
      const unallocated = await getUnallocatedUSDC(connectedAccount, vaultAddress);
      setUnallocatedUSDC(unallocated);

      // Fetch active DCAs from blockchain
      const userAddress = connectedAccount.address;
      const dcas = await getUserDCAsForVault(connectedAccount, userAddress, vaultAddress);
      setActiveDCAs(dcas);
      console.log('VaultDCA: Loaded DCAs from blockchain:', dcas);
    } catch (error) {
      console.error('Error fetching DCA data:', error);
    }
  };

  const handleCreateDCA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connectedAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);

    try {
      // First approve USDC spending for the total amount
      const totalAmount = (
        parseFloat(formData.amount) * formData.totalExecutions
      ).toFixed(USDC_DECIMALS);

      toast.info('Step 1/2: Approving USDC...');
      const approvalResult = await approveUSDCSpending(
        connectedAccount,
        DUSA_DCA_CONTRACT_ADDRESS,
        totalAmount
      );

      if (!approvalResult.success) {
        throw new Error(approvalResult.error || 'Approval failed');
      }

      toast.success('USDC approved! Now setting up DCA...');

      // Convert form data to DCAConfig
      const config: DCAConfig = {
        amountEachDCA: formData.amount,
        interval: DCA_FREQUENCIES[formData.frequency],
        nbOfDCA: formData.totalExecutions,
        tokenPath: [USDC_TOKEN_ADDRESS, vaultAddress], // Path from USDC to vault
        threshold: 100, // 1% slippage tolerance
        moreGas: false,
        startIn: Math.max(formData.startDelay * 3600, 86400), // Convert hours to seconds, minimum 24 hours
      };

      toast.info('Step 2/2: Creating DCA plan...');
      const result = await startDCAToVault(connectedAccount, vaultAddress, config);

      if (result.success) {
        toast.success('DCA plan created successfully! 🎉');
        
        // Dispatch custom event to notify DCAOverview
        window.dispatchEvent(new Event('dcaCreated'));
        
        setShowCreateForm(false);
        setFormData({
          amount: '',
          frequency: 'daily',
          totalExecutions: 10,
          startDelay: 24, // Reset to 24 hours minimum
        });
        // Refresh data from blockchain
        await fetchData();
      } else {
        throw new Error(result.error || 'DCA creation failed');
      }
    } catch (error) {
      console.error('Error creating DCA:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create DCA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopDCA = async (dcaId: bigint) => {
    if (!connectedAccount) return;

    setIsLoading(true);
    try {
      const result = await stopDCA(connectedAccount, dcaId);
      if (result.success) {
        toast.success('DCA stopped successfully');
        await fetchData();
      } else {
        throw new Error(result.error || 'Failed to stop DCA');
      }
    } catch (error) {
      console.error('Error stopping DCA:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to stop DCA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessUnallocated = async () => {
    if (!connectedAccount) return;

    setIsLoading(true);
    try {
      const result = await processUnallocatedUSDC(connectedAccount, vaultAddress);
      if (result.success) {
        // Refresh unallocated amount
        await fetchData();
      }
    } catch (error) {
      console.error('Error processing unallocated USDC:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIntervalLabel = (seconds: number): string => {
    const hours = seconds / 3600;
    const days = seconds / 86400;
    if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Unallocated USDC Card */}
      {parseFloat(unallocatedUSDC) > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Pending USDC
              </h3>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-1">
                {unallocatedUSDC} USDC
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                This USDC has arrived (likely from DCA) but hasn't been split yet
              </p>
            </div>
            <button
              onClick={handleProcessUnallocated}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Process Now
            </button>
          </div>
        </div>
      )}

      {/* Active DCAs */}
      {activeDCAs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Active DCA Plans
          </h3>
          <div className="space-y-4">
            {activeDCAs.map((dca) => (
              <div
                key={dca.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {(Number(dca.amountEachDCA) / 10**USDC_DECIMALS).toFixed(2)} USDC
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        every {getIntervalLabel(dca.interval)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Executions:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {dca.executedCount} / {dca.nbOfDCA}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStopDCA(BigInt(dca.id))}
                    disabled={isLoading}
                    className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Stop
                  </button>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(dca.executedCount / dca.nbOfDCA) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create DCA Button/Form */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Create New DCA Plan
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create DCA Plan
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateDCA} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount per Execution
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-16"
                  placeholder="0.00"
                  required
                />
                <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400">
                  USDC
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your balance: {usdcBalance} USDC
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) =>
                  setFormData({ ...formData, frequency: e.target.value as DCAFormData['frequency'] })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="daily">Daily (24 hours)</option>
                <option value="weekly">Weekly (7 days)</option>
                <option value="monthly">Monthly (30 days)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum interval: 24 hours (Dusa DCA requirement)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Executions
              </label>
              <input
                type="number"
                min="1"
                value={formData.totalExecutions}
                onChange={(e) =>
                  setFormData({ ...formData, totalExecutions: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Total amount: {(parseFloat(formData.amount || '0') * formData.totalExecutions).toFixed(2)} USDC
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Delay (hours)
              </label>
              <select
                value={formData.startDelay}
                onChange={(e) =>
                  setFormData({ ...formData, startDelay: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={24}>1 day (recommended)</option>
                <option value={48}>2 days</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum delay: 24 hours before first execution
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>How it works:</strong> Your USDC will be automatically sent to this vault at the specified interval. Once received, you can process it to split across your configured tokens.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ⚠️ <strong>MAS Required:</strong> You'll need ~{(1.5 + 0.3 * formData.totalExecutions).toFixed(2)} MAS for storage costs (returned when DCA completes).
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create DCA Plan'}
            </button>
          </form>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          About DCA (Dollar Cost Averaging)
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Automate recurring deposits to your vault</li>
          <li>• Reduce timing risk by averaging your entry points</li>
          <li>• Set it and forget it - fully autonomous execution</li>
          <li>• Stop or modify anytime</li>
        </ul>
      </div>
    </div>
  );
}
