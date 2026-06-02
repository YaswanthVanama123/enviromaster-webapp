import { stripWaxPricingConfig as cfg } from "../../../../components/services/stripWax/stripWaxConfig";
import { VISITS_PER_YEAR_MAP } from "../../../../lib/pricing";
import type {
  StripWaxFormState,
  StripWaxServiceVariant,
} from "../../../../components/services/stripWax/stripWaxTypes";

export interface BackendStripWaxConfig {
  variants: {
    standardFull: { label: string; ratePerSqFt: number; minCharge: number; coatsIncluded: number; sealantIncluded: boolean };
    noSealant: { label: string; alternateRatePerSqFt: number; minCharge: number; includeExtraCoatFourthFree: boolean };
    wellMaintained: { label: string; ratePerSqFt: number; minCharge: number; coatsIncluded: number };
  };
  tripCharges: { standard: number; beltway: number };
  frequencyMetadata: {
    weekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };
  minContractMonths: number;
  maxContractMonths: number;
  defaultFrequency: string;
  defaultVariant: string;
  rateCategories: { redRate: { multiplier: number; commissionRate: string }; greenRate: { multiplier: number; commissionRate: string } };
}

export interface StripWaxActiveConfig {
  minContractMonths: number;
  maxContractMonths: number;
  defaultFrequency: string;
  defaultVariant: string;
  variants: Record<string, { label?: string; ratePerSqFt: number; minCharge: number }>;
  rateCategories: { redRate: { multiplier: number; commissionRate?: string }; greenRate: { multiplier: number; commissionRate?: string } };
  tripCharges: { standard: number; beltway: number };
  frequencyMultipliers: Record<string, number>;
  annualFrequencies: Record<string, number>;
  frequencyMetadata?: BackendStripWaxConfig["frequencyMetadata"];
}

