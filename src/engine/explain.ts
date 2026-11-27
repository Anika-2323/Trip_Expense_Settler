// src/engine/explain.ts
import { ExpenseRecord } from './types';

export interface ExpenseExplanationLine {
  expenseId?: string;
  description: string;
  date?: string;
  totalAmountPaise: number;
  paidByYou: number;
  yourShare: number;
  netImpactPaise: number; // positive = added to your credit, negative = added to what you owe
}

export interface MemberExplanation {
  memberId: string;
  totalPaidPaise: number;
  totalOwedPaise: number;
  netBalancePaise: number;
  breakdown: ExpenseExplanationLine[];
}

/**
 * Produces a clear line-by-line financial audit for a single member.
 */
export function explainMemberBalance(
  memberId: string,
  expenses: (ExpenseRecord & { description?: string; date?: string })[]
): MemberExplanation {
  let totalPaid = 0;
  let totalOwed = 0;
  const breakdown: ExpenseExplanationLine[] = [];

  for (const exp of expenses) {
    if (exp.deletedAt) continue;

    const paidByYou = exp.paidBy === memberId ? exp.amountPaise : 0;
    const splitEntry = exp.splits.find((s) => s.memberId === memberId);
    const yourShare = splitEntry ? splitEntry.owedPaise : 0;

    // Only include expenses where this member paid or participated
    if (paidByYou > 0 || yourShare > 0) {
      totalPaid += paidByYou;
      totalOwed += yourShare;

      breakdown.push({
        expenseId: exp._id,
        description: exp.description || (exp.type === 'payment' ? 'Settlement Payment' : 'Expense'),
        date: exp.date,
        totalAmountPaise: exp.amountPaise,
        paidByYou,
        yourShare,
        netImpactPaise: paidByYou - yourShare,
      });
    }
  }

  return {
    memberId,
    totalPaidPaise: totalPaid,
    totalOwedPaise: totalOwed,
    netBalancePaise: totalPaid - totalOwed,
    breakdown,
  };
}