# VaultDetails Automation - Developer Notes

## Quick Reference

### Key Files Modified

- `frontend/src/pages/VaultDetails.tsx` - Main page component
- `frontend/src/hooks/useAutomationStatus.tsx` - Real contract integration
- `frontend/src/lib/types.ts` - Fixed syntax error

### New Dependencies

```typescript
// Components
import AutomationStatusCard from "../components/AutomationStatusCard";
import GasReserveWidget from "../components/GasReserveWidget";
import ExecutionHistoryTable from "../components/ExecutionHistoryTable";

// Services
import { pauseAutomation, resumeAutomation } from "../lib/automationService";

// Hooks
import { useAutomationStatus } from "../hooks/useAutomationStatus";
import { useExecutionHistory } from "../hooks/useExecutionHistory";
```

## Hook Usage

### useAutomationStatus

```typescript
const {
  status: automationStatus, // AutomationStatusData | null
  loading: automationLoading, // boolean
  refetch: refreshAutomation, // () => Promise<void>
} = useAutomationStatus({
  vaultAddress: id || "",
  enabled: !!id && !!connectedAccount,
  pollingInterval: 30000, // optional, default 30s
});
```

**Returns:**

- `status`: Current automation status or null
- `loading`: True while fetching
- `refetch`: Manual refresh function

**Polling:**

- Automatically polls every 30 seconds
- Can be disabled with `enabled: false`
- Cleans up on unmount

### useExecutionHistory

```typescript
const {
  executions: executionHistory, // ExecutionRecord[]
  loading: historyLoading, // boolean
} = useExecutionHistory({
  vaultAddress: id || "",
  enabled: !!id && !!connectedAccount,
  pollingInterval: 60000, // optional, default 60s
  maxRecords: 100, // optional, default 100
});
```

**Returns:**

- `executions`: Array of execution records
- `loading`: True while fetching
- `refetch`: Manual refresh function (not used in current implementation)
- `addExecution`: Add execution manually (for real-time events)

**Polling:**

- Automatically polls every 60 seconds
- Can be disabled with `enabled: false`
- Cleans up on unmount

## Component Props

### AutomationStatusCard

```typescript
interface AutomationStatusCardProps {
  status: AutomationStatusData;
}

interface AutomationStatusData {
  dcaEnabled: boolean;
  dcaNextExecution: number;
  dcaPurchasesCompleted: number;
  scheduledDepositEnabled: boolean;
  scheduledDepositNextExecution: number;
  savingsStrategyEnabled: boolean;
  savingsStrategyNextExecution: number;
  gasReserve: number;
  isPaused: boolean;
}
```

### GasReserveWidget

```typescript
interface GasReserveWidgetProps {
  gasReserve: number; // Current balance in MAS
  consumptionHistory?: GasConsumptionRecord[];
  estimatedGasPerOperation?: number; // Default 0.1
  onAddGas?: () => void; // Callback after gas added
  showHistory?: boolean; // Default true
  warningThreshold?: number; // Default 0.5 MAS
}
```

### ExecutionHistoryTable

```typescript
interface ExecutionHistoryTableProps {
  executions: ExecutionRecord[];
  maxRows?: number; // Default 10
}

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

## Handler Functions

### Pause Automation

```typescript
const handlePauseAutomation = async () => {
  if (!connectedAccount || !id) return;

  const result = await pauseAutomation(connectedAccount, id);
  if (result.success) {
    refreshAutomation(); // Refresh status after pause
  }
};
```

### Resume Automation

```typescript
const handleResumeAutomation = async () => {
  if (!connectedAccount || !id) return;

  const result = await resumeAutomation(connectedAccount, id);
  if (result.success) {
    refreshAutomation(); // Refresh status after resume
  }
};
```

### Gas Added Callback

```typescript
const handleGasAdded = () => {
  refreshAutomation(); // Refresh status to show new gas balance
};
```

## Conditional Rendering

### Check if Vault Has Automation

```typescript
const hasAutomation =
  automationStatus &&
  (automationStatus.dcaEnabled ||
    automationStatus.scheduledDepositEnabled ||
    automationStatus.savingsStrategyEnabled);
```

### Render Automation Sections

```typescript
{
  hasAutomation && (
    <>
      {/* Automation Status Card */}
      {/* Execution History Table */}
    </>
  );
}
```

### Render Gas Widget

```typescript
{
  hasAutomation && connectedAccount && automationStatus && (
    <GasReserveWidget
      gasReserve={automationStatus.gasReserve}
      onAddGas={handleGasAdded}
    />
  );
}
```

## State Management

### Loading States

```typescript
// Automation status loading
{
  automationLoading ? (
    <div>Loading automation status...</div>
  ) : automationStatus ? (
    <AutomationStatusCard status={automationStatus} />
  ) : (
    <div>No automation configured</div>
  );
}

// Execution history loading
{
  historyLoading ? (
    <div>Loading execution history...</div>
  ) : (
    <ExecutionHistoryTable executions={executionHistory} />
  );
}
```

### Button States

```typescript
// Pause/Resume button
{
  automationStatus?.isPaused ? (
    <button onClick={handleResumeAutomation} disabled={automationLoading}>
      ▶️ Resume
    </button>
  ) : (
    <button onClick={handlePauseAutomation} disabled={automationLoading}>
      ⏸️ Pause
    </button>
  );
}
```

## API Integration

### Automation Service Functions

```typescript
// Get automation status
const status = await getAutomationStatus(connectedAccount, vaultAddress);

