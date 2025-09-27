export const demoVaults = [
  {
    id: "v1",
    name: "Long‑Term Savings",
    strategy: "DCA into USDC every 12h",
    split: "80% hold / 20% swap",
    balance: 1243.57,
    status: "Autonomous",
    color: "#84CC16",
    createdAt: "2025-08-01",
    timeline: [
      { t: "2025-09-01 10:00", action: "Auto‑swap 10 MAS → USDC" },
      { t: "2025-08-31 22:00", action: "Auto‑swap 10 MAS → USDC" },
      { t: "2025-08-31 10:00", action: "Auto‑swap 10 MAS → USDC" },
    ]
  },
  {
    id: "v2",
    name: "Rent Subscription",
    strategy: "Pay 250 USDC monthly",
    split: "N/A",
    balance: 780.10,
    status: "Scheduled",
    color: "#F59E0B",
    createdAt: "2025-07-20",
    timeline: [
      { t: "2025-08-28 12:00", action: "Paid 250 USDC to landlord" },
      { t: "2025-07-28 12:00", action: "Paid 250 USDC to landlord" },
    ]
  },
  {
    id: "v3",
    name: "Rewards Lockbox",
    strategy: "Lock staking rewards 30%",
    split: "30% lock / 70% liquid",
    balance: 312.09,
    status: "Autonomous",
    color: "#2563EB",
    createdAt: "2025-08-15",
    timeline: [
      { t: "2025-09-01 09:10", action: "Auto‑lock 2.1 MAS" },
      { t: "2025-08-31 09:08", action: "Auto‑lock 1.9 MAS" },
    ]
  }
]
