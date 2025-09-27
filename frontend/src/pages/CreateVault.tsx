import { useState } from "react";
import Stepper from "../components/Stepper.tsx";
import { useNavigate } from "react-router-dom";

interface VaultForm {
  name: string;
  type: string;
  split: number;
  interval: string;
  timelock: number;
}

export default function CreateVault() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<VaultForm>({
    name: "My Savings Vault",
    type: "dca",
    split: 20,
    interval: "12h",
    timelock: 0,
  });
  const nav = useNavigate();

  const next = () => setStep((s) => Math.min(2, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="brut-card bg-white p-6 max-w-3xl">
      <h1 className="text-3xl font-black mb-4">Create Vault</h1>
      <Stepper steps={["Setup", "Configure", "Deploy"]} current={step} />
      {step === 0 && (
        <div className="space-y-4">
          <label className="block">
            <span className="font-bold">Vault Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3"
            />
          </label>
          <label className="block">
            <span className="font-bold">Strategy</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3"
            >
              <option value="dca">DCA into asset</option>
              <option value="split">Auto‑split deposits</option>
              <option value="subs">Recurring payment</option>
              <option value="lock">Time‑lock savings</option>
            </select>
          </label>
        </div>
      )}
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="font-bold">
              % Split to target / payment amount
            </span>
            <input
              type="number"
              value={form.split}
              onChange={(e) => setForm({ ...form, split: +e.target.value })}
              className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3"
            />
          </label>
          <label className="block">
            <span className="font-bold">Interval</span>
            <select
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value })}
              className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3"
            >
              <option>6h</option>
              <option>12h</option>
              <option>24h</option>
              <option>7d</option>
              <option>30d</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="font-bold">Time‑lock (days)</span>
            <input
              type="number"
              value={form.timelock}
              onChange={(e) => setForm({ ...form, timelock: +e.target.value })}
              className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3"
            />
          </label>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <p className="font-bold">Review</p>
          <ul className="list-disc pl-6">
            <li>Name: {form.name}</li>
            <li>Strategy: {form.type}</li>
            <li>Split/Amount: {form.split}</li>
            <li>Interval: {form.interval}</li>
            <li>Time‑lock: {form.timelock} days</li>
          </ul>
          <div className="brut-card bg-lime-200 p-4">
            Deployment will be fully on‑chain with Massa ASC (placeholder demo).
          </div>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button onClick={prev} className="brut-btn bg-white">
          Back
        </button>
        {step < 2 ? (
          <button onClick={next} className="brut-btn bg-lime-300">
            Next
          </button>
        ) : (
          <button
            onClick={() => nav("/dashboard")}
            className="brut-btn bg-yellow-300"
          >
            Deploy (Demo)
          </button>
        )}
      </div>
    </div>
  );
}
