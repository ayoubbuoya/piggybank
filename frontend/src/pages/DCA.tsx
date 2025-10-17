import { useState, useEffect } from 'react';
import { useAccountStore } from '@massalabs/react-ui-kit';
import { AVAILABLE_TOKENS } from '../lib/types';
import { startDCA, stopDCA, getUserDCAs } from '../lib/dca';
import { toast } from 'react-toastify';

interface DCAFormData {
  fromToken: string;
  toToken: string;
  amount: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  totalExecutions: number;
  startDelay: number; // hours
}

const DCA_FREQUENCIES = {
  daily: 86400, // 24 hours in seconds
  weekly: 604800, // 7 days
  monthly: 2592000, // 30 days
};

export default function DCA() {
  const { connectedAccount } = useAccountStore();
  const [activeDCAs, setActiveDCAs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DCAFormData>({
    fromToken: '',
    toToken: '',
    amount: '',
    frequency: 'weekly',
    totalExecutions: 10,
    startDelay: 24,
  });

  useEffect(() => {
    if (connectedAccount) {
      fetchUserDCAs();
    }
  }, [connectedAccount]);

  const fetchUserDCAs = async () => {
    if (!connectedAccount) return;

    try {
      const dcas = await getUserDCAs(connectedAccount);
      setActiveDCAs(dcas);
    } catch (error) {
      console.error('Error fetching DCAs:', error);
    }
  };

  const handleCreateDCA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connectedAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.fromToken || !formData.toToken) {
      toast.error('Please select both tokens');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const config = {
        amountEachDCA: formData.amount,
        interval: DCA_FREQUENCIES[formData.frequency],
        nbOfDCA: formData.totalExecutions,
        tokenPath: [formData.fromToken, formData.toToken],
        threshold: 100, // 1% slippage
        moreGas: false,
        startIn: Math.max(formData.startDelay * 3600, 86400), // minimum 24 hours
      };

      const result = await startDCA(connectedAccount, config);

      if (result.success) {
        toast.success('DCA created successfully! 🎉');
        setFormData({
          fromToken: '',
          toToken: '',
          amount: '',
          frequency: 'weekly',
          totalExecutions: 10,
          startDelay: 24,
        });
        await fetchUserDCAs();
      }
    } catch (error) {
      console.error('Error creating DCA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopDCA = async (dcaId: number) => {
    if (!connectedAccount) return;

    setLoading(true);
    try {
      const result = await stopDCA(connectedAccount, BigInt(dcaId));
      if (result.success) {
        await fetchUserDCAs();
      }
    } catch (error) {
      console.error('Error stopping DCA:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="brut-card bg-gradient-to-r from-purple-100 to-blue-100 p-8">
        <h1 className="text-4xl font-black mb-2">Dollar Cost Averaging</h1>
        <p className="text-lg text-gray-700">
          Automate your token swaps and reduce timing risk with DCA powered by Dusa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create DCA Form */}
        <div className="lg:col-span-2">
          <div className="brut-card bg-white p-6">
            <h2 className="text-2xl font-bold mb-4">Create New DCA</h2>

            <form onSubmit={handleCreateDCA} className="space-y-4">
              {/* Token Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">From Token</label>
                  <select
                    value={formData.fromToken}
                    onChange={(e) => setFormData({ ...formData, fromToken: e.target.value })}
                    className="brut-input w-full"
                    required
                  >
                    <option value="">Select token...</option>
                    {AVAILABLE_TOKENS.map((token) => (
                      <option key={token.address} value={token.address}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">To Token</label>
                  <select
                    value={formData.toToken}
                    onChange={(e) => setFormData({ ...formData, toToken: e.target.value })}
                    className="brut-input w-full"
                    required
                  >
                    <option value="">Select token...</option>
                    {AVAILABLE_TOKENS.map((token) => (
                      <option key={token.address} value={token.address}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-bold mb-2">Amount per Execution</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="brut-input w-full"
                  placeholder="10.00"
                  required
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-bold mb-2">Frequency</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFormData({ ...formData, frequency: freq })}
                      className={`brut-btn ${
                        formData.frequency === freq
                          ? 'bg-blue-400 border-blue-600'
                          : 'bg-gray-200 border-gray-400'
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Executions */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Total Executions: {formData.totalExecutions}
                </label>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={formData.totalExecutions}
                  onChange={(e) =>
                    setFormData({ ...formData, totalExecutions: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>2</span>
                  <span>50</span>
                </div>
              </div>

              {/* Start Delay */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Start Delay: {formData.startDelay} hours
                </label>
                <input
                  type="range"
                  min="24"
                  max="168"
                  step="24"
                  value={formData.startDelay}
                  onChange={(e) =>
                    setFormData({ ...formData, startDelay: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>24h</span>
                  <span>7 days</span>
                </div>
              </div>

              {/* Summary */}
              <div className="brut-card bg-blue-50 p-4">
                <h3 className="font-bold mb-2">Summary</h3>
                <div className="text-sm space-y-1">
                  <p>
                    • Total Investment: {(parseFloat(formData.amount || '0') * formData.totalExecutions).toFixed(2)}{' '}
                    tokens
                  </p>
                  <p>• Executes every {formData.frequency}</p>
                  <p>• First execution in {formData.startDelay} hours</p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !connectedAccount}
                className="brut-btn bg-blue-400 border-blue-600 w-full text-lg"
              >
                {loading ? 'Creating...' : 'Create DCA Plan'}
              </button>
            </form>
          </div>
        </div>

        {/* Active DCAs Sidebar */}
        <div>
          <div className="brut-card bg-white p-6">
            <h3 className="text-lg font-bold mb-4">Your Active DCAs</h3>

            {!connectedAccount ? (
              <p className="text-sm text-gray-600">Connect wallet to view your DCAs</p>
            ) : activeDCAs.length === 0 ? (
              <p className="text-sm text-gray-600">No active DCAs yet</p>
            ) : (
              <div className="space-y-3">
                {activeDCAs.map((dca) => (
                  <div key={dca.id} className="brut-card bg-gray-50 p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-bold">DCA #{dca.id}</div>
                      <button
                        onClick={() => handleStopDCA(dca.id)}
                        className="text-xs px-2 py-1 bg-red-200 border-2 border-red-400 rounded"
                        disabled={loading}
                      >
                        Stop
                      </button>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>{dca.executedCount} / {dca.nbOfDCA} completed</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="brut-card bg-purple-50 p-6 mt-6">
            <h3 className="font-bold mb-2">What is DCA?</h3>
            <div className="text-sm space-y-2">
              <p>Dollar Cost Averaging helps reduce timing risk by:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Spreading purchases over time</li>
                <li>Avoiding emotional trading</li>
                <li>Automating your strategy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
