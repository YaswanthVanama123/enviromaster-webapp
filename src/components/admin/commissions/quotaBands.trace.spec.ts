import {describe, it, expect} from 'vitest';

const RATES = {below: 3, above: 6, double: 9};

function bands(positionBefore: number, agreementQuotaCredit: number, quotaTarget: number) {
  const aboveBoundary = quotaTarget;
  const doubleBoundary = quotaTarget * 2;
  const positionAfter = positionBefore + agreementQuotaCredit;
  const belowQuotaPortion = Math.max(0, Math.min(positionAfter, aboveBoundary) - positionBefore);
  const aboveQuotaPortion = Math.max(0, Math.min(positionAfter, doubleBoundary) - Math.max(positionBefore, aboveBoundary));
  const doubleQuotaPortion = Math.max(0, positionAfter - Math.max(positionBefore, doubleBoundary));
  const total = belowQuotaPortion + aboveQuotaPortion + doubleQuotaPortion;
  const blendedRate =
    total > 0
      ? (belowQuotaPortion * RATES.below + aboveQuotaPortion * RATES.above + doubleQuotaPortion * RATES.double) / total
      : 0;
  return {belowQuotaPortion, aboveQuotaPortion, doubleQuotaPortion, blendedRate};
}

describe('quota progressive banding — bounds are [0, quotaTarget, 2x quotaTarget]', () => {
  it('spec: target 10k, prior 5k, agreement 20k -> 5k@3% + 10k@6% + 5k@9%', () => {
    const r = bands(5000, 20000, 10000);
    expect(r.belowQuotaPortion).toBe(5000);
    expect(r.aboveQuotaPortion).toBe(10000);
    expect(r.doubleQuotaPortion).toBe(5000);
  });

  it('spec: target 10k, prior 0, agreement 25k -> first 10k@3% + next 10k@6% + 5k@9%', () => {
    const r = bands(0, 25000, 10000);
    expect(r.belowQuotaPortion).toBe(10000);
    expect(r.aboveQuotaPortion).toBe(10000);
    expect(r.doubleQuotaPortion).toBe(5000);
  });

  it('spec: target 10k, prior 0, agreement 8k -> all below band (3%)', () => {
    const r = bands(0, 8000, 10000);
    expect(r.belowQuotaPortion).toBe(8000);
    expect(r.aboveQuotaPortion).toBe(0);
    expect(r.doubleQuotaPortion).toBe(0);
    expect(r.blendedRate).toBeCloseTo(3, 5);
  });

  it('below-target rep is NOT flat 9% (the bug): prior 25k, target 50k, agreement 30k', () => {
    const r = bands(25000, 30000, 50000);
    expect(r.belowQuotaPortion).toBe(25000);
    expect(r.aboveQuotaPortion).toBe(5000);
    expect(r.doubleQuotaPortion).toBe(0);
    expect(r.blendedRate).toBeGreaterThan(3);
    expect(r.blendedRate).toBeLessThan(6);
  });
});
