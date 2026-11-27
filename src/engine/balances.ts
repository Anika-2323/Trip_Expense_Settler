
import { ExpenseRecord, MemberBalance } from './types';

/**
 * Computes net balances for all members across all active expenses and payments.
 * Invariant: Sum of net balances across all members MUST equal zero.
 */
export function computeBalances(
  memberIds: string[],
  expenses: ExpenseRecord[]
): MemberBalance[] {
  const balanceMap = new Map<string, number>();

  // Initialize all known members to 0
  for (const mid of memberIds) {
    balanceMap.set(mid, 0);
  }

  for (const exp of expenses) {
    // Ignore soft-deleted entries
    if (exp.deletedAt) continue;

    // 1. The payer is credited the full amount
    const currentPayerBalance = balanceMap.get(exp.paidBy) || 0;
    balanceMap.set(exp.paidBy, currentPayerBalance + exp.amountPaise);

    // 2. Each participant in the split is debited their owed share
    for (const split of exp.splits) {
      const currentDebtorBalance = balanceMap.get(split.memberId) || 0;
      balanceMap.set(split.memberId, currentDebtorBalance - split.owedPaise);
    }
  }

  const balances: MemberBalance[] = Array.from(balanceMap.entries()).map(
    ([memberId, netPaise]) => ({
      memberId,
      netPaise,
    })
  );

  // Invariant verification
  const totalSum = balances.reduce((sum, b) => sum + b.netPaise, 0);
  if (totalSum !== 0) {
    throw new Error(`Balance invariant violated: sum of balances is ${totalSum}, expected 0.`);
  }

  return balances;
}