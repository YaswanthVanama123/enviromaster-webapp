import {
  formatCurrency,
  getVisitsPerYear,
} from '../../backendservice/utils/commissionCalculatorV2';
import { DEFAULT_COMMISSION_RULES_V2 } from '../../backendservice/types/commission.types.v2';
import {
  getPricingTierFromList,
  PRICING_TIERS,
  type ResolvedCommissionRules,
} from '../../backendservice/types/commission.types';
import type { ServiceFrequency, AgreementTerm } from '../../backendservice/types/commission.types.v2';
import { getFrequencyNumber, BACKEND_TO_FREQUENCY, expandServiceAreas } from './frequency';

export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

export interface AccountTypeCacheEntry {
  accountType: AccountType | null;
  confidence?: 'high' | 'low' | null;
  reason?: string | null;
  drivingTimeMinutes?: number | null;
  nearestDestination?: string | null;
  usedFallback?: boolean;
}

export const ACCOUNT_TYPE_DEDUCTIONS: Record<AccountType, number> = {
  Anchor: 0,
  Bread5: 50,
  Bread15: 75,
  Pit: 100,
};

const FREQ_ORDER_BY_VISITS_ASC = [6, 0, 5, 4, 14, 3, 13, 2, 1];

function findAccountEntry(
  cache: Record<number, AccountTypeCacheEntry>,
  freqNum: number,
): AccountTypeCacheEntry | undefined {
  if (cache[freqNum]) return cache[freqNum];
  const idx = FREQ_ORDER_BY_VISITS_ASC.indexOf(freqNum);
  if (idx === -1) {
    for (const f of FREQ_ORDER_BY_VISITS_ASC) if (cache[f]) return cache[f];
    return undefined;
  }
  for (let i = idx + 1; i < FREQ_ORDER_BY_VISITS_ASC.length; i++) {
    if (cache[FREQ_ORDER_BY_VISITS_ASC[i]]) return cache[FREQ_ORDER_BY_VISITS_ASC[i]];
  }
  for (let i = idx - 1; i >= 0; i--) {
    if (cache[FREQ_ORDER_BY_VISITS_ASC[i]]) return cache[FREQ_ORDER_BY_VISITS_ASC[i]];
  }
  return undefined;
}

function getAgreementTerm(contractMonths: number): AgreementTerm {
  if (contractMonths >= 36) return '3-year';
  if (contractMonths >= 12) return '1-year';

  return 'MTM-with-install';
}

export function getAgreementMultiplier(contractMonths: number): number {
  const term = getAgreementTerm(contractMonths);
  return DEFAULT_COMMISSION_RULES_V2.agreementMultipliers[term];
}

type ExtendedFrequency = ServiceFrequency | 'bi-weekly' | 'semi-annual' | 'annual' | 'twice-per-month' | 'bi-monthly';

const EXTENDED_FREQUENCY_VISITS: Record<ExtendedFrequency, number> = {
  'weekly': 52,
  'biweekly': 26,
  'bi-weekly': 26,
  'monthly': 12,
  'quarterly': 4,
  'semi-annual': 2,
  'annual': 1,
  'twice-per-month': 24,
  'bi-monthly': 6,
  'one-time': 1,
};

export function backendFrequencyToServiceFrequency(freqNum: number): ExtendedFrequency {
  const mapping: Record<number, ExtendedFrequency> = {
    1: 'weekly',
    2: 'bi-weekly',
    3: 'monthly',
    4: 'quarterly',
    5: 'semi-annual',
    6: 'annual',
    13: 'twice-per-month',
    14: 'bi-monthly',
    0: 'one-time',
  };
  return mapping[freqNum] || 'monthly';
}

export function getVisitsPerYearExtended(frequency: ExtendedFrequency): number {

  if (EXTENDED_FREQUENCY_VISITS[frequency] !== undefined) {
    return EXTENDED_FREQUENCY_VISITS[frequency];
  }

  try {
    return getVisitsPerYear(frequency as ServiceFrequency);
  } catch {
    return 12;
  }
}

