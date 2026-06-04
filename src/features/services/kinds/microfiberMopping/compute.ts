import type {
  MicrofiberMoppingFormState,
  MicrofiberFrequencyKey,
  MicrofiberMoppingCalcResult,
} from "../../../../components/services/microfiberMopping/microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "../../../../components/services/microfiberMopping/microfiberMoppingConfig";

export interface BackendMicrofiberConfig {
  includedBathroomRate?: number;
  hugeBathroomPricing?: {
    enabled: boolean;
    ratePerSqFt: number;
    sqFtUnit: number;
    description: string;
  };
  extraAreaPricing?: {
    singleLargeAreaRate: number;
    extraAreaSqFtUnit: number;
    extraAreaRatePerUnit: number;
    useHigherRate: boolean;
  };
  standalonePricing?: {
    standaloneSqFtUnit: number;
    standaloneRatePerUnit: number;
    standaloneMinimum: number;
    includeTripCharge: boolean;
  };
  chemicalProducts?: {
    dailyChemicalPerGallon: number;
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };
  bathroomMoppingPricing?: {
    flatPricePerBathroom: number;
    hugeBathroomSqFtUnit: number;
    hugeBathroomRate: number;
  };
  nonBathroomAddonAreas?: {
    flatPriceSingleLargeArea: number;
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    useHigherRate: boolean;
  };
  standaloneMoppingPricing?: {
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    minimumPrice: number;
    includeTripCharge: boolean;
  };
  tripCharges?: { standard: number; beltway: number };
  minimumChargePerVisit?: number;
  frequencyMetadata?: any;
  billingConversions?: {
    oneTime: { annualMultiplier: number; monthlyMultiplier: number };
    weekly: { annualMultiplier: number; monthlyMultiplier: number };
    biweekly: { annualMultiplier: number; monthlyMultiplier: number };
    twicePerMonth: { annualMultiplier: number; monthlyMultiplier: number };
    monthly: { annualMultiplier: number; monthlyMultiplier: number };
    everyFourWeeks?: { annualMultiplier: number; monthlyMultiplier: number };
    bimonthly: { annualMultiplier: number; monthlyMultiplier: number };
    quarterly: { annualMultiplier: number; monthlyMultiplier: number };
    biannual: { annualMultiplier: number; monthlyMultiplier: number };
    annual: { annualMultiplier: number; monthlyMultiplier: number };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number;
  };
  rateCategories?: {
    redRate: { multiplier: number; commissionRate: string };
    greenRate: { multiplier: number; commissionRate: string };
  };
  defaultFrequency?: string;
  allowedFrequencies?: string[];
}

