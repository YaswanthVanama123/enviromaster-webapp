import {describe, it, expect} from 'vitest';
import {computeGlobalCommission} from '../../../shared/commission-engine/computeGlobalCommission';
import {resolveCommissionRules} from '../../../backendservice/types/commission.types';

describe('commission rate follows the quota-credit position (not raw commissionable banding)', () => {
  const rules = resolveCommissionRules({quotaTarget: 10000});
  const cache = {3: {accountType: null}} as any; // monthly

  it('first agreement, prior 0, credit ~10,562 (105.6% of 10k) -> blended ~3.16%, NOT 9%', () => {
    const services = {
      svc: {isActive: true, frequency: 'monthly', contractTotal: 10562, originalContractTotal: 10562},
    };
    const r = computeGlobalCommission(services as any, cache, 12, 3, rules, 0, true, 0, 0);
    expect(r.totalQuotaCredit).toBeCloseTo(10562, 0);
    expect(r.effectiveCommissionRate).toBeGreaterThan(3);
    expect(r.effectiveCommissionRate).toBeLessThan(4); // ~3.16, well below the 9% double band
  });

  it('genuinely double-quota credit (>2x target) correctly approaches the 9% band', () => {
    const services = {
      svc: {isActive: true, frequency: 'monthly', contractTotal: 60000, originalContractTotal: 60000},
    };
    const r = computeGlobalCommission(services as any, cache, 12, 3, rules, 0, true, 0, 0);
    // 10k@3% + 10k@6% + 40k@9% over 60k -> ~7.5%
    expect(r.effectiveCommissionRate).toBeGreaterThan(6);
    expect(r.effectiveCommissionRate).toBeLessThan(9);
  });

  it('prior credit already above double -> agreement billed at 9%', () => {
    const services = {
      svc: {isActive: true, frequency: 'monthly', contractTotal: 5000, originalContractTotal: 5000},
    };
    const r = computeGlobalCommission(services as any, cache, 12, 3, rules, 25000, true, 0, 0);
    expect(r.effectiveCommissionRate).toBeCloseTo(9, 1);
  });
});
