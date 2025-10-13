# Quick Start: Deploy Contracts

## TL;DR

```bash
cd contracts
npm run deploy:all
```

Then copy the factory address to `frontend/.env`:

```
VITE_SMART_CONTRACT=<factory_address_from_deployed-templates.json>
```

## What This Does

1. ✅ Deploys splitter template contract
2. ✅ Deploys automated-splitter template contract
3. ✅ Deploys factory contract with template references
4. ✅ Saves all addresses to `deployed-templates.json`

## Expected Output

```
============================================================
STEP 1: Deploying Child Contracts
============================================================

1. Deploying Splitter Contract...
✅ Splitter Contract deployed at: AS12xxxxx...

2. Deploying Automated Splitter Contract...
✅ Automated Splitter Contract deployed at: AS12xxxxx...

============================================================
Child Contracts Deployed Successfully!
============================================================

============================================================
STEP 2: Deploying Factory Contract
============================================================

Using template addresses:
  Splitter Template: AS12xxxxx...
  Automated Splitter Template: AS12xxxxx...

Deploying Factory Contract...
✅ Factory Contract deployed at: AS12xxxxx...

============================================================
Deployment Complete!
============================================================

All contract addresses:
  Factory: AS12xxxxx...
  Splitter Template: AS12xxxxx...
  Automated Splitter Template: AS12xxxxx...

Next step: Update your frontend .env file with the factory address:
  VITE_SMART_CONTRACT=AS12xxxxx...
```

## Cost

~0.5 MAS total (make sure your wallet has at least 1 MAS)

## What Was Fixed

The previous deployment failed with "Maximum call stack size exceeded" because the factory was trying to embed large contract bytecode. Now it uses a template-based architecture where:

- Templates are deployed once
- Factory clones templates when creating vaults
- Much smaller factory contract → successful deployment

## Troubleshooting

**Error: "deployed-templates.json not found"**

- Run `npm run deploy:templates` first

**Error: "Insufficient funds"**

- Add more MAS to your wallet (need ~1 MAS)

**Error: "WALLET_SECRET_KEY not found"**

- Check your `contracts/.env` file

## More Details

See `contracts/DEPLOYMENT_GUIDE.md` for comprehensive documentation.

## Ready to Test?

After deployment:

```bash
# Test creating a vault
npm run test:createSplitter

# Start the frontend
cd ../frontend
npm run dev
```

That's it! 🚀