export interface ServiceCommissionDetail {
  serviceName: string;
  accountType: AccountType | null;
  confidence: 'high' | 'low' | null;
  reason: string | null;

  perVisitRevenue: number;
  revenueDeduction: number;
  commissionableRevenue: number;
  anchorBonus: number;

  annualOriginalRevenue: number;
  priceRatio: number;
  pricingTierLabel: string;
  pricingMultiplier: number;
  adjustedAnnualRevenue: number;

  frequencyNumber: number;
  frequencyLabel: string;
  visitsPerYear: number;

  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;

  commissionTiers: CommissionTier[];

  farTiers: {
    originalPerVisit: number;
    currentPerVisit: number;
    adjustedPerVisit: number;
    priceRatio: number;
    priorPerVisit: number;
    combinedPerVisit: number;
    pitThreshold: number;
    anchorThreshold: number;
    isGreenline: boolean;
    noCommPerVisit: number;
    normalPerVisit: number;
    anchorPerVisit: number;
    commissionablePerVisit: number;
  } | null;

  formatted: {
    perVisitRevenue: string;
    revenueDeduction: string;
    commissionableRevenue: string;
    annualOriginalRevenue: string;
    adjustedAnnualRevenue: string;
    priceRatio: string;
    pricingMultiplier: string;
    perVisitCommission: string;
    weeklyCommission: string;
    annualCommission: string;
  };
}

export interface GroupCommissionDetail {
  groupKey: string;
  serviceNames: string[];
  accountType: AccountType | null;
  frequencyLabel: string;
  visitsPerYear: number;
  perVisitRevenue: number;
  revenueDeduction: number;
  commissionableRevenue: number;
  anchorBonus: number;
  annualOriginalRevenue: number;
  priceRatio: number;
  pricingTierLabel: string;
  pricingMultiplier: number;
  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;
  commissionTiers: CommissionTier[];
  farTiers: ServiceCommissionDetail['farTiers'];
}

export interface GlobalCommissionResult {

  totalPerVisitCommission: number;
  totalWeeklyCommission: number;
  totalAnnualCommission: number;
  totalPerVisitRevenue: number;
  totalCommissionableRevenue: number;
  totalQuotaCredit: number;
  totalFarAnnual: number;
  totalFarAnnualRedline: number;
  totalFarAnnualGreenline: number;

  agreementMultiplier: number;
  agreementTerm: AgreementTerm;
  effectiveCommissionRate: number;

  priorQuotaCredit: number;
  quotaTarget: number;
  quotaTierBreakdown: QuotaTierPortion[];
  commissionTierBreakdown: CommissionTier[];

  services: ServiceCommissionDetail[];
  groups: GroupCommissionDetail[];

  formatted: {
    totalPerVisitCommission: string;
    totalWeeklyCommission: string;
    totalAnnualCommission: string;
    totalPerVisitRevenue: string;
    totalCommissionableRevenue: string;
  };

  hasDetectedServices: boolean;
  serviceCount: number;
}

export interface QuotaTierPortion {
  level: 'below' | 'above' | 'double';
  label: string;
  rate: number;
  quotaCredit: number;
  commission: number;
}

export function computeQuotaTierPortions(
  priorQuotaCredit: number,
  agreementQuotaCredit: number,
  quotaTarget: number,
  rates: { below: number; above: number; double: number },
): QuotaTierPortion[] {
  const bounds = [0, quotaTarget, quotaTarget * 2, Infinity];
  const defs: Array<{ level: 'below' | 'above' | 'double'; label: string; rate: number }> = [
    { level: 'below', label: 'Below Quota', rate: rates.below },
    { level: 'above', label: 'Above Quota', rate: rates.above },
    { level: 'double', label: 'Double Quota', rate: rates.double },
  ];
  const lo = Math.max(0, priorQuotaCredit);
  const hi = lo + agreementQuotaCredit;
  return defs.map((d, i) => {
    const from = Math.max(lo, bounds[i]);
    const to = Math.min(hi, bounds[i + 1]);
    const quotaCredit = Math.max(0, to - from);
    return { ...d, quotaCredit, commission: quotaCredit * (d.rate / 100) };
  });
}

