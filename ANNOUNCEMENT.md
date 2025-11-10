# 🎉 New Feature: Multi-Sig Savings Vaults!

Hey everyone!

So I've been working on something pretty cool for Massa Piggybank and wanted to share it with you all. After getting some great feedback from the last wave, I spent some time thinking about what would make this app even more useful for real people.

## What I Built

**Multi-Signature Savings Vaults** - basically a way for families, couples, or teams to save money together where everyone has a say in how its spent.

Here's how it works:
- You create a vault with 2-5 people (we call them "signers")
- You set a threshold like "2 out of 3 people need to approve"
- Anyone in the group can deposit money
- But to withdraw, you need multiple people to approve

The cool part? When enough people approve a withdrawal, it executes automatically. No need for a third approval step or anything - Massa's autonomous smart contracts handle it all.

## Why I Think This Is Useful

I was talking to a friend who's married and they mentioned how they wanted to save for their kids college but didn't want just one person having full control. That got me thinking - there's probably lots of situations where people want shared financial control:

- Parents saving for their kids
- Couples managing joint savings
- Business partners with shared funds
- DAOs managing treasuries
- Friend groups saving for trips

Most savings apps are single-user only, so this felt like a gap worth filling.

## Technical Stuff

For those interested in the implementation:

**Smart Contract Side:**
- Built a new `MultiSigVault` contract in AssemblyScript
- Proposal system where any signer can propose a withdrawal
- Other signers approve by calling `approveProposal()`
- Auto-executes when threshold is met (no separate execute call needed)
- Supports 2-5 signers with configurable M-of-N threshold
- Deposits still auto-split across tokens like regular vaults

**Frontend Side:**
- New pages for creating multi-sig vaults and viewing details
- Visual indicators showing who's approved what
- Real-time approval tracking
- Modals for deposits and creating proposals
- Responsive design that works on mobile

**Factory Integration:**
- Updated the factory contract to support creating multi-sig vaults
- Uses template pattern for gas efficiency
- Stores vault for each signer so everyone can find it

## Demo

I deployed a test version to DeWeb if you want to try it out:
**https://piggybank-massa.massa-deweb.xyz/**

Just click "Multi-Sig" in the nav and you can create a test vault. You'll need at least 2 wallet addresses to make it work properly.

## What's Next

I'm planning to test this more thoroughly over the next few days and fix any bugs that come up. If anyone wants to help test or has suggestions for improvements, let me know!

Some ideas I'm considering for future iterations:
- Allowances (like a signer can withdraw up to $X without approval)
- Proposal expiry (auto-reject after 7 days)
- Email notifications when someone creates a proposal
- Transaction history view

## Feedback Welcome

This is still pretty new so I'm sure there's things I missed or could improve. If you try it out and run into issues or have ideas, please let me know! I'm trying to make this as useful as possible for real use cases.

Thanks for checking it out! 🚀

---

**TL;DR:** Built multi-sig savings vaults where multiple people need to approve withdrawals. Good for families, couples, teams. Auto-executes when threshold is met. Try it on DeWeb!

