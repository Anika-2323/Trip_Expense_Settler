// src/engine/optimal.ts
export { settleGreedy } from './greedy';
import { MemberBalance, Transfer } from './types';
import { settleGreedy } from './greedy';

/**
 * Optimal Settlement using Bitmask Dynamic Programming.
 * Partitions participants into the maximum number of zero-sum subsets,
 * then settles each subset independently.
 */
export function settleOptimal(balances: MemberBalance[]): Transfer[] {
  // Only consider non-zero balances
  const active = balances.filter((b) => b.netPaise !== 0);
  const n = active.length;

  if (n === 0) return [];
  // For small single sets, greedy is already minimal
  if (n <= 2) return settleGreedy(active);

  const totalStates = 1 << n;
  const sum = new Array<number>(totalStates).fill(0);

  // Precompute sum for each subset
  for (let mask = 0; mask < totalStates; mask++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        s += active[i].netPaise;
      }
    }
    sum[mask] = s;
  }

  // dp[mask] = max number of disjoint zero-sum subsets in mask
  const dp = new Array<number>(totalStates).fill(0);
  // parent[mask] = the last zero-sum submask that contributed to optimal dp[mask]
  const parent = new Array<number>(totalStates).fill(0);

  for (let mask = 1; mask < totalStates; mask++) {
    // If the entire mask does not sum to 0, it can at best inherit from subsets
    // Iterate through submasks
    for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
      if (sum[sub] === 0 && dp[mask ^ sub] + 1 > dp[mask]) {
        dp[mask] = dp[mask ^ sub] + 1;
        parent[mask] = sub;
      }
    }
    // If the mask itself sums to 0 and no better partition was found
    if (sum[mask] === 0 && dp[mask] === 0) {
      dp[mask] = 1;
      parent[mask] = mask;
    }
  }

  // Reconstruct the zero-sum partitions
  const groups: MemberBalance[][] = [];
  let remaining = totalStates - 1;

  while (remaining > 0) {
    const sub = parent[remaining];
    if (sub === 0 || sum[sub] !== 0) {
      // Fallback: whatever remains settles together
      const fallbackGroup: MemberBalance[] = [];
      for (let i = 0; i < n; i++) {
        if ((remaining & (1 << i)) !== 0) fallbackGroup.push(active[i]);
      }
      if (fallbackGroup.length > 0) groups.push(fallbackGroup);
      break;
    }

    const group: MemberBalance[] = [];
    for (let i = 0; i < n; i++) {
      if ((sub & (1 << i)) !== 0) {
        group.push(active[i]);
      }
    }
    groups.push(group);
    remaining ^= sub;
  }

  // Settle each zero-sum component greedily (guaranteed minimal transfers per partition)
  const allTransfers: Transfer[] = [];
  for (const group of groups) {
    allTransfers.push(...settleGreedy(group));
  }

  return allTransfers;
}