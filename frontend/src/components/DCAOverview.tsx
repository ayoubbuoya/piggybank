import { useState, useEffect } from 'react';
import { useAccountStore } from '@massalabs/react-ui-kit';
import { DCAStatus } from '../lib/types';
import { USDC_DECIMALS } from '../lib/types';
import { getUserDCAsForVault } from '../lib/dcaQueries';

interface DCAOverviewProps {
  vaultAddress: string;
  onViewDetails: () => void; // Callback to switch to DCA tab
}

export default function DCAOverview({ vaultAddress, onViewDetails }: DCAOverviewProps) {
  const { connectedAccount } = useAccountStore();
  const [activeDCAs, setActiveDCAs] = useState<DCAStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    fetchActiveDCAs(true);
    
    // Use a client-side timer to update the countdown every second
    // This updates only the time display without refetching data
    const countdownInterval = setInterval(() => {
      // Force re-render to update countdown timers
      setActiveDCAs(prev => [...prev]);
    }, 1000);
    
    // Refresh data from blockchain every 30 seconds (less aggressive)
    const dataInterval = setInterval(() => fetchActiveDCAs(false), 30000);
    
    // Refresh when window regains focus
    const handleFocus = () => fetchActiveDCAs(false);
    window.addEventListener('focus', handleFocus);
    
    // Listen for custom event when DCA is created
    const handleDCACreated = () => {
      console.log('DCAOverview: DCA created event received, refreshing...');
      setTimeout(() => fetchActiveDCAs(false), 500);
    };
    window.addEventListener('dcaCreated', handleDCACreated);
    
    return () => {
      clearInterval(countdownInterval);
      clearInterval(dataInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('dcaCreated', handleDCACreated);
    };
  }, [connectedAccount, vaultAddress]);

  const fetchActiveDCAs = async (showLoading = false) => {
    if (!connectedAccount) {
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    try {
      // Only show loading spinner on initial load or manual refresh
      if (showLoading) {
        setLoading(true);
      }
      
      console.log('DCAOverview: Fetching DCAs from blockchain for vault:', vaultAddress);
      
      // Fetch active DCAs from blockchain using the connected account's address
      const userAddress = connectedAccount.address;
      console.log('DCAOverview: User address:', userAddress);
      
      const dcas = await getUserDCAsForVault(connectedAccount, userAddress, vaultAddress);
      console.log('DCAOverview: Found DCAs from blockchain:', dcas);
      
      setActiveDCAs(dcas);
    } catch (error) {
      console.error('Error fetching DCAs from blockchain:', error);
      // Don't clear existing data on error during background refresh
      if (showLoading) {
        setActiveDCAs([]);
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const formatInterval = (seconds: number): string => {
    const hours = seconds / 3600;
    if (hours < 24) return `${hours}h`;
    const days = hours / 24;
    if (days < 7) return `${Math.floor(days)}d`;
    const weeks = days / 7;
    if (weeks < 4) return `${Math.floor(weeks)}w`;
    return `${Math.floor(days / 30)}mo`;
  };

  const formatAmount = (amount: bigint): string => {
    const divisor = BigInt(10 ** USDC_DECIMALS);
    return (Number(amount) / Number(divisor)).toFixed(2);
  };

  const getTimeUntilNext = (dca: DCAStatus): string => {
    const now = Math.floor(Date.now() / 1000);
    
    // If startTime is very small (< 1 year in seconds), it's likely a relative delay, not an absolute timestamp
    // In that case, the DCA hasn't been properly initialized yet
    const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
    if (dca.startTime < ONE_YEAR_SECONDS) {
      return 'Pending initialization...';
    }
    
    // Calculate next execution time
    // If executedCount is 0, the next execution is at startTime + interval (not just startTime)
    // The startTime is when the DCA was created, first execution happens after one interval
    const nextExecution = dca.startTime + ((dca.executedCount + 1) * dca.interval);
    
    if (nextExecution < now) {
      // Check how long it's been since the scheduled time
      const delaySeconds = now - nextExecution;
      
      // If it's been less than an hour since scheduled time, show it's processing
      if (delaySeconds < 3600) {
        return 'Processing soon...';
      }
      
      // If it's been more than an hour, there might be an issue
      const delayHours = Math.floor(delaySeconds / 3600);
      if (delayHours < 24) {
        return `Scheduled ${delayHours}h ago`;
      }
      const delayDays = Math.floor(delayHours / 24);
      return `Scheduled ${delayDays}d ago`;
    }
    
    const diff = nextExecution - now;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProgress = (dca: DCAStatus): number => {
    return Math.round((dca.executedCount / dca.nbOfDCA) * 100);
  };

  if (!connectedAccount) {
    return null;
  }

  // Only show loading state on initial load
  if (loading && isInitialLoad) {
    return (
      <div className="brut-card bg-white p-6">
        <h3 className="text-lg font-bold mb-3">Active DCA Plans</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (activeDCAs.length === 0) {
    return (
      <div className="brut-card bg-gradient-to-br from-purple-50 to-blue-50 p-6 border-2 border-purple-200">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-purple-900">DCA Automation</h3>
          <span className="text-2xl">📈</span>
        </div>
        <p className="text-sm text-purple-700 mb-4">
          Set up automated USDC deposits to your vault with Dollar Cost Averaging
        </p>
        <button
          onClick={onViewDetails}
          className="w-full brut-btn bg-purple-300 border-purple-500 text-purple-900 hover:bg-purple-400"
        >
          Set Up DCA
        </button>
      </div>
    );
  }

  return (
    <div className="brut-card bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Active DCA Plans</h3>
        <div className="flex items-center gap-2">
          <div className="brut-btn bg-lime-300 text-xs px-2 py-1">
            {activeDCAs.length} Active
          </div>
          <button
            onClick={() => fetchActiveDCAs(true)}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Refresh DCAs"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {activeDCAs.map((dca) => {
          const progress = getProgress(dca);
          
          return (
            <div
              key={dca.id}
              className="brut-card bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-2 border-blue-200"
            >
              {/* Amount & Frequency */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xl font-black text-blue-900">
                    {formatAmount(dca.amountEachDCA)} USDC
                  </div>
                  <div className="text-xs text-blue-600">
                    every {formatInterval(dca.interval)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-purple-900">
                    {dca.executedCount} / {dca.nbOfDCA}
                  </div>
                  <div className="text-xs text-purple-600">executions</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">Progress</span>
                  <span className="text-xs font-bold text-gray-900">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden border-2 border-gray-300">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Next Execution */}
              {dca.executedCount < dca.nbOfDCA && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Next in:</span>
                  <span className="font-bold text-green-700 bg-green-100 px-2 py-1 rounded border border-green-300">
                    ⏱️ {getTimeUntilNext(dca)}
                  </span>
                </div>
              )}

              {/* Completed Badge */}
              {dca.executedCount >= dca.nbOfDCA && (
                <div className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded border border-green-300 text-center">
                  ✅ Completed
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      <button
        onClick={onViewDetails}
        className="w-full mt-4 brut-btn bg-blue-200 border-blue-400 text-sm"
      >
        Manage DCA Plans
      </button>
    </div>
  );
}
