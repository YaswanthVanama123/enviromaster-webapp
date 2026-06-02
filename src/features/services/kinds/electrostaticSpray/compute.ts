import type { ElectrostaticSprayFormState, ElectrostaticSprayCalcResult } from "../../../../components/services/electrostaticSpray/electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "../../../../components/services/electrostaticSpray/electrostaticSprayConfig";

export interface BackendElectrostaticSprayConfig {
  pricingMethodOptions: string[];
  combinedServiceOptions: string[];
  locationOptions: string[];
  standardSprayPricing: {
    sprayRatePerRoom: number;
    sqFtUnit: number;
    sprayRatePerSqFtUnit: number;
    minimumPriceOptional: number;
  };
  tripCharges: { standard: number; beltway: number };
  minimumChargePerVisit: number;
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

export interface ElectrostaticActiveConfig {
  standardSprayPricing: BackendElectrostaticSprayConfig["standardSprayPricing"];
  tripCharges: { standard: number; beltway?: number; insideBeltway?: number; outsideBeltway?: number };
  minimumChargePerVisit: number;
  minContractMonths: number;
  maxContractMonths: number;
  billingConversions: typeof cfg.billingConversions;
}

export function transformBackendFrequencyMeta(
  backendMeta: BackendElectrostaticSprayConfig["frequencyMetadata"] | undefined
) {
  if (!backendMeta) return cfg.billingConversions;
  const transformedBilling: any = { ...cfg.billingConversions };
  if (backendMeta.weekly) {
    transformedBilling.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      annualMultiplier: backendMeta.weekly.monthlyRecurringMultiplier * 12,
    };
  }
  if (backendMeta.biweekly) {
    transformedBilling.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      annualMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier * 12,
    };
  }
  const cycleBased = ["monthly", "bimonthly", "quarterly", "biannual", "annual"] as const;
  for (const freq of cycleBased) {
    const data = backendMeta[freq];
    if (data?.cycleMonths) {
      transformedBilling[freq] = {
        monthlyMultiplier: 1 / data.cycleMonths,
        annualMultiplier: 12 / data.cycleMonths,
      };
    }
  }
  return transformedBilling;
}

export function buildElectrostaticActiveConfig(
  backendConfig: BackendElectrostaticSprayConfig | null
): ElectrostaticActiveConfig {
  return {
    standardSprayPricing: backendConfig?.standardSprayPricing ?? {
      sprayRatePerRoom: cfg.ratePerRoom,
      sqFtUnit: cfg.sqFtUnit,
      sprayRatePerSqFtUnit: cfg.ratePerThousandSqFt,
      minimumPriceOptional: 0,
    },
    tripCharges: backendConfig?.tripCharges ?? cfg.tripCharges,
    minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,
    minContractMonths: backendConfig?.minContractMonths ?? cfg.minContractMonths,
    maxContractMonths: backendConfig?.maxContractMonths ?? cfg.maxContractMonths,
    billingConversions: transformBackendFrequencyMeta(backendConfig?.frequencyMetadata),
  };
}

