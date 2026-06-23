import {describe, it, expect} from 'vitest';
import {expandServiceAreas} from '../../../shared/commission-engine/frequency';
import {computeGlobalCommission} from '../../../shared/commission-engine/computeGlobalCommission';
import {resolveCommissionRules} from '../../../backendservice/types/commission.types';

const refreshService = {
  refreshPowerScrub: {
    serviceId: 'refreshPowerScrub',
    isActive: true,
    frequency: 'weekly',
    contractTotal: 11200,
    areas: [
      {key: 'dumpster', isActive: true, frequency: 'weekly', perVisit: 100, contractTotal: 5200, originalContractTotal: 5200},
      {key: 'patio', isActive: true, frequency: 'monthly', perVisit: 500, contractTotal: 6000, originalContractTotal: 6000},
    ],
  },
};

describe('refresh power scrub — areas as separate services (webapp)', () => {
  it('expandServiceAreas splits refresh into one entry per area with its own frequency', () => {
    const out = expandServiceAreas(refreshService);
    expect(out.refreshPowerScrub).toBeUndefined();
    expect(out.refreshPowerScrub__dumpster.frequency).toBe('weekly');
    expect(out.refreshPowerScrub__dumpster.contractTotal).toBe(5200);
    expect(out.refreshPowerScrub__patio.frequency).toBe('monthly');
    expect(out.refreshPowerScrub__patio.contractTotal).toBe(6000);
  });

  it('commission computes for refresh, grouped per area frequency (was: not computing)', () => {
    const rules = resolveCommissionRules(null);
    const cache = {1: {accountType: null}, 3: {accountType: null}} as any;
    const result = computeGlobalCommission(refreshService as any, cache, 12, 6, rules, 0, true, 0, 0);
    const freqs = result.services.map((s: any) => s.frequencyLabel);
    expect(freqs).toContain('Weekly');
    expect(freqs).toContain('Monthly');
    expect(result.totalAnnualCommission).toBeGreaterThan(0);
  });

  it('non-area services pass through unchanged', () => {
    const out = expandServiceAreas({saniclean: {isActive: true, frequency: 'weekly', contractTotal: 1000}});
    expect(out.saniclean.contractTotal).toBe(1000);
  });
});
