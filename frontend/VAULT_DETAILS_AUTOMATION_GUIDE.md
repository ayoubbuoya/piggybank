# Vault Details Page - Automation Features Guide

## Overview

The VaultDetails page now includes comprehensive automation management features for automated vaults. This guide shows the layout and functionality.

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VAULT DETAILS PAGE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬──────────────────────────────────────┐
│  MAIN CONTENT (2/3 width)            │  SIDEBAR (1/3 width)                 │
├──────────────────────────────────────┼──────────────────────────────────────┤
│                                      │                                      │
│  ┌────────────────────────────────┐ │  ┌────────────────────────────────┐ │
│  │  VAULT INFO CARD               │ │  │  GAS RESERVE WIDGET            │ │
│  │  - Name & Status               │ │  │  (Only for automated vaults)   │ │
│  │  - Address                     │ │  │  - Current balance             │ │
│  │  - Tokens count                │ │  │  - Estimated operations        │ │
│  │  - Created date                │ │  │  - Low gas warning             │ │
│  │  - Withdraw button             │ │  │  - Add gas button              │ │
│  └────────────────────────────────┘ │  └────────────────────────────────┘ │
│                                      │                                      │
│  ┌────────────────────────────────┐ │  ┌────────────────────────────────┐ │
│  │  TOKEN ALLOCATION              │ │  │  PORTFOLIO VALUE               │ │
│  │  - Token list with %           │ │  │  - Token balances              │ │
│  │  - Token logos & names         │ │  │  - Refresh button              │ │
│  └────────────────────────────────┘ │  └────────────────────────────────┘ │
│                                      │                                      │
│  ┌────────────────────────────────┐ │  ┌────────────────────────────────┐ │
│  │  AUTOMATION STATUS             │ │  │  DEPOSIT COMPONENT             │ │
│  │  (Only for automated vaults)   │ │  │  - Amount input                │ │
│  │  ┌──────────────────────────┐  │ │  │  - Deposit button              │ │
│  │  │ Header with Pause/Resume │  │ │  └────────────────────────────────┘ │
│  │  └──────────────────────────┘  │ │                                      │
│  │  ┌──────────────────────────┐  │ │  ┌────────────────────────────────┐ │
│  │  │ DCA Strategy Status      │  │ │  │  HOW IT WORKS                  │ │
│  │  │ - Next execution time    │  │ │  │  - Info about vault            │ │
│  │  │ - Purchases completed    │  │ │  └────────────────────────────────┘ │
│  │  └──────────────────────────┘  │ │                                      │
│  │  ┌──────────────────────────┐  │ │                                      │
│  │  │ Scheduled Deposit Status │  │ │                                      │
│  │  │ - Next execution time    │  │ │                                      │
│  │  └──────────────────────────┘  │ │                                      │
│  │  ┌──────────────────────────┐  │ │                                      │
│  │  │ Savings Strategy Status  │  │ │                                      │
│  │  │ - Next execution time    │  │ │                                      │
│  │  └──────────────────────────┘  │ │                                      │
│  └────────────────────────────────┘ │                                      │
│                                      │                                      │
│  ┌────────────────────────────────┐ │                                      │
│  │  EXECUTION HISTORY             │ │                                      │
│  │  (Only for automated vaults)   │ │                                      │
│  │  ┌──────────────────────────┐  │ │                                      │
│  │  │ Table of past executions │  │ │                                      │
│  │  │ - Type | Status | Amount │  │ │                                      │
│  │  │ - Timestamp | Details    │  │ │                                      │
│  │  └──────────────────────────┘  │ │                                      │
│  └────────────────────────────────┘ │                                      │
│                                      │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

## Component Details

### 1. Gas Reserve Widget (Sidebar Top)

```
┌─────────────────────────────────────┐
│  ⛽ Gas Reserve                      │
├─────────────────────────────────────┤
│  Current Balance: 5.2 MAS           │
│  Estimated Operations: ~52          │
│                                     │
│  ⚠️ Low Gas Warning                 │
│  (Shows when balance < 0.5 MAS)    │
│                                     │
│  [Add Gas] button                   │
└─────────────────────────────────────┘
```

**Features:**

- Real-time gas balance display
- Estimated operations remaining
- Low gas warning banner (yellow/red)
- Quick add gas button
- Auto-refresh after gas is added

### 2. Automation Status Card (Main Content)