export function mapMicrofiberFrequency(v: string): MicrofiberFrequencyKey {
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

export function convertFrequencyMetadataToBillingConversions(
  config: any
): BackendMicrofiberConfig {
  if (config.billingConversions) {
    return config as BackendMicrofiberConfig;
  }
  if (config.frequencyMetadata) {
    const freqMeta = config.frequencyMetadata;
    return {
      ...config,
      billingConversions: {
        oneTime: { annualMultiplier: 1, monthlyMultiplier: 0 },
        weekly: {
          annualMultiplier: 52,
          monthlyMultiplier: freqMeta.weekly?.monthlyRecurringMultiplier ?? 4.33,
        },
        biweekly: {
          annualMultiplier: 26,
          monthlyMultiplier: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 2.165,
        },
        twicePerMonth: { annualMultiplier: 24, monthlyMultiplier: 2 },
        monthly: { annualMultiplier: 12, monthlyMultiplier: 1 },
        everyFourWeeks: { annualMultiplier: 13, monthlyMultiplier: 1.0833 },
        bimonthly: { annualMultiplier: 6, monthlyMultiplier: 0.5 },
        quarterly: { annualMultiplier: 4, monthlyMultiplier: 0 },
        biannual: { annualMultiplier: 2, monthlyMultiplier: 0 },
        annual: { annualMultiplier: 1, monthlyMultiplier: 0 },
        actualWeeksPerYear: 52,
        actualWeeksPerMonth: 4.33,
      },
    } as BackendMicrofiberConfig;
  }
  return config as BackendMicrofiberConfig;
}

export interface MicrofiberMoppingComputeQuote {
  calc: MicrofiberMoppingCalcResult;
  serviceId: string;
  perVisit: number;
  monthly: number;
  annual: number;
}

export function computeMicrofiberMopping(
  form: MicrofiberMoppingFormState,
  backendConfig: BackendMicrofiberConfig | null,
  customFieldsTotal: number = 0
): MicrofiberMoppingComputeQuote {
  const activeConfig = {
    includedBathroomRate:
      backendConfig?.bathroomMoppingPricing?.flatPricePerBathroom ??
      backendConfig?.includedBathroomRate ??
      cfg.includedBathroomRate,
    hugeBathroomPricing: {
      enabled: true,
      ratePerSqFt:
        backendConfig?.bathroomMoppingPricing?.hugeBathroomRate ??
        backendConfig?.hugeBathroomPricing?.ratePerSqFt ??
        cfg.hugeBathroomPricing.ratePerSqFt,
      sqFtUnit:
        backendConfig?.bathroomMoppingPricing?.hugeBathroomSqFtUnit ??
        backendConfig?.hugeBathroomPricing?.sqFtUnit ??
        cfg.hugeBathroomPricing.sqFtUnit,
      description:
        backendConfig?.hugeBathroomPricing?.description ?? cfg.hugeBathroomPricing.description,
    },
    extraAreaPricing: {
      singleLargeAreaRate:
        backendConfig?.nonBathroomAddonAreas?.flatPriceSingleLargeArea ??
        backendConfig?.extraAreaPricing?.singleLargeAreaRate ??
        cfg.extraAreaPricing.singleLargeAreaRate,
      extraAreaSqFtUnit:
        backendConfig?.nonBathroomAddonAreas?.sqFtUnit ??
        backendConfig?.extraAreaPricing?.extraAreaSqFtUnit ??
        cfg.extraAreaPricing.extraAreaSqFtUnit,
      extraAreaRatePerUnit:
        backendConfig?.nonBathroomAddonAreas?.ratePerSqFtUnit ??
        backendConfig?.extraAreaPricing?.extraAreaRatePerUnit ??
        cfg.extraAreaPricing.extraAreaRatePerUnit,
      useHigherRate:
        backendConfig?.nonBathroomAddonAreas?.useHigherRate ??
        backendConfig?.extraAreaPricing?.useHigherRate ??
        cfg.extraAreaPricing.useHigherRate,
    },
    standalonePricing: {
      standaloneSqFtUnit:
        backendConfig?.standaloneMoppingPricing?.sqFtUnit ??
        backendConfig?.standalonePricing?.standaloneSqFtUnit ??
        cfg.standalonePricing.standaloneSqFtUnit,
      standaloneRatePerUnit:
        backendConfig?.standaloneMoppingPricing?.ratePerSqFtUnit ??
        backendConfig?.standalonePricing?.standaloneRatePerUnit ??
        cfg.standalonePricing.standaloneRatePerUnit,
      standaloneMinimum:
        backendConfig?.standaloneMoppingPricing?.minimumPrice ??
        backendConfig?.minimumChargePerVisit ??
        backendConfig?.standalonePricing?.standaloneMinimum ??
        cfg.standalonePricing.standaloneMinimum,
      includeTripCharge:
        backendConfig?.standaloneMoppingPricing?.includeTripCharge ??
        backendConfig?.standalonePricing?.includeTripCharge ??
        cfg.standalonePricing.includeTripCharge,
    },
    chemicalProducts: backendConfig?.chemicalProducts ?? cfg.chemicalProducts,
    billingConversions: backendConfig?.billingConversions ?? cfg.billingConversions,
    rateCategories: backendConfig?.rateCategories ?? cfg.rateCategories,
    defaultFrequency: backendConfig?.defaultFrequency ?? cfg.defaultFrequency,
    allowedFrequencies: backendConfig?.allowedFrequencies ?? cfg.allowedFrequencies,
    minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? cfg.minimumChargePerVisit,
  };

  const freq: MicrofiberFrequencyKey = mapMicrofiberFrequency(
    form.frequency ?? activeConfig.defaultFrequency
  );
  const conv = (activeConfig.billingConversions as any)[freq] || activeConfig.billingConversions.weekly;

  const effectiveIncludedBathroomRate =
    form.customIncludedBathroomRate ?? form.includedBathroomRate;
  const effectiveHugeBathroomRatePerSqFt =
    form.customHugeBathroomRatePerSqFt ?? form.hugeBathroomRatePerSqFt;
  const effectiveExtraAreaRatePerUnit =
    form.customExtraAreaRatePerUnit ?? form.extraAreaRatePerUnit;
  const effectiveStandaloneRatePerUnit =
    form.customStandaloneRatePerUnit ?? form.standaloneRatePerUnit;
  const effectiveDailyChemicalPerGallon =
    form.customDailyChemicalPerGallon ?? form.dailyChemicalPerGallon;

  const { actualWeeksPerYear, actualWeeksPerMonth } = activeConfig.billingConversions;
  const isAllInclusive = !!form.isAllInclusive;

  const bathroomCount = Number(form.bathroomCount) || 0;
  const hugeBathroomSqFt = Number(form.hugeBathroomSqFt) || 0;
  const extraAreaSqFt = Number(form.extraAreaSqFt) || 0;
  const standaloneSqFt = Number(form.standaloneSqFt) || 0;
  const chemicalGallons = Number(form.chemicalGallons) || 0;

  const isServiceInactive =
    bathroomCount === 0 &&
    hugeBathroomSqFt === 0 &&
    extraAreaSqFt === 0 &&
    standaloneSqFt === 0 &&
    chemicalGallons === 0;

  if (isServiceInactive) {
    const calc = {
      standardBathroomPrice: 0,
      hugeBathroomPrice: 0,
      bathroomPrice: 0,
      extraAreaPrice: 0,
      standaloneServicePrice: 0,
      standaloneTripCharge: 0,
      standaloneTotal: 0,
      chemicalSupplyMonthly: 0,
      weeklyServiceTotal: 0,
      weeklyTotalWithChemicals: 0,
      perVisitPrice: 0,
      annualPrice: 0,
      monthlyRecurring: 0,
      firstVisitPrice: 0,
      firstMonthPrice: 0,
      contractMonths: 0,
      contractTotal: 0,
      originalContractTotal: 0,
      minimumChargePerVisit: 0,
    } as MicrofiberMoppingCalcResult;
    return {
      calc,
      serviceId: "microfiberMopping",
      perVisit: 0,
      monthly: 0,
      annual: 0,
    };
  }

  let calculatedStandardBathroomPrice = 0;
  let calculatedHugeBathroomPrice = 0;

  if (!isAllInclusive && form.hasExistingSaniService) {
    const standardBathCount = Math.max(0, Number(form.bathroomCount) || 0);
    if (standardBathCount > 0) {
      calculatedStandardBathroomPrice = standardBathCount * effectiveIncludedBathroomRate;
    }
    const hugeSqFt = Math.max(0, Number(form.hugeBathroomSqFt) || 0);
    if (form.isHugeBathroom && activeConfig.hugeBathroomPricing.enabled && hugeSqFt > 0) {
      const units = Math.ceil(hugeSqFt / activeConfig.hugeBathroomPricing.sqFtUnit);
      calculatedHugeBathroomPrice = units * effectiveHugeBathroomRatePerSqFt;
    }
  }

  const standardBathroomPrice =
    form.customStandardBathroomTotal !== undefined
      ? form.customStandardBathroomTotal
      : calculatedStandardBathroomPrice;
  const hugeBathroomPrice =
    form.customHugeBathroomTotal !== undefined
      ? form.customHugeBathroomTotal
      : calculatedHugeBathroomPrice;
  const bathroomPrice = standardBathroomPrice + hugeBathroomPrice;

  let calculatedExtraAreaPrice = 0;
  if (!isAllInclusive && form.extraAreaSqFt > 0) {
    const unitSqFt = activeConfig.extraAreaPricing.extraAreaSqFtUnit;
    const firstUnitRate = activeConfig.extraAreaPricing.singleLargeAreaRate;
    const additionalUnitRate = effectiveExtraAreaRatePerUnit;
    if (form.useExactExtraAreaSqft) {
      const unitsInMinimum = Math.floor(firstUnitRate / additionalUnitRate);
      const minimumCoverageSqFt = unitsInMinimum * unitSqFt;
      if (form.extraAreaSqFt <= minimumCoverageSqFt) {
        calculatedExtraAreaPrice = firstUnitRate;
      } else {
        const totalUnits = Math.ceil(form.extraAreaSqFt / unitSqFt);
        calculatedExtraAreaPrice = totalUnits * additionalUnitRate;
      }
    } else {
      const minimumUnits = Math.floor(firstUnitRate / additionalUnitRate);
      const minimumCoverageSqFt = minimumUnits * unitSqFt;
      if (form.extraAreaSqFt <= minimumCoverageSqFt) {
        calculatedExtraAreaPrice = firstUnitRate;
      } else {
        const extraSqFt = form.extraAreaSqFt - minimumCoverageSqFt;
        const ratePerSqFt = additionalUnitRate / unitSqFt;
        calculatedExtraAreaPrice = firstUnitRate + extraSqFt * ratePerSqFt;
      }
    }
    if (activeConfig.extraAreaPricing.useHigherRate) {
      calculatedExtraAreaPrice = Math.max(calculatedExtraAreaPrice, firstUnitRate);
    }
  }
  const extraAreaPrice =
    form.customExtraAreaTotal !== undefined
      ? form.customExtraAreaTotal
      : calculatedExtraAreaPrice;

  let calculatedStandaloneServicePrice = 0;
  let standaloneTripCharge = 0;
  if (!isAllInclusive && form.standaloneSqFt > 0) {
    const unitSqFt = activeConfig.standalonePricing.standaloneSqFtUnit;
    const minimumRate = activeConfig.standalonePricing.standaloneMinimum;
    const additionalUnitRate = effectiveStandaloneRatePerUnit;
    if (form.useExactStandaloneSqft) {
      const unitsInMinimum = Math.floor(minimumRate / additionalUnitRate);
      const minimumCoverageSqFt = unitsInMinimum * unitSqFt;
      if (form.standaloneSqFt <= minimumCoverageSqFt) {
        calculatedStandaloneServicePrice = minimumRate;
      } else {
        const totalUnits = Math.ceil(form.standaloneSqFt / unitSqFt);
        calculatedStandaloneServicePrice = totalUnits * additionalUnitRate;
      }
    } else {
      const minimumUnits = Math.floor(minimumRate / additionalUnitRate);
      const minimumCoverageSqFt = minimumUnits * unitSqFt;
      if (form.standaloneSqFt <= minimumCoverageSqFt) {
        calculatedStandaloneServicePrice = minimumRate;
      } else {
        const extraSqFt = form.standaloneSqFt - minimumCoverageSqFt;
        const ratePerSqFt = additionalUnitRate / unitSqFt;
        calculatedStandaloneServicePrice = minimumRate + extraSqFt * ratePerSqFt;
      }
    }
    standaloneTripCharge = 0;
  }

  const standaloneServicePrice =
    form.customStandaloneTotal !== undefined
      ? form.customStandaloneTotal
      : calculatedStandaloneServicePrice;
  const standaloneTotal = standaloneServicePrice;

  const calculatedChemicalSupplyMonthly =
    form.chemicalGallons > 0
      ? form.chemicalGallons * effectiveDailyChemicalPerGallon
      : 0;
  const chemicalSupplyMonthly =
    form.customChemicalTotal !== undefined
      ? form.customChemicalTotal
      : calculatedChemicalSupplyMonthly;

  const calculatedPerVisitServiceTotal = bathroomPrice + extraAreaPrice + standaloneTotal;
  const minimumChargePerVisit = activeConfig.minimumChargePerVisit;
  const calculatedPerVisitWithMinimum =
    form.applyMinimum !== false
      ? Math.max(calculatedPerVisitServiceTotal, minimumChargePerVisit)
      : calculatedPerVisitServiceTotal;

  const perVisitPrice =
    form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitWithMinimum;

  const isVisitBasedFrequency =
    freq === "oneTime" ||
    freq === "quarterly" ||
    freq === "biannual" ||
    freq === "annual" ||
    freq === "bimonthly" ||
    freq === "everyFourWeeks";

  const monthlyVisits = conv.monthlyMultiplier;
  const calculatedMonthlyService = perVisitPrice * monthlyVisits;
  const calculatedMonthlyRecurring = calculatedMonthlyService + chemicalSupplyMonthly;

  const monthlyRecurring =
    form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;

  const installFee = 0;
  const firstVisitPrice = installFee;

  let calculatedFirstMonthPrice = 0;
  if (isVisitBasedFrequency) {
    calculatedFirstMonthPrice = perVisitPrice;
  } else {
    const calculatedFirstMonthService = Math.max(monthlyVisits, 0) * perVisitPrice;
    calculatedFirstMonthPrice =
      firstVisitPrice + calculatedFirstMonthService + chemicalSupplyMonthly;
  }
  const firstMonthPrice =
    form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthPrice;

  let contractMonths = Number(form.contractTermMonths) || 0;
  if (contractMonths < 2) contractMonths = 2;
  if (contractMonths > 36) contractMonths = 36;

  let calculatedContractTotal = 0;
  if (freq === "oneTime") {
    calculatedContractTotal = firstMonthPrice;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear = conv.annualMultiplier ?? 1;
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    calculatedContractTotal =
      totalVisits * perVisitPrice +
      contractMonths * (chemicalSupplyMonthly / monthlyVisits || 0);
  } else {
    const remainingMonths = Math.max(contractMonths - 1, 0);
    calculatedContractTotal = firstMonthPrice + remainingMonths * monthlyRecurring;
  }
  const contractTotal =
    form.customContractTotal !== undefined ? form.customContractTotal : calculatedContractTotal;
  const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

  const annualPrice = monthlyRecurring * 12;
  const weeklyServiceTotal = calculatedMonthlyService / (actualWeeksPerMonth || 4.33);
  const weeklyTotalWithChemicals = annualPrice / actualWeeksPerYear;

  const baselineBathroomRate = activeConfig.includedBathroomRate;
  const baselineExtraAreaRatePerUnit = activeConfig.extraAreaPricing.extraAreaRatePerUnit;
  const baselineStandaloneRatePerUnit = activeConfig.standalonePricing.standaloneRatePerUnit;

  let baselineStandardBathroom = 0;
  if (!isAllInclusive && form.hasExistingSaniService && bathroomCount > 0) {
    baselineStandardBathroom = bathroomCount * baselineBathroomRate;
  }
  let baselineHugeBathroom = 0;
  if (
    !isAllInclusive &&
    form.hasExistingSaniService &&
    form.isHugeBathroom &&
    activeConfig.hugeBathroomPricing.enabled &&
    hugeBathroomSqFt > 0
  ) {
    const units = Math.ceil(hugeBathroomSqFt / activeConfig.hugeBathroomPricing.sqFtUnit);
    baselineHugeBathroom = units * activeConfig.hugeBathroomPricing.ratePerSqFt;
  }

  let baselineExtraArea = 0;
  if (!isAllInclusive && extraAreaSqFt > 0) {
    const unitSqFt = activeConfig.extraAreaPricing.extraAreaSqFtUnit;
    const firstUnitRate = activeConfig.extraAreaPricing.singleLargeAreaRate;
    const unitsInMinimum = Math.floor(firstUnitRate / baselineExtraAreaRatePerUnit);
    const minimumCoverageSqFt = unitsInMinimum * unitSqFt;
    if (extraAreaSqFt <= minimumCoverageSqFt) {
      baselineExtraArea = firstUnitRate;
    } else {
      const totalUnits = Math.ceil(extraAreaSqFt / unitSqFt);
      baselineExtraArea = totalUnits * baselineExtraAreaRatePerUnit;
    }
  }
  let baselineStandalone = 0;
  if (!isAllInclusive && standaloneSqFt > 0) {
    const unitSqFt = activeConfig.standalonePricing.standaloneSqFtUnit;
    const minimumRate = activeConfig.standalonePricing.standaloneMinimum;
    const unitsInMinimum = Math.floor(minimumRate / baselineStandaloneRatePerUnit);
    const minimumCoverageSqFt = unitsInMinimum * unitSqFt;
    if (standaloneSqFt <= minimumCoverageSqFt) {
      baselineStandalone = minimumRate;
    } else {
      const totalUnits = Math.ceil(standaloneSqFt / unitSqFt);
      baselineStandalone = totalUnits * baselineStandaloneRatePerUnit;
    }
  }

  const baselineRaw =
    baselineStandardBathroom + baselineHugeBathroom + baselineExtraArea + baselineStandalone;
  const baselinePerVisit =
    form.applyMinimum !== false ? Math.max(baselineRaw, minimumChargePerVisit) : baselineRaw;
  const baselineMonthlyService = baselinePerVisit * monthlyVisits;

  let originalContractTotal = 0;
  if (freq === "oneTime") {
    originalContractTotal = baselinePerVisit;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear = conv.annualMultiplier ?? 1;
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    originalContractTotal = totalVisits * baselinePerVisit;
  } else {
    const remainingMonths = Math.max(contractMonths - 1, 0);
    originalContractTotal = baselineMonthlyService + remainingMonths * baselineMonthlyService;
  }

  const calc: MicrofiberMoppingCalcResult = {
    standardBathroomPrice,
    hugeBathroomPrice,
    bathroomPrice,
    extraAreaPrice,
    standaloneServicePrice,
    standaloneTripCharge,
    standaloneTotal,
    chemicalSupplyMonthly,
    weeklyServiceTotal,
    weeklyTotalWithChemicals,
    perVisitPrice,
    annualPrice,
    monthlyRecurring,
    firstVisitPrice,
    firstMonthPrice,
    contractMonths,
    contractTotal: contractTotalWithCustomFields,
    originalContractTotal,
    minimumChargePerVisit,
  };

  return {
    calc,
    serviceId: "microfiberMopping",
    perVisit: perVisitPrice,
    monthly: monthlyRecurring,
    annual: annualPrice,
  };
}
