# Automation Monitoring Visual Guide

This guide shows how the automation monitoring components will appear in the UI.

## AutomationStatusCard Component

### With Active Automation

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Automation Status                          ▶️ Active     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Gas Reserve                              [Add Gas]    │   │
│ │ 2.5000 MAS                                            │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 💰 Dollar-Cost Averaging                    Active    │   │
│ │                                                        │   │
│ │ Amount: 100 WMAS                                      │   │
│ │ Frequency: Weekly                                     │   │
│ │ Purchases Completed: 5                                │   │
│ │                                                        │   │
│ │ ┌─────────────────────────────────────────────────┐  │   │
│ │ │ Next Execution                                  │  │   │
│ │ │ 2d 14h 32m                                      │  │   │
│ │ │ Jan 13, 2025, 10:30:00 AM                       │  │   │
│ │ └─────────────────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📅 Scheduled Deposits                       Active    │   │
│ │                                                        │   │
│ │ Amount: 500 WMAS                                      │   │
│ │ Frequency: Monthly                                    │   │
│ │                                                        │   │
│ │ ┌─────────────────────────────────────────────────┐  │   │
│ │ │ Next Execution                                  │  │   │
│ │ │ 15d 8h 45m                                      │  │   │
│ │ │ Jan 26, 2025, 2:15:00 PM                        │  │   │
│ │ └─────────────────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ [⏸️ Pause Automation]                                        │
└─────────────────────────────────────────────────────────────┘
```

### With Low Gas Warning

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Automation Status                          ▶️ Active     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ⚠️ Low Gas Reserve                      [Add Gas]     │   │
│ │ Current: 0.3500 MAS                                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ... (rest of status cards)                                   │
└─────────────────────────────────────────────────────────────┘
```

### With Paused Automation

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Automation Status                          ⏸️ Paused     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ... (status cards shown but marked as paused)                │
│                                                               │
│ [▶️ Resume Automation]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Without Automation

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Automation Status                                         │
├─────────────────────────────────────────────────────────────┤
│ No automation configured for this vault.                     │
└─────────────────────────────────────────────────────────────┘
```

## ExecutionHistoryTable Component

### Desktop View (Table)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 Execution History                                    15 total executions │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Time              Type        Status      Amount      Details               │
│ ─────────────────────────────────────────────────────────────────────────── │
│ 2h ago            💰 DCA      ✓ Success   100 WMAS    Purchase completed   │
│ Jan 10, 10:30 AM                                       View transaction →   │
│                                                                              │
│ 1d ago            📅 Deposit  ✓ Success   500 WMAS    Deposit completed    │
│ Jan 9, 2:15 PM                                         View transaction →   │
│                                                                              │
│ 2d ago            💰 DCA      ✗ Error     100 WMAS    Insufficient balance │
│ Jan 8, 10:30 AM                                                             │
│                                                                              │
│ 3d ago            🎯 Strategy ✓ Success   1050 WMAS   Accumulation phase   │
│ Jan 7, 9:00 AM                                         View transaction →   │
│                                                                              │
│ 5d ago            📅 Deposit  ↻ Retry     500 WMAS    Retry scheduled      │
│ Jan 5, 2:15 PM                                                              │
│                                                                              │
│                        [Show All (10 more)]                                 │
│                                                                              │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│        12                    2                    1                         │
│    Successful              Errors               Retries                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile View (Cards)

```
┌─────────────────────────────────────────────┐
│ 📊 Execution History      15 total executions│
├─────────────────────────────────────────────┤
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ 💰 DCA              ✓ Success        │   │
│ │                                      │   │
│ │ Time: 2h ago                         │   │
│ │ Amount: 100 WMAS                     │   │
│ │ Details: Purchase completed          │   │
│ │ View transaction →                   │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ 📅 Deposit          ✓ Success        │   │
│ │                                      │   │
│ │ Time: 1d ago                         │   │
│ │ Amount: 500 WMAS                     │   │
│ │ Details: Deposit completed           │   │
│ │ View transaction →                   │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ 💰 DCA              ✗ Error          │   │
│ │                                      │   │
│ │ Time: 2d ago                         │   │
│ │ Amount: 100 WMAS                     │   │
│ │ Error: Insufficient balance          │   │
│ └──────────────────────────────────────┘   │
│                                              │
│         [Show All (12 more)]                │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│    12           2           1               │
│ Successful   Errors     Retries             │
└─────────────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Execution History                                         │
├─────────────────────────────────────────────────────────────┤
│ No executions yet. Automation will appear here once it      │
│ starts running.                                              │
└─────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Status Badges