export function progressiveQuotaCommissionRate(
  priorQuotaCredit: number,
  agreementQuotaCredit: number,
  quotaTarget: number,
  rates: { below: number; above: number; double: number },
  fallbackRate: number,
): number {
  if (agreementQuotaCredit <= 0 || quotaTarget <= 0) return fallbackRate;
  const portions = computeQuotaTierPortions(priorQuotaCredit, agreementQuotaCredit, quotaTarget, rates);
  const commission = portions.reduce((sum, t) => sum + t.commission, 0);
  return (commission / agreementQuotaCredit) * 100;
}

export interface CommissionTier {
  level: 'below' | 'above' | 'double';
  label: string;
  rate: number;
  effectiveRate: number;
  base: number;
  commission: number;
  quotaCredit?: number;
}

export function computeCommissionTiers(
  priorQuotaCredit: number,
  commissionableBase: number,
  quotaTarget: number,
  rates: { below: number; above: number; double: number },
  agreementMultiplier: number,
): CommissionTier[] {
  const bounds = [0, quotaTarget, quotaTarget * 2, Infinity];
  const defs: Array<{ level: 'below' | 'above' | 'double'; label: string; rate: number }> = [
    { level: 'below', label: 'Below Quota', rate: rates.below },
    { level: 'above', label: 'Above Quota', rate: rates.above },
    { level: 'double', label: 'Double Quota', rate: rates.double },
  ];
  const mult = agreementMultiplier / 100;
  const lo = Math.max(0, priorQuotaCredit);
  const hi = lo + commissionableBase;
  return defs.map((d, i) => {
    const from = Math.max(lo, bounds[i]);
    const to = Math.min(hi, bounds[i + 1]);
    const base = Math.max(0, to - from);
    const effectiveRate = d.rate * mult;
    return { ...d, effectiveRate, base, commission: base * (effectiveRate / 100) };
  });
}

