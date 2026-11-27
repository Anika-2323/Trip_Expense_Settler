// src/tests/settlement.test.ts
import { test, expect } from 'vitest';
import { computeBalances } from '../engine/balances';
import { settleGreedy } from '../engine/greedy';
import { settleOptimal } from '../engine/optimal';
import { ExpenseRecord, MemberBalance } from '../engine/types';

test('Calculates balances and verifies the zero-sum invariant', () => {
  const members = ['Anu', 'Priya', 'Ravi', 'Kavi'];
  
  // Anu pays 4000 for all 4 equally (1000 each)
  // Priya pays 2000 for Ravi and herself (1000 each)
  const expenses: ExpenseRecord[] = [
    {
      tripId: 'trip_1',
      type: 'expense',
      paidBy: 'Anu',
      amountPaise: 4000,
      splits: [
        { memberId: 'Anu', owedPaise: 1000 },
        { memberId: 'Priya', owedPaise: 1000 },
        { memberId: 'Ravi', owedPaise: 1000 },
        { memberId: 'Kavi', owedPaise: 1000 },
      ],
    },
    {
      tripId: 'trip_1',
      type: 'expense',
      paidBy: 'Priya',
      amountPaise: 2000,
      splits: [
        { memberId: 'Priya', owedPaise: 1000 },
        { memberId: 'Ravi', owedPaise: 1000 },
      ],
    },
  ];

  const balances = computeBalances(members, expenses);
  
  // Anu: paid 4000, owes 1000 -> +3000
  // Priya: paid 2000, owes 2000 -> 0
  // Ravi: paid 0, owes 2000 -> -2000
  // Kavi: paid 0, owes 1000 -> -1000
  const bMap = new Map(balances.map(b => [b.memberId, b.netPaise]));
  expect(bMap.get('Anu')).toBe(3000);
  expect(bMap.get('Priya')).toBe(0);
  expect(bMap.get('Ravi')).toBe(-2000);
  expect(bMap.get('Kavi')).toBe(-1000);
});

test('Optimal algorithm settles disjoint zero-sum groups in fewer transfers', () => {
  // Group 1: A (+1000), B (-1000) -> 1 transfer
  // Group 2: C (+2000), D (-2000) -> 1 transfer
  // Total optimal transfers = 2
  const balances: MemberBalance[] = [
    { memberId: 'A', netPaise: 1000 },
    { memberId: 'B', netPaise: -1000 },
    { memberId: 'C', netPaise: 2000 },
    { memberId: 'D', netPaise: -2000 },
  ];

  const transfers = settleOptimal(balances);
  expect(transfers.length).toBe(2);

  // Check that every transfer clears amounts completely
  const totalSettled = transfers.reduce((sum, t) => sum + t.amountPaise, 0);
  expect(totalSettled).toBe(3000);
});

import { explainMemberBalance } from '../engine/explain';

test('Generates line-by-line explanation for a member', () => {
  const expenses = [
    {
      _id: 'e1',
      tripId: 't1',
      type: 'expense' as const,
      paidBy: 'Anu',
      description: 'Dinner at Annalakshmi',
      amountPaise: 3000,
      splits: [
        { memberId: 'Anu', owedPaise: 1500 },
        { memberId: 'Priya', owedPaise: 1500 },
      ],
    },
    {
      _id: 'e2',
      tripId: 't1',
      type: 'expense' as const,
      paidBy: 'Priya',
      description: 'Cab fare',
      amountPaise: 600,
      splits: [
        { memberId: 'Anu', owedPaise: 300 },
        { memberId: 'Priya', owedPaise: 300 },
      ],
    },
  ];

  const explanation = explainMemberBalance('Anu', expenses);

  expect(explanation.totalPaidPaise).toBe(3000);
  expect(explanation.totalOwedPaise).toBe(1800);
  expect(explanation.netBalancePaise).toBe(1200);
  expect(explanation.breakdown.length).toBe(2);
});