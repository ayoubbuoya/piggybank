# Massa Piggybank — Vite + React + Tailwind (SPA)

Autonomous on‑chain micro‑savings vaults (demo UI). Built as a Single‑Page App for easy deploy on Massa DeWeb.

## Quickstart

```bash
npm install
npm run dev
```

Build for DeWeb (upload the `dist/` folder):
```bash
npm run build
```

## Pages
- `/` — Landing
- `/dashboard` — Vault Dashboard
- `/vault/create` — Create Vault (multi‑step)
- `/vault/:id` — Vault Details
- `/analytics` — Analytics (dummy stats)
- `/about` — Learn / FAQ
- `/settings` — Preferences

## Notes
- Neo‑Brutalism styling: bold colors, thick borders (`border-[3px]`), chunky UI.
- Wallet connect is a placeholder; wire Massa wallets later.
- Dummy data lives in `src/data/vaults.ts`.
