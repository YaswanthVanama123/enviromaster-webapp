import type {ResolvedCommissionRules} from '../../backendservice/types/commission.types';

function mergeKeepPrev<T extends Record<string, any>>(active: T, prev: Partial<T> | undefined): T {
  return {...(active || {}), ...(prev || {})} as T;
}

export function buildFrozenRulesSnapshot(
  prev: Partial<ResolvedCommissionRules> | null | undefined,
  active: ResolvedCommissionRules,
  usedAccountTypes: string[],
): ResolvedCommissionRules {
  const prevPenalties = (prev?.perVisitPenalties || {}) as Record<string, number>;
  const activePenalties = (active.perVisitPenalties || {}) as Record<string, number>;

  const penalties: Record<string, number> = {...prevPenalties};
  for (const t of usedAccountTypes) {
    if (t && penalties[t] == null && activePenalties[t] != null) {
      penalties[t] = activePenalties[t];
    }
  }

  return {
    ...active,
    ...(prev || {}),
    quotaRates: mergeKeepPrev(active.quotaRates, prev?.quotaRates),
    agreementMultipliers: mergeKeepPrev(active.agreementMultipliers, prev?.agreementMultipliers),
    quotaTierCutoffs: mergeKeepPrev(active.quotaTierCutoffs, prev?.quotaTierCutoffs),
    frequencyVisitsPerYear: mergeKeepPrev(active.frequencyVisitsPerYear, prev?.frequencyVisitsPerYear),
    perVisitPenalties: penalties as ResolvedCommissionRules['perVisitPenalties'],
    pricingTiers: prev?.pricingTiers && prev.pricingTiers.length ? prev.pricingTiers : active.pricingTiers,
  } as ResolvedCommissionRules;
}
