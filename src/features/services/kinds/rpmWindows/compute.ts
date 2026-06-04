import { rpmWindowPricingConfig as cfg } from "../../../../components/services/rpmWindows/rpmWindowsConfig";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
} from "../../../../components/services/rpmWindows/rpmWindowsTypes";

export interface BackendRpmConfig {
  windowPricingBothSidesIncluded: {
    smallWindowPrice: number;
    mediumWindowPrice: number;
    largeWindowPrice: number;
  };
  installPricing: {
    installationMultiplier: number;
    cleanInstallationMultiplier: number;
  };
  minimumChargePerVisit: number;
  tripCharges: {
    standard: number;
    beltway: number;
  };
  frequencyPriceMultipliers: {
    biweeklyPriceMultiplier: number;
    monthlyPriceMultiplier: number;
    quarterlyPriceMultiplierAfterFirstTime: number;
    quarterlyFirstTimeMultiplier: number;
  };
  frequencyMetadata: {
    weekly: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly: { cycleMonths: number };
    bimonthly: { cycleMonths: number };
    quarterly: { cycleMonths: number };
    biannual: { cycleMonths: number };
    annual: { cycleMonths: number };
  };
  minContractMonths: number;
  maxContractMonths: number;
}

export interface RpmBaseWeeklyRates {
  small: number;
  medium: number;
  large: number;
  trip: number;
}

export interface RpmCalcResult {
  effSmall: number;
  effMedium: number;
  effLarge: number;
  effTrip: number;
  recurringPerVisitRated: number;
  installOneTime: number;
  firstVisitTotalRated: number;
  standardMonthlyBillRated: number;
  firstMonthBillRated: number;
  monthlyBillRated: number;
  contractTotalRated: number;
  minimumChargePerVisit: number;
  originalContractTotal: number;
}

export function mapFrequency(v: string): RpmFrequencyKey {
  if (
    v === "oneTime" ||
    v === "weekly" ||
    v === "biweekly" ||
    v === "twicePerMonth" ||
    v === "monthly" ||
    v === "everyFourWeeks" ||
    v === "bimonthly" ||
    v === "quarterly" ||
    v === "biannual" ||
    v === "annual"
  ) {
    return v;
  }
  return "weekly";
}

export function getEffectiveFrequencyKey(freqKey: RpmFrequencyKey): RpmFrequencyKey {
  if (freqKey === "twicePerMonth" || freqKey === "bimonthly" || freqKey === "everyFourWeeks") {
    return "monthly";
  }
  if (freqKey === "biannual" || freqKey === "annual") {
    return "quarterly";
  }
  return freqKey;
}

export function getFrequencyMultiplier(
  effectiveFreqKey: RpmFrequencyKey,
  backendConfig: BackendRpmConfig | null
): number {
  if (backendConfig?.frequencyPriceMultipliers) {
    if (effectiveFreqKey === "weekly") return 1;
    if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
      return backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
    }
    if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
      return backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
    }
    if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
      return backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
    }
  }
  return (cfg.frequencyMultipliers as any)[effectiveFreqKey] || 1;
}

export function getBackendBaseRates(backendConfig: BackendRpmConfig | null): RpmBaseWeeklyRates {
  return {
    small: backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
    medium: backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
    large: backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
    trip: backendConfig?.tripCharges?.standard ?? cfg.tripCharge,
  };
}

function getCycleMonths(frequency: string, backendConfig: any): number {
  const cycleMonths = backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths;
  if (frequency === "monthly") {
    return cycleMonths === 0 ? 1 : (cycleMonths ?? 1);
  }
  if (typeof cycleMonths === "number" && cycleMonths > 0) {
    return cycleMonths;
  }
  const fallbackCycles: Record<string, number> = {
    bimonthly: 2,
    quarterly: 3,
    biannual: 6,
    annual: 12,
  };
  return fallbackCycles[frequency] ?? 1;
}