export function computeGlobalCommission(
  servicesState: Record<string, any>,
  accountTypeCache: Record<number, AccountTypeCacheEntry>,
  globalContractMonths: number,
  commissionRate: number,
  rules: ResolvedCommissionRules,
  priorQuotaCredit: number = 0,
  isNewLocation: boolean = true,
  priorLocationFarAnnualRedline: number = 0,
  priorLocationFarAnnualGreenline: number = 0,
): GlobalCommissionResult {

    const visitsPerYearOf = (freqStr: string): number => {
      const v: any = rules.frequencyVisitsPerYear;
      const norm = (freqStr || 'monthly').toLowerCase().replace(/-/g, '');
      if (norm === 'weekly') return v.weekly;
      if (norm === 'biweekly') return v.biweekly;
      if (norm === 'monthly') return v.monthly;
      if (norm === 'quarterly') return v.quarterly;
      if (norm === 'onetime') return v['one-time'];

      return EXTENDED_FREQUENCY_VISITS[freqStr as ExtendedFrequency] ?? 12;
    };

    const agreementTerm = getAgreementTerm(globalContractMonths);
    const agreementMultiplier = rules.agreementMultipliers[agreementTerm];



    type ServiceRow = {
      serviceName: string;
      serviceData: any;
      freqNum: number;
      freqLabel: string;
      freqStr: ExtendedFrequency;
      annualCurrent: number;
      annualOriginal: number;
      accountType: AccountType | null;
      cacheEntry: AccountTypeCacheEntry | undefined;
    };

    const rows: ServiceRow[] = [];

    Object.entries(expandServiceAreas(servicesState)).forEach(([serviceName, serviceData]: [string, any]) => {
      if (!serviceData?.isActive) return;

      const freqNum = getFrequencyNumber(serviceData);
      if (freqNum === null || freqNum === 0) return;

      const serviceCurrent =
        (typeof serviceData.contractTotal === 'number' && serviceData.contractTotal) ||
        serviceData.totals?.contract?.amount ||
        serviceData.totals?.annual?.amount ||
        0;
      const serviceOriginal =
        (typeof serviceData.originalContractTotal === 'number' && serviceData.originalContractTotal) ||
        serviceCurrent;

      if (serviceCurrent <= 0) return;

      const annualCurrent =
        globalContractMonths > 0 ? (serviceCurrent / globalContractMonths) * 12 : serviceCurrent;
      const annualOriginal =
        globalContractMonths > 0 ? (serviceOriginal / globalContractMonths) * 12 : serviceOriginal;

      const cacheEntry = findAccountEntry(accountTypeCache, freqNum);
      const accountType = cacheEntry?.accountType || null;
      const freqStr = backendFrequencyToServiceFrequency(freqNum);
      const freqLabel = BACKEND_TO_FREQUENCY[freqNum] || 'Unknown';

      rows.push({
        serviceName,
        serviceData,
        freqNum,
        freqLabel,
        freqStr,
        annualCurrent,
        annualOriginal,
        accountType,
        cacheEntry,
      });
    });



    const groups = new Map<
      string,
      {
        freqStr: ExtendedFrequency;
        freqLabel: string;
        rows: ServiceRow[];
        accountType: AccountType | null;
        annualCurrent: number;
        annualOriginal: number;
        priceRatio: number;
        pricingTier: ReturnType<typeof getPricingTierFromList>;
        pricingMultiplier: number;
        adjustedAnnual: number;
        revenueDeduction: number;
        anchorBonus: number;
        commissionableAnnual: number;
        annualCommission: number;
        commissionTiers: CommissionTier[];
        farTiers: ServiceCommissionDetail['farTiers'];
      }
    >();

    rows.forEach(row => {
      const key = `${row.accountType || 'none'}|${row.freqStr}`;
      if (!groups.has(key)) {
        groups.set(key, {
          freqStr: row.freqStr,
          freqLabel: row.freqLabel,
          rows: [],
          accountType: row.accountType,
          annualCurrent: 0,
          annualOriginal: 0,
          priceRatio: 1,
          pricingTier: PRICING_TIERS[1],
          pricingMultiplier: 1,
          adjustedAnnual: 0,
          revenueDeduction: 0,
          anchorBonus: 0,
          commissionableAnnual: 0,
          annualCommission: 0,
          commissionTiers: [],
          farTiers: null,
        });
      }
      const g = groups.get(key)!;
      g.rows.push(row);
      g.annualCurrent += row.annualCurrent;
      g.annualOriginal += row.annualOriginal;

      if (!g.accountType && row.accountType) g.accountType = row.accountType;
    });

    let totalCommissionableAnnual = 0;
    let totalQuotaCredit = 0;
    let totalFarAnnualRedline = 0;
    let totalFarAnnualGreenline = 0;
    let numFarGroupsRedline = 0;
    let numFarGroupsGreenline = 0;
    groups.forEach(g => {
      const tier = getPricingTierFromList(g.annualCurrent, g.annualOriginal, rules.pricingTiers);
      g.pricingTier = tier;
      g.pricingMultiplier = tier.quotaMultiplier;
      g.priceRatio = g.annualOriginal > 0 ? g.annualCurrent / g.annualOriginal : 1;
      if (g.accountType === 'Anchor' || g.accountType === 'Pit') {
        if (tier.label === 'Greenline (130%+)') numFarGroupsGreenline++;
        else numFarGroupsRedline++;
      }
    });

    groups.forEach(g => {

      const isGreenline = g.pricingTier.label === 'Greenline (130%+)';
      const perFarGroupPrior = !isNewLocation
        ? (isGreenline
            ? (numFarGroupsGreenline > 0 ? priorLocationFarAnnualGreenline / numFarGroupsGreenline : 0)
            : (numFarGroupsRedline > 0 ? priorLocationFarAnnualRedline / numFarGroupsRedline : 0))
        : 0;

      g.adjustedAnnual = g.annualCurrent * g.pricingMultiplier;

      const visits = visitsPerYearOf(g.freqStr);
      const pitZoneAnnual = rules.pitPerVisitThreshold * visits;
      const anchorZoneAnnual = (isGreenline ? rules.anchorMinGreenline : rules.anchorPerVisitThreshold) * visits;
      const pen = rules.perVisitPenalties;
      const bread5Annual = pen.Bread5 * visits;
      const bread15Annual = pen.Bread15 * visits;
      const pitAnnual = pen.Pit * visits;

      const adjusted = g.adjustedAnnual;

      switch (g.accountType) {
        case 'Anchor':
        case 'Pit': {
          const visitsF = visits > 0 ? visits : 1;
          const round2 = (x: number) => Math.round(x * 100) / 100;
          // Prior is stored PER-VISIT (by pricing line). Scale it to this group's
          // annual using its own visit count before tiering.
          const prior = perFarGroupPrior * visitsF;
          // Accumulate this group's far contribution PER-VISIT (by pricing line).
          if (isGreenline) totalFarAnnualGreenline += adjusted / visitsF;
          else totalFarAnnualRedline += adjusted / visitsF;
          const comb = adjusted + prior;
          const tieredFar = (v: number) =>
            Math.min(Math.max(0, v - pitZoneAnnual), Math.max(0, anchorZoneAnnual - pitZoneAnnual)) +
            Math.max(0, v - anchorZoneAnnual) * rules.anchorBonusMultiplier;
          const cpv = round2(Math.max(0, tieredFar(comb) - tieredFar(prior)) / visitsF);
          g.commissionableAnnual = cpv * visitsF;
          g.revenueDeduction = Math.max(0, Math.min(comb, pitZoneAnnual) - Math.min(prior, pitZoneAnnual));
          const anchorOfThis =
            Math.max(0, comb - anchorZoneAnnual) - Math.max(0, prior - anchorZoneAnnual);
          g.anchorBonus = anchorOfThis * (rules.anchorBonusMultiplier - 1);

          const bandNormal = Math.max(0, Math.min(comb, anchorZoneAnnual) - Math.max(prior, pitZoneAnnual));
          g.farTiers = {
            originalPerVisit: round2(g.annualOriginal / visitsF),
            currentPerVisit: round2(g.annualCurrent / visitsF),
            adjustedPerVisit: round2(adjusted / visitsF),
            priceRatio: g.annualOriginal > 0 ? g.annualCurrent / g.annualOriginal : 1,
            priorPerVisit: round2(prior / visitsF),
            combinedPerVisit: round2(comb / visitsF),
            pitThreshold: rules.pitPerVisitThreshold,
            anchorThreshold: isGreenline ? rules.anchorMinGreenline : rules.anchorPerVisitThreshold,
            isGreenline,
            noCommPerVisit: round2(g.revenueDeduction / visitsF),
            normalPerVisit: round2(bandNormal / visitsF),
            anchorPerVisit: round2(anchorOfThis / visitsF),
            commissionablePerVisit: cpv,
          };

          if (g.accountType === 'Pit' && perFarGroupPrior > rules.anchorPerVisitThreshold) {
            g.accountType = 'Anchor';
          }
          break;
        }
        case 'Bread5': {
          g.revenueDeduction = bread5Annual;
          g.commissionableAnnual = Math.max(0, adjusted - g.revenueDeduction);
          break;
        }
        case 'Bread15': {
          g.revenueDeduction = bread15Annual;
          g.commissionableAnnual = Math.max(0, adjusted - g.revenueDeduction);
          break;
        }
        default: {

          g.revenueDeduction = 0;
          g.commissionableAnnual = adjusted;
        }
      }

      totalCommissionableAnnual += g.commissionableAnnual;
      totalQuotaCredit += g.annualCurrent * g.pricingMultiplier;
    });



    let totalAnnualCommission = 0;
    let totalWeeklyCommission = 0;
    let totalPerVisitCommission = 0;
    let totalPerVisitRevenue = 0;
    let totalCommissionableRevenue = 0;

    const services: ServiceCommissionDetail[] = [];
    const groupsList: GroupCommissionDetail[] = [];

    const mult = agreementMultiplier / 100;
    const tierAggBase: Record<'below' | 'above' | 'double', number> = { below: 0, above: 0, double: 0 };
    const tierAggCommission: Record<'below' | 'above' | 'double', number> = { below: 0, above: 0, double: 0 };
    const quotaAggCredit: Record<'below' | 'above' | 'double', number> = { below: 0, above: 0, double: 0 };
    let cumQuotaCredit = priorQuotaCredit;

    groups.forEach(g => {

      const groupQuotaCredit = g.annualCurrent * g.pricingMultiplier;

      const groupBaseRate = progressiveQuotaCommissionRate(
        cumQuotaCredit,
        groupQuotaCredit,
        rules.quotaTarget,
        rules.quotaRates,
        commissionRate,
      );
      g.annualCommission = g.commissionableAnnual * ((groupBaseRate * mult) / 100);

      const groupQuotaPortions =
        rules.quotaTarget > 0 && groupQuotaCredit > 0
          ? computeQuotaTierPortions(cumQuotaCredit, groupQuotaCredit, rules.quotaTarget, rules.quotaRates)
          : [];

      const groupCommissionTiers: CommissionTier[] = groupQuotaPortions
        .filter(p => p.quotaCredit > 0)
        .map(p => {
          const share = groupQuotaCredit > 0 ? p.quotaCredit / groupQuotaCredit : 0;
          return {
            level: p.level,
            label: p.label,
            rate: p.rate,
            effectiveRate: p.rate * mult,
            base: g.commissionableAnnual * share,
            commission: g.annualCommission * share,
            quotaCredit: p.quotaCredit,
          };
        });
      g.commissionTiers = groupCommissionTiers;

      groupCommissionTiers.forEach(t => { tierAggBase[t.level] += t.base; tierAggCommission[t.level] += t.commission; });
      groupQuotaPortions.forEach(t => { quotaAggCredit[t.level] += t.quotaCredit; });

      cumQuotaCredit += groupQuotaCredit;

      const groupVisits = visitsPerYearOf(g.freqStr);

      groupsList.push({
        groupKey: `${g.accountType || 'none'}|${g.freqStr}`,
        serviceNames: g.rows.map(r => r.serviceName),
        accountType: g.accountType,
        frequencyLabel: g.freqLabel,
        visitsPerYear: groupVisits,
        perVisitRevenue: g.annualCurrent,
        revenueDeduction: g.revenueDeduction,
        commissionableRevenue: g.commissionableAnnual,
        anchorBonus: g.anchorBonus,
        annualOriginalRevenue: g.annualOriginal,
        priceRatio: g.priceRatio,
        pricingTierLabel: g.pricingTier.label,
        pricingMultiplier: g.pricingMultiplier,
        perVisitCommission: groupVisits > 0 ? g.annualCommission / groupVisits : 0,
        weeklyCommission: g.annualCommission / rules.weeksPerAnnualCommission,
        annualCommission: g.annualCommission,
        commissionTiers: groupCommissionTiers,
        farTiers: g.farTiers,
      });

      g.rows.forEach(row => {
        const share = g.annualCurrent > 0 ? row.annualCurrent / g.annualCurrent : 0;
        const rowAnnualCommission = g.annualCommission * share;
        const rowCommissionable = g.commissionableAnnual * share;
        const rowDeduction = g.revenueDeduction * share;
        const rowAnchorBonus = g.anchorBonus * share;
        const rowWeekly = rowAnnualCommission / rules.weeksPerAnnualCommission;
        const rowPerVisit = groupVisits > 0 ? rowAnnualCommission / groupVisits : 0;
        const rowCommissionTiers = groupCommissionTiers.map(t => ({
          ...t,
          base: t.base * share,
          commission: t.commission * share,
          quotaCredit: (t.quotaCredit ?? 0) * share,
        }));

        totalAnnualCommission += rowAnnualCommission;
        totalWeeklyCommission += rowWeekly;
        totalPerVisitCommission += rowPerVisit;
        totalPerVisitRevenue += row.annualCurrent;
        totalCommissionableRevenue += rowCommissionable;

        const rowAdjusted = row.annualCurrent * g.pricingMultiplier;
        const rowOriginal = row.annualOriginal;

        services.push({
          serviceName: row.serviceName,
          accountType: g.accountType,
          confidence: row.cacheEntry?.confidence || null,
          reason: row.cacheEntry?.reason || null,
          perVisitRevenue: row.annualCurrent,
          revenueDeduction: rowDeduction,
          commissionableRevenue: rowCommissionable,
          anchorBonus: rowAnchorBonus,

          annualOriginalRevenue: rowOriginal,
          priceRatio: g.priceRatio,
          pricingTierLabel: g.pricingTier.label,
          pricingMultiplier: g.pricingMultiplier,
          adjustedAnnualRevenue: rowAdjusted,
          frequencyNumber: row.freqNum,
          frequencyLabel: row.freqLabel,
          visitsPerYear: groupVisits,
          perVisitCommission: rowPerVisit,
          weeklyCommission: rowWeekly,
          annualCommission: rowAnnualCommission,
          commissionTiers: rowCommissionTiers,
          farTiers: g.farTiers,
          formatted: {
            perVisitRevenue: formatCurrency(row.annualCurrent),
            revenueDeduction: formatCurrency(rowDeduction),
            commissionableRevenue: formatCurrency(rowCommissionable),
            annualOriginalRevenue: formatCurrency(rowOriginal),
            adjustedAnnualRevenue: formatCurrency(rowAdjusted),
            priceRatio: `${(g.priceRatio * 100).toFixed(1)}%`,
            pricingMultiplier: `${g.pricingMultiplier.toFixed(2)}×`,
            perVisitCommission: formatCurrency(rowPerVisit),
            weeklyCommission: formatCurrency(rowWeekly),
            annualCommission: formatCurrency(rowAnnualCommission),
          },
        });
      });
    });

    const tierMeta = [
      { level: 'below' as const, label: 'Below Quota', rate: rules.quotaRates.below },
      { level: 'above' as const, label: 'Above Quota', rate: rules.quotaRates.above },
      { level: 'double' as const, label: 'Double Quota', rate: rules.quotaRates.double },
    ];
    const commissionTierBreakdown: CommissionTier[] = tierMeta.map(m => ({
      level: m.level,
      label: m.label,
      rate: m.rate,
      effectiveRate: m.rate * mult,
      base: tierAggBase[m.level],
      commission: tierAggCommission[m.level],
    }));
    const quotaTierBreakdown: QuotaTierPortion[] = tierMeta.map(m => ({
      level: m.level,
      label: m.label,
      rate: m.rate,
      quotaCredit: quotaAggCredit[m.level],
      commission: quotaAggCredit[m.level] * (m.rate / 100),
    }));
    const effectiveCommissionRate =
      totalCommissionableRevenue > 0 ? (totalAnnualCommission / totalCommissionableRevenue) * 100 : 0;

    return {
      totalPerVisitCommission,
      totalWeeklyCommission,
      totalAnnualCommission,
      totalPerVisitRevenue,
      totalCommissionableRevenue,
      totalQuotaCredit,
      totalFarAnnual: totalFarAnnualRedline + totalFarAnnualGreenline,
      totalFarAnnualRedline,
      totalFarAnnualGreenline,

      agreementMultiplier,
      agreementTerm,
      effectiveCommissionRate,

      priorQuotaCredit,
      quotaTarget: rules.quotaTarget,
      quotaTierBreakdown,
      commissionTierBreakdown,

      services,
      groups: groupsList,

      formatted: {
        totalPerVisitCommission: formatCurrency(totalPerVisitCommission),
        totalWeeklyCommission: formatCurrency(totalWeeklyCommission),
        totalAnnualCommission: formatCurrency(totalAnnualCommission),
        totalPerVisitRevenue: formatCurrency(totalPerVisitRevenue),
        totalCommissionableRevenue: formatCurrency(totalCommissionableRevenue),
      },

      hasDetectedServices: services.some(s => s.accountType !== null),
      serviceCount: services.length,
    };
}
