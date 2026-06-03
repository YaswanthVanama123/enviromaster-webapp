import type { SaniscrubFormState, SaniscrubFrequency } from "../../../../components/services/saniscrub/saniscrubTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyList,
} from "../../../../components/services/saniscrub/saniscrubConfig";
import { VISITS_PER_YEAR_MAP } from "../../../../lib/pricing";

export interface BackendSaniscrubConfig {
  tripCharges: { standard: number; beltway: number };
  parkingFeeAddOn: number;
  monthlyPricing: { pricePerFixture: number; minimumPrice: number };
  bimonthlyPricing: { pricePerFixture: number; minimumPrice: number };
  quarterlyPricing: { pricePerFixture: number; minimumPrice: number };
  twicePerMonthPricing: { discountFromMonthlyRate: number };
  nonBathroomSqFtPricingRule: {
    sqFtBlockUnit: number;
    priceFirstBlock: number;
    priceAdditionalBlock: number;
  };
  installationPricing: {
    installMultiplierDirtyOrFirstTime: number;
    allowInstallFeeWaiver: boolean;
  };
  frequencyMetadata: {
    weekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly?: { cycleMonths: number };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };
}

export interface SaniscrubActiveConfig {
  fixtureRates: { monthly: number; bimonthly: number; quarterly: number };
  minimums: { monthly: number; bimonthly: number; quarterly: number };
  nonBathroomFirstUnitRate: number;
  nonBathroomAdditionalUnitRate: number;
  nonBathroomUnitSqFt: number;
  installMultipliers: { dirty: number; clean: number };
  twoTimesPerMonthDiscountFlat: number;
  tripCharges: { standard: number; beltway: number };
  parkingFee: number;
  frequencyMultipliers: Record<string, number>;
  annualFrequencies: Record<string, number>;
  frequencyMetadata?: BackendSaniscrubConfig["frequencyMetadata"];
}

export function buildSaniscrubActiveConfig(
  backendConfig: BackendSaniscrubConfig | null
): SaniscrubActiveConfig {
  const defaults = {
    fixtureRates: cfg.fixtureRates || { monthly: 25, bimonthly: 35, quarterly: 40 },
    minimums: cfg.minimums || { monthly: 125, bimonthly: 175, quarterly: 200 },
    nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate || 250,
    nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate || 125,
    nonBathroomUnitSqFt: cfg.nonBathroomUnitSqFt || 500,
    installMultipliers: cfg.installMultipliers || { dirty: 3, clean: 1 },
    twoTimesPerMonthDiscountFlat: cfg.twoTimesPerMonthDiscountFlat || 50,
    tripCharges: ((cfg as any).tripCharges ?? { standard: 0, beltway: 0 }) as { standard: number; beltway: number },
    parkingFee: ((cfg as any).parkingFee ?? 5) as number,
  };

  if (!backendConfig) {
    return {
      ...defaults,
      frequencyMultipliers: {
        oneTime: 0,
        weekly: 4.33,
        biweekly: 2.165,
        twicePerMonth: 2,
        monthly: 1.0,
        bimonthly: 0.5,
        quarterly: 0,
        biannual: 0,
        annual: 0,
      },
      annualFrequencies: { ...VISITS_PER_YEAR_MAP },
    };
  }

  return {
    fixtureRates: {
      monthly: backendConfig.monthlyPricing?.pricePerFixture ?? defaults.fixtureRates.monthly,
      bimonthly: backendConfig.bimonthlyPricing?.pricePerFixture ?? defaults.fixtureRates.bimonthly,
      quarterly: backendConfig.quarterlyPricing?.pricePerFixture ?? defaults.fixtureRates.quarterly,
    },
    minimums: {
      monthly: backendConfig.monthlyPricing?.minimumPrice ?? defaults.minimums.monthly,
      bimonthly: backendConfig.bimonthlyPricing?.minimumPrice ?? defaults.minimums.bimonthly,
      quarterly: backendConfig.quarterlyPricing?.minimumPrice ?? defaults.minimums.quarterly,
    },
    nonBathroomFirstUnitRate: backendConfig.nonBathroomSqFtPricingRule?.priceFirstBlock ?? defaults.nonBathroomFirstUnitRate,
    nonBathroomAdditionalUnitRate: backendConfig.nonBathroomSqFtPricingRule?.priceAdditionalBlock ?? defaults.nonBathroomAdditionalUnitRate,
    nonBathroomUnitSqFt: backendConfig.nonBathroomSqFtPricingRule?.sqFtBlockUnit ?? defaults.nonBathroomUnitSqFt,
    installMultipliers: {
      dirty: backendConfig.installationPricing?.installMultiplierDirtyOrFirstTime ?? defaults.installMultipliers.dirty,
      clean: 1,
    },
    twoTimesPerMonthDiscountFlat: backendConfig.twicePerMonthPricing?.discountFromMonthlyRate ?? defaults.twoTimesPerMonthDiscountFlat,
    tripCharges: backendConfig.tripCharges ?? defaults.tripCharges,
    parkingFee: backendConfig.parkingFeeAddOn ?? defaults.parkingFee,
    frequencyMultipliers: {
      oneTime: 0,
      weekly: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? 4.33,
      biweekly: backendConfig.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? 2.165,
      twicePerMonth: 2,
      monthly: 1.0,
      everyFourWeeks: 1.0833,
      bimonthly: 0.5,
      quarterly: 0,
      biannual: 0,
      annual: 0,
    },
    annualFrequencies: {
      ...VISITS_PER_YEAR_MAP,
      bimonthly: backendConfig.frequencyMetadata?.bimonthly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.bimonthly.cycleMonths : 6,
      quarterly: backendConfig.frequencyMetadata?.quarterly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.quarterly.cycleMonths : 4,
      biannual: backendConfig.frequencyMetadata?.biannual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.biannual.cycleMonths : 2,
      annual: backendConfig.frequencyMetadata?.annual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.annual.cycleMonths : 1,
    },
    frequencyMetadata: backendConfig.frequencyMetadata,
  };
}

