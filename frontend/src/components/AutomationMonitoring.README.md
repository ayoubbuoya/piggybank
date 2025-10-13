# Automation Monitoring Components

This directory contains components and hooks for monitoring automated vault operations in real-time.

## Components

### AutomationStatusCard

Displays the current status of all active automation features for a vault, including countdown timers and gas reserve information.

**Features:**

- Real-time countdown timers for next execution
- Gas reserve monitoring with low gas warnings
- Individual status cards for DCA, Scheduled Deposits, and Savings Strategies
- Pause/Resume controls
- Add gas functionality

**Props:**

```typescript
interface AutomationStatusCardProps {
  status: AutomationStatusData; // Current automation status
  config?: AutomationConfig; // Optional configuration details
  onPause?: () => void; // Callback for pause button
  onResume?: () => void; // Callback for resume button
  onAddGas?: () => void; // Callback for add gas button
}
```

**Usage:**

```tsx
import AutomationStatusCard from "./components/AutomationStatusCard";

<AutomationStatusCard
  status={automationStatus}
  config={automationConfig}
  onPause={handlePause}
  onResume={handleResume}
  onAddGas={handleAddGas}
/>;
```

### ExecutionHistoryTable

Displays a table of past automation executions with timestamps, status, and details.

**Features:**

- Sortable execution history (most recent first)
- Success/Error/Retry status badges
- Responsive design (table on desktop, cards on mobile)
- Show more/less functionality
- Summary statistics (success rate, errors, retries)
- Transaction hash links to block explorer

**Props:**

```typescript
interface ExecutionHistoryTableProps {
  executions: ExecutionRecord[]; // Array of execution records
  maxRows?: number; // Max rows to show initially (default: 10)
}
```

**Usage:**

```tsx
import ExecutionHistoryTable from "./components/ExecutionHistoryTable";

<ExecutionHistoryTable executions={executionHistory} maxRows={10} />;
```

## Hooks

### useAutomationStatus

Custom hook for fetching and polling automation status with real-time updates.

**Features:**

- Automatic polling at configurable intervals
- Loading and error states
- Manual refetch capability
- Enable/disable polling

**Usage:**

```tsx
import { useAutomationStatus } from "../hooks/useAutomationStatus";

const { status, loading, error, refetch } = useAutomationStatus({
  vaultAddress: "AS1...",
  pollingInterval: 30000, // 30 seconds
  enabled: true,
});
```

### useExecutionHistory

Custom hook for fetching and monitoring execution history with event listening support.

**Features:**

- Automatic polling for new executions
- Event listener support (for real-time updates)
- Local caching with max records limit
- Manual refetch capability
- Add execution function for real-time updates

**Usage:**

```tsx
import { useExecutionHistory } from "../hooks/useExecutionHistory";

const { executions, loading, error, refetch, addExecution } =
  useExecutionHistory({
    vaultAddress: "AS1...",
    pollingInterval: 60000, // 60 seconds
    enabled: true,
    maxRecords: 100,
  });
```

## Data Types

### AutomationStatusData

```typescript
interface AutomationStatusData {
  dcaEnabled: boolean;
  dcaNextExecution: number; // Unix timestamp in seconds
  dcaPurchasesCompleted: number;
  scheduledDepositEnabled: boolean;
  scheduledDepositNextExecution: number;
  savingsStrategyEnabled: boolean;
  savingsStrategyNextExecution: number;
  gasReserve: number; // In MAS
  isPaused: boolean;
}
```

### ExecutionRecord

```typescript
interface ExecutionRecord {
  id: string;
  timestamp: number; // Unix timestamp in seconds
  type: "DCA" | "DEPOSIT" | "STRATEGY";
  status: "SUCCESS" | "ERROR" | "RETRY";
  amount?: string;
  details?: string;
  errorMessage?: string;
  transactionHash?: string;
}
```

### AutomationConfig

```typescript
interface AutomationConfig {
  dca?: {
    amount: string;
    frequency: number;
  };
  scheduledDeposit?: {
    depositAmount: string;
    frequency: number;
  };
  savingsStrategy?: {
    strategyType: number;
    baseAmount: string;
    frequency: number;
  };
}
```

## Integration Guide

### Step 1: Add to Vault Details Page

