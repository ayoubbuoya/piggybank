import { useState, useEffect, useRef } from 'react';
import { useAccountStore } from '@massalabs/react-ui-kit';
import { 
    scheduleRecurringDeposit, 
    cancelDepositSchedule,
    getUserDepositSchedules,
    AutoDepositSchedule 
} from '../lib/autoDeposit';
import { formatUnits, parseUnits } from '@massalabs/massa-web3';
import { USDC_DECIMALS, BASE_TOKEN_ADDRESS } from '../lib/types';
import { FACTORY_CONTRACT_ADDRESS } from '../lib/autoDeposit';
import { SmartContract, Args, OperationStatus } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';

// Approve token spending
async function approveToken(connectedAccount: any, spender: string, amount: bigint): Promise<boolean> {
    const toastId = toast.loading('Approving token spending...');
    try {
        const tokenContract = new SmartContract(connectedAccount, BASE_TOKEN_ADDRESS);
        const args = new Args()
            .addString(spender)
            .addU256(amount)
            .serialize();

        const operation = await tokenContract.call('increaseAllowance', args, { coins: 0n });
        const status = await operation.waitSpeculativeExecution();

        if (status === OperationStatus.SpeculativeSuccess) {
            toast.update(toastId, {
                render: '✅ Approval successful',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
            });
            return true;
        } else {
            toast.update(toastId, {
                render: 'Approval failed',
                type: 'error',
                isLoading: false,
                autoClose: 3000,
            });
            return false;
        }
    } catch (error) {
        console.error('Approval error:', error);
        toast.update(toastId, {
            render: 'Approval failed',
            type: 'error',
            isLoading: false,
            autoClose: 3000,
        });
        return false;
    }
}

interface VaultAutoDepositProps {
    vaultAddress: string;
}

