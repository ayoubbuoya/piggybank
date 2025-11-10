# Multi-Sig Vault Testing Guide

## 🧪 Complete Testing Workflow

This guide walks you through testing the multi-sig vault feature end-to-end.

---

## Prerequisites

- [ ] Multi-sig template contract deployed
- [ ] Factory contract updated with template address
- [ ] Frontend running locally or deployed to DeWeb
- [ ] At least 2 test wallets with MAS and USDC
- [ ] Connected to Massa buildnet

---

## Test Scenario: "Family Savings Vault"

### Setup
- **Wallet 1 (Dad)**: Your main wallet
- **Wallet 2 (Mom)**: Secondary test wallet
- **Vault Type**: 2-of-2 multi-sig
- **Tokens**: 60% USDC, 40% ETH

---

## Step 1: Deploy Contracts

### 1.1 Deploy Multi-Sig Template

```bash
cd contracts
npm run build
npx ts-node src/deploy-multisig.ts
```

**Expected Output:**
```
✅ Multi-Sig Template deployed at: AS1...
```

**Action:** Copy the template address

### 1.2 Set Template in Factory

```typescript
// Using massa-web3 or your deployment script
const factoryContract = new SmartContract(provider, FACTORY_ADDRESS);

const setTemplateOp = await factoryContract.call(
  'setMultiSigTemplateAddress',
  new Args().addString(TEMPLATE_ADDRESS).serialize(),
  { coins: parseMas('0.1') }
);

await setTemplateOp.waitSpeculativeExecution();
```

**Expected:** Transaction succeeds

### 1.3 Verify Template Address

```typescript
const result = await factoryContract.read('getMultiSigTemplateAddress');
const args = new Args(result.value);
const templateAddress = args.nextString().unwrapOr('');

console.log('Template address:', templateAddress);
```

**Expected:** Should match the deployed template address

---

## Step 2: Create Multi-Sig Vault (Frontend)

### 2.1 Navigate to Create Page

1. Open frontend: `http://localhost:5173` or DeWeb URL
2. Connect Wallet 1 (Dad)
3. Click "Multi-Sig" in navigation
4. Should see "Create Multi-Sig Savings Vault" page

**Expected:** Page loads with empty form

### 2.2 Fill Out Form

**Vault Name:**
```
Emma's College Fund
```

**Signers:**
```
Signer 1: AS1... (Wallet 1 - Dad)
Signer 2: AS1... (Wallet 2 - Mom)
```

**Threshold:**
```
2 of 2
```

**Token Allocation:**
```
USDC: 60%
ETH: 40%
Total: 100% ✓
```

### 2.3 Create Vault

1. Click "🔐 Create Multi-Sig Vault"
2. Confirm transaction in wallet
3. Wait for confirmation toast

**Expected:**
- ✅ Loading toast appears
- ✅ Success toast: "🎉 Multi-sig vault created successfully!"
- ✅ Redirected to dashboard
- ✅ New vault appears in list

**Troubleshooting:**
- If transaction fails, check console for errors
- Verify you have enough MAS for gas (~5 MAS)
- Check factory has template address set

---

## Step 3: View Vault Details

### 3.1 Navigate to Vault

1. From dashboard, click on the new multi-sig vault
2. Should navigate to `/vault/multisig/AS1...`

**Expected:**
- ✅ Vault name displayed: "Emma's College Fund"
- ✅ Shows "🔐 2 of 2 Multi-Sig Vault"
- ✅ 2 signers listed
- ✅ Your address highlighted with "You" badge
- ✅ "Deposit Funds" button visible
- ✅ "Propose Withdrawal" button visible
- ✅ "Pending Proposals (0)" section

### 3.2 Verify Signer Display

**Expected:**
```
Signers (2)
┌─────────────────────────┐
│ 1  AS1...abc (You)      │ <- Green background
└─────────────────────────┘
┌─────────────────────────┐
│ 2  AS1...xyz            │ <- Gray background
└─────────────────────────┘
```

---

## Step 4: Deposit Funds (Wallet 1)

### 4.1 Open Deposit Modal

1. Click "💰 Deposit Funds"
2. Modal appears

**Expected:**
- ✅ Input field for amount
- ✅ "Deposit" and "Cancel" buttons

### 4.2 Make Deposit

1. Enter amount: `100`
2. Click "Deposit"
3. Approve USDC spending (if first time)
4. Confirm deposit transaction

**Expected:**
- ✅ Approval transaction succeeds
- ✅ Deposit transaction succeeds
- ✅ Toast: "✅ Deposit successful!"
- ✅ Modal closes
- ✅ Vault balance updates (may need refresh)

**Troubleshooting:**
- If approval fails, check USDC balance
- If deposit fails, check console logs
- Verify vault address is correct

---

## Step 5: Create Withdrawal Proposal (Wallet 1)

### 5.1 Open Proposal Modal

1. Click "📝 Propose Withdrawal"
2. Modal appears

**Expected:**
- ✅ Token selector dropdown
- ✅ Amount input
- ✅ Recipient address input
- ✅ "Create Proposal" and "Cancel" buttons

### 5.2 Create Proposal

**Fill in:**
```
Token: USDC
Amount: 50
Recipient: AS1... (any valid address)
```

1. Click "Create Proposal"
2. Confirm transaction

**Expected:**
- ✅ Transaction succeeds
- ✅ Toast: "✅ Proposal created successfully!"
- ✅ Modal closes
- ✅ New proposal appears in "Pending Proposals"

### 5.3 Verify Proposal Display

**Expected:**
```
Pending Proposals (1)
┌─────────────────────────────────────┐
│ Proposal #0                    1/2  │
│ Proposed by AS1...abc               │
│                                     │
│ Withdraw 50 USDC                    │
│ To: AS1...xyz                       │
│                                     │
│ [✓] [Approve]                       │
│ 1 more approval needed              │
└─────────────────────────────────────┘
```

