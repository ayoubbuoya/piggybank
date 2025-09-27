import { useParams } from "react-router-dom";
import { demoVaults } from "../data/vaults.ts";

export default function VaultDetails() {
  const { id } = useParams<{ id: string }>();
  const v = demoVaults.find((x) => x.id === id);

  if (!v) {
    return <div className="brut-card bg-white p-6">Vault not found.</div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 brut-card bg-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black">{v.name}</h1>
          <div className="brut-btn" style={{ backgroundColor: v.color }}>
            {v.status}
          </div>
        </div>
        <p className="mt-2">{v.strategy}</p>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="brut-card bg-lime-200 p-4">
            <p className="text-sm font-bold">Balance</p>
            <p className="text-2xl font-black">${v.balance.toLocaleString()}</p>
          </div>
          <div className="brut-card bg-yellow-200 p-4">
            <p className="text-sm font-bold">Split</p>
            <p className="text-2xl font-black">{v.split}</p>
          </div>
          <div className="brut-card bg-blue-200 p-4">
            <p className="text-sm font-bold">Since</p>
            <p className="text-2xl font-black">{v.createdAt}</p>
          </div>
        </div>
      </div>
      <div className="brut-card bg-white p-6">
        <h2 className="text-xl font-black">Activity</h2>
        <ul className="mt-3 space-y-2">
          {v.timeline.map((e, i) => (
            <li key={i} className="brut-card bg-white p-3">
              {e.t} — {e.action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
