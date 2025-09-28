import { demoVaults } from "../data/vaults.ts";

export default function Analytics() {
  const total = demoVaults.reduce((a, b) => a + b.balance, 0);
  const actions = demoVaults.reduce((a, b) => a + b.timeline.length, 0);
  
  return (
    <div className="relative space-y-6">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 rounded-3xl">
        <div className="brut-card bg-yellow-300 border-black p-8 text-center max-w-md">
          <h2 className="text-2xl font-black mb-4"> Coming Soon!</h2>
          <p className="text-lg font-bold mb-3">Analytics Dashboard</p>
          <div className="text-sm space-y-2 mb-4">
         
            <p>📈 Vault analytics and insights</p>
            <p>🔄 Swap history and metrics</p>
            <p>📅 Historical deposit/withdrawal data</p>
          </div>
          <div className="brut-card bg-white p-3">
            <p className="text-xs font-bold text-gray-700">
              This feature is currently in development and will be available in the next update!
            </p>
          </div>
        </div>
      </div>

      {/* Background content (blurred/disabled) */}
      <div className="filter blur-sm pointer-events-none select-none">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="brut-card bg-white p-6">
            <h2 className="text-xl font-black">Total Saved</h2>
            <div className="text-4xl font-black mt-3">
              ${total.toLocaleString()}
            </div>
          </div>
          <div className="brut-card bg-white p-6">
            <h2 className="text-xl font-black">Automations Executed</h2>
            <div className="text-4xl font-black mt-3">{actions}</div>
          </div>
          <div className="brut-card bg-white p-6">
            <h2 className="text-xl font-black">Active Vaults</h2>
            <div className="text-4xl font-black mt-3">{demoVaults.length}</div>
          </div>
          <div className="md:col-span-3 brut-card bg-accent-primary p-6">
            <p className="font-bold">Charts placeholder:</p>
            <p>Swap in a chart lib later, or render on‑chain stats.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