```
┌─────────────────────────────────────────────────────┐
│  Automation Status              [⏸️ Pause] or [▶️ Resume] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  💰 DCA Strategy                    ✅ Active       │
│  Next Purchase: in 2 hours 15 minutes              │
│  Purchases Completed: 5 / 20                       │
│  Amount per Purchase: 10 MAS                       │
│                                                     │
│  📅 Scheduled Deposits              ✅ Active       │
│  Next Deposit: in 5 days 3 hours                   │
│  Deposit Amount: 50 MAS                            │
│  Frequency: Weekly                                 │
│                                                     │
│  💎 Savings Strategy                ⏸️ Paused      │
│  Strategy Type: Accumulation                       │
│  Base Amount: 100 MAS                              │
│  Growth Rate: 5% per period                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**

- Shows all enabled automation strategies
- Displays next execution times with countdown
- Shows completion counters and progress
- Pause/Resume button in header
- Visual indicators for active/paused state

### 3. Execution History Table (Main Content)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Execution History                                                  │
├──────────┬─────────┬────────┬──────────────────┬───────────────────┤
│  Type    │ Status  │ Amount │ Timestamp        │ Details           │
├──────────┼─────────┼────────┼──────────────────┼───────────────────┤
│  DCA     │ ✅ Success │ 10 MAS │ 2 hours ago      │ Purchased tokens  │
│  DEPOSIT │ ✅ Success │ 50 MAS │ 1 day ago        │ Deposit completed │
│  DCA     │ ❌ Error   │ 10 MAS │ 3 days ago       │ Insufficient gas  │
│  DEPOSIT │ 🔄 Retry   │ 50 MAS │ 5 days ago       │ Retry scheduled   │
│  STRATEGY│ ✅ Success │ 5 MAS  │ 1 week ago       │ Strategy executed │
├──────────┴─────────┴────────┴──────────────────┴───────────────────┤
│  [Show More] button (if more than 10 records)                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Chronological list of executions (newest first)
- Color-coded status indicators
- Execution type badges
- Timestamp with relative time
- Details and error messages
- Pagination for large histories

## User Interactions

### Pause Automation

1. User clicks "⏸️ Pause" button
2. Confirmation toast appears
3. All scheduled operations are cancelled
4. Status updates to show "Paused"
5. Button changes to "▶️ Resume"

### Resume Automation

1. User clicks "▶️ Resume" button
2. Confirmation toast appears
3. Operations are rescheduled from current time
4. Status updates to show "Active"
5. Button changes to "⏸️ Pause"

### Add Gas

1. User clicks "Add Gas" button in Gas Reserve Widget
2. Modal opens with amount input
3. User enters amount (e.g., "5 MAS")
4. User confirms transaction
5. Gas is added to vault's reserve
6. Widget updates with new balance
7. Low gas warning disappears if balance is sufficient

### View Execution Details

1. User scrolls to Execution History section
2. Table shows recent executions
3. User can see type, status, amount, and timestamp
4. Error messages are displayed for failed executions
5. User can click "Show More" for older records

## Real-Time Updates

### Polling Intervals

- **Automation Status**: Updates every 30 seconds
- **Execution History**: Updates every 60 seconds
- **Gas Reserve**: Updates after manual actions

### Manual Refresh

- User can manually refresh by:
  - Clicking refresh button in Portfolio Value
  - Performing an action (pause/resume/add gas)
  - Navigating away and back to the page

## Conditional Display

### For Automated Vaults

- ✅ Gas Reserve Widget visible
- ✅ Automation Status Card visible
- ✅ Execution History Table visible
- ✅ Pause/Resume buttons available

### For Non-Automated Vaults

- ❌ Gas Reserve Widget hidden
- ❌ Automation Status Card hidden
- ❌ Execution History Table hidden
- ✅ Standard vault features remain

## Mobile Responsive

### Desktop (lg breakpoint)

- 2/3 main content, 1/3 sidebar layout
- All components visible side-by-side

### Tablet/Mobile

- Stacked layout (full width)
- Gas Reserve Widget moves to top
- Automation sections stack vertically
- Tables scroll horizontally if needed

## Error Handling

### Loading States

```
┌─────────────────────────────────────┐
│  Automation Status                  │
├─────────────────────────────────────┤
│  Loading automation status...       │
│  (Spinner or skeleton)              │
└─────────────────────────────────────┘
```

### Error States

```
┌─────────────────────────────────────┐
│  Automation Status                  │
├─────────────────────────────────────┤
│  ❌ Failed to load automation status │
│  [Retry] button                     │
└─────────────────────────────────────┘
```

### Empty States

```
┌─────────────────────────────────────┐
│  Execution History                  │
├─────────────────────────────────────┤
│  No executions yet                  │
│  Executions will appear here after  │
│  automation runs                    │
└─────────────────────────────────────┘
```

## Accessibility

- ✅ Semantic HTML structure
- ✅ ARIA labels for buttons
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Color contrast compliance
- ✅ Focus indicators

## Performance

- ✅ Efficient polling with cleanup
- ✅ Conditional rendering (only for automated vaults)
- ✅ Lazy loading of automation service
- ✅ Optimized re-renders with useCallback
- ✅ Minimal bundle size impact

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Future Enhancements

### Planned (Not in Current Task)

1. **Update Config Modal**: Edit automation settings
2. **Real-time Events**: WebSocket for instant updates
3. **Gas Charts**: Visualize consumption over time
4. **Export History**: Download execution records
5. **Notifications**: Browser notifications for executions
6. **Advanced Filters**: Filter history by type/status

## Testing Checklist

### Manual Testing

- [ ] Load page with automated vault
- [ ] Verify automation status displays correctly
- [ ] Test pause button functionality
- [ ] Test resume button functionality
- [ ] Verify gas reserve widget shows correct balance
- [ ] Test add gas functionality
- [ ] Verify execution history displays
- [ ] Test with non-automated vault (sections hidden)
- [ ] Test loading states
- [ ] Test error states
- [ ] Test mobile responsive layout

### Integration Testing

- [ ] Test with real automated vault on testnet
- [ ] Verify contract calls work correctly
- [ ] Test pause/resume with actual operations
- [ ] Verify gas addition updates contract
- [ ] Test polling updates status correctly

## Conclusion

The VaultDetails page now provides a comprehensive automation management interface that allows users to:

- Monitor automation status in real-time
- Control automation with pause/resume
- Manage gas reserves efficiently
- View complete execution history
- Understand their vault's automation behavior

All features are implemented according to the design specifications and requirements.