- **Active**: Lime background (`bg-lime-200`)
- **Paused**: Yellow background (`bg-yellow-200`)
- **Success**: Lime background (`bg-lime-200`)
- **Error**: Red background (`bg-red-200`)
- **Retry**: Yellow background (`bg-yellow-200`)

### Type Badges

- **DCA**: Purple background (`bg-purple-100`)
- **Deposit**: Green background (`bg-green-100`)
- **Strategy**: Yellow background (`bg-yellow-100`)

### Cards

- **DCA Card**: Purple tint (`bg-purple-50`)
- **Deposit Card**: Green tint (`bg-green-50`)
- **Strategy Card**: Yellow tint (`bg-yellow-50`)
- **Gas Reserve**: Blue tint (`bg-blue-50`)
- **Low Gas Warning**: Red tint (`bg-red-100`)

## Countdown Timer States

### Long Duration (Days)

```
2d 14h 32m
```

### Medium Duration (Hours)

```
14h 32m 15s
```

### Short Duration (Minutes)

```
5m 42s
```

### Very Short Duration (Seconds)

```
23s
```

### Executing Soon

```
Executing soon...
```

### Not Scheduled

```
Not scheduled
```

## Integration Example

Here's how the components would appear on a vault details page:

```
┌─────────────────────────────────────────────────────────────┐
│ Vault Details                                    [🔄 Refresh]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [Vault Info Card]                                            │
│                                                               │
│ [AutomationStatusCard]                                       │
│   - Shows all active automations                             │
│   - Real-time countdown timers                               │
│   - Gas reserve status                                       │
│   - Pause/Resume controls                                    │
│                                                               │
│ [ExecutionHistoryTable]                                      │
│   - Past execution records                                   │
│   - Success/Error indicators                                 │
│   - Transaction links                                        │
│   - Summary statistics                                       │
│                                                               │
│ [Other Vault Components]                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (≥768px)

- Table layout for execution history
- Side-by-side layout for multiple automation cards
- Full details visible

### Mobile (<768px)

- Card layout for execution history
- Stacked automation cards
- Condensed information
- Touch-friendly buttons

## Interactive Elements

### Buttons

- **Pause Automation**: Yellow button with pause icon
- **Resume Automation**: Lime button with play icon
- **Add Gas**: Blue/Red button (red when low)
- **Refresh**: Blue button with refresh icon
- **Show More/Less**: Blue button for pagination

### Links

- **Transaction Hash**: Blue underlined link to block explorer
- Opens in new tab with `target="_blank"`

### Hover States

- Table rows highlight on hover
- Buttons show slight elevation
- Links underline on hover

## Loading States

### Initial Load

```
┌─────────────────────────────────────────────────────────────┐
│ Loading automation data...                                   │
└─────────────────────────────────────────────────────────────┘
```

### Refreshing

- Toast notification: "Refreshing automation data..."
- Components remain visible during refresh

## Error States

### Error Loading

```
┌─────────────────────────────────────────────────────────────┐
│ ❌ Error Loading Automation Data                            │
│                                                               │
│ Failed to fetch automation status                            │
│                                                               │
│ [Retry]                                                      │
└─────────────────────────────────────────────────────────────┘
```

## Toast Notifications

### Success

- ✅ "Automation paused successfully"
- ✅ "Automation resumed successfully"
- ✅ "Added 1.5 MAS to gas reserve"
- ✅ "Data refreshed"

### Error

- ❌ "Failed to pause automation"
- ❌ "Failed to resume automation"
- ❌ "Failed to add gas reserve"
- ❌ "Failed to refresh data"

### Loading

- ⏳ "Pausing automation..."
- ⏳ "Resuming automation..."
- ⏳ "Adding gas reserve..."
- ⏳ "Refreshing automation data..."

## Accessibility Features

- Semantic HTML structure
- Keyboard navigation support
- High contrast colors
- Screen reader friendly labels
- Focus indicators on interactive elements
- Responsive text sizing

## Animation

- Countdown timers update smoothly every second
- Buttons have subtle hover effects
- Cards have slight elevation on hover
- Toast notifications slide in from top
- Loading states fade in/out

This visual guide provides a complete picture of how the automation monitoring components will look and behave in the production application.
