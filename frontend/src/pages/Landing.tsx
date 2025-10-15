import { Link } from "react-router-dom";
import BentoCard from "../components/BentoCard.tsx";

export default function Landing() {
  return (
    <div className="space-y-8">
      <section className="brut-card bg-white p-8 grid md:grid-cols-2 gap-6 items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight">
            Automate Your Savings,{" "}
            <span className="underline decoration-ink-950 decoration-8">
              Forever
            </span>
            .
          </h1>
          <p className="mt-4 text-lg">
            Create autonomous vaults powered by Massa's Autonomous Smart
            Contracts. Deposit USDC and automatically split it across multiple tokens.
            No bots. No keepers. Just code that runs.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/vault/create" className="brut-btn bg-lime-300">
              Launch Vault
            </Link>
            <Link to="/dashboard" className="brut-btn bg-yellow-300">
              View Dashboard
            </Link>
          </div>
          <p className="mt-3 text-sm">Deployed on DeWeb ·</p>
        </div>
        <div className="relative">
          <div className="brut-card bg-accent-primary p-6">
            <img
              src="/piggybank yellow massa.png"
              width={200}
              className="mx-auto"
            />
            <p className="font-bold mt-2">
              Your on‑chain piggybank NFT evolves as you save.
            </p>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        <BentoCard title="Autonomous Savings" bg="#FD5A46">
          <p>Set once. Runs forever with Deferred Calls.</p>
        </BentoCard>
        <BentoCard title="DCA Engine" bg="#84CC16">
          <p>Deposit USDC and swap into MAS, ETH, BTC at your chosen ratios via EagleFi DEX.</p>
        </BentoCard>
        <BentoCard title="Subscriptions" bg="#F59E0B">
          <p>On‑chain recurring payments with guaranteed execution.</p>
        </BentoCard>
        <BentoCard title="DeWeb Frontend" bg="#60A5FA">
          <p>Truly unstoppable UI hosted on the blockchain.</p>
        </BentoCard>
      </section>

      <section className="brut-card bg-white p-8">
        <h2 className="text-3xl font-black">Why Massa?</h2>
        <ul className="list-disc pl-6 mt-4 font-semibold">
          <li>No IPFS or servers — DeWeb hosts the app.</li>
          <li>Autonomous Smart Contracts mean no Gelato/Chainlink.</li>
          <li>Fully trustless savings automation.</li>
        </ul>
      </section>
    </div>
  );
}
