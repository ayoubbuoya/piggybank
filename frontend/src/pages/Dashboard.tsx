import { Link } from "react-router-dom";
import { demoVaults } from "../data/vaults.ts";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">My Vaults</h1>
        <Link to="/vault/create" className="brut-btn bg-lime-300">
          + New Vault
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {demoVaults.map((v) => (
          <Link
            key={v.id}
            to={`/vault/${v.id}`}
            className="brut-card p-5 bg-white hover:translate-y-[-2px] transition"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{v.name}</h3>
              <span
                className="brut-btn bg-white"
                style={{ backgroundColor: v.color }}
              >
                {v.status}
              </span>
            </div>
            <p className="mt-2">{v.strategy}</p>
            <p className="mt-1 text-sm text-ink-950/80">{v.split}</p>
            <div className="mt-4 text-2xl font-black">
              ${v.balance.toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
