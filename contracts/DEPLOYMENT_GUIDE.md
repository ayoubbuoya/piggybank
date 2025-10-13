# Deployment Guide - Template-Based Architecture

## Overview

The contracts now use a **template-based architecture** to avoid stack overflow errors during deployment. Instead of embedding bytecode in the factory contract, we:

1. Deploy template contracts (splitter and automated-splitter) once
2. Deploy the factory contract with references to these templates
3. Factory clones templates when creating new vaults

This approach significantly reduces the factory contract size and deployment complexity.

## Prerequisites

1. Node.js >= 16
2. Massa wallet with sufficient MAS for deployment (~1 MAS recommended)
3. `.env` file configured with:
   ```
   WALLET_SECRET_KEY=your_secret_key_here
   JSON_RPC_URL_PUBLIC=https://buildnet.massa.net/api/v2
   ```

## Deployment Steps

### Option 1: Deploy Everything (Recommended)

```bash
cd contracts
npm run deploy:all
```

This will:
1. Deploy splitter template
2. Deploy automated-splitter template
3. Deploy factory contract
4. Save all addresses to `deployed-templates.json`

### Option 2: Step-by-Step Deployment

#### Step 1: Deploy Template Contracts

```bash
npm run deploy:templates
```

**What this does:**
- Deploys a splitter contract (template)
- Deploys an automated-splitter contract (template)
- Saves addresses to `deployed-templates.json`

**Expected output:**
```
============================================================
STEP 1: Deploying Child Contracts
============================================================

1. Deploying Splitter Contract...
✅ Splitter Contract deployed at: AS12...

2. Deploying Automated Splitter Contract...
✅ Automated Splitter Contract deployed at: AS12...

============================================================
Child Contracts Deployed Successfully!
============================================================

Addresses saved to: deployed-templates.json
```

#### Step 2: Deploy Factory Contract

```bash
npm run deploy:factory
```

**What this does:**
- Reads template addresses from `deployed-templates.json`
- Deploys factory contract with template references
- Updates `deployed-templates.json` with factory address

**Expected output:**
```
============================================================
STEP 2: Deploying Factory Contract
============================================================

Using template addresses:
  Splitter Template: AS12...
  Automated Splitter Template: AS12...

Deploying Factory Contract...
✅ Factory Contract deployed at: AS12...

============================================================
Deployment Complete!
============================================================

All contract addresses:
  Factory: AS12...
  Splitter Template: AS12...
  Automated Splitter Template: AS12...
```

## Post-Deployment

### 1. Update Frontend Configuration

Copy the factory address to your frontend `.env` file:

```bash
# In frontend/.env
VITE_SMART_CONTRACT=<factory_address_from_deployed-templates.json>
```

### 2. Verify Deployment

Check that all contracts are deployed:

```bash
cat deployed-templates.json
```

Expected structure:
```json
{
  "splitterTemplate": "AS12...",
  "automatedSplitterTemplate": "AS12...",
  "factory": "AS12...",
  "network": "buildnet",
  "deployedAt": "2024-01-15T10:30:00.000Z"
}
```

### 3. Test the Deployment

Run the test scripts to verify functionality:

```bash
# Test creating a simple splitter vault
npm run test:createSplitter

# Test creating and depositing to a vault
npm run test:createAndDepositSplitter

# Test getting vault details
npm run test:getSplitterInfo
```

## Architecture Details

### Template-Based Cloning

```
┌─────────────────────────────────────────────────────────┐
│                    Factory Contract                      │
│  - Stores template addresses                            │
│  - Clones templates to create new vaults                │
└─────────────────────────────────────────────────────────┘
           │                              │
           │ getBytecodeOf()              │ getBytecodeOf()
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────────┐
│ Splitter Template    │      │ Automated Splitter       │
│ (deployed once)      │      │ Template (deployed once) │
└──────────────────────┘      └──────────────────────────┘
           │                              │
           │ createSC()                   │ createSC()
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────────┐
│ User Vault Instance  │      │ User Automated Vault     │
│ (cloned from         │      │ Instance (cloned from    │
│  template)           │      │  template)               │
└──────────────────────┘      └──────────────────────────┘
```

