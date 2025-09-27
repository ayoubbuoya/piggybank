import { demoVaults } from "../data/vaults.ts";

export default function Analytics() {
  const total = demoVaults.reduce((a, b) => a + b.balance, 0);
  const actions = demoVaults.reduce((a, b) => a + b.timeline.length, 0);
  return (
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
  );
}