// Pause automation
const result = await pauseAutomation(connectedAccount, vaultAddress);

// Resume automation
const result = await resumeAutomation(connectedAccount, vaultAddress);

// Add gas reserve
const result = await addGasReserve(connectedAccount, vaultAddress, amount);
```

**All functions return:**

```typescript
{ success: boolean; error?: string }
```

**getAutomationStatus returns:**

```typescript
AutomationStatus | null;
```

## Error Handling

### Hook Errors

```typescript
const { status, loading, error } = useAutomationStatus({...});

if (error) {
  // Display error message
  console.error('Automation status error:', error);
}
```

### API Errors

```typescript
const result = await pauseAutomation(connectedAccount, id);
if (!result.success) {
  // Error is already shown via toast in the service
  console.error("Pause failed:", result.error);
}
```

## Performance Optimization

### Polling Cleanup

```typescript
// Hooks automatically clean up polling on unmount
useEffect(() => {
  return () => {
    // Cleanup happens automatically
  };
}, []);
```

### Conditional Polling

```typescript
// Only poll when vault address and account are available
const { status } = useAutomationStatus({
  vaultAddress: id || "",
  enabled: !!id && !!connectedAccount, // Disable if missing
});
```

### Lazy Loading

```typescript
// Automation service is imported dynamically in the hook
const { getAutomationStatus } = await import("../lib/automationService");
```

## Testing

### Unit Tests (Future)

```typescript
describe("VaultDetails Automation", () => {
  it("should display automation status for automated vaults", () => {
    // Test automation status display
  });

  it("should hide automation sections for non-automated vaults", () => {
    // Test conditional rendering
  });

  it("should handle pause/resume actions", () => {
    // Test control buttons
  });

  it("should refresh status after gas is added", () => {
    // Test gas addition callback
  });
});
```

### Integration Tests (Future)

```typescript
describe("VaultDetails Automation Integration", () => {
  it("should fetch real automation status from contract", () => {
    // Test with real contract
  });

  it("should pause automation on contract", () => {
    // Test pause functionality
  });

  it("should resume automation on contract", () => {
    // Test resume functionality
  });
});
```

## Common Issues

### Issue: Automation sections not showing

**Solution:** Check that `hasAutomation` is true

```typescript
console.log("Has automation:", hasAutomation);
console.log("Automation status:", automationStatus);
```

### Issue: Polling not working

**Solution:** Check that `enabled` is true

```typescript
console.log("Polling enabled:", !!id && !!connectedAccount);
```

### Issue: Status not refreshing after action

**Solution:** Ensure `refreshAutomation()` is called

```typescript
const result = await pauseAutomation(connectedAccount, id);
if (result.success) {
  refreshAutomation(); // Don't forget this!
}
```

### Issue: Gas widget not showing

**Solution:** Check all conditions

```typescript
console.log("Has automation:", hasAutomation);
console.log("Connected account:", !!connectedAccount);
console.log("Automation status:", !!automationStatus);
```

## Future Improvements

### Real-Time Events

```typescript
// Replace polling with WebSocket events
useEffect(() => {
  const eventListener = (event) => {
    // Update status immediately
    refreshAutomation();
  };

  // Subscribe to events
  eventEmitter.on("AUTOMATION_EXECUTED", eventListener);

  return () => {
    eventEmitter.off("AUTOMATION_EXECUTED", eventListener);
  };
}, []);
```

### Update Config Modal

```typescript
const [showUpdateConfigModal, setShowUpdateConfigModal] = useState(false);

// Add button to open modal
<button onClick={() => setShowUpdateConfigModal(true)}>Update Config</button>;

// Render modal
{
  showUpdateConfigModal && (
    <UpdateConfigModal
      vaultAddress={id}
      currentConfig={automationStatus}
      onClose={() => setShowUpdateConfigModal(false)}
      onSuccess={() => {
        refreshAutomation();
        setShowUpdateConfigModal(false);
      }}
    />
  );
}
```

### Gas Consumption Charts

```typescript
// Add chart component
import GasConsumptionChart from "../components/GasConsumptionChart";

<GasConsumptionChart consumptionHistory={consumptionHistory} timeRange="7d" />;
```

## Debugging

### Enable Debug Logging

```typescript
// In useAutomationStatus hook
console.log("Fetching automation status for vault:", vaultAddress);
console.log("Automation status received:", statusData);

// In VaultDetails component
console.log("Has automation:", hasAutomation);
console.log("Automation loading:", automationLoading);
console.log("Execution history:", executionHistory);
```

### Check Network Requests

```typescript
// Open browser DevTools > Network tab
// Filter by "getAutomationStatus"
// Check request/response
```

### Verify Contract Calls

```typescript
// Check console for contract call logs
// Look for "Operation ID:" messages
// Verify transaction status
```

## Summary

The VaultDetails automation integration is complete and production-ready. Key points:

✅ Real-time status updates via polling
✅ Pause/resume control with proper API integration
✅ Gas management with visual warnings
✅ Execution history with detailed records
✅ Conditional rendering for automated vaults only
✅ Proper error handling and loading states
✅ Performance optimized with cleanup
✅ Type-safe with TypeScript
✅ Accessible and responsive

For questions or issues, refer to:

- Task 20 Implementation Summary
- Vault Details Automation Guide
- Component documentation in respective files