export function buildStripWaxActiveConfig(
  backendConfig: BackendStripWaxConfig | null
): StripWaxActiveConfig {
  const defaults = {
    weeksPerMonth: cfg.weeksPerMonth || 4.33,
    weeksPerYear: cfg.weeksPerYear || 52,
    minContractMonths: cfg.minContractMonths || 2,
    maxContractMonths: cfg.maxContractMonths || 36,
    defaultFrequency: cfg.defaultFrequency || "weekly",
    defaultVariant: cfg.defaultVariant || "standardFull",
    variants: cfg.variants || {
      standardFull: { label: "Standard Full", ratePerSqFt: 0.75, minCharge: 550 },
      noSealant: { label: "No Sealant", ratePerSqFt: 0.7, minCharge: 550 },
      wellMaintained: { label: "Well Maintained", ratePerSqFt: 0.4, minCharge: 400 },
    },
    rateCategories: cfg.rateCategories || {
      redRate: { multiplier: 1, commissionRate: "20%" },
      greenRate: { multiplier: 1.3, commissionRate: "25%" },
    },
  };

  if (!backendConfig) {
    return {
      ...defaults,
      tripCharges: { standard: 0, beltway: 0 },
      frequencyMultipliers: {
        oneTime: 0,
        weekly: 4.33,
        biweekly: 2.165,
        twicePerMonth: 2,
        monthly: 1.0,
        everyFourWeeks: 1.0833,
        bimonthly: 0.5,
        quarterly: 0,
        biannual: 0,
        annual: 0,
      },
      annualFrequencies: { ...VISITS_PER_YEAR_MAP },
    };
  }

  return {
    minContractMonths: backendConfig.minContractMonths ?? defaults.minContractMonths,
    maxContractMonths: backendConfig.maxContractMonths ?? defaults.maxContractMonths,
    defaultFrequency: backendConfig.defaultFrequency ?? defaults.defaultFrequency,
    defaultVariant: backendConfig.defaultVariant ?? defaults.defaultVariant,
    variants: {
      standardFull: {
        label: backendConfig.variants?.standardFull?.label ?? defaults.variants.standardFull.label,
        ratePerSqFt: backendConfig.variants?.standardFull?.ratePerSqFt ?? defaults.variants.standardFull.ratePerSqFt,
        minCharge: backendConfig.variants?.standardFull?.minCharge ?? defaults.variants.standardFull.minCharge,
      },
      noSealant: {
        label: backendConfig.variants?.noSealant?.label ?? defaults.variants.noSealant.label,
        ratePerSqFt: backendConfig.variants?.noSealant?.alternateRatePerSqFt ?? defaults.variants.noSealant.ratePerSqFt,
        minCharge: backendConfig.variants?.noSealant?.minCharge ?? defaults.variants.noSealant.minCharge,
      },
      wellMaintained: {
        label: backendConfig.variants?.wellMaintained?.label ?? defaults.variants.wellMaintained.label,
        ratePerSqFt: backendConfig.variants?.wellMaintained?.ratePerSqFt ?? defaults.variants.wellMaintained.ratePerSqFt,
        minCharge: backendConfig.variants?.wellMaintained?.minCharge ?? defaults.variants.wellMaintained.minCharge,
      },
    },
    rateCategories: backendConfig.rateCategories ?? defaults.rateCategories,
    tripCharges: backendConfig.tripCharges ?? { standard: 0, beltway: 0 },
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

export interface StripWaxCalcResult {
  perVisit: number;
  monthly: number;
  annual: number;
  firstVisit: number;
  ongoingMonthly: number;
  contractTotal: number;
  originalContractTotal: number;
  rawPrice: number;
}

export function getStripWaxVariantConfigFromState(state: StripWaxFormState): { ratePerSqFt: number; minCharge: number } {
  if (state.serviceVariant === "standardFull") {
    return { ratePerSqFt: state.standardFullRatePerSqFt, minCharge: state.standardFullMinCharge };
  }
  if (state.serviceVariant === "noSealant") {
    return { ratePerSqFt: state.noSealantRatePerSqFt, minCharge: state.noSealantMinCharge };
  }
  return { ratePerSqFt: state.wellMaintainedRatePerSqFt, minCharge: state.wellMaintainedMinCharge };
}

export function computeStripWaxCalc(
  form: StripWaxFormState,
  activeConfig: StripWaxActiveConfig,
  customFieldsTotal: number = 0
): StripWaxCalcResult {
  const areaSqFt = Math.max(0, Number(form.floorAreaSqFt) || 0);
  if (areaSqFt === 0) {
    return {
      perVisit: 0,
      monthly: 0,
      annual: 0,
      firstVisit: 0,
      ongoingMonthly: 0,
      contractTotal: 0,
      originalContractTotal: 0,
      rawPrice: 0,
    };
  }

  const rateCfg = {
    multiplier:
      form.rateCategory === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier,
  };

  let monthlyVisits: number;
  if (
    activeConfig.frequencyMultipliers &&
    activeConfig.frequencyMultipliers[form.frequency] !== undefined
  ) {
    monthlyVisits = activeConfig.frequencyMultipliers[form.frequency];
  } else {
    const conv = cfg.billingConversions?.[form.frequency];
    monthlyVisits = conv?.monthlyMultiplier ?? 0;
  }

  const isVisitBasedFrequency =
    form.frequency === "oneTime" ||
    form.frequency === "quarterly" ||
    form.frequency === "biannual" ||
    form.frequency === "annual" ||
    form.frequency === "bimonthly" ||
    form.frequency === "everyFourWeeks";

  const getVariantConfig = (variant: StripWaxServiceVariant) => {
    if (variant === "standardFull") {
      return { ratePerSqFt: form.standardFullRatePerSqFt, minCharge: form.standardFullMinCharge };
    } else if (variant === "noSealant") {
      return { ratePerSqFt: form.noSealantRatePerSqFt, minCharge: form.noSealantMinCharge };
    } else {
      return { ratePerSqFt: form.wellMaintainedRatePerSqFt, minCharge: form.wellMaintainedMinCharge };
    }
  };

  const variantCfg = getVariantConfig(form.serviceVariant);
  const ratePerSqFt = form.ratePerSqFt > 0 ? form.ratePerSqFt : variantCfg.ratePerSqFt;
  const minCharge = form.minCharge > 0 ? form.minCharge : variantCfg.minCharge;

  const rawPriceRed = areaSqFt * ratePerSqFt;
  const perVisitRed =
    form.applyMinimum !== false ? Math.max(rawPriceRed, minCharge) : rawPriceRed;
  const perVisit = perVisitRed * rateCfg.multiplier;
  const firstVisit = perVisit;

  const minMonths = activeConfig.minContractMonths ?? 2;
  const maxMonths = activeConfig.maxContractMonths ?? 36;
  const rawMonths = Number(form.contractMonths) || minMonths;
  const contractMonths = Math.min(Math.max(rawMonths, minMonths), maxMonths);

  let monthlyPrice: number;
  let calculatedContractTotal: number;

  if (form.frequency === "oneTime") {
    monthlyPrice = perVisit;
    calculatedContractTotal = perVisit;
  } else if (isVisitBasedFrequency) {
    let visitsPerYear: number;
    if (
      activeConfig.annualFrequencies &&
      activeConfig.annualFrequencies[form.frequency] !== undefined
    ) {
      visitsPerYear = activeConfig.annualFrequencies[form.frequency];
    } else {
      const conv = cfg.billingConversions[form.frequency];
      visitsPerYear = conv.annualMultiplier;
    }
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    monthlyPrice = monthlyVisits * perVisit;
    calculatedContractTotal = totalVisits * perVisit;
  } else {
    monthlyPrice = monthlyVisits * perVisit;
    calculatedContractTotal = monthlyPrice * contractMonths;
  }

  const finalPerVisit = form.customPerVisit ?? perVisit;
  const finalMonthly = form.customMonthly ?? monthlyPrice;
  const finalOngoingMonthly = form.customOngoingMonthly ?? monthlyPrice;
  const calculatedContractTotalBeforeCustomFields =
    form.customContractTotal ?? calculatedContractTotal;
  const finalContractTotal = calculatedContractTotalBeforeCustomFields + customFieldsTotal;

  const baselineVariantRatePerSqFt =
    activeConfig.variants[form.serviceVariant]?.ratePerSqFt ??
    activeConfig.variants[activeConfig.defaultVariant]?.ratePerSqFt ??
    0;
  const baselineVariantMinCharge =
    activeConfig.variants[form.serviceVariant]?.minCharge ??
    activeConfig.variants[activeConfig.defaultVariant]?.minCharge ??
    0;
  const baselineRawPrice = areaSqFt * baselineVariantRatePerSqFt;
  const baselinePerVisit =
    form.applyMinimum !== false
      ? Math.max(baselineRawPrice, baselineVariantMinCharge)
      : baselineRawPrice;

  let originalContractTotal = 0;
  if (form.frequency === "oneTime") {
    originalContractTotal = baselinePerVisit;
  } else if (isVisitBasedFrequency) {
    let visitsPerYear: number;
    if (
      activeConfig.annualFrequencies &&
      activeConfig.annualFrequencies[form.frequency] !== undefined
    ) {
      visitsPerYear = activeConfig.annualFrequencies[form.frequency];
    } else {
      visitsPerYear = 1;
    }
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    originalContractTotal = totalVisits * baselinePerVisit;
  } else {
    originalContractTotal = monthlyVisits * baselinePerVisit * contractMonths;
  }

  return {
    perVisit: finalPerVisit,
    monthly: finalMonthly,
    annual: finalContractTotal,
    firstVisit: finalPerVisit,
    ongoingMonthly: finalOngoingMonthly,
    contractTotal: finalContractTotal,
    originalContractTotal,
    rawPrice: rawPriceRed,
  };
}