export function clampSaniscrubFrequency(f: string): SaniscrubFrequency {
  return saniscrubFrequencyList.includes(f as SaniscrubFrequency)
    ? (f as SaniscrubFrequency)
    : "monthly";
}

export function clampSaniscrubContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

export interface SaniscrubCalcResult {
  fixtureMonthly: number;
  fixtureBaseAmount: number;
  fixturePerVisit: number;
  nonBathroomPerVisit: number;
  nonBathroomMonthly: number;
  monthlyBase: number;
  perVisitTrip: number;
  monthlyTrip: number;
  monthlyTotal: number;
  annualTotal: number;
  visitsPerYear: number;
  visitsPerMonth: number;
  perVisitEffective: number;
  installOneTime: number;
  firstMonthTotal: number;
  contractTotal: number;
  originalContractTotal: number;
  frequency: SaniscrubFrequency;
  isVisitBasedFrequency: boolean;
  monthsPerVisit: number;
  totalVisitsForContract: number;
  nonBathroomUnitSqFt: number;
}

export function computeSaniscrubCalc(
  form: SaniscrubFormState,
  activeConfig: SaniscrubActiveConfig,
  customFieldsTotal: number = 0
): SaniscrubCalcResult {
  const freq = clampSaniscrubFrequency(form.frequency);

  const getFrequencyMultiplier = (frequency: string) => {
    if (activeConfig.frequencyMetadata && (activeConfig.frequencyMetadata as any)[frequency]) {
      const metadata = (activeConfig.frequencyMetadata as any)[frequency];
      if (typeof metadata.monthlyRecurringMultiplier === "number") {
        return metadata.monthlyRecurringMultiplier;
      }
      if (typeof metadata.cycleMonths === "number") {
        return 1 / metadata.cycleMonths;
      }
    }
    return activeConfig.frequencyMultipliers[frequency] ?? 1;
  };

  const monthlyVisits = getFrequencyMultiplier(freq);
  const visitsPerYear = monthlyVisits * 12;
  const visitsPerMonth = visitsPerYear / 12;

  const isVisitBasedFrequency =
    freq === "oneTime" ||
    freq === "quarterly" ||
    freq === "biannual" ||
    freq === "annual" ||
    freq === "bimonthly" ||
    freq === "everyFourWeeks";

  const fixtureCount = form.fixtureCount ?? 0;
  const nonBathSqFt = form.nonBathroomSqFt ?? 0;

  let fixtureMonthly = 0;
  let fixturePerVisit = 0;
  let fixtureBaseAmount = 0;

  if (fixtureCount > 0) {
    let baseRate = 0;
    let minimumAmount = 0;
    if (
      freq === "oneTime" ||
      freq === "weekly" ||
      freq === "biweekly" ||
      freq === "twicePerMonth" ||
      freq === "monthly" ||
      freq === "everyFourWeeks"
    ) {
      baseRate = form.fixtureRateMonthly;
      minimumAmount = form.minimumMonthly;
    } else if (freq === "bimonthly") {
      baseRate = form.fixtureRateBimonthly;
      minimumAmount = form.minimumBimonthly;
    } else if (freq === "quarterly") {
      baseRate = form.fixtureRateQuarterly;
      minimumAmount = activeConfig.minimums.quarterly;
    } else {
      baseRate = form.fixtureRateQuarterly;
      minimumAmount = activeConfig.minimums.quarterly;
    }

    const rawAmount = fixtureCount * baseRate;
    fixtureBaseAmount =
      fixtureCount > 0
        ? form.applyMinimum !== false
          ? Math.max(rawAmount, minimumAmount)
          : rawAmount
        : 0;

    if (freq === "oneTime") {
      fixtureMonthly = 0;
      fixturePerVisit = fixtureBaseAmount;
    } else if (freq === "weekly" || freq === "biweekly") {
      fixturePerVisit = fixtureBaseAmount;
      fixtureMonthly = fixtureBaseAmount * monthlyVisits;
    } else if (freq === "monthly") {
      fixtureMonthly = fixtureBaseAmount;
      fixturePerVisit = fixtureBaseAmount;
    } else if (freq === "twicePerMonth") {
      fixtureMonthly = fixtureBaseAmount;
      fixturePerVisit = fixtureBaseAmount / 2;
    } else if (freq === "bimonthly") {
      fixturePerVisit = fixtureBaseAmount;
      fixtureMonthly = fixtureBaseAmount * monthlyVisits;
    } else if (freq === "quarterly") {
      fixturePerVisit = fixtureBaseAmount;
      fixtureMonthly = fixtureBaseAmount * monthlyVisits;
    } else {
      fixturePerVisit = fixtureBaseAmount;
      fixtureMonthly = fixtureBaseAmount * monthlyVisits;
    }
  }

  let nonBathroomPerVisit = 0;
  let nonBathroomMonthly = 0;
  if (nonBathSqFt > 0) {
    if (nonBathSqFt <= activeConfig.nonBathroomUnitSqFt) {
      nonBathroomPerVisit = form.nonBathroomFirstUnitRate;
    } else {
      const extraSqFt = nonBathSqFt - activeConfig.nonBathroomUnitSqFt;
      if (form.useExactNonBathroomSqft) {
        const ratePerSqFt = form.nonBathroomAdditionalUnitRate / activeConfig.nonBathroomUnitSqFt;
        nonBathroomPerVisit = form.nonBathroomFirstUnitRate + extraSqFt * ratePerSqFt;
      } else {
        const additionalBlocks = Math.ceil(extraSqFt / activeConfig.nonBathroomUnitSqFt);
        nonBathroomPerVisit =
          form.nonBathroomFirstUnitRate + additionalBlocks * form.nonBathroomAdditionalUnitRate;
      }
    }
    nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
  }

  const baseTrip = 0;
  const parkingCharge = 0;
  const perVisitTrip = baseTrip + parkingCharge;
  const monthlyTrip = perVisitTrip * visitsPerMonth;

  let adjustedFixtureMonthly = fixtureMonthly;
  if (freq === "twicePerMonth") {
    adjustedFixtureMonthly = fixtureMonthly * 2;
    if (form.hasSaniClean) {
      adjustedFixtureMonthly = Math.max(0, adjustedFixtureMonthly - form.twoTimesPerMonthDiscount);
    }
  }

  const monthlyBase = adjustedFixtureMonthly + nonBathroomMonthly;

  const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

  const monthlyRecurring = monthlyBase + monthlyTrip;

  const basePerVisitCost =
    (fixtureCount > 0 ? fixtureBaseAmount : 0) +
    (nonBathSqFt > 0 ? nonBathroomPerVisit : 0);

  const installationFixtureBase = fixtureCount > 0 ? fixtureBaseAmount : 0;
  const installationNonBathroomBase = nonBathSqFt > 0 ? nonBathroomPerVisit : 0;
  const installationBasePrice = installationFixtureBase + installationNonBathroomBase;

  const installMultiplier = form.isDirtyInstall
    ? form.installMultiplierDirty
    : form.installMultiplierClean;

  const calculatedInstallOneTime =
    serviceActive && form.includeInstall ? installationBasePrice * installMultiplier : 0;

  const installOneTime =
    form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

  let calculatedFirstMonthTotal = 0;
  if (serviceActive) {
    if (freq === "oneTime") {
      calculatedFirstMonthTotal =
        form.includeInstall && installOneTime > 0 ? installOneTime : basePerVisitCost + perVisitTrip;
    } else if (freq === "weekly" || freq === "biweekly") {
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = monthlyVisits - 1;
        calculatedFirstMonthTotal =
          installOneTime + remainingVisits * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
      }
    } else if (
      freq === "monthly" ||
      freq === "bimonthly" ||
      freq === "quarterly" ||
      freq === "biannual" ||
      freq === "annual" ||
      freq === "everyFourWeeks"
    ) {
      calculatedFirstMonthTotal =
        form.includeInstall && installOneTime > 0 ? installOneTime : basePerVisitCost + perVisitTrip;
    } else if (freq === "twicePerMonth") {
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = monthlyVisits - 1;
        calculatedFirstMonthTotal =
          installOneTime + remainingVisits * (basePerVisitCost + perVisitTrip);
        if (form.hasSaniClean) {
          calculatedFirstMonthTotal = Math.max(
            0,
            calculatedFirstMonthTotal - form.twoTimesPerMonthDiscount
          );
        }
      } else {
        calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
        if (form.hasSaniClean) {
          calculatedFirstMonthTotal = Math.max(
            0,
            calculatedFirstMonthTotal - form.twoTimesPerMonthDiscount
          );
        }
      }
    }
  }

  const firstMonthTotal =
    form.customFirstMonthPrice !== undefined ? form.customFirstMonthPrice : calculatedFirstMonthTotal;

  const contractMonths = clampSaniscrubContractMonths(form.contractMonths);
  let calculatedContractTotal = 0;
  let monthsPerVisit = 1;
  let totalVisitsForContract = 0;

  if (serviceActive && contractMonths > 0) {
    if (freq === "oneTime") {
      calculatedContractTotal = firstMonthTotal;
      totalVisitsForContract = 1;
    } else if (freq === "weekly" || freq === "biweekly") {
      totalVisitsForContract = Math.round(contractMonths * monthlyVisits);
      if (form.includeInstall && installOneTime > 0) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        calculatedContractTotal =
          firstMonthTotal + remainingMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedContractTotal = contractMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
      }
    } else if (freq === "monthly") {
      totalVisitsForContract = contractMonths;
      if (form.includeInstall && installOneTime > 0) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingMonths * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedContractTotal = contractMonths * (basePerVisitCost + perVisitTrip);
      }
    } else if (freq === "bimonthly") {
      const totalVisits = Math.round(contractMonths / 2);
      totalVisitsForContract = totalVisits;
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        calculatedContractTotal = installOneTime + remainingVisits * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
      }
    } else if (freq === "quarterly") {
      const totalVisits = Math.round(contractMonths / 3);
      totalVisitsForContract = totalVisits;
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        calculatedContractTotal = installOneTime + remainingVisits * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
      }
    } else if (freq === "biannual") {
      const totalServices = Math.round((contractMonths / 12) * 2);
      totalVisitsForContract = totalServices;
      if (form.includeInstall && installOneTime > 0) {
        const remainingServices = Math.max(totalServices - 1, 0);
        calculatedContractTotal =
          firstMonthTotal + remainingServices * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
      }
    } else if (freq === "annual") {
      const totalServices = Math.round(contractMonths / 12);
      totalVisitsForContract = totalServices;
      if (form.includeInstall && installOneTime > 0) {
        const remainingServices = Math.max(totalServices - 1, 0);
        calculatedContractTotal = installOneTime + remainingServices * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
      }
    } else if (freq === "everyFourWeeks") {
      const totalVisits = Math.round(contractMonths * 1.0833);
      totalVisitsForContract = totalVisits;
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingVisits * (basePerVisitCost + perVisitTrip);
      } else {
        calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
      }
    } else if (freq === "twicePerMonth") {
      totalVisitsForContract = Math.round(contractMonths * monthlyVisits);
      if (form.includeInstall && installOneTime > 0) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
        if (form.hasSaniClean) {
          monthlyRecurringWithDiscount = Math.max(
            0,
            monthlyRecurringWithDiscount - form.twoTimesPerMonthDiscount
          );
        }
        calculatedContractTotal = firstMonthTotal + remainingMonths * monthlyRecurringWithDiscount;
      } else {
        let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
        if (form.hasSaniClean) {
          monthlyRecurringWithDiscount = Math.max(
            0,
            monthlyRecurringWithDiscount - form.twoTimesPerMonthDiscount
          );
        }
        calculatedContractTotal = contractMonths * monthlyRecurringWithDiscount;
      }
    }
  }

  const contractTotalBeforeCustomFields =
    form.customContractTotal !== undefined ? form.customContractTotal : calculatedContractTotal;
  const contractTotal = contractTotalBeforeCustomFields + customFieldsTotal;

  const monthlyTotal =
    form.customMonthlyRecurring !== undefined ? form.customMonthlyRecurring : monthlyRecurring;
  const annualTotal = contractTotal;
  const perVisitEffective =
    form.customPerVisitPrice !== undefined ? form.customPerVisitPrice : basePerVisitCost + perVisitTrip;

  monthsPerVisit =
    freq === "bimonthly" ? 2 : freq === "quarterly" ? 3 : freq === "biannual" ? 6 : freq === "annual" ? 12 : 1;
  totalVisitsForContract =
    isVisitBasedFrequency && contractMonths > 0
      ? Math.round((contractMonths / 12) * visitsPerYear)
      : Math.round(contractMonths * monthlyVisits);

  const originalContractTotal = (() => {
    if (!serviceActive) return 0;
    const baselineFixtureRate =
      freq === "oneTime" ||
      freq === "monthly" ||
      freq === "weekly" ||
      freq === "biweekly" ||
      freq === "twicePerMonth" ||
      freq === "everyFourWeeks"
        ? activeConfig.fixtureRates.monthly
        : freq === "bimonthly"
        ? activeConfig.fixtureRates.bimonthly
        : activeConfig.fixtureRates.quarterly;
    const baselineMinimum =
      freq === "oneTime" ||
      freq === "monthly" ||
      freq === "weekly" ||
      freq === "biweekly" ||
      freq === "twicePerMonth" ||
      freq === "everyFourWeeks"
        ? activeConfig.minimums.monthly
        : freq === "bimonthly"
        ? activeConfig.minimums.bimonthly
        : activeConfig.minimums.quarterly;
    const baselineRawAmount = fixtureCount > 0 ? fixtureCount * baselineFixtureRate : 0;
    const baselineBaseAmount =
      fixtureCount > 0
        ? form.applyMinimum !== false
          ? Math.max(baselineRawAmount, baselineMinimum)
          : baselineRawAmount
        : 0;

    const baselineNonBathroomFirstUnitRate =
      activeConfig.nonBathroomFirstUnitRate ?? form.nonBathroomFirstUnitRate;
    const baselineNonBathroomAdditionalUnitRate =
      activeConfig.nonBathroomAdditionalUnitRate ?? form.nonBathroomAdditionalUnitRate;
    let baselineNonBathroomPerVisit = 0;
    if (nonBathSqFt > 0) {
      if (nonBathSqFt <= activeConfig.nonBathroomUnitSqFt) {
        baselineNonBathroomPerVisit = baselineNonBathroomFirstUnitRate;
      } else {
        const extraSqFt = nonBathSqFt - activeConfig.nonBathroomUnitSqFt;
        if (form.useExactNonBathroomSqft) {
          const ratePerSqFt = baselineNonBathroomAdditionalUnitRate / activeConfig.nonBathroomUnitSqFt;
          baselineNonBathroomPerVisit = baselineNonBathroomFirstUnitRate + extraSqFt * ratePerSqFt;
        } else {
          const additionalBlocks = Math.ceil(extraSqFt / activeConfig.nonBathroomUnitSqFt);
          baselineNonBathroomPerVisit =
            baselineNonBathroomFirstUnitRate +
            additionalBlocks * baselineNonBathroomAdditionalUnitRate;
        }
      }
    }

    const baselinePerVisit = baselineBaseAmount + baselineNonBathroomPerVisit;
    const baselineMonthlyTwice = baselineBaseAmount * 2 + baselineNonBathroomPerVisit * 2;
    let baselineContractTotal = 0;
    if (freq === "oneTime") {
      if (form.includeInstall && baselinePerVisit > 0) {
        const baselineInstallMultiplier = form.isDirtyInstall
          ? activeConfig.installMultipliers.dirty
          : activeConfig.installMultipliers.clean;
        baselineContractTotal = baselinePerVisit * baselineInstallMultiplier;
      } else {
        baselineContractTotal = baselinePerVisit;
      }
    } else if (freq === "weekly" || freq === "biweekly") {
      if (form.includeInstall && baselinePerVisit > 0) {
        const baselineInstallMultiplier = form.isDirtyInstall
          ? activeConfig.installMultipliers.dirty
          : activeConfig.installMultipliers.clean;
        const baselineInstallOneTime = baselinePerVisit * baselineInstallMultiplier;
        const baselineFirstMonth =
          baselineInstallOneTime + Math.max(monthlyVisits - 1, 0) * baselinePerVisit;
        baselineContractTotal =
          baselineFirstMonth + Math.max(contractMonths - 1, 0) * monthlyVisits * baselinePerVisit;
      } else {
        baselineContractTotal = contractMonths * monthlyVisits * baselinePerVisit;
      }
    } else if (freq === "monthly") {
      if (form.includeInstall && baselinePerVisit > 0) {
        const baselineInstallMultiplier = form.isDirtyInstall
          ? activeConfig.installMultipliers.dirty
          : activeConfig.installMultipliers.clean;
        const baselineInstallOneTime = baselinePerVisit * baselineInstallMultiplier;
        baselineContractTotal =
          baselineInstallOneTime + Math.max(contractMonths - 1, 0) * baselinePerVisit;
      } else {
        baselineContractTotal = contractMonths * baselinePerVisit;
      }
    } else if (freq === "twicePerMonth") {
      if (form.includeInstall && baselinePerVisit > 0) {
        const baselineInstallMultiplier = form.isDirtyInstall
          ? activeConfig.installMultipliers.dirty
          : activeConfig.installMultipliers.clean;
        const baselineInstallOneTime = baselinePerVisit * baselineInstallMultiplier;
        let baselineFirstMonth =
          baselineInstallOneTime + Math.max(monthlyVisits - 1, 0) * baselinePerVisit;
        if (form.hasSaniClean) {
          baselineFirstMonth = Math.max(
            0,
            baselineFirstMonth - activeConfig.twoTimesPerMonthDiscountFlat
          );
        }
        let baselineMonthlyRecurring = baselineMonthlyTwice;
        if (form.hasSaniClean) {
          baselineMonthlyRecurring = Math.max(
            0,
            baselineMonthlyRecurring - activeConfig.twoTimesPerMonthDiscountFlat
          );
        }
        baselineContractTotal =
          baselineFirstMonth + Math.max(contractMonths - 1, 0) * baselineMonthlyRecurring;
      } else {
        let baselineMonthlyRecurring = baselineMonthlyTwice;
        if (form.hasSaniClean) {
          baselineMonthlyRecurring = Math.max(
            0,
            baselineMonthlyRecurring - activeConfig.twoTimesPerMonthDiscountFlat
          );
        }
        baselineContractTotal = contractMonths * baselineMonthlyRecurring;
      }
    } else {
      if (form.includeInstall && baselinePerVisit > 0) {
        const baselineInstallMultiplier = form.isDirtyInstall
          ? activeConfig.installMultipliers.dirty
          : activeConfig.installMultipliers.clean;
        const baselineInstallOneTime = baselinePerVisit * baselineInstallMultiplier;
        baselineContractTotal =
          baselineInstallOneTime + Math.max(totalVisitsForContract - 1, 0) * baselinePerVisit;
      } else {
        baselineContractTotal = totalVisitsForContract * baselinePerVisit;
      }
    }
    return baselineContractTotal;
  })();

  return {
    fixtureMonthly,
    fixtureBaseAmount,
    fixturePerVisit,
    nonBathroomPerVisit,
    nonBathroomMonthly,
    monthlyBase,
    perVisitTrip,
    monthlyTrip,
    monthlyTotal,
    annualTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitEffective,
    installOneTime,
    firstMonthTotal,
    contractTotal,
    originalContractTotal,
    frequency: freq,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,
    nonBathroomUnitSqFt: activeConfig.nonBathroomUnitSqFt,
  };
}
