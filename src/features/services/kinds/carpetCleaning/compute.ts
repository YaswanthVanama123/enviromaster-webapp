import type { CarpetFormState, CarpetFrequency } from "../../../../components/services/carpetCleaning/carpetTypes";
import {
  carpetPricingConfig as cfg,
  carpetFrequencyList,
} from "../../../../components/services/carpetCleaning/carpetConfig";

export interface BackendCarpetConfig {
  baseSqFtUnit: number;
  basePrice: number;
  additionalSqFtUnit: number;
  additionalUnitPrice: number;
  minimumChargePerVisit: number;
  installationMultipliers: {
    dirtyInstallMultiplier: number;
    cleanInstallMultiplier: number;
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
  minContractMonths: number;
  maxContractMonths: number;
}

export interface CarpetActiveBaseConfig {
  unitSqFt: number;
  firstUnitRate: number;
  additionalUnitRate: number;
  perVisitMinimum: number;
  installMultipliers: { dirty: number; clean: number };
  frequencyMeta: any;
}

export interface CarpetCalc {
  perVisitBase: number;
  perVisitCharge: number;
  monthlyTotal: number;
  contractTotal: number;
  originalContractTotal: number;
  visitsPerYear: number;
  visitsPerMonth: number;
  perVisitTrip: number;
  monthlyTrip: number;
  installOneTime: number;
  firstMonthTotal: number;
  perVisitEffective: number;
  frequency: CarpetFrequency;
  isVisitBasedFrequency: boolean;
  monthsPerVisit: number;
  totalVisitsForContract: number;
}

export function transformBackendFrequencyMeta(
  backendMeta: BackendCarpetConfig["frequencyMetadata"] | undefined
) {
  if (!backendMeta) return cfg.frequencyMeta;
  const transformedMeta: any = {};
  if (backendMeta.weekly) {
    transformedMeta.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.weekly.firstMonthExtraMultiplier,
      visitsPerYear: Math.round(backendMeta.weekly.monthlyRecurringMultiplier * 12),
      annualMultiplier: Math.round(backendMeta.weekly.monthlyRecurringMultiplier * 12),
    };
  }
  if (backendMeta.biweekly) {
    transformedMeta.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.biweekly.firstMonthExtraMultiplier,
      visitsPerYear: Math.round(backendMeta.biweekly.monthlyRecurringMultiplier * 12),
      annualMultiplier: Math.round(backendMeta.biweekly.monthlyRecurringMultiplier * 12),
    };
  }
  const cycleBased = ["monthly", "bimonthly", "quarterly", "biannual", "annual"] as const;
  for (const freq of cycleBased) {
    const data = backendMeta[freq];
    if (data?.cycleMonths) {
      const cycleMonths = data.cycleMonths;
      const visitsPerYear = 12 / cycleMonths;
      transformedMeta[freq] = {
        cycleMonths,
        monthlyMultiplier: visitsPerYear / 12,
        visitsPerYear,
        annualMultiplier: visitsPerYear,
      };
    }
  }
  return { ...cfg.frequencyMeta, ...transformedMeta };
}

export function buildCarpetBaseConfig(
  backendConfig: BackendCarpetConfig | null
): CarpetActiveBaseConfig {
  if (backendConfig) {
    return {
      unitSqFt: backendConfig.baseSqFtUnit ?? cfg.unitSqFt,
      firstUnitRate: backendConfig.basePrice ?? cfg.firstUnitRate,
      additionalUnitRate: backendConfig.additionalUnitPrice ?? cfg.additionalUnitRate,
      perVisitMinimum: backendConfig.minimumChargePerVisit ?? cfg.perVisitMinimum,
      installMultipliers: {
        dirty:
          backendConfig.installationMultipliers?.dirtyInstallMultiplier ??
          cfg.installMultipliers.dirty,
        clean:
          backendConfig.installationMultipliers?.cleanInstallMultiplier ??
          cfg.installMultipliers.clean,
      },
      frequencyMeta: transformBackendFrequencyMeta(backendConfig.frequencyMetadata),
    };
  }
  return {
    unitSqFt: cfg.unitSqFt,
    firstUnitRate: cfg.firstUnitRate,
    additionalUnitRate: cfg.additionalUnitRate,
    perVisitMinimum: cfg.perVisitMinimum,
    installMultipliers: cfg.installMultipliers,
    frequencyMeta: cfg.frequencyMeta,
  };
}