export function computeElectrostaticSprayCalc(
  form: ElectrostaticSprayFormState,
  activeConfig: ElectrostaticActiveConfig,
  customFieldsTotal: number = 0
): ElectrostaticSprayCalcResult {
  let calculatedServiceCharge = 0;
  let effectiveRate = 0;
  const pricingMethodUsed = form.pricingMethod;

  const effectiveRatePerRoom = form.customRatePerRoom ?? form.ratePerRoom;
  const effectiveRatePerThousandSqFt =
    form.customRatePerThousandSqFt ?? form.ratePerThousandSqFt;

  if (form.pricingMethod === "byRoom") {
    calculatedServiceCharge = form.roomCount * effectiveRatePerRoom;
    effectiveRate = effectiveRatePerRoom;
  } else {
    let calculateForSqFt = form.squareFeet;
    if (!form.useExactCalculation) {
      const minTier = activeConfig.standardSprayPricing.sqFtUnit;
      if (calculateForSqFt <= minTier) {
        calculateForSqFt = minTier;
      } else {
        calculateForSqFt =
          Math.ceil(calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit) *
          activeConfig.standardSprayPricing.sqFtUnit;
      }
    }
    const units = calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit;
    calculatedServiceCharge = units * effectiveRatePerThousandSqFt;
    effectiveRate = effectiveRatePerThousandSqFt;
  }

  const hasService =
    (form.pricingMethod === "byRoom" && form.roomCount > 0) ||
    (form.pricingMethod === "bySqFt" && form.squareFeet > 0);

  if (activeConfig.minimumChargePerVisit > 0 && hasService) {
    calculatedServiceCharge =
      form.applyMinimum !== false
        ? Math.max(calculatedServiceCharge, activeConfig.minimumChargePerVisit)
        : calculatedServiceCharge;
  } else if (!hasService) {
    calculatedServiceCharge = 0;
  }

  const serviceCharge = form.customServiceCharge ?? calculatedServiceCharge;

  const effectiveTripChargePerVisit =
    form.customTripChargePerVisit ?? form.tripChargePerVisit;
  const tripCharge = form.isCombinedWithSaniClean ? 0 : effectiveTripChargePerVisit;

  const perVisit = form.customPerVisitPrice ?? serviceCharge + tripCharge;

  const freqConfig = activeConfig.billingConversions[form.frequency];
  const monthlyMultiplier = freqConfig?.monthlyMultiplier ?? 0;
  const annualMultiplier = freqConfig?.annualMultiplier ?? 0;

  const isVisitBasedFrequency =
    form.frequency === "oneTime" ||
    form.frequency === "quarterly" ||
    form.frequency === "biannual" ||
    form.frequency === "annual" ||
    form.frequency === "bimonthly" ||
    form.frequency === "everyFourWeeks";

  const monthsPerVisit =
    form.frequency === "oneTime"
      ? 0
      : form.frequency === "bimonthly"
      ? 2
      : form.frequency === "quarterly"
      ? 3
      : form.frequency === "biannual"
      ? 6
      : form.frequency === "annual"
      ? 12
      : 1;

  const monthlyRecurring = form.customMonthlyRecurring ?? perVisit * monthlyMultiplier;

  let contractTotal: number;
  if (form.frequency === "oneTime") {
    contractTotal = form.customContractTotal ?? perVisit;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear = annualMultiplier;
    const totalVisits = (form.contractMonths / 12) * visitsPerYear;
    contractTotal = form.customContractTotal ?? totalVisits * perVisit;
  } else {
    contractTotal = form.customContractTotal ?? monthlyRecurring * form.contractMonths;
  }

  const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

  let originalContractTotal = 0;
  if (hasService) {
    const baselineRatePerRoom = activeConfig.standardSprayPricing.sprayRatePerRoom;
    const baselineRatePerSqFtUnit = activeConfig.standardSprayPricing.sprayRatePerSqFtUnit;
    let baselineServiceCharge = 0;
    if (form.pricingMethod === "byRoom") {
      baselineServiceCharge = form.roomCount * baselineRatePerRoom;
    } else {
      let calcSqFt = form.squareFeet;
      if (!form.useExactCalculation) {
        const minTier = activeConfig.standardSprayPricing.sqFtUnit;
        calcSqFt = calcSqFt <= minTier ? minTier : Math.ceil(calcSqFt / minTier) * minTier;
      }
      const units = calcSqFt / activeConfig.standardSprayPricing.sqFtUnit;
      baselineServiceCharge = units * baselineRatePerSqFtUnit;
    }
    if (activeConfig.minimumChargePerVisit > 0) {
      baselineServiceCharge =
        form.applyMinimum !== false
          ? Math.max(baselineServiceCharge, activeConfig.minimumChargePerVisit)
          : baselineServiceCharge;
    }
    const baselinePerVisit = baselineServiceCharge + tripCharge;
    const baselineMonthlyRecurring = baselinePerVisit * monthlyMultiplier;
    if (form.frequency === "oneTime") {
      originalContractTotal = baselinePerVisit;
    } else if (isVisitBasedFrequency) {
      const visitsPerYear = annualMultiplier;
      const totalVisits = (form.contractMonths / 12) * visitsPerYear;
      originalContractTotal = totalVisits * baselinePerVisit;
    } else {
      originalContractTotal = baselineMonthlyRecurring * form.contractMonths;
    }
  }

  return {
    serviceCharge,
    tripCharge,
    perVisit,
    monthlyRecurring,
    contractTotal: contractTotalWithCustomFields,
    originalContractTotal,
    effectiveRate,
    pricingMethodUsed,
    isVisitBasedFrequency,
    monthsPerVisit,
    minimumChargePerVisit: activeConfig.minimumChargePerVisit,
  };
}