export default function VaultAutoDeposit({ vaultAddress }: VaultAutoDepositProps) {
    const { connectedAccount } = useAccountStore();
    const [amount, setAmount] = useState('10');
    const [frequency, setFrequency] = useState<'test' | 'daily' | 'weekly' | 'monthly'>('weekly');
    const [schedule, setSchedule] = useState<AutoDepositSchedule | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [countdown, setCountdown] = useState('');
    const isInitialLoad = useRef(true);

    const intervalMap = {
        test: 300,       // 5 minutes (for testing!)
        daily: 86400,    // 24 hours
        weekly: 604800,  // 7 days
        monthly: 2592000 // 30 days
    };

    // Fetch user's schedule for this vault
    useEffect(() => {
        if (!connectedAccount) return;

        const fetchSchedule = async () => {
            const schedules = await getUserDepositSchedules(connectedAccount, connectedAccount.address);
            const vaultSchedule = schedules.find(s => 
                s.vaultAddress === vaultAddress && s.isActive
            );
            setSchedule(vaultSchedule || null);
            
            // Only show loading on initial load, not on subsequent polls
            if (isInitialLoad.current) {
                setFetching(false);
                isInitialLoad.current = false;
            }
        };

        fetchSchedule();
        // Poll less frequently to avoid UI flashing (every 60 seconds instead of 30)
        const interval = setInterval(fetchSchedule, 60000);
        return () => clearInterval(interval);
    }, [connectedAccount, vaultAddress]);

    // Countdown timer
    useEffect(() => {
        if (!schedule || !schedule.isActive) {
            setCountdown('');
            return;
        }

        const updateCountdown = () => {
            const now = Date.now(); // milliseconds
            const timeUntilNext = Math.floor((schedule.nextExecutionTime - now) / 1000); // convert to seconds

            if (timeUntilNext <= 0) {
                // The deferred call system will execute automatically on-chain
                // No user interaction needed!
                setCountdown('⚡ Executing automatically...');
            } else {
                const days = Math.floor(timeUntilNext / 86400);
                const hours = Math.floor((timeUntilNext % 86400) / 3600);
                const minutes = Math.floor((timeUntilNext % 3600) / 60);
                const seconds = timeUntilNext % 60;

                if (days > 0) {
                    setCountdown(`${days}d ${hours}h ${minutes}m`);
                } else if (hours > 0) {
                    setCountdown(`${hours}h ${minutes}m ${seconds}s`);
                } else {
                    setCountdown(`${minutes}m ${seconds}s`);
                }
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [schedule]);

    const handleScheduleDeposit = async () => {
        if (!connectedAccount) return;

        setLoading(true);
        try {
            // Calculate approval amount based on frequency
            // Test mode: 12 deposits (1 hour of testing)
            // Daily = 365, Weekly = 52, Monthly = 12
            const depositsPerYear = frequency === 'test' ? 12 : 
                                   frequency === 'daily' ? 365 : 
                                   frequency === 'weekly' ? 52 : 12;
            const approvalAmount = parseUnits(
                (parseFloat(amount) * depositsPerYear).toString(), 
                USDC_DECIMALS
            );
            
            const approvalMessage = frequency === 'test' 
                ? `${depositsPerYear} test deposits (1 hour)`
                : `${depositsPerYear} deposits (1 year)`;
            console.log(`Approving ${formatUnits(approvalAmount, USDC_DECIMALS)} USDC (${approvalMessage})`);
            
            // First, approve the factory contract to spend tokens
            const approved = await approveToken(
                connectedAccount,
                FACTORY_CONTRACT_ADDRESS,
                approvalAmount
            );

            if (!approved) {
                setLoading(false);
                return;
            }

            // Schedule the recurring deposit
            const result = await scheduleRecurringDeposit(connectedAccount, {
                vaultAddress,
                amount,
                intervalSeconds: intervalMap[frequency]
            });

            if (result.success) {
                // Refresh schedule
                const schedules = await getUserDepositSchedules(connectedAccount, connectedAccount.address);
                const vaultSchedule = schedules.find(s => 
                    s.vaultAddress === vaultAddress && s.isActive
                );
                setSchedule(vaultSchedule || null);
            }
        } catch (error) {
            console.error('Error scheduling deposit:', error);
        }
        setLoading(false);
    };

    const handleCancelSchedule = async () => {
        if (!connectedAccount || !schedule) return;

        setLoading(true);
        try {
            const result = await cancelDepositSchedule(connectedAccount, schedule.id);
            if (result.success) {
                setSchedule(null);
            }
        } catch (error) {
            console.error('Error cancelling schedule:', error);
        }
        setLoading(false);
    };

    if (fetching) {
        return (
            <div className="brut-card bg-yellow-50 p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {schedule && schedule.isActive ? (
                // Active schedule view - Brutalist style
                <div className="space-y-4">
                    <div className="brut-card bg-lime-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">⚡</span>
                            <h3 className="font-black text-lg">AUTOMATION ACTIVE</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="brut-card bg-white p-3">
                                <p className="text-xs font-bold text-gray-600 mb-1">AMOUNT</p>
                                <p className="text-xl font-black">
                                    {formatUnits(schedule.amount, USDC_DECIMALS)} USDC
                                </p>
                            </div>
                            <div className="brut-card bg-white p-3">
                                <p className="text-xs font-bold text-gray-600 mb-1">FREQUENCY</p>
                                <p className="text-xl font-black">
                                    {schedule.intervalSeconds === 300 ? '🧪 TEST (5MIN)' :
                                     schedule.intervalSeconds === 86400 ? 'DAILY' : 
                                     schedule.intervalSeconds === 604800 ? 'WEEKLY' : 
                                     schedule.intervalSeconds === 2592000 ? 'MONTHLY' : 
                                     `${schedule.intervalSeconds / 86400}D`}
                                </p>
                            </div>
                        </div>

                        <div className="brut-card bg-blue-50 p-3 mb-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-600">NEXT DEPOSIT IN</p>
                                    <p className="text-lg font-black text-blue-600">{countdown}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-600">COMPLETED</p>
                                    <p className="text-lg font-black">{schedule.totalDeposits}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCancelSchedule}
                            disabled={loading}
                            className="w-full brut-btn bg-red-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {loading ? 'STOPPING...' : '🛑 STOP AUTOMATION'}
                        </button>
                    </div>

                    <div className="brut-card bg-yellow-50 p-3">
                        <p className="text-xs font-bold">
                            ⚠️ Keep sufficient USDC balance & allowance in your wallet
                        </p>
                    </div>
                </div>
            ) : (
                // Setup form - Brutalist style
                <div className="space-y-4">
                    <div className="brut-card bg-white p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">⚡</span>
                            <div>
                                <h3 className="font-black text-lg">SET IT & FORGET IT</h3>
                                <p className="text-xs text-gray-600">Automate your vault deposits</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block font-bold text-sm mb-1">
                                    AMOUNT PER DEPOSIT (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="10"
                                    min="1"
                                    step="1"
                                    className="w-full border-2 border-ink-950 rounded-lg p-2 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-sm mb-2">
                                    FREQUENCY
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['test', 'daily', 'weekly', 'monthly'] as const).map((freq) => (
                                        <button
                                            key={freq}
                                            onClick={() => setFrequency(freq)}
                                            className={`brut-btn text-xs ${
                                                frequency === freq
                                                    ? 'bg-lime-300'
                                                    : 'bg-gray-200'
                                            }`}
                                        >
                                            {freq === 'test' ? '🧪 5MIN' : freq.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                {frequency === 'test' && (
                                    <p className="text-xs text-orange-600 font-bold mt-1">
                                        ⚠️ Test mode: deposits every 5 minutes
                                    </p>
                                )}
                            </div>

                            <div className="brut-card bg-blue-50 p-3">
                                <p className="text-xs font-bold text-gray-600 mb-1">SUMMARY</p>
                                <p className="font-bold">
                                    Deposit <span className="text-blue-600">{amount} USDC</span> every{' '}
                                    <span className="text-purple-600">
                                        {frequency === 'test' ? '5 minutes' : frequency}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {frequency === 'test' 
                                        ? '🧪 Perfect for testing the automation!'
                                        : `≈ ${(parseFloat(amount || '0') * (frequency === 'daily' ? 30 : frequency === 'weekly' ? 4 : 1)).toFixed(2)} USDC per month`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleScheduleDeposit}
                        disabled={loading || !connectedAccount || parseFloat(amount) <= 0}
                        className="w-full brut-btn bg-lime-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'SETTING UP...' : '⚡ ACTIVATE AUTOMATION'}
                    </button>

                    <div className="brut-card bg-purple-50 p-3">
                        <p className="text-xs font-bold mb-2">ℹ️ HOW IT WORKS</p>
                        <div className="text-xs space-y-1">
                            <p>• Approve contract to spend your USDC</p>
                            <p>• Auto-deposits at your chosen frequency</p>
                            <p>• Cancel anytime - no lock period</p>
                            <p>• Keep USDC in wallet for scheduled deposits</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