export function clampCarpetFrequency(f: string): CarpetFrequency {
  return carpetFrequencyList.includes(f as CarpetFrequency)
    ? (f as CarpetFrequency)
    : "monthly";
}

export function clampCarpetContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

export function computeCarpetCalc(
  form: CarpetFormState,
  baseConfig: CarpetActiveBaseConfig,
  backendConfig: BackendCarpetConfig | null,
  customFieldsTotal: number = 0
): CarpetCalc {
  const activeConfig = {
    unitSqFt: baseConfig.unitSqFt,
    firstUnitRate: form.customFirstUnitRate ?? form.firstUnitRate ?? baseConfig.firstUnitRate,
    additionalUnitRate:
      form.customAdditionalUnitRate ?? form.additionalUnitRate ?? baseConfig.additionalUnitRate,
    perVisitMinimum:
      form.customPerVisitMinimum ?? form.perVisitMinimum ?? baseConfig.perVisitMinimum,
    installMultipliers: {
      dirty: form.installMultiplierDirty ?? baseConfig.installMultipliers.dirty,
      clean: form.installMultiplierClean ?? baseConfig.installMultipliers.clean,
    },
    frequencyMeta: baseConfig.frequencyMeta,
  };

  const freq = clampCarpetFrequency(form.frequency);
  const conv = activeConfig.frequencyMeta[freq];
  let monthlyVisits = 1;
  let visitsPerYear = 12;
  if (conv) {
    if (conv.monthlyMultiplier !== undefined) {
      monthlyVisits = conv.monthlyMultiplier;
      visitsPerYear =
        conv.visitsPerYear || conv.annualMultiplier || monthlyVisits * 12;
    } else if (conv.cycleMonths !== undefined) {
      visitsPerYear = 12 / conv.cycleMonths;
      monthlyVisits = visitsPerYear / 12;
    }
  } else {
    const fallbackConv = cfg.billingConversions[freq];
    if (fallbackConv) {
      monthlyVisits = fallbackConv.monthlyMultiplier || 1;
      visitsPerYear = fallbackConv.annualMultiplier || 12;
    }
  }
  const visitsPerMonth = visitsPerYear / 12;

  const frequentFrequencies: CarpetFrequency[] = [
    "weekly",
    "biweekly",
    "twicePerMonth",
    "monthly",
  ];
  const infrequentFrequencies: CarpetFrequency[] = [
    "bimonthly",
    "quarterly",
    "biannual",
    "annual",
    "everyFourWeeks",
  ];
  const shouldShowVisitRecurring = infrequentFrequencies.includes(freq);
  const isVisitBasedFrequency = shouldShowVisitRecurring;

  const areaSqFt = form.areaSqFt ?? 0;

  let calculatedPerVisitBase = 0;
  let calculatedPerVisitCharge = 0;

  if (areaSqFt > 0) {
    if (areaSqFt <= activeConfig.unitSqFt) {
      calculatedPerVisitBase = activeConfig.firstUnitRate;
    } else {
      const extraSqFt = areaSqFt - activeConfig.unitSqFt;
      if (form.useExactSqft) {
        const ratePerSqFt = activeConfig.additionalUnitRate / activeConfig.unitSqFt;
        calculatedPerVisitBase = activeConfig.firstUnitRate + extraSqFt * ratePerSqFt;
      } else {
        const additionalBlocks = Math.ceil(extraSqFt / activeConfig.unitSqFt);
        calculatedPerVisitBase =
          activeConfig.firstUnitRate + additionalBlocks * activeConfig.additionalUnitRate;
      }
    }
    calculatedPerVisitCharge =
      form.applyMinimum !== false
        ? Math.max(calculatedPerVisitBase, activeConfig.perVisitMinimum)
        : calculatedPerVisitBase;
  }

  const perVisitBase = calculatedPerVisitBase;
  const perVisitCharge =
    form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitCharge;

  const perVisitTrip = 0;
  const monthlyTrip = 0;

  const serviceActive = areaSqFt > 0;

  const installationBasePrice =
    form.applyMinimum !== false
      ? Math.max(calculatedPerVisitBase, activeConfig.perVisitMinimum)
      : calculatedPerVisitBase;
  const calculatedInstallOneTime =
    serviceActive && form.includeInstall
      ? installationBasePrice *
        (form.isDirtyInstall
          ? activeConfig.installMultipliers.dirty
          : activeConfig.installMultipliers.clean)
      : 0;
  const installOneTime =
    form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

  let calculatedMonthlyRecurring = 0;
  if (serviceActive) {
    if (freq === "oneTime") {
      calculatedMonthlyRecurring = perVisitCharge;
    } else if (isVisitBasedFrequency) {
      calculatedMonthlyRecurring = monthlyVisits * perVisitCharge;
    } else if (monthlyVisits > 0) {
      calculatedMonthlyRecurring = perVisitCharge * monthlyVisits;
    }
  }
  const monthlyRecurring =
    form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;

  let calculatedFirstMonthTotal = 0;
  if (serviceActive) {
    if (freq === "oneTime") {
      if (form.includeInstall && installOneTime > 0) {
        calculatedFirstMonthTotal = installOneTime;
      } else {
        calculatedFirstMonthTotal = perVisitCharge;
      }
    } else if (freq === "weekly") {
      if (form.includeInstall && installOneTime > 0) {
        const backendWeeklyMeta = backendConfig?.frequencyMetadata?.weekly;
        if (backendWeeklyMeta?.firstMonthExtraMultiplier !== undefined) {
          const extraVisits = backendWeeklyMeta.firstMonthExtraMultiplier;
          calculatedFirstMonthTotal = installOneTime + extraVisits * perVisitCharge;
        } else {
          const remainingVisits = monthlyVisits - 1;
          calculatedFirstMonthTotal = installOneTime + remainingVisits * perVisitCharge;
        }
      } else {
        calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
      }
    } else if (freq === "biweekly") {
      if (form.includeInstall && installOneTime > 0) {
        const backendBiweeklyMeta = backendConfig?.frequencyMetadata?.biweekly;
        if (backendBiweeklyMeta?.firstMonthExtraMultiplier !== undefined) {
          const extraVisits = backendBiweeklyMeta.firstMonthExtraMultiplier;
          calculatedFirstMonthTotal = installOneTime + extraVisits * perVisitCharge;
        } else {
          const remainingVisits = monthlyVisits - 1;
          calculatedFirstMonthTotal = installOneTime + remainingVisits * perVisitCharge;
        }
      } else {
        calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
      }
    } else if (freq === "monthly") {
      if (form.includeInstall && installOneTime > 0) {
        calculatedFirstMonthTotal = installOneTime;
      } else {
        calculatedFirstMonthTotal = perVisitCharge;
      }
    } else if (freq === "everyFourWeeks") {
      if (form.includeInstall && installOneTime > 0) {
        calculatedFirstMonthTotal = installOneTime;
      } else {
        calculatedFirstMonthTotal = perVisitCharge;
      }
    } else if (freq === "bimonthly") {
      if (form.includeInstall && installOneTime > 0) {
        calculatedFirstMonthTotal = installOneTime;
      } else {
        calculatedFirstMonthTotal = perVisitCharge;
      }
    } else if (freq === "quarterly") {
      if (form.includeInstall && installOneTime > 0) {
        calculatedFirstMonthTotal = installOneTime;
      } else {
        calculatedFirstMonthTotal = perVisitCharge;
      }
    } else if (freq === "biannual") {
      if (form.includeInstall && installOneTime > 0) {
        calculatedFirstMonthTotal = installOneTime;
      } else {
        calculatedFirstMonthTotal = perVisitCharge;
      }
    } else if (freq === "annual") {
      if (form.includeInstall && installOneTime > 0) {
        calculatedFirstMonthTotal = installOneTime;
      } else {
        calculatedFirstMonthTotal = perVisitCharge;
      }
    } else if (freq === "twicePerMonth") {
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = monthlyVisits - 1;
        calculatedFirstMonthTotal = installOneTime + remainingVisits * perVisitCharge;
      } else {
        calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
      }
    }
  }

  const firstMonthTotal =
    form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;

  const contractMonths = clampCarpetContractMonths(form.contractMonths);

  let calculatedContractTotal = 0;
  const monthsPerVisit = 1;
  let totalVisitsForContract = 0;

  if (contractMonths > 0 && serviceActive) {
    if (freq === "oneTime") {
      calculatedContractTotal = firstMonthTotal;
      totalVisitsForContract = 1;
    } else if (freq === "weekly") {
      const backendWeeklyMeta = backendConfig?.frequencyMetadata?.weekly;
      const effectiveMonthlyVisits =
        backendWeeklyMeta?.monthlyRecurringMultiplier ?? monthlyVisits;
      totalVisitsForContract = Math.round(contractMonths * effectiveMonthlyVisits);
      if (form.includeInstall && installOneTime > 0) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingMonths * monthlyRecurring;
      } else {
        calculatedContractTotal = contractMonths * monthlyRecurring;
      }
    } else if (freq === "biweekly") {
      const backendBiweeklyMeta = backendConfig?.frequencyMetadata?.biweekly;
      const effectiveMonthlyVisits =
        backendBiweeklyMeta?.monthlyRecurringMultiplier ?? monthlyVisits;
      totalVisitsForContract = Math.round(contractMonths * effectiveMonthlyVisits);
      if (form.includeInstall && installOneTime > 0) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingMonths * monthlyRecurring;
      } else {
        calculatedContractTotal = contractMonths * monthlyRecurring;
      }
    } else if (freq === "monthly") {
      const backendMonthlyMeta = backendConfig?.frequencyMetadata?.monthly;
      const cycleMonths = backendMonthlyMeta?.cycleMonths ?? 1;
      totalVisitsForContract = Math.round(contractMonths / cycleMonths);
      if (form.includeInstall && installOneTime > 0) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingMonths * monthlyRecurring;
      } else {
        calculatedContractTotal = contractMonths * monthlyRecurring;
      }
    } else if (freq === "everyFourWeeks") {
      const totalVisits = Math.round(contractMonths * 1.0833);
      totalVisitsForContract = totalVisits;
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingVisits * perVisitCharge;
      } else {
        calculatedContractTotal = totalVisits * perVisitCharge;
      }
    } else if (freq === "bimonthly") {
      const cycleMonths = backendConfig?.frequencyMetadata?.bimonthly?.cycleMonths ?? 2;
      const totalVisits = Math.round(contractMonths / cycleMonths);
      totalVisitsForContract = totalVisits;
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        calculatedContractTotal = installOneTime + remainingVisits * perVisitCharge;
      } else {
        calculatedContractTotal = totalVisits * perVisitCharge;
      }
    } else if (freq === "quarterly") {
      const cycleMonths = backendConfig?.frequencyMetadata?.quarterly?.cycleMonths ?? 3;
      const totalVisits = Math.round(contractMonths / cycleMonths);
      totalVisitsForContract = totalVisits;
      if (form.includeInstall && installOneTime > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        calculatedContractTotal = installOneTime + remainingVisits * perVisitCharge;
      } else {
        calculatedContractTotal = totalVisits * perVisitCharge;
      }
    } else if (freq === "biannual") {
      const cycleMonths = backendConfig?.frequencyMetadata?.biannual?.cycleMonths ?? 6;
      const totalServices = Math.round(contractMonths / cycleMonths);
      totalVisitsForContract = totalServices;
      if (form.includeInstall && installOneTime > 0) {
        const remainingServices = Math.max(totalServices - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingServices * perVisitCharge;
      } else {
        calculatedContractTotal = totalServices * perVisitCharge;
      }
    } else if (freq === "annual") {
      const cycleMonths = backendConfig?.frequencyMetadata?.annual?.cycleMonths ?? 12;
      const totalServices = Math.round(contractMonths / cycleMonths);
      totalVisitsForContract = totalServices;
      if (form.includeInstall && installOneTime > 0) {
        const remainingServices = Math.max(totalServices - 1, 0);
        calculatedContractTotal = installOneTime + remainingServices * perVisitCharge;
      } else {
        calculatedContractTotal = totalServices * perVisitCharge;
      }
    } else if (freq === "twicePerMonth") {
      totalVisitsForContract = Math.round(contractMonths * monthlyVisits);
      if (form.includeInstall && installOneTime > 0) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        calculatedContractTotal = firstMonthTotal + remainingMonths * monthlyRecurring;
      } else {
        calculatedContractTotal = contractMonths * monthlyRecurring;
      }
    }
  }

  const contractTotal =
    form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;
  const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

  const perVisitEffective = perVisitCharge;

  let originalContractTotal = 0;
  if (serviceActive && contractMonths > 0) {
    const baselineUnitSqFt = baseConfig.unitSqFt;
    const baselineFirstUnitRate = baseConfig.firstUnitRate;
    const baselineAdditionalUnitRate = baseConfig.additionalUnitRate;
    let baselinePerVisitBase = 0;
    if (areaSqFt <= baselineUnitSqFt) {
      baselinePerVisitBase = baselineFirstUnitRate;
    } else {
      const extraSqFt = areaSqFt - baselineUnitSqFt;
      if (form.useExactSqft) {
        const ratePerSqFt = baselineAdditionalUnitRate / baselineUnitSqFt;
        baselinePerVisitBase = baselineFirstUnitRate + extraSqFt * ratePerSqFt;
      } else {
        const additionalBlocks = Math.ceil(extraSqFt / baselineUnitSqFt);
        baselinePerVisitBase =
          baselineFirstUnitRate + additionalBlocks * baselineAdditionalUnitRate;
      }
    }
    const baselinePerVisitCharge =
      form.applyMinimum !== false
        ? Math.max(baselinePerVisitBase, baseConfig.perVisitMinimum ?? 0)
        : baselinePerVisitBase;
    const baselineInstallOneTime = form.includeInstall
      ? baselinePerVisitCharge *
        (form.isDirtyInstall
          ? baseConfig.installMultipliers.dirty
          : baseConfig.installMultipliers.clean)
      : 0;
    const baselineMonthlyRecurring = baselinePerVisitCharge * monthlyVisits;

    if (freq === "oneTime") {
      originalContractTotal =
        form.includeInstall && baselineInstallOneTime > 0
          ? baselineInstallOneTime
          : baselinePerVisitCharge;
    } else if (isVisitBasedFrequency) {
      if (form.includeInstall && baselineInstallOneTime > 0) {
        const remainingVisits = Math.max(totalVisitsForContract - 1, 0);
        originalContractTotal =
          baselineInstallOneTime + remainingVisits * baselinePerVisitCharge;
      } else {
        originalContractTotal = totalVisitsForContract * baselinePerVisitCharge;
      }
    } else {
      if (form.includeInstall && baselineInstallOneTime > 0) {
        const backendMeta = backendConfig?.frequencyMetadata?.[freq as keyof BackendCarpetConfig["frequencyMetadata"]];
        const extraVisits =
          (backendMeta as { firstMonthExtraMultiplier?: number } | undefined)
            ?.firstMonthExtraMultiplier ?? Math.max(monthlyVisits - 1, 0);
        const baselineFirstMonth =
          baselineInstallOneTime + extraVisits * baselinePerVisitCharge;
        const remainingMonths = Math.max(contractMonths - 1, 0);
        originalContractTotal =
          baselineFirstMonth + remainingMonths * baselineMonthlyRecurring;
      } else {
        originalContractTotal = contractMonths * baselineMonthlyRecurring;
      }
    }
  }

  return {
    perVisitBase,
    perVisitCharge,
    monthlyTotal: monthlyRecurring,
    contractTotal: contractTotalWithCustomFields,
    originalContractTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitTrip,
    monthlyTrip,
    installOneTime,
    firstMonthTotal,
    perVisitEffective,
    frequency: freq,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,
  };
}