### How It Works

1. **Template Deployment**: Templates are deployed once with minimal initialization
2. **Factory Deployment**: Factory stores template addresses in its storage
3. **Vault Creation**: When a user creates a vault:
   - Factory calls `getBytecodeOf(templateAddress)` to get template bytecode
   - Factory calls `createSC(bytecode)` to deploy a new instance
   - Factory calls the vault's `init()` function with user parameters
   - Each vault is an independent contract with its own storage

### Benefits

✅ **Smaller Factory Contract**: No embedded bytecode
✅ **Faster Deployment**: Factory deploys quickly
✅ **No Stack Overflow**: Serialization works correctly
✅ **Upgradeable Templates**: Can deploy new templates and update factory
✅ **Gas Efficient**: Cloning is cheaper than deploying from scratch

## Troubleshooting

### Error: "deployed-templates.json not found"

**Solution**: Run `npm run deploy:templates` first

### Error: "SPLITTER_TEMPLATE_NOT_SET"

**Cause**: Factory was deployed without template addresses

**Solution**: Redeploy factory with correct template addresses

### Error: "Maximum call stack size exceeded"

**Cause**: Using old deployment method with embedded bytecode

**Solution**: Use the new template-based deployment (`npm run deploy:all`)

### Error: "Insufficient funds"

**Cause**: Not enough MAS in wallet

**Solution**: Ensure wallet has at least 1 MAS for deployment

## Cost Breakdown

Approximate deployment costs on Massa Buildnet:

| Contract | Size | Deployment Cost |
|----------|------|----------------|
| Splitter Template | ~50KB | ~0.1 MAS |
| Automated Splitter Template | ~150KB | ~0.3 MAS |
| Factory | ~30KB | ~0.1 MAS |
| **Total** | | **~0.5 MAS** |

Note: Actual costs may vary based on network conditions.

## Redeployment

If you need to redeploy (e.g., after contract changes):

### Full Redeployment
```bash
# Delete old addresses
rm deployed-templates.json

# Deploy everything fresh
npm run deploy:all
```

### Partial Redeployment

**If only factory changed:**
```bash
# Keep templates, redeploy factory
npm run deploy:factory
```

**If templates changed:**
```bash
# Redeploy templates (will create new addresses)
npm run deploy:templates

# Then redeploy factory with new template addresses
npm run deploy:factory
```

## Security Considerations

1. **Template Immutability**: Once deployed, templates cannot be modified
2. **Factory Ownership**: Only factory owner can update template addresses
3. **Vault Isolation**: Each vault is independent with its own storage
4. **Access Control**: Vaults have owner-only functions for sensitive operations

## Next Steps

After successful deployment:

1. ✅ Update frontend `.env` with factory address
2. ✅ Test vault creation through frontend
3. ✅ Test automation features
4. ✅ Monitor gas consumption
5. ✅ Set up event monitoring

## Support

If you encounter issues:

1. Check the error message carefully
2. Verify `.env` configuration
3. Ensure sufficient wallet balance
4. Check network connectivity
5. Review contract build output

## Advanced: Manual Deployment

If you need more control, you can deploy manually:

```typescript
import { SmartContract, Args } from '@massalabs/massa-web3';

// 1. Deploy splitter template
const splitterTemplate = await SmartContract.deploy(
  provider,
  splitterBytecode,
  splitterArgs,
  { coins: '0.1' }
);

// 2. Deploy automated splitter template
const automatedTemplate = await SmartContract.deploy(
  provider,
  automatedBytecode,
  automatedArgs,
  { coins: '0.3' }
);

// 3. Deploy factory with template addresses
const factoryArgs = new Args()
  .addString(swapRouterAddress)
  .addString(splitterTemplate.address)
  .addString(automatedTemplate.address);

const factory = await SmartContract.deploy(
  provider,
  factoryBytecode,
  factoryArgs,
  { coins: '0.1' }
);
```

## Conclusion

The template-based architecture solves the deployment issues while maintaining all functionality. The factory can now create unlimited vaults by cloning pre-deployed templates, making the system scalable and efficient.
