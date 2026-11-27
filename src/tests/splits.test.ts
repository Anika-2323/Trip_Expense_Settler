// src/tests/splits.test.ts
import { test, expect } from 'vitest';
import { computeSplits } from '../engine/splits';

test('10000 paise split 3 ways sums strictly to 10000', () => {
  const splits = computeSplits(10000, 'equal', [
    { memberId: 'user_1' },
    { memberId: 'user_2' },
    { memberId: 'user_3' },
  ]);

  const total = splits.reduce((sum, s) => sum + s.owedPaise, 0);
  expect(total).toBe(10000);
  expect(splits.map((s) => s.owedPaise)).toEqual([3334, 3333, 3333]);
});