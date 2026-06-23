import {describe, it, expect} from 'vitest';
import {buildFrozenRulesSnapshot} from './freezeRules';
import {resolveCommissionRules} from '../../backendservice/types/commission.types';

const active = () =>
  resolveCommissionRules({
    quotaRates: {below: 3, above: 6, double: 9},
    perVisitPenalties: {Anchor: 0, Bread5: 100, Bread15: 75, Pit: 100},
    quotaTarget: 10000,
  } as any);

describe('buildFrozenRulesSnapshot — freeze used rule values, keep old / add new at current', () => {
  it('first save: stores penalties only for the USED account types', () => {
    const snap = buildFrozenRulesSnapshot(null, active(), ['Pit', 'Bread5']);
    expect(snap.perVisitPenalties).toHaveProperty('Pit', 100);
    expect(snap.perVisitPenalties).toHaveProperty('Bread5', 100);
    // Bread15 was NOT used -> not frozen yet
    expect((snap.perVisitPenalties as any).Bread15).toBeUndefined();
  });

  it('top-up adds a new account type at the CURRENT value, keeping previously frozen ones', () => {
    const first = buildFrozenRulesSnapshot(null, active(), ['Pit']);
    // admin later changes Pit + adds a different Bread15 value
    const changed = resolveCommissionRules({
      quotaRates: {below: 4, above: 7, double: 10},
      perVisitPenalties: {Anchor: 0, Bread5: 120, Bread15: 60, Pit: 200},
      quotaTarget: 12000,
    } as any);
    const second = buildFrozenRulesSnapshot(first, changed, ['Pit', 'Bread15']);
    // Pit stays at the originally frozen value (100), NOT the changed 200
    expect(second.perVisitPenalties.Pit).toBe(100);
    // Bread15 is newly used -> takes the current value (60)
    expect(second.perVisitPenalties.Bread15).toBe(60);
    // quotaRates stay frozen at the original
    expect(second.quotaRates.below).toBe(3);
    expect(second.quotaTarget).toBe(10000);
  });

  it('re-saving with the same used types never changes the frozen values', () => {
    const first = buildFrozenRulesSnapshot(null, active(), ['Pit']);
    const changed = resolveCommissionRules({perVisitPenalties: {Anchor: 0, Bread5: 1, Bread15: 1, Pit: 999}} as any);
    const second = buildFrozenRulesSnapshot(first, changed, ['Pit']);
    expect(second.perVisitPenalties.Pit).toBe(100);
  });
});
