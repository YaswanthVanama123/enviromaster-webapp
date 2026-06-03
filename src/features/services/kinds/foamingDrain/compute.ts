import { FOAMING_DRAIN_CONFIG as cfg } from "../../../../components/services/foamingDrain/foamingDrainConfig";
import type {
  FoamingDrainFormState,
  FoamingDrainQuoteResult,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
  FoamingDrainBreakdown,
} from "../../../../components/services/foamingDrain/foamingDrainTypes";

export interface BackendFoamingDrainConfig {
  standardPricing: {
    standardDrainRate: number;
    alternateBaseCharge: number;
    alternateExtraPerDrain: number;
  };
  volumePricing: {
    minimumDrains: number;
    weeklyRatePerDrain: number;
    bimonthlyRatePerDrain: number;
  };
  addOns: { plumbingWeeklyAddonPerDrain: number };
  minimumChargePerVisit: number;
  installationMultipliers: { filthyMultiplier: number };
  greenDrainPricing: { installPerDrain: number; weeklyRatePerDrain: number };
  greaseTrapPricing: { weeklyRatePerTrap: number; installPerTrap: number };
  tripCharges: { standard: number; beltway: number };
  contract: { minMonths: number; maxMonths: number; defaultMonths: number };
  defaultFrequency: string;
  allowedFrequencies: string[];
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

export function transformBackendFrequencyMeta(
  backendMeta: BackendFoamingDrainConfig["frequencyMetadata"] | undefined
) {
  if (!backendMeta) return cfg.billingConversions;
  const transformedBilling: any = {};
  if (backendMeta.weekly) {
    transformedBilling.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.weekly.firstMonthExtraMultiplier,
    };
  }
  if (backendMeta.biweekly) {
    transformedBilling.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.biweekly.firstMonthExtraMultiplier,
    };
  }
  const cycleBased = ["monthly", "bimonthly", "quarterly", "biannual", "annual"] as const;
  for (const freq of cycleBased) {
    const data = backendMeta[freq];
    if (data?.cycleMonths) {
      transformedBilling[freq] = {
        cycleMonths: data.cycleMonths,
        monthlyMultiplier: 1 / data.cycleMonths,
      };
    }
  }
  return { ...cfg.billingConversions, ...transformedBilling };
}

export interface FoamingDrainActiveConfig {
  standardDrainRate: number;
  altBaseCharge: number;
  altExtraPerDrain: number;
  volumePricing: {
    minimumDrains: number;
    weeklyRatePerDrain: number;
    bimonthlyRatePerDrain: number;
  };
  grease: { weeklyRatePerTrap: number; installPerTrap: number };
  green: { weeklyRatePerDrain: number; installPerDrain: number };
  plumbing: { weeklyAddonPerDrain: number };
  installationRules: { filthyMultiplier: number };
  tripCharges: { standard: number; beltway: number };
  contract: { minMonths: number; maxMonths: number; defaultMonths: number };
  defaultFrequency: string;
  allowedFrequencies: string[];
  billingConversions: any;
}

export function buildFoamingDrainActiveConfig(
  backendConfig: BackendFoamingDrainConfig | null
): FoamingDrainActiveConfig {
  return {
    standardDrainRate: backendConfig?.standardPricing?.standardDrainRate ?? cfg.standardDrainRate,
    altBaseCharge: backendConfig?.standardPricing?.alternateBaseCharge ?? cfg.altBaseCharge,
    altExtraPerDrain: backendConfig?.standardPricing?.alternateExtraPerDrain ?? cfg.altExtraPerDrain,
    volumePricing: {
      minimumDrains: backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains,
      weeklyRatePerDrain: backendConfig?.volumePricing?.weeklyRatePerDrain ?? cfg.volumePricing.weekly.ratePerDrain,
      bimonthlyRatePerDrain: backendConfig?.volumePricing?.bimonthlyRatePerDrain ?? cfg.volumePricing.bimonthly.ratePerDrain,
    },
    grease: {
      weeklyRatePerTrap: backendConfig?.greaseTrapPricing?.weeklyRatePerTrap ?? cfg.grease.weeklyRatePerTrap,
      installPerTrap: backendConfig?.greaseTrapPricing?.installPerTrap ?? cfg.grease.installPerTrap,
    },
    green: {
      weeklyRatePerDrain: backendConfig?.greenDrainPricing?.weeklyRatePerDrain ?? cfg.green.weeklyRatePerDrain,
      installPerDrain: backendConfig?.greenDrainPricing?.installPerDrain ?? cfg.green.installPerDrain,
    },
    plumbing: {
      weeklyAddonPerDrain: backendConfig?.addOns?.plumbingWeeklyAddonPerDrain ?? cfg.plumbing.weeklyAddonPerDrain,
    },
    installationRules: {
      filthyMultiplier: backendConfig?.installationMultipliers?.filthyMultiplier ?? cfg.installationRules.filthyMultiplier,
    },
    tripCharges: backendConfig?.tripCharges ?? cfg.tripCharges,
    contract: backendConfig?.contract ?? cfg.contract,
    defaultFrequency: backendConfig?.defaultFrequency ?? cfg.defaultFrequency,
    allowedFrequencies: (backendConfig?.allowedFrequencies ?? cfg.allowedFrequencies) as string[],
    billingConversions: transformBackendFrequencyMeta(backendConfig?.frequencyMetadata),
  };
}