**Note:** Proposer automatically approves, so it shows 1/2

---

## Step 6: Approve Proposal (Wallet 2)

### 6.1 Switch Wallets

1. Disconnect Wallet 1
2. Connect Wallet 2 (Mom)
3. Navigate to same vault details page

**Expected:**
- ✅ "You" badge now on Wallet 2's signer
- ✅ Same proposal visible
- ✅ "Approve" button visible (not "You Approved")

### 6.2 Approve Proposal

1. Click "Approve" on Proposal #0
2. Confirm transaction

**Expected:**
- ✅ Transaction succeeds
- ✅ Toast: "✅ Proposal approved!"
- ✅ Proposal disappears from pending (auto-executed!)
- ✅ Funds transferred to recipient

**Troubleshooting:**
- If approval fails, check you're using Wallet 2
- Verify proposal ID is correct
- Check console for errors

### 6.3 Verify Execution

**Check:**
- [ ] Proposal no longer in pending list
- [ ] Recipient received 50 USDC
- [ ] Vault balance decreased by 50 USDC

---

## Step 7: Test Edge Cases

### 7.1 Non-Signer Cannot Deposit

1. Connect Wallet 3 (not a signer)
2. Navigate to vault details
3. Try to deposit

**Expected:**
- ✅ "Deposit Funds" button NOT visible
- ✅ "Propose Withdrawal" button NOT visible
- ✅ Can view vault info but cannot interact

### 7.2 Cannot Approve Twice

1. Connect Wallet 1 (already approved)
2. View proposal (before Wallet 2 approves)

**Expected:**
- ✅ Shows "✓ You Approved" badge
- ✅ No "Approve" button

### 7.3 Threshold Validation

1. Create 3-of-3 vault
2. Create proposal (1/3 approvals)
3. Approve with second signer (2/3 approvals)

**Expected:**
- ✅ Proposal still pending
- ✅ Shows "1 more approval needed"

4. Approve with third signer (3/3 approvals)

**Expected:**
- ✅ Proposal auto-executes
- ✅ Disappears from pending

---

## Step 8: UI/UX Testing

### 8.1 Responsive Design

Test on:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Expected:**
- ✅ All elements visible
- ✅ Buttons accessible
- ✅ No horizontal scroll
- ✅ Modals centered

### 8.2 Loading States

**Check:**
- [ ] "Creating..." text during vault creation
- [ ] Loading toast during transactions
- [ ] Disabled buttons during loading
- [ ] Spinner or loading indicator

### 8.3 Error Handling

**Test:**
1. Create vault with invalid signer address
2. Deposit with insufficient balance
3. Propose withdrawal for more than balance

**Expected:**
- ✅ Error toast with clear message
- ✅ No crash
- ✅ User can retry

---

## Step 9: Performance Testing

### 9.1 Multiple Vaults

1. Create 3 multi-sig vaults
2. Navigate to dashboard

**Expected:**
- ✅ All vaults load
- ✅ No lag
- ✅ Correct data for each

### 9.2 Multiple Proposals

1. Create 5 proposals in one vault
2. View vault details

**Expected:**
- ✅ All proposals displayed
- ✅ Scrollable list
- ✅ Correct approval counts

---

## Step 10: Integration Testing

### 10.1 Token Swapping

1. Deposit 100 USDC to vault with 50% USDC, 50% ETH
2. Check token balances

**Expected:**
- ✅ ~50 USDC in vault
- ✅ ~50 USDC worth of ETH in vault
- ✅ Swap executed via EagleFi

### 10.2 Cross-Feature Testing

1. Create regular vault
2. Create multi-sig vault
3. Create DCA strategy

**Expected:**
- ✅ All features work independently
- ✅ Dashboard shows all vaults/strategies
- ✅ No conflicts

---

## ✅ Test Completion Checklist

### Smart Contract
- [ ] Template deployed successfully
- [ ] Factory updated with template address
- [ ] Vault creation works
- [ ] Deposits work
- [ ] Proposals created successfully
- [ ] Approvals work
- [ ] Auto-execution at threshold
- [ ] Events emitted correctly

### Frontend
- [ ] Create vault page loads
- [ ] Form validation works
- [ ] Vault creation succeeds
- [ ] Vault details page loads
- [ ] Signers displayed correctly
- [ ] Deposit modal works
- [ ] Proposal modal works
- [ ] Approval button works
- [ ] Real-time updates
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design

### User Experience
- [ ] Intuitive navigation
- [ ] Clear error messages
- [ ] Helpful tooltips
- [ ] Visual feedback
- [ ] Fast load times
- [ ] No bugs or crashes

---

## 🐛 Common Issues & Solutions

### Issue: "Template address not set"
**Solution:** Run `setMultiSigTemplateAddress()` on factory

### Issue: "Transaction failed"
**Solution:** Check gas fees, wallet balance, and console logs

### Issue: "Vault not found"
**Solution:** Verify vault address, check network (buildnet)

### Issue: "Cannot approve proposal"
**Solution:** Ensure you're a signer and haven't already approved

### Issue: "Deposit not working"
**Solution:** Approve USDC spending first, check USDC balance

---

## 📊 Success Criteria

✅ **All tests pass**
✅ **No console errors**
✅ **Smooth user experience**
✅ **Fast transaction times**
✅ **Clear visual feedback**
✅ **Works on mobile**

---

## 🎉 Ready for Demo!

Once all tests pass, you're ready to:
1. Record demo video
2. Present to judges
3. Deploy to production
4. Win the buildathon! 🏆

Good luck! 🚀