export function computeRpmWindowsCalc(
  form: RpmWindowsFormState,
  baseWeeklyRates: RpmBaseWeeklyRates,
  backendConfig: BackendRpmConfig | null,
  customFieldsTotal: number = 0
): RpmCalcResult {
  const activeConfig = {
    smallWindowRate: backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
    mediumWindowRate: backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
    largeWindowRate: backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
    tripCharge: backendConfig?.tripCharges?.standard ?? cfg.tripCharge,
    installMultiplierFirstTime: backendConfig?.installPricing?.installationMultiplier ?? cfg.installMultiplierFirstTime,
    installMultiplierClean: backendConfig?.installPricing?.cleanInstallationMultiplier ?? cfg.installMultiplierClean,
    minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,
    frequencyMultipliers: {
      weekly: 1,
      biweekly: backendConfig?.frequencyPriceMultipliers?.biweeklyPriceMultiplier ?? cfg.frequencyMultipliers.biweekly,
      monthly: backendConfig?.frequencyPriceMultipliers?.monthlyPriceMultiplier ?? cfg.frequencyMultipliers.monthly,
      quarterly: backendConfig?.frequencyPriceMultipliers?.quarterlyPriceMultiplierAfterFirstTime ?? cfg.frequencyMultipliers.quarterly,
      bimonthly: cfg.frequencyMultipliers.bimonthly,
      annual: cfg.frequencyMultipliers.annual,
      biannual: cfg.frequencyMultipliers.biannual,
      twicePerMonth: cfg.frequencyMultipliers.twicePerMonth,
      oneTime: cfg.frequencyMultipliers.oneTime,
      quarterlyFirstTime: backendConfig?.frequencyPriceMultipliers?.quarterlyFirstTimeMultiplier ?? cfg.frequencyMultipliers.quarterlyFirstTime,
    },
    monthlyConversions: {
      weekly: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.weekly,
      biweekly: backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? (cfg.monthlyConversions.weekly / 2),
      actualWeeksPerMonth: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.actualWeeksPerMonth,
      actualWeeksPerYear: 52,
    },
    annualFrequencies: cfg.annualFrequencies,
    rateCategories: cfg.rateCategories,
  };

  const freqKey = mapFrequency(form.frequency);
  let effectiveFreqKey = freqKey;
  if (freqKey === "twicePerMonth" || freqKey === "bimonthly" || freqKey === "everyFourWeeks") {
    effectiveFreqKey = "monthly";
  } else if (freqKey === "biannual" || freqKey === "annual") {
    effectiveFreqKey = "quarterly";
  }

  let freqMult = 1;
  if (backendConfig?.frequencyPriceMultipliers) {
    if (effectiveFreqKey === "weekly") {
      freqMult = 1;
    } else if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
      freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
    } else if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
      freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
    } else if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
      freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
    } else {
      const activeFreqMult = cfg.frequencyMultipliers as any;
      freqMult = activeFreqMult[effectiveFreqKey] || 1;
    }
  } else {
    const activeFreqMult = cfg.frequencyMultipliers as any;
    freqMult = activeFreqMult[effectiveFreqKey] || 1;
  }

  const weeklySmall = baseWeeklyRates.small;
  const weeklyMedium = baseWeeklyRates.medium;
  const weeklyLarge = baseWeeklyRates.large;

  const weeklyWindows =
    form.smallQty * weeklySmall + form.mediumQty * weeklyMedium + form.largeQty * weeklyLarge;
  const hasWindows = weeklyWindows > 0;

  const effSmall = form.smallWindowRate;
  const effMedium = form.mediumWindowRate;
  const effLarge = form.largeWindowRate;
  const effTrip = form.tripCharge;

  const perVisitWindows =
    form.smallQty * effSmall + form.mediumQty * effMedium + form.largeQty * effLarge;
  const perVisitService = hasWindows ? perVisitWindows : 0;

  const extrasTotal = form.extraCharges.reduce((s, l) => s + (l.amount || 0), 0);
  const recurringPerVisitBase = perVisitService + extrasTotal;

  const rateCfg =
    activeConfig.rateCategories[form.selectedRateCategory] ?? activeConfig.rateCategories.redRate;
  const recurringPerVisitRated = recurringPerVisitBase * (rateCfg?.multiplier ?? 1);

  const installMultiplier = form.isFirstTimeInstall
    ? (form.installMultiplierFirstTime ?? activeConfig.installMultiplierFirstTime ?? cfg.installMultiplierFirstTime)
    : (form.installMultiplierClean ?? activeConfig.installMultiplierClean ?? cfg.installMultiplierClean);

  const minimumChargePerVisit =
    backendConfig?.minimumChargePerVisit ?? activeConfig.minimumChargePerVisit ?? (cfg as any).minimumChargePerVisit ?? 50;
  const weeklyWindowsWithMinimum = hasWindows
    ? (form.applyMinimum !== false ? Math.max(weeklyWindows, minimumChargePerVisit) : weeklyWindows)
    : 0;

  const installOneTimeBase =
    form.isFirstTimeInstall && hasWindows ? weeklyWindowsWithMinimum * installMultiplier : 0;
  const installOneTime = installOneTimeBase * (rateCfg?.multiplier ?? 1);

  const effectiveInstallation = form.customInstallationFee ?? installOneTime;
  const effectivePerVisit = form.customPerVisitPrice ?? recurringPerVisitRated;

  const firstVisitTotalRated = effectiveInstallation;

  let monthlyVisits = 0;
  const weeksPerMonth = activeConfig.monthlyConversions.actualWeeksPerMonth ?? 4.33;

  if (freqKey === "oneTime") {
    monthlyVisits = 0;
  } else if (freqKey === "weekly") {
    monthlyVisits = backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? weeksPerMonth;
  } else if (freqKey === "biweekly") {
    monthlyVisits = backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? (weeksPerMonth / 2);
  } else if (freqKey === "twicePerMonth") {
    monthlyVisits = 2;
  } else if (freqKey === "monthly") {
    monthlyVisits = 1;
  } else if (freqKey === "everyFourWeeks") {
    monthlyVisits = 1.0833;
  } else if (freqKey === "bimonthly") {
    monthlyVisits = 0.5;
  } else if (freqKey === "quarterly") {
    monthlyVisits = 0;
  } else if (freqKey === "biannual") {
    monthlyVisits = 0;
  } else if (freqKey === "annual") {
    monthlyVisits = 0;
  }

  let standardMonthlyBillRated = effectivePerVisit * monthlyVisits;
  if (freqKey === "twicePerMonth") {
    standardMonthlyBillRated = effectivePerVisit * 1;
  }

  let displayMonthlyBillRated = standardMonthlyBillRated;
  if (standardMonthlyBillRated === 0 && effectivePerVisit > 0) {
    if (freqKey === "quarterly") {
      const cycleMonths = getCycleMonths("quarterly", backendConfig);
      displayMonthlyBillRated = effectivePerVisit / cycleMonths;
    } else if (freqKey === "biannual") {
      const cycleMonths = getCycleMonths("biannual", backendConfig);
      displayMonthlyBillRated = effectivePerVisit / cycleMonths;
    } else if (freqKey === "annual") {
      const cycleMonths = getCycleMonths("annual", backendConfig);
      displayMonthlyBillRated = effectivePerVisit / cycleMonths;
    } else if (freqKey === "bimonthly") {
      const cycleMonths = getCycleMonths("bimonthly", backendConfig);
      displayMonthlyBillRated = effectivePerVisit / cycleMonths;
    }
  }

  const isVisitBasedFrequency =
    freqKey === "oneTime" ||
    freqKey === "quarterly" ||
    freqKey === "biannual" ||
    freqKey === "annual" ||
    freqKey === "bimonthly" ||
    freqKey === "everyFourWeeks";
  const effectiveServiceVisitsFirstMonth =
    isVisitBasedFrequency ? 0 : (monthlyVisits > 1 ? monthlyVisits - 1 : 0);

  let firstMonthBillRated = 0;
  if (form.isFirstTimeInstall) {
    if (isVisitBasedFrequency) {
      firstMonthBillRated = effectiveInstallation;
    } else {
      firstMonthBillRated = effectiveInstallation + effectivePerVisit * effectiveServiceVisitsFirstMonth;
    }
  } else {
    firstMonthBillRated = effectivePerVisit * monthlyVisits;
  }

  const monthlyBillRated = displayMonthlyBillRated;
  const contractMonths = Math.max(form.contractMonths ?? 0, 0);

  let contractTotalRated = 0;
  if (contractMonths > 0) {
    if (freqKey === "oneTime") {
      contractTotalRated = firstMonthBillRated;
    } else if (
      freqKey === "quarterly" ||
      freqKey === "biannual" ||
      freqKey === "annual" ||
      freqKey === "bimonthly"
    ) {
      const cycleMonths = getCycleMonths(freqKey, backendConfig);
      const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
      if (form.isFirstTimeInstall) {
        const serviceVisits = Math.max(totalVisits - 1, 0);
        contractTotalRated = effectiveInstallation + serviceVisits * effectivePerVisit;
      } else {
        contractTotalRated = totalVisits * effectivePerVisit;
      }
    } else if (freqKey === "everyFourWeeks") {
      const totalVisits = Math.round(contractMonths * 1.0833);
      if (form.isFirstTimeInstall) {
        const serviceVisits = Math.max(totalVisits - 1, 0);
        contractTotalRated = effectiveInstallation + serviceVisits * effectivePerVisit;
      } else {
        contractTotalRated = totalVisits * effectivePerVisit;
      }
    } else {
      if (form.isFirstTimeInstall) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        contractTotalRated = firstMonthBillRated + standardMonthlyBillRated * remainingMonths;
      } else {
        contractTotalRated = standardMonthlyBillRated * contractMonths;
      }
    }
  }

  const recurringPerVisitWithMinimum = hasWindows
    ? (form.applyMinimum !== false ? Math.max(effectivePerVisit, minimumChargePerVisit) : effectivePerVisit)
    : 0;

  const standardMonthlyBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
  let displayMonthlyBillWithMinimum = standardMonthlyBillWithMinimum;

  if (isVisitBasedFrequency) {
    if (freqKey === "quarterly") {
      const cycleMonths = getCycleMonths("quarterly", backendConfig);
      displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
    } else if (freqKey === "biannual") {
      const cycleMonths = getCycleMonths("biannual", backendConfig);
      displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
    } else if (freqKey === "annual") {
      const cycleMonths = getCycleMonths("annual", backendConfig);
      displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
    } else if (freqKey === "bimonthly") {
      const cycleMonths = getCycleMonths("bimonthly", backendConfig);
      displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
    }
  }

  let firstMonthBillWithMinimum = 0;
  if (form.isFirstTimeInstall) {
    if (isVisitBasedFrequency) {
      firstMonthBillWithMinimum = effectiveInstallation;
    } else {
      firstMonthBillWithMinimum =
        effectiveInstallation + recurringPerVisitWithMinimum * effectiveServiceVisitsFirstMonth;
    }
  } else {
    firstMonthBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
  }

  let contractTotalWithMinimum = 0;
  if (contractMonths > 0) {
    if (freqKey === "oneTime") {
      contractTotalWithMinimum = form.isFirstTimeInstall
        ? effectiveInstallation
        : recurringPerVisitWithMinimum;
    } else if (freqKey === "everyFourWeeks") {
      const totalVisits = Math.round(contractMonths * 1.0833);
      contractTotalWithMinimum =
        (form.isFirstTimeInstall ? effectiveInstallation : 0) +
        recurringPerVisitWithMinimum * (totalVisits - (form.isFirstTimeInstall ? 1 : 0));
    } else if (isVisitBasedFrequency) {
      const cycleMonths = getCycleMonths(freqKey, backendConfig);
      const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
      contractTotalWithMinimum =
        (form.isFirstTimeInstall ? effectiveInstallation : 0) +
        recurringPerVisitWithMinimum * (totalVisits - (form.isFirstTimeInstall ? 1 : 0));
    } else {
      if (form.isFirstTimeInstall && firstMonthBillWithMinimum !== standardMonthlyBillWithMinimum) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        contractTotalWithMinimum = firstMonthBillWithMinimum + standardMonthlyBillWithMinimum * remainingMonths;
      } else {
        contractTotalWithMinimum = standardMonthlyBillWithMinimum * contractMonths;
      }
    }
  }

  const finalFirstMonth = firstMonthBillWithMinimum;
  const finalMonthlyRecurring = form.customMonthlyRecurring ?? standardMonthlyBillWithMinimum;

  let finalContractTotal = contractTotalWithMinimum;
  if (contractMonths > 0 && !isVisitBasedFrequency) {
    if (form.isFirstTimeInstall && finalFirstMonth !== finalMonthlyRecurring) {
      const remainingMonths = Math.max(contractMonths - 1, 0);
      finalContractTotal = finalFirstMonth + finalMonthlyRecurring * remainingMonths;
    } else {
      finalContractTotal = finalMonthlyRecurring * contractMonths;
    }
  }

  const contractTotalBeforeCustomFields = form.customContractTotal ?? finalContractTotal;
  const contractTotalWithCustomFields = contractTotalBeforeCustomFields + customFieldsTotal;

  const pricingTableSmall =
    backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate;
  const pricingTableMedium =
    backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate;
  const pricingTableLarge =
    backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate;

  const baselineSmallRate = pricingTableSmall * freqMult;
  const baselineMediumRate = pricingTableMedium * freqMult;
  const baselineLargeRate = pricingTableLarge * freqMult;

  const originalPerVisitWindows = hasWindows
    ? form.smallQty * baselineSmallRate +
      form.mediumQty * baselineMediumRate +
      form.largeQty * baselineLargeRate
    : 0;
  const originalPerVisitRated = originalPerVisitWindows * (rateCfg?.multiplier ?? 1);

  const originalPerVisitWithMinimum = hasWindows
    ? (form.applyMinimum !== false ? Math.max(originalPerVisitRated, minimumChargePerVisit) : originalPerVisitRated)
    : 0;
  const originalStandardMonthlyBill = originalPerVisitWithMinimum * monthlyVisits;

  const baselineWeeklyWindows =
    form.smallQty * pricingTableSmall +
    form.mediumQty * pricingTableMedium +
    form.largeQty * pricingTableLarge;

  const baselineInstallMultiplier = form.isFirstTimeInstall
    ? (activeConfig.installMultiplierFirstTime ?? cfg.installMultiplierFirstTime)
    : (activeConfig.installMultiplierClean ?? cfg.installMultiplierClean);
  const baselineInstallOneTime =
    form.isFirstTimeInstall && hasWindows
      ? Math.max(baselineWeeklyWindows, minimumChargePerVisit) *
        baselineInstallMultiplier *
        (rateCfg?.multiplier ?? 1)
      : 0;

  let originalContractTotal = 0;
  if (contractMonths > 0 && hasWindows) {
    if (freqKey === "oneTime") {
      originalContractTotal = form.isFirstTimeInstall
        ? baselineInstallOneTime
        : originalPerVisitWithMinimum;
    } else if (freqKey === "everyFourWeeks") {
      const totalVisits = Math.round(contractMonths * 1.0833);
      if (form.isFirstTimeInstall && baselineInstallOneTime > 0) {
        const serviceVisits = Math.max(totalVisits - 1, 0);
        originalContractTotal = baselineInstallOneTime + serviceVisits * originalPerVisitWithMinimum;
      } else {
        originalContractTotal = totalVisits * originalPerVisitWithMinimum;
      }
    } else if (isVisitBasedFrequency) {
      const cycleMonths = getCycleMonths(freqKey, backendConfig);
      const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
      if (form.isFirstTimeInstall && baselineInstallOneTime > 0) {
        const serviceVisits = Math.max(totalVisits - 1, 0);
        originalContractTotal = baselineInstallOneTime + serviceVisits * originalPerVisitWithMinimum;
      } else {
        originalContractTotal = totalVisits * originalPerVisitWithMinimum;
      }
    } else {
      if (form.isFirstTimeInstall && baselineInstallOneTime > 0) {
        const effectiveServiceVisitsFirst = monthlyVisits > 1 ? monthlyVisits - 1 : 0;
        const baselineFirstMonth =
          baselineInstallOneTime + originalPerVisitWithMinimum * effectiveServiceVisitsFirst;
        const remainingMonths = Math.max(contractMonths - 1, 0);
        originalContractTotal = baselineFirstMonth + originalStandardMonthlyBill * remainingMonths;
      } else {
        originalContractTotal = originalStandardMonthlyBill * contractMonths;
      }
    }
  }

  return {
    effSmall,
    effMedium,
    effLarge,
    effTrip,
    recurringPerVisitRated: form.customPerVisitPrice ?? recurringPerVisitWithMinimum,
    installOneTime: effectiveInstallation,
    firstVisitTotalRated,
    standardMonthlyBillRated: finalMonthlyRecurring,
    firstMonthBillRated: finalFirstMonth,
    monthlyBillRated: form.customMonthlyRecurring ?? displayMonthlyBillWithMinimum,
    contractTotalRated: contractTotalWithCustomFields,
    minimumChargePerVisit,
    originalContractTotal,
  };
}
