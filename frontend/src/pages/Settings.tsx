export default function Settings() {
  return (
    <div className="brut-card bg-white p-6 max-w-2xl">
      <h1 className="text-3xl font-black">Settings</h1>
      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="font-bold">Theme</span>
          <select className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3">
            <option>Neo‑Brutalism (Default)</option>
            <option>High‑Contrast</option>
          </select>
        </label>
        <label className="block">
          <span className="font-bold">Notifications</span>
          <select className="mt-1 w-full border-3 border-ink-950 rounded-2xl p-3">
            <option>On‑chain only</option>
            <option>Email + On‑chain</option>
            <option>Disabled</option>
          </select>
        </label>
      </div>
    </div>
  );
}
