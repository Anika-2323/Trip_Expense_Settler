// src/engine/greedy.ts
import { MemberBalance, Transfer } from './types';

/**
 * Greedy matching: repeatedly matches the largest debtor with the largest creditor.
 * Fast O(n log n), optimal in most everyday scenarios.
 */
export function settleGreedy(balances: MemberBalance[]): Transfer[] {
  // Separate debtors (<0) and creditors (>0), dropping members already at 0
  const debtors = balances
    .filter((b) => b.netPaise < 0)
    .map((b) => ({ memberId: b.memberId, amount: -b.netPaise }));

  const creditors = balances
    .filter((b) => b.netPaise > 0)
    .map((b) => ({ memberId: b.memberId, amount: b.netPaise }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      transfers.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amountPaise: settleAmount,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return transfers;
}