```tsx
import AutomationStatusCard from "../components/AutomationStatusCard";
import ExecutionHistoryTable from "../components/ExecutionHistoryTable";
import { useAutomationStatus } from "../hooks/useAutomationStatus";
import { useExecutionHistory } from "../hooks/useExecutionHistory";

function VaultDetails({ vaultAddress }) {
  const { status } = useAutomationStatus({ vaultAddress });
  const { executions } = useExecutionHistory({ vaultAddress });

  return (
    <div className="space-y-6">
      {status && <AutomationStatusCard status={status} />}
      <ExecutionHistoryTable executions={executions} />
    </div>
  );
}
```

### Step 2: Implement Contract Calls

Replace the placeholder implementations in the hooks with actual contract calls:

```tsx
// In useAutomationStatus.tsx
const result = await vaultContract.getAutomationStatus();
const statusData = AutomationStatus.deserialize(result);
setStatus(statusData);
```

```tsx
// In useExecutionHistory.tsx
const events = await fetchVaultEvents(vaultAddress, [
  "DCA_PURCHASE_EXECUTED",
  "SCHEDULED_DEPOSIT_EXECUTED",
  "SAVINGS_STRATEGY_EXECUTED",
  "AUTOMATION_ERROR",
]);
const executions = events.map(parseEventToExecution);
setExecutions(executions);
```

### Step 3: Add Event Listeners (Optional)

For real-time updates without polling, implement event listeners:

```tsx
useEffect(() => {
  const handleEvent = (event) => {
    const execution = parseEventToExecution(event);
    addExecution(execution);
  };

  eventEmitter.on("DCA_PURCHASE_EXECUTED", handleEvent);
  eventEmitter.on("SCHEDULED_DEPOSIT_EXECUTED", handleEvent);

  return () => {
    eventEmitter.off("DCA_PURCHASE_EXECUTED", handleEvent);
    eventEmitter.off("SCHEDULED_DEPOSIT_EXECUTED", handleEvent);
  };
}, [addExecution]);
```

## Styling

All components use the existing "brutalist" design system with:

- `.brut-card` for card containers
- `.brut-btn` for buttons
- Tailwind CSS utility classes
- Consistent color scheme (lime, blue, yellow, purple, red)

## Performance Considerations

1. **Polling Intervals**: Default intervals are set conservatively (30s for status, 60s for history). Adjust based on your needs and blockchain performance.

2. **Max Records**: The execution history hook limits records to prevent memory issues. Default is 100 records.

3. **Conditional Rendering**: Components check for active automation before rendering to avoid unnecessary DOM updates.

4. **Memoization**: Consider using `useMemo` for expensive calculations if performance issues arise.

## Testing

See `AutomationMonitoring.example.tsx` for a complete working example with mock data.

To test with real data:

1. Create an automated vault
2. Navigate to the vault details page
3. Observe real-time countdown timers
4. Wait for executions to appear in history
5. Test pause/resume functionality
6. Test gas addition

## Event Mapping

The components expect events from the smart contracts:

| Contract Event             | Execution Type | Status  |
| -------------------------- | -------------- | ------- |
| DCA_PURCHASE_EXECUTED      | DCA            | SUCCESS |
| SCHEDULED_DEPOSIT_EXECUTED | DEPOSIT        | SUCCESS |
| SAVINGS_STRATEGY_EXECUTED  | STRATEGY       | SUCCESS |
| AUTOMATION_ERROR           | \*             | ERROR   |
| DEPOSIT_RETRY_SCHEDULED    | DEPOSIT        | RETRY   |

See `contracts/assembly/contracts/lib/automation/EVENT_DOCUMENTATION.md` for complete event documentation.

## Troubleshooting

### Countdown timers not updating

- Ensure the component is mounted and not being recreated
- Check that timestamps are in seconds (not milliseconds)

### Polling not working

- Verify `enabled` prop is true
- Check console for errors
- Ensure polling interval is > 0

### Events not appearing

- Verify contract is emitting events correctly
- Check event parsing logic in `parseEventToExecution`
- Ensure vault address is correct

### Gas warnings not showing

- Check that `gasReserve` is in MAS (not nanoMAS)
- Verify threshold logic (default: < 0.5 MAS)

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Export execution history to CSV
- [ ] Advanced filtering and search
- [ ] Execution analytics and charts
- [ ] Push notifications for important events
- [ ] Batch operations (pause all, resume all)
- [ ] Execution predictions based on history

## Related Files

- `contracts/assembly/contracts/automated-splitter.ts` - Smart contract
- `contracts/assembly/contracts/lib/automation/AutomationEvents.ts` - Event definitions
- `contracts/assembly/contracts/structs/automation-config.ts` - Data structures
- `frontend/src/components/AutomationConfigPanel.tsx` - Configuration UI
