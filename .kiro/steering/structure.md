# Project Structure

## Monorepo Layout

This is a monorepo with two main packages:

```
/
├── contracts/          # Smart contracts (AssemblyScript)
└── frontend/           # Web application (React + TypeScript)
```

## Contracts Structure

```
contracts/
├── assembly/
│   ├── contracts/          # Smart contract source files
│   │   ├── interfaces/     # Contract interfaces (IMRC20, IFactory, etc.)
│   │   ├── lib/            # Shared libraries (ownership, reentrancy guard, utils)
│   │   ├── structs/        # Data structures (TokenWithPercentage, SwapPath)
│   │   ├── factory.ts      # Factory contract for creating vaults
│   │   ├── splitter.ts     # Main splitter vault contract
│   │   └── storage.ts      # Storage utilities
│   └── __tests__/          # Unit tests
├── src/                    # Deployment and interaction scripts (TypeScript)
│   └── tests/              # Integration tests
├── build/                  # Compiled WASM contracts
└── package.json
```

### Contract Architecture

- **factory.ts**: Creates new splitter vault instances
- **splitter.ts**: Main vault logic for receiving and distributing funds
- **storage.ts**: Persistent storage helpers
- **lib/**: Reusable modules (ownership, reentrancy protection, wrapping, math)
- **interfaces/**: External contract interfaces (MRC20 tokens, EagleFi DEX)
- **structs/**: Type definitions for complex data structures

## Frontend Structure

```
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route pages (Landing, Dashboard, CreateVault, etc.)
│   ├── hooks/              # Custom React hooks (useAccountSync, useNetworkCheck)
│   ├── lib/                # Utility functions and helpers
│   ├── data/               # Static data and constants
│   ├── themes/             # TailwindCSS theme configuration
│   ├── App.tsx             # Main app with routing
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── dist/                   # Production build output
└── package.json
```

### Frontend Routing

- `/` - Landing page
- `/dashboard` - User's vaults overview
- `/vault/create` - Create new vault
- `/vault/:id` - Vault details and management
- `/analytics` - Performance analytics
- `/about` - About page
- `/settings` - User settings

## Key Conventions

- Smart contracts use AssemblyScript with strict typing
- Frontend uses TypeScript with React functional components
- Both packages have independent `package.json` and build systems
- Contracts are deployed to Massa blockchain
- Frontend connects via massa-web3 and wallet-provider
