# Using the Basic Factory (No Automation)

## What Happened

You successfully deployed the **basic factory** contract! This version doesn't include automation features to keep the contract size small enough for deployment.

The error you saw:

```
Missing export createAutomatedVault
```

This is expected - the basic factory doesn't have this function.

## What I Fixed

I've updated the frontend to automatically detect which factory version you're using:

### Environment Variable Added

In `frontend/.env`:

```
VITE_ENABLE_AUTOMATION=false
```

Set this to:

- `false` - For basic factory (current deployment)
- `true` - For full factory with automation (future deployment)

### UI Changes

- When `VITE_ENABLE_AUTOMATION=false`:
  - ✅ Automation UI is hidden
  - ✅ Shows info message about basic factory
  - ✅ Only creates standard splitter vaults
- When `VITE_ENABLE_AUTOMATION=true`:
  - ✅ Shows full automation configuration
  - ✅ Allows creating automated vaults
  - ✅ Shows DCA, scheduled deposits, savings options

## Testing Now

1. **Restart your frontend** (if it's running):

   ```bash
   # Stop the dev server (Ctrl+C)
   npm run dev
   ```

2. **Create a vault**:

   - Go to Create Vault page
   - You'll see a blue info box instead of automation options
   - Configure your token allocation
   - Create vault normally

3. **What works**:

   - ✅ Create splitter vaults
   - ✅ Deposit funds
   - ✅ Automatic token splitting via EagleFi
   - ✅ Withdraw tokens
   - ✅ View vault details

4. **What doesn't work** (yet):
   - ❌ Automated vaults
   - ❌ DCA purchases
   - ❌ Scheduled deposits
   - ❌ Savings strategies
   - ❌ Automation monitoring

## UI Changes You'll See

### Create Vault Page - Step 2

Instead of automation configuration, you'll see:

```
ℹ️ Note: Automation features are not available with the current factory contract.
Your vault will function as a standard splitter vault with manual deposits and withdrawals.
```

### Vault Details Page

- No automation status card
- No execution history
- No gas reserve widget
- Just standard vault info and controls

## Adding Automation Later

When you're ready to deploy the full factory with automation:

### Option 1: Deploy Full Factory

1. Follow the template-based deployment guide
2. Update `VITE_SMART_CONTRACT` with new address
3. Set `VITE_ENABLE_AUTOMATION=true`
4. Restart frontend

### Option 2: Separate Automation Factory

1. Deploy a second factory for automated vaults
2. Add `VITE_AUTOMATION_FACTORY=<address>` to `.env`
3. Frontend can use both factories

## Current Configuration

Your `.env` should look like:

```
VITE_SMART_CONTRACT=AS126HuN3TqbZwiiExrcfxaENieKxmhrkVJmjXBtGPJQ22M5CUN5i
VITE_ENABLE_AUTOMATION=false
NODE_ENV='production'
```

## Troubleshooting

### Still seeing automation UI?

- Check `.env` has `VITE_ENABLE_AUTOMATION=false`
- Restart the dev server
- Clear browser cache

### Errors when creating vault?

- Make sure you're connected to Massa wallet
- Check you have sufficient MAS
- Verify factory address in `.env` is correct

### Want to test automation?

- You'll need to deploy the full factory first
- See `DEPLOYMENT_SOLUTION_FINAL.md` for options

## Summary

✅ **You're unblocked!** The frontend now works with your basic factory deployment.

✅ **Test the core features** - vault creation, deposits, token splitting, withdrawals.

✅ **Automation can be added later** once we solve the deployment architecture.

The system is working - just without the advanced automation features for now. This is a pragmatic approach that lets you test and validate the core functionality! 🎉
