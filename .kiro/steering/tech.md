# Technology Stack

## Smart Contracts

- **Language**: AssemblyScript
- **SDK**: @massalabs/massa-as-sdk v3.0.2
- **Compiler**: @massalabs/massa-sc-compiler
- **Testing**: as-pect (AssemblyScript testing framework)
- **Standards**: @massalabs/sc-standards (MRC20 token standard)

### Contract Build System

Contracts use AssemblyScript with Massa-specific transformers and are compiled to WebAssembly.

### Common Commands

```bash
# In contracts/ directory
npm run build          # Compile all contracts in assembly/contracts
npm run test           # Run unit tests with as-pect
npm run deploy         # Build and deploy contracts
npm run fmt            # Format code (prettier + eslint)
npm run fmt:check      # Check formatting without fixing
npm run clean          # Remove build artifacts
```

### Contract Testing

```bash
npm run test:createSplitter              # Test vault creation
npm run test:createAndDepositSplitter    # Test creation and deposit
npm run test:getSplitterInfo             # Test vault info retrieval
```

## Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3 with custom theme preset
- **UI Components**: @massalabs/react-ui-kit
- **Routing**: React Router v6
- **Notifications**: react-toastify
- **Web3**: @massalabs/massa-web3 v5.2.1-dev
- **Wallet**: @massalabs/wallet-provider v3.2.0

### Frontend Build System

Vite with React plugin, Terser minification, and production console removal.

### Common Commands

```bash
# In frontend/ directory
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

## Environment Configuration

Both contracts and frontend require `.env` files:

- **contracts/.env**: WALLET_SECRET_KEY, JSON_RPC_URL_PUBLIC
- **frontend/.env**: Network and contract configuration

## Node Version

Node.js >= 16 required
