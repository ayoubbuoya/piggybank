# AutomationConfigPanel Component

A comprehensive React component for configuring autonomous vault automation features including DCA (Dollar-Cost Averaging), scheduled deposits, and custom savings strategies.

## Features

### 1. Dollar-Cost Averaging (DCA)

- Configure automatic token purchases at regular intervals
- Set purchase amount, frequency, and duration
- Automatic gas estimation per execution
- Visual execution count display

### 2. Scheduled Deposits

- Automate recurring deposits from user wallet
- Configure deposit amount, frequency, and retry logic
- Source wallet integration with connected account
- Token approval reminder for WMAS transfers

### 3. Savings Strategies

- Three strategy types:
  - **Accumulation**: Increasing deposits over time with growth rate
  - **Distribution**: Scheduled withdrawals to specified address
  - **Hybrid**: Both accumulation and distribution phases
- Configurable growth rates and phase transitions
- Distribution address validation

### 4. Gas Management

- Automatic gas cost estimation
- Breakdown of gas costs per automation type
- Total estimated gas calculation
- Initial gas reserve configuration

### 5. Validation

- Real-time form validation
- Date range validation (start < end)
- Amount validation (> 0)
- Address validation for distribution strategies
- Visual error messages

### 6. Configuration Preview

- Collapsible summary of all configurations
- Execution count calculations
- Total gas cost display
- Easy review before submission

## Usage

```tsx
import AutomationConfigPanel, {
  AutomationConfig,
} from "./components/AutomationConfigPanel";

function MyComponent() {
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [isValid, setIsValid] = useState(true);

  return (
    <AutomationConfigPanel
      onConfigChange={(config) => setConfig(config)}
      onValidationChange={(isValid) => setIsValid(isValid)}
    />
  );
}
```

## Props

### `onConfigChange: (config: AutomationConfig) => void`

Callback fired whenever the configuration changes. Receives the complete automation configuration object.

### `onValidationChange: (isValid: boolean) => void`

Callback fired whenever validation status changes. Use this to enable/disable submit buttons.

## Configuration Structure

```typescript
interface AutomationConfig {
  dca: DCAConfigData;
  scheduledDeposit: ScheduledDepositConfigData;
  savingsStrategy: SavingsStrategyConfigData;
  initialGasReserve: string;
}
```

### DCAConfigData

```typescript
{
  enabled: boolean;
  amount: string; // WMAS amount per purchase
  frequency: AutomationFrequency;
  startTime: Date;
  endTime: Date;
  gasPerExecution: string; // MAS per execution
}
```

### ScheduledDepositConfigData

```typescript
{
  enabled: boolean;
  depositAmount: string; // WMAS amount per deposit
  frequency: AutomationFrequency;
  sourceWallet: string; // User's wallet address
  startTime: Date;
  endTime: Date;
  maxRetries: number; // Retry attempts on failure
  gasPerExecution: string;
}
```

### SavingsStrategyConfigData

```typescript
{
  enabled: boolean;
  strategyType: StrategyType;
  baseAmount: string;
  growthRate: number; // Percentage (0-100)
  frequency: AutomationFrequency;
  distributionAddress: string; // Required for DISTRIBUTION/HYBRID
  phaseTransitionTime: Date; // For HYBRID strategy
  startTime: Date;
  endTime: Date;
  gasPerExecution: string;
}
```

## Enums

### AutomationFrequency

```typescript
enum AutomationFrequency {
  DAILY = 0,
  WEEKLY = 1,
  BIWEEKLY = 2,
  MONTHLY = 3,
}
```

### StrategyType

```typescript
enum StrategyType {
  ACCUMULATION = 0, // Increasing deposits
  DISTRIBUTION = 1, // Scheduled withdrawals
  HYBRID = 2, // Both phases
}
```

## Gas Estimation

The component uses the following default gas estimates:

- **DCA per execution**: 0.1 MAS
- **Deposit per execution**: 0.05 MAS
- **Strategy per execution**: 0.08 MAS
- **Base reserve**: 1.0 MAS

Total gas cost is calculated as:

```
Total = Base Reserve + (DCA executions × DCA gas) +
        (Deposit executions × Deposit gas) +
        (Strategy executions × Strategy gas)
```

## Validation Rules

### DCA

- Amount must be > 0
- End date must be after start date

### Scheduled Deposits

- Deposit amount must be > 0
- Source wallet must be provided
- End date must be after start date

### Savings Strategy

- Base amount must be > 0
- Growth rate must be 0-100
- End date must be after start date
- Distribution address required for DISTRIBUTION/HYBRID types
- Phase transition time required for HYBRID type

## Integration with Smart Contracts

When creating an automated vault, you need to:

1. **Convert dates to timestamps**:

   ```typescript
   const timestamp = Math.floor(date.getTime());
   ```

2. **Convert amounts to u256**:

   ```typescript
   const amount = BigInt(parseFloat(amountString) * 1e9); // Convert to nanoMAS
   ```

3. **Request token approval** (for scheduled deposits):

   ```typescript
   if (config.scheduledDeposit.enabled) {
     const totalAmount = depositAmount × executionCount;
     await approveWMASSpending(account, vaultAddress, totalAmount);
   }
   ```

4. **Serialize configuration**:
   ```typescript
   const args = new Args()
     .addBool(config.dca.enabled)
     .addSerializable(dcaConfigObject)
     .addBool(config.scheduledDeposit.enabled)
     .addSerializable(depositConfigObject)
     .addBool(config.savingsStrategy.enabled)
     .addSerializable(strategyConfigObject)
     .addU64(BigInt(parseFloat(config.initialGasReserve) * 1e9));
   ```

## Styling

The component uses TailwindCSS with custom "brut" (brutalist) design system classes:

- `brut-card`: Card container with border
- `brut-btn`: Button styling
- Color scheme: lime, blue, yellow, gray backgrounds

## Accessibility

- All form inputs have associated labels
- Checkbox inputs are keyboard accessible
- Validation errors are clearly displayed
- Color is not the only indicator of state

## Future Enhancements

- [ ] Add tooltips for complex fields
- [ ] Implement gas price fetching from network
- [ ] Add preset configurations (e.g., "Conservative DCA", "Aggressive Growth")
- [ ] Support for multiple currencies beyond WMAS
- [ ] Historical execution visualization
- [ ] Advanced scheduling (specific days/times)