function clamp(num: number, min: number, max: number): number {
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeFoamingDrainQuote(
  state: FoamingDrainFormState,
  activeConfig: FoamingDrainActiveConfig,
  backendConfig: BackendFoamingDrainConfig | null,
  customFieldsTotal: number = 0
): FoamingDrainQuoteResult {
  const standardDrains = Math.max(0, Number(state.standardDrainCount) || 0);
  const installRequested = Math.max(0, Number(state.installDrainCount) || 0);
  const filthyRequested = Math.max(0, Number(state.filthyDrainCount) || 0);
  const greaseTraps = Math.max(0, Number(state.greaseTrapCount) || 0);
  const greenDrains = Math.max(0, Number(state.greenDrainCount) || 0);
  const plumbingDrains = Math.max(0, Number(state.plumbingDrainCount) || 0);

  const frequency: FoamingDrainFrequency = state.frequency || cfg.defaultFrequency;
  const location: FoamingDrainLocation = state.location || "standard";
  const condition: FoamingDrainCondition = state.facilityCondition || "normal";

  const isVolume = standardDrains >= activeConfig.volumePricing.minimumDrains;
  const canUseInstallProgram =
    isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

  const installDrains = canUseInstallProgram
    ? Math.min(installRequested, standardDrains)
    : 0;
  const normalStandardDrains = Math.max(standardDrains - installDrains, 0);
  const standardDrainsActive = state.isAllInclusive ? 0 : normalStandardDrains;

  let filthyDrains = 0;
  if (condition === "filthy" && standardDrainsActive > 0) {
    if (filthyRequested > 0) {
      filthyDrains = Math.min(filthyRequested, standardDrainsActive);
    } else {
      filthyDrains = standardDrainsActive;
    }
  }

  const effectiveStandardDrainRate = state.customRatePerDrain ?? state.standardDrainRate;
  const effectiveAltBaseCharge = state.customAltBaseCharge ?? state.altBaseCharge;
  const effectiveAltExtraPerDrain = state.customAltExtraPerDrain ?? state.altExtraPerDrain;
  const effectiveVolumeWeeklyRate = state.customVolumeWeeklyRate ?? state.volumeWeeklyRate;
  const effectiveVolumeBimonthlyRate = state.customVolumeBimonthlyRate ?? state.volumeBimonthlyRate;
  const effectiveGreaseWeeklyRate = state.customGreaseWeeklyRate ?? state.greaseWeeklyRate;
  const effectiveGreaseInstallRate = state.customGreaseInstallRate ?? state.greaseInstallRate;
  const effectiveGreenWeeklyRate = state.customGreenWeeklyRate ?? state.greenWeeklyRate;
  const effectiveGreenInstallRate = state.customGreenInstallRate ?? state.greenInstallRate;
  const effectivePlumbingAddonRate = state.customPlumbingAddonRate ?? state.plumbingAddonRate;
  const effectiveFilthyMultiplier = state.customFilthyMultiplier ?? state.filthyMultiplier;

  const tenTotal = standardDrainsActive * effectiveStandardDrainRate;
  const altTotal =
    standardDrainsActive > 0
      ? effectiveAltBaseCharge + effectiveAltExtraPerDrain * standardDrainsActive
      : 0;

  let usedSmallAlt = false;
  let usedBigAccountAlt = false;
  let useAltPricing = false;

  if (standardDrainsActive > 0 && !state.isAllInclusive) {
    if (state.useSmallAltPricingWeekly) {
      useAltPricing = true;
      usedSmallAlt = true;
    } else if (state.useBigAccountTenWeekly) {
      useAltPricing = false;
      usedBigAccountAlt = true;
    } else {
      if (altTotal > 0 && altTotal < tenTotal) {
        useAltPricing = true;
        usedSmallAlt = true;
      } else {
        useAltPricing = false;
      }
    }
  }

  const weeklyStandardDrains = state.isAllInclusive
    ? 0
    : useAltPricing
    ? altTotal
    : tenTotal;

  let weeklyInstallDrains = 0;
  let volumePricingApplied = false;
  if (installDrains > 0 && canUseInstallProgram) {
    volumePricingApplied = true;
    const perDrainRate =
      state.installFrequency === "bimonthly"
        ? effectiveVolumeBimonthlyRate
        : effectiveVolumeWeeklyRate;
    weeklyInstallDrains = perDrainRate * installDrains;
  }

  const weeklyPlumbing =
    state.needsPlumbing && plumbingDrains > 0
      ? plumbingDrains * effectivePlumbingAddonRate
      : 0;
  const weeklyGreaseTraps = greaseTraps > 0 ? greaseTraps * effectiveGreaseWeeklyRate : 0;
  const weeklyGreenDrains = greenDrains > 0 ? greenDrains * effectiveGreenWeeklyRate : 0;

  const weeklyServiceRaw =
    weeklyStandardDrains +
    weeklyInstallDrains +
    weeklyPlumbing +
    weeklyGreaseTraps +
    weeklyGreenDrains;

  const minimumChargePerVisit = backendConfig?.minimumChargePerVisit ?? 50;
  const weeklyServiceBeforeMin = round2(weeklyServiceRaw);
  const weeklyService =
    weeklyServiceRaw > 0
      ? state.applyMinimum !== false
        ? Math.max(weeklyServiceBeforeMin, minimumChargePerVisit)
        : weeklyServiceBeforeMin
      : 0;
  const tripCharge = 0;

  let filthyInstallOneTime = 0;
  if (condition === "filthy" && standardDrainsActive > 0 && !state.useBigAccountTenWeekly) {
    const filthyDrainCount =
      filthyDrains > 0 && filthyDrains <= standardDrainsActive
        ? filthyDrains
        : standardDrainsActive;
    let weeklyFilthyCost = 0;
    if (useAltPricing) {
      weeklyFilthyCost =
        effectiveAltBaseCharge + effectiveAltExtraPerDrain * filthyDrainCount;
    } else {
      weeklyFilthyCost = effectiveStandardDrainRate * filthyDrainCount;
    }
    filthyInstallOneTime = weeklyFilthyCost * effectiveFilthyMultiplier;
  }

  const greaseInstallOneTime =
    state.chargeGreaseTrapInstall && greaseTraps > 0
      ? effectiveGreaseInstallRate * greaseTraps
      : 0;
  const greenInstallOneTime = greenDrains > 0 ? effectiveGreenInstallRate * greenDrains : 0;

  const installationRaw = filthyInstallOneTime + greaseInstallOneTime + greenInstallOneTime;
  const installation = round2(installationRaw);
  const effectiveInstallation = state.customInstallationTotal ?? installation;

  let firstVisitServiceRaw = weeklyInstallDrains + weeklyPlumbing;
  if (condition === "normal") firstVisitServiceRaw += weeklyStandardDrains;
  if (!state.chargeGreaseTrapInstall) firstVisitServiceRaw += weeklyGreaseTraps;
  const firstVisitService = round2(firstVisitServiceRaw);
  let firstVisitPrice = effectiveInstallation + firstVisitService;
  firstVisitPrice = round2(firstVisitPrice);

  const contractMonths = clamp(
    Number(state.contractMonths) || activeConfig.contract.defaultMonths,
    activeConfig.contract.minMonths,
    activeConfig.contract.maxMonths
  );

  const getFrequencyMultiplier = (freq: string) => {
    const normalized = freq.toLowerCase().replace(/\s+/g, "");
    switch (normalized) {
      case "onetime":
        return activeConfig.billingConversions.oneTime?.monthlyMultiplier ?? 0;
      case "weekly":
        return activeConfig.billingConversions.weekly?.monthlyMultiplier ?? 4.33;
      case "biweekly":
        return activeConfig.billingConversions.biweekly?.monthlyMultiplier ?? 2.165;
      case "twicepermonth":
        return activeConfig.billingConversions.twicePerMonth?.monthlyMultiplier ?? 2.0;
      case "monthly":
        return activeConfig.billingConversions.monthly?.monthlyMultiplier ?? 1.0;
      case "everyfourweeks":
        return activeConfig.billingConversions.everyFourWeeks?.monthlyMultiplier ?? 1.0833;
      case "bimonthly":
        return activeConfig.billingConversions.bimonthly?.monthlyMultiplier ?? 0.5;
      case "quarterly":
        return activeConfig.billingConversions.quarterly?.monthlyMultiplier ?? 0.333;
      case "biannual":
        return activeConfig.billingConversions.biannual?.monthlyMultiplier ?? 0.167;
      case "annual":
        return activeConfig.billingConversions.annual?.monthlyMultiplier ?? 0.083;
      default:
        return 1.0;
    }
  };

  const frequencyMultiplier = getFrequencyMultiplier(frequency);

  const customOrCalculated = state.customWeeklyService ?? weeklyService;
  const effectiveWeeklyService =
    weeklyServiceRaw > 0
      ? state.applyMinimum !== false
        ? Math.max(customOrCalculated, minimumChargePerVisit)
        : customOrCalculated
      : customOrCalculated;

  let normalMonth = effectiveWeeklyService * frequencyMultiplier;
  let firstMonthPrice = 0;
  if (effectiveInstallation > 0) {
    firstMonthPrice = firstVisitPrice + effectiveWeeklyService * Math.max(0, frequencyMultiplier - 1);
  } else {
    firstMonthPrice = normalMonth;
  }
  normalMonth = round2(normalMonth);
  firstMonthPrice = round2(firstMonthPrice);

  let contractTotalRaw = 0;
  const freqLower = frequency.toLowerCase();
  if (freqLower === "onetime" || freqLower === "one time") {
    contractTotalRaw = effectiveInstallation + effectiveWeeklyService;
  } else if (freqLower === "bimonthly") {
    const totalVisitsIn12Months = 6;
    const contractVisitsForTerm = Math.round((contractMonths / 12) * totalVisitsIn12Months);
    if (effectiveInstallation > 0) {
      const remainingVisits = Math.max(contractVisitsForTerm - 1, 0);
      contractTotalRaw = firstVisitPrice + effectiveWeeklyService * remainingVisits;
    } else {
      contractTotalRaw = effectiveWeeklyService * contractVisitsForTerm;
    }
  } else if (freqLower === "quarterly") {
    const totalVisits = Math.round(contractMonths / 3);
    if (effectiveInstallation > 0) {
      const remainingVisits = Math.max(totalVisits - 1, 0);
      contractTotalRaw = firstVisitPrice + effectiveWeeklyService * remainingVisits;
    } else {
      contractTotalRaw = effectiveWeeklyService * totalVisits;
    }
  } else if (freqLower === "biannual") {
    const totalVisits = Math.round(contractMonths / 6);
    if (effectiveInstallation > 0) {
      const remainingVisits = Math.max(totalVisits - 1, 0);
      contractTotalRaw = firstVisitPrice + effectiveWeeklyService * remainingVisits;
    } else {
      contractTotalRaw = effectiveWeeklyService * totalVisits;
    }
  } else if (freqLower === "annual") {
    const totalVisits = Math.round(contractMonths / 12);
    if (effectiveInstallation > 0) {
      const remainingVisits = Math.max(totalVisits - 1, 0);
      contractTotalRaw = firstVisitPrice + effectiveWeeklyService * remainingVisits;
    } else {
      contractTotalRaw = effectiveWeeklyService * totalVisits;
    }
  } else if (freqLower === "everyfourweeks") {
    const totalVisits = Math.round(contractMonths * 1.0833);
    if (effectiveInstallation > 0) {
      const remainingVisits = Math.max(totalVisits - 1, 0);
      contractTotalRaw = firstVisitPrice + effectiveWeeklyService * remainingVisits;
    } else {
      contractTotalRaw = effectiveWeeklyService * totalVisits;
    }
  } else {
    contractTotalRaw = firstMonthPrice + (contractMonths - 1) * normalMonth;
  }

  const contractTotal = round2(contractTotalRaw);
  const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

  const calculatedMonthlyRecurring = normalMonth;
  const calculatedContractTotal = contractTotalWithCustomFields;

  const breakdown: FoamingDrainBreakdown = {
    usedSmallAlt,
    usedBigAccountAlt,
    volumePricingApplied,
    weeklyStandardDrains: round2(weeklyStandardDrains),
    weeklyInstallDrains: round2(weeklyInstallDrains),
    weeklyGreaseTraps: round2(weeklyGreaseTraps),
    weeklyGreenDrains: round2(weeklyGreenDrains),
    weeklyPlumbing: round2(weeklyPlumbing),
    filthyInstallOneTime: round2(filthyInstallOneTime),
    greaseInstallOneTime: round2(greaseInstallOneTime),
    greenInstallOneTime: round2(greenInstallOneTime),
    tripCharge,
  };

  const originalContractTotal = (() => {
    if (!weeklyServiceRaw) return 0;
    const bTenTotal = standardDrainsActive * activeConfig.standardDrainRate;
    const bAltTotal =
      standardDrainsActive > 0
        ? activeConfig.altBaseCharge + activeConfig.altExtraPerDrain * standardDrainsActive
        : 0;
    let baselineUseAlt = false;
    if (standardDrainsActive > 0 && !state.isAllInclusive) {
      if (state.useSmallAltPricingWeekly) {
        baselineUseAlt = bAltTotal <= bTenTotal && bAltTotal > 0;
      } else if (!state.useBigAccountTenWeekly) {
        baselineUseAlt = bAltTotal > 0 && bAltTotal < bTenTotal;
      }
    }
    const baselineStandardDrains = state.isAllInclusive
      ? 0
      : baselineUseAlt
      ? bAltTotal
      : bTenTotal;
    const baselineInstallDrains =
      installDrains > 0 && canUseInstallProgram
        ? (state.installFrequency === "bimonthly"
            ? activeConfig.volumePricing.bimonthlyRatePerDrain
            : activeConfig.volumePricing.weeklyRatePerDrain) * installDrains
        : 0;
    const baselinePlumbing =
      state.needsPlumbing && plumbingDrains > 0
        ? plumbingDrains * activeConfig.plumbing.weeklyAddonPerDrain
        : 0;
    const baselineGrease = greaseTraps > 0 ? greaseTraps * activeConfig.grease.weeklyRatePerTrap : 0;
    const baselineGreen = greenDrains > 0 ? greenDrains * activeConfig.green.weeklyRatePerDrain : 0;
    const baselineWeeklyRaw =
      baselineStandardDrains + baselineInstallDrains + baselinePlumbing + baselineGrease + baselineGreen;
    const baselineWeekly =
      baselineWeeklyRaw > 0
        ? state.applyMinimum !== false
          ? Math.max(round2(baselineWeeklyRaw), minimumChargePerVisit)
          : round2(baselineWeeklyRaw)
        : 0;
    const baselineNormalMonth = round2(baselineWeekly * frequencyMultiplier);
    const freqLowerOct = frequency.toLowerCase();

    let baselineInstallation = 0;
    if (condition === "filthy" && standardDrainsActive > 0 && !state.useBigAccountTenWeekly) {
      const filthyDrainCount =
        filthyDrains > 0 && filthyDrains <= standardDrainsActive
          ? filthyDrains
          : standardDrainsActive;
      const bInstTenTotal = standardDrainsActive * activeConfig.standardDrainRate;
      const bInstAltTotal =
        standardDrainsActive > 0
          ? activeConfig.altBaseCharge + activeConfig.altExtraPerDrain * standardDrainsActive
          : 0;
      let bInstUseAlt = false;
      if (state.useSmallAltPricingWeekly) {
        bInstUseAlt = bInstAltTotal <= bInstTenTotal && bInstAltTotal > 0;
      } else if (!state.useBigAccountTenWeekly) {
        bInstUseAlt = bInstAltTotal > 0 && bInstAltTotal < bInstTenTotal;
      }
      const bFilthyCost = bInstUseAlt
        ? activeConfig.altBaseCharge + activeConfig.altExtraPerDrain * filthyDrainCount
        : activeConfig.standardDrainRate * filthyDrainCount;
      baselineInstallation += bFilthyCost * activeConfig.installationRules.filthyMultiplier;
    }
    if (state.chargeGreaseTrapInstall && greaseTraps > 0) {
      baselineInstallation += activeConfig.grease.installPerTrap * greaseTraps;
    }
    if (greenDrains > 0) {
      baselineInstallation += activeConfig.green.installPerDrain * greenDrains;
    }
    baselineInstallation = round2(baselineInstallation);

    let baselineFirstVisitService = 0;
    if (baselineInstallation > 0) {
      baselineFirstVisitService = baselineInstallDrains + baselinePlumbing;
      if (condition === "normal") baselineFirstVisitService += baselineStandardDrains;
      if (!state.chargeGreaseTrapInstall) baselineFirstVisitService += baselineGrease;
      baselineFirstVisitService = round2(baselineFirstVisitService);
    }
    const baselineFirstVisitPrice = baselineInstallation + baselineFirstVisitService;

    let baselineContractRaw = 0;
    if (freqLowerOct === "onetime" || freqLowerOct === "one time") {
      baselineContractRaw = baselineInstallation + baselineWeekly;
    } else if (freqLowerOct === "bimonthly") {
      const contractVisitsForTerm = Math.round(contractMonths / 2);
      if (baselineInstallation > 0) {
        const remainingVisits = Math.max(contractVisitsForTerm - 1, 0);
        baselineContractRaw = baselineFirstVisitPrice + baselineWeekly * remainingVisits;
      } else {
        baselineContractRaw = baselineWeekly * contractVisitsForTerm;
      }
    } else if (freqLowerOct === "quarterly") {
      const totalVisits = Math.max(Math.floor(contractMonths / 3), 1);
      if (baselineInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        baselineContractRaw = baselineFirstVisitPrice + baselineWeekly * remainingVisits;
      } else {
        baselineContractRaw = baselineWeekly * totalVisits;
      }
    } else if (freqLowerOct === "biannual") {
      const totalVisits = Math.max(Math.floor(contractMonths / 6), 1);
      if (baselineInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        baselineContractRaw = baselineFirstVisitPrice + baselineWeekly * remainingVisits;
      } else {
        baselineContractRaw = baselineWeekly * totalVisits;
      }
    } else if (freqLowerOct === "annual") {
      const totalVisits = Math.max(Math.floor(contractMonths / 12), 1);
      if (baselineInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        baselineContractRaw = baselineFirstVisitPrice + baselineWeekly * remainingVisits;
      } else {
        baselineContractRaw = baselineWeekly * totalVisits;
      }
    } else if (freqLowerOct === "everyfourweeks") {
      const totalVisits = Math.round(contractMonths * 1.0833);
      if (baselineInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        baselineContractRaw = baselineFirstVisitPrice + baselineWeekly * remainingVisits;
      } else {
        baselineContractRaw = baselineWeekly * totalVisits;
      }
    } else {
      if (baselineInstallation > 0) {
        const baselineFirstMonth = round2(
          baselineFirstVisitPrice + baselineWeekly * Math.max(0, frequencyMultiplier - 1)
        );
        baselineContractRaw = baselineFirstMonth + (contractMonths - 1) * baselineNormalMonth;
      } else {
        baselineContractRaw = baselineNormalMonth + (contractMonths - 1) * baselineNormalMonth;
      }
    }

    return round2(baselineContractRaw) + customFieldsTotal;
  })();

  return {
    serviceId: "foamingDrain",
    frequency,
    location,
    facilityCondition: condition,
    useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
    useBigAccountTenWeekly: state.useBigAccountTenWeekly,
    isAllInclusive: state.isAllInclusive,
    chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,
    weeklyService: effectiveWeeklyService,
    weeklyTotal: effectiveWeeklyService,
    monthlyRecurring: state.customMonthlyRecurring ?? calculatedMonthlyRecurring,
    annualRecurring: state.customContractTotal ?? calculatedContractTotal,
    installation: state.customInstallationTotal ?? installation,
    tripCharge,
    firstVisitPrice,
    firstMonthPrice: state.customFirstMonthPrice ?? firstMonthPrice,
    contractMonths,
    notes: state.notes || "",
    breakdown,
    minimumChargePerVisit,
    originalContractTotal,
  } as unknown as FoamingDrainQuoteResult;
}
