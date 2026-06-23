import {describe, it, expect} from 'vitest';
import {
  resolveCommissionRules,
  DEFAULT_QUOTA_TIER_CUTOFFS,
  DEFAULT_QUOTA_TARGET,
} from './commission.types';

describe('resolveCommissionRules — quota band boundaries must never collapse to 0', () => {
  it('replaces zero quotaTierCutoffs with defaults (was the bug: 0 cutoffs pushed all credit into the 9% double band)', () => {
    const r = resolveCommissionRules({quotaTierCutoffs: {aboveQuota: 0, doubleQuota: 0}});
    expect(r.quotaTierCutoffs.aboveQuota).toBe(DEFAULT_QUOTA_TIER_CUTOFFS.aboveQuota);
    expect(r.quotaTierCutoffs.doubleQuota).toBe(DEFAULT_QUOTA_TIER_CUTOFFS.doubleQuota);
  });

  it('replaces missing quotaTierCutoffs with defaults', () => {
    const r = resolveCommissionRules(null);
    expect(r.quotaTierCutoffs.aboveQuota).toBe(DEFAULT_QUOTA_TIER_CUTOFFS.aboveQuota);
    expect(r.quotaTierCutoffs.doubleQuota).toBe(DEFAULT_QUOTA_TIER_CUTOFFS.doubleQuota);
  });

  it('preserves valid configured cutoffs', () => {
    const r = resolveCommissionRules({quotaTierCutoffs: {aboveQuota: 8000, doubleQuota: 16000}});
    expect(r.quotaTierCutoffs.aboveQuota).toBe(8000);
    expect(r.quotaTierCutoffs.doubleQuota).toBe(16000);
  });

  it('replaces zero/missing quotaTarget with default but preserves valid values', () => {
    expect(resolveCommissionRules({quotaTarget: 0}).quotaTarget).toBe(DEFAULT_QUOTA_TARGET);
    expect(resolveCommissionRules(null).quotaTarget).toBe(DEFAULT_QUOTA_TARGET);
    expect(resolveCommissionRules({quotaTarget: 30000}).quotaTarget).toBe(30000);
  });
});
