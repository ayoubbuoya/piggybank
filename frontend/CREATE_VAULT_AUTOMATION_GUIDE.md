# Create Vault with Automation - User Flow Guide

## Overview

This guide explains the updated vault creation flow that supports automation features.

## Step-by-Step Flow

### Step 0: Setup

**Purpose**: Basic vault configuration

- User enters vault name
- Information about splitter vaults is displayed

**Navigation**:

- Next → Step 1 (Configure)

---

### Step 1: Configure

**Purpose**: Token selection and allocation

- User selects tokens from available list (WMAS, USDC, WETH)
- User sets percentage allocation for each token
- Auto-balance button for equal distribution
- Total percentage must equal 100%

**Validation**:

- At least one token must be selected
- Total percentage must equal 100%

**Navigation**:

- Back → Step 0 (Setup)
- Next → Step 2 (Automation) - Only enabled if validation passes

---

### Step 2: Automation (NEW)

**Purpose**: Configure autonomous vault operations

#### Master Toggle

- **Enable Automation** checkbox at the top
- When disabled: Shows informational message about standard vaults
- When enabled: Shows full automation configuration panel

#### Automation Features (when enabled)

##### 1. Dollar-Cost Averaging (DCA)

- Toggle to enable/disable
- Configuration:
  - Purchase amount (WMAS)
  - Frequency (Daily/Weekly/Bi-weekly/Monthly)
  - Start date
  - End date
  - Gas per execution (auto-calculated)
- Shows estimated number of executions

##### 2. Scheduled Deposits

- Toggle to enable/disable
- Configuration:
  - Deposit amount (WMAS)
  - Frequency (Daily/Weekly/Bi-weekly/Monthly)
  - Source wallet (auto-filled from connected account)
  - Start date
  - End date
  - Max retries on failure
  - Gas per execution (auto-calculated)
- Shows estimated number of executions
- Warning about token approval requirement

##### 3. Savings Strategy

- Toggle to enable/disable
- Configuration:
  - Strategy type (Accumulation/Distribution/Hybrid)
  - Base amount (WMAS)
  - Growth rate (%)
  - Frequency (Daily/Weekly/Bi-weekly/Monthly)
  - Distribution address (for Distribution/Hybrid)
  - Phase transition date (for Hybrid)
  - Start date
  - End date
  - Gas per execution (auto-calculated)
- Shows estimated number of executions

#### Gas Reserve Section

- Displays when any automation feature is enabled
- Shows:
  - Initial gas reserve input field
  - Total estimated gas cost breakdown
  - Per-feature execution costs
  - Number of executions per feature

#### Configuration Preview

- Collapsible section showing full configuration
- JSON-like display of all settings
- Helps users verify their configuration

**Validation**:

- If automation enabled:
  - At least one feature must be enabled
  - All enabled features must have valid configuration
  - Amounts must be positive
  - Dates must be valid (start < end)
  - Distribution address required for Distribution/Hybrid strategies

**Navigation**:

- Back → Step 1 (Configure)
- Next → Step 3 (Review) - Only enabled if validation passes

---

### Step 3: Review

**Purpose**: Final review before deployment

#### Vault Configuration Summary

- Vault name
- Selected tokens with percentages

#### Automation Summary (if enabled)

- Shows checkmarks for enabled features
- DCA: Amount and frequency
- Scheduled Deposits: Amount and frequency
- Savings Strategy: Type and base amount
- Initial gas reserve amount

#### Important Information

- Deployment cost:
  - Regular vault: ~5 MAS
  - Automated vault: ~7 MAS + gas reserve
- Token swap via EagleFi DEX
- User will be vault owner
- Automation executes autonomously (if enabled)

#### Wallet Connection Check

- Red warning if wallet not connected

**Navigation**:

- Back → Step 2 (Automation)
- Deploy Vault → Creates vault and navigates to vault details

---

## Vault Creation Logic

### Regular Vault (Automation Disabled)

```typescript
createSplitterVault(connectedAccount, tokensWithPercentage);
```

### Automated Vault (Automation Enabled)

```typescript
createAutomatedVault(connectedAccount, tokensWithPercentage, automationConfig);
```

## Gas Cost Estimation

### Calculation Formula

```
Total Gas = Base Reserve + Σ(Feature Executions × Gas Per Execution)
```

### Example

- Base Reserve: 1.0 MAS
- DCA: 10 executions × 0.1 MAS = 1.0 MAS
- Scheduled Deposits: 12 executions × 0.05 MAS = 0.6 MAS
- **Total: 2.6 MAS**

## Validation Rules

### Token Configuration

- ✓ At least one token selected
- ✓ Total percentage = 100%

### Automation Configuration (if enabled)

- ✓ At least one feature enabled
- ✓ Valid amounts (> 0)
- ✓ Valid dates (start < end)
- ✓ Valid frequency selected
- ✓ Distribution address for Distribution/Hybrid strategies
- ✓ Gas reserve amount specified

## User Experience Features

### Progressive Disclosure

- Automation is optional - users can skip it entirely
- Each automation feature can be independently enabled
- Configuration sections only show when relevant

### Real-time Validation

- Percentage total updates as user types
- Validation messages show what's needed
- Next button disabled until validation passes

### Gas Transparency

- Clear breakdown of gas costs
- Estimated execution counts
- Total cost prominently displayed

### Configuration Preview

- Users can review all settings before deployment
- Automation summary in review step
- Clear indication of what will be automated

## Error Handling

### Validation Errors

- Shown inline with helpful messages
- Prevent navigation until resolved
- Clear indication of what needs fixing

### Creation Errors

- Toast notifications for success/failure
- Console logging for debugging
- Graceful fallback to dashboard if vault address not available

## Mobile Responsiveness

- All components use responsive Tailwind classes
- Forms stack vertically on small screens
- Touch-friendly toggle switches and buttons

## Accessibility

- Semantic HTML structure
- Clear labels for all inputs
- Keyboard navigation support
- Screen reader friendly
