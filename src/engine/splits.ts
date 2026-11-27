
import { SplitInput, SplitAllocation, ItemizedExpenseInput } from './types';

/**
 * Distributes totalPaise across weights/shares using the Largest Remainder Method (Hamilton-Hare).
 */
export function distributeProportional(
  totalPaise: number,
  participants: { memberId: string; weight: number }[]
): SplitAllocation[] {
  if (totalPaise < 0) throw new Error('Total amount cannot be negative');
  if (participants.length === 0) throw new Error('Participants list cannot be empty');

  const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0) throw new Error('Total weight must be positive');

  let allocatedSum = 0;

  // 1. Calculate floor shares and keep track of fractional remainders
  const provisional = participants.map((p) => {
    const exactShare = (totalPaise * p.weight) / totalWeight;
    const floorShare = Math.floor(exactShare);
    const remainder = exactShare - floorShare;
    allocatedSum += floorShare;
    return {
      memberId: p.memberId,
      owedPaise: floorShare,
      remainder,
    };
  });

  // 2. Distribute leftover paise one-by-one by largest remainder (break ties deterministically by memberId)
  let leftover = totalPaise - allocatedSum;
  provisional.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.memberId.localeCompare(b.memberId);
  });

  for (let i = 0; i < leftover; i++) {
    provisional[i].owedPaise += 1;
  }

  // Restore original ordering & return clean allocations
  const resultMap = new Map(provisional.map((p) => [p.memberId, p.owedPaise]));
  return participants.map((p) => ({
    memberId: p.memberId,
    owedPaise: resultMap.get(p.memberId)!,
  }));
}

/**
 * Computes splits for standard split types.
 */
export function computeSplits(
  amountPaise: number,
  splitType: 'equal' | 'shares' | 'percent' | 'nights' | 'exact',
  splits: SplitInput[]
): SplitAllocation[] {
  if (splits.length === 0) throw new Error('At least one member must be in the split');

  switch (splitType) {
    case 'equal': {
      const weights = splits.map((s) => ({ memberId: s.memberId, weight: 1 }));
      return distributeProportional(amountPaise, weights);
    }

    case 'shares':
    case 'nights': {
      const weights = splits.map((s) => ({
        memberId: s.memberId,
        weight: s.weight && s.weight > 0 ? s.weight : 1,
      }));
      return distributeProportional(amountPaise, weights);
    }

    case 'percent': {
      const totalPct = splits.reduce((sum, s) => sum + (s.percent || 0), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        throw new Error(`Percentages must sum to 100%, got ${totalPct}%`);
      }
      const weights = splits.map((s) => ({
        memberId: s.memberId,
        weight: s.percent || 0,
      }));
      return distributeProportional(amountPaise, weights);
    }

    case 'exact': {
      const getPaisaValue = (s: any) =>
        Number(s.exactPaise ?? s.amountPaise ?? s.owedPaise ?? s.exactAmountPaise ?? 0);

      const sumExact = splits.reduce((sum, s) => sum + getPaisaValue(s), 0);
      if (sumExact !== amountPaise) {
        throw new Error(`Exact amounts (${sumExact}) must equal total expense (${amountPaise})`);
      }
      return splits.map((s) => ({
        memberId: s.memberId,
        owedPaise: getPaisaValue(s),
      }));
    }
    
    default:
      throw new Error(`Unsupported split type: ${splitType}`);
  }
}

/**
 * Itemized receipts: assigns specific items to people, then distributes
 * tax and service charges proportionally to each person's subtotal.
 */
export function computeItemizedSplits(input: ItemizedExpenseInput): SplitAllocation[] {
  const memberSubtotals = new Map<string, number>();

  for (const item of input.items) {
    if (item.assignedTo.length === 0) {
      throw new Error(`Item "${item.name}" must be assigned to at least one person`);
    }
    // Equal split of the item across its assigned members
    const itemSplits = distributeProportional(
      item.pricePaise,
      item.assignedTo.map((id) => ({ memberId: id, weight: 1 }))
    );
    for (const split of itemSplits) {
      memberSubtotals.set(
        split.memberId,
        (memberSubtotals.get(split.memberId) || 0) + split.owedPaise
      );
    }
  }

  const itemsTotal = Array.from(memberSubtotals.values()).reduce((a, b) => a + b, 0);
  const tax = input.taxPaise || 0;
  const service = input.servicePaise || 0;
  const extraFees = tax + service;

  if (extraFees === 0 || itemsTotal === 0) {
    return Array.from(memberSubtotals.entries()).map(([memberId, owedPaise]) => ({
      memberId,
      owedPaise,
    }));
  }

  // Allocate extra fees proportionally to each member's subtotal
  const feeDistribution = distributeProportional(
    extraFees,
    Array.from(memberSubtotals.entries()).map(([memberId, subtotal]) => ({
      memberId,
      weight: subtotal,
    }))
  );

  const feeMap = new Map(feeDistribution.map((f) => [f.memberId, f.owedPaise]));

  return Array.from(memberSubtotals.entries()).map(([memberId, subtotal]) => ({
    memberId,
    owedPaise: subtotal + (feeMap.get(memberId) || 0),
  }));
}