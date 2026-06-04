import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshAreaTotals,
  RefreshPowerScrubFormState,
} from "../../../../components/services/refreshPowerScrub/refreshPowerScrubTypes";

export const FALLBACK_DEFAULT_HOURLY = 200;
export const FALLBACK_DEFAULT_MIN = 475;
export const FALLBACK_DEFAULT_TRIP = 75;
export const FALLBACK_FOH_RATE = 2500;
export const FALLBACK_KITCHEN_LARGE = 2500;
export const FALLBACK_KITCHEN_SMALL_MED = 1500;
export const FALLBACK_PATIO_STANDALONE = 800;
export const FALLBACK_PATIO_UPSELL = 500;
export const FALLBACK_SQFT_FIXED_FEE = 200;
export const FALLBACK_SQFT_INSIDE_RATE = 0.6;
export const FALLBACK_SQFT_OUTSIDE_RATE = 0.4;
export const FALLBACK_PER_HOUR_RATE = 400;

export interface BackendRefreshPowerScrubConfig {
  coreRates: {
    defaultHourlyRate: number;
    perWorkerRate: number;
    perHourRate: number;
    tripCharge: number;
    minimumVisit: number;
  };
  areaSpecificPricing: {
    kitchen: { smallMedium: number; large: number };
    frontOfHouse: number;
    patio: { standalone: number; upsell: number };
  };
  squareFootagePricing: {
    fixedFee: number;
    insideRate: number;
    outsideRate: number;
  };
  billingConversions: {
    weekly: { monthlyMultiplier: number; annualMultiplier: number; description: string };
    biweekly: { monthlyMultiplier: number; annualMultiplier: number; description: string };
    monthly: { monthlyMultiplier: number; annualMultiplier: number; description: string };
    bimonthly: { monthlyMultiplier: number; annualMultiplier: number; description: string };
    quarterly: { monthlyMultiplier: number; annualMultiplier: number; description: string };
  };
  frequencyOptions: string[];
  areaTypes: string[];
  pricingTypes: string[];
  frequencyMetadata: {
    weekly: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly: { cycleMonths: number };
    bimonthly: { cycleMonths: number };
    quarterly: { cycleMonths: number };
    biannual: { cycleMonths: number };
    annual: { cycleMonths: number };
  };
}

export const AREA_KEYS: RefreshAreaKey[] = [
  "dumpster",
  "patio",
  "walkway",
  "foh",
  "boh",
  "other",
];

export function transformBackendFrequencyMeta(
  backendMeta: BackendRefreshPowerScrubConfig["frequencyMetadata"] | undefined
) {
  if (!backendMeta) return null;
  const transformedBilling: any = {};
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
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      transformedBilling[freq] = {
        monthlyMultiplier: 1 / cycleMonths,
        annualMultiplier: 12 / cycleMonths,
      };
    }
  }
  return transformedBilling;
}

export function getBillingMultiplier(
  frequency: string,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  let normalizedFrequency = frequency.toLowerCase().replace("-", "").replace(/\s+/g, "");
  if (
    normalizedFrequency.includes("2×") ||
    normalizedFrequency.includes("2x") ||
    normalizedFrequency === "2/month"
  ) {
    normalizedFrequency = "twicepermonth";
  }
  if (normalizedFrequency === "every4weeks") {
    normalizedFrequency = "everyfourweeks";
  }
  const defaultMultipliers: Record<string, number> = {
    onetime: 0,
    weekly: 4.33,
    biweekly: 2.165,
    twicepermonth: 2.0,
    monthly: 1.0,
    everyfourweeks: 1.0833,
    bimonthly: 0.5,
    quarterly: 0.333,
    biannual: 0.167,
    annual: 0.083,
  };

  if (backendConfig?.billingConversions) {
    const conversions = backendConfig.billingConversions as any;
    switch (normalizedFrequency) {
      case "weekly":
        return conversions.weekly?.monthlyMultiplier ?? defaultMultipliers.weekly;
      case "biweekly":
        return conversions.biweekly?.monthlyMultiplier ?? defaultMultipliers.biweekly;
      case "twicepermonth":
        return defaultMultipliers.twicepermonth;
      case "monthly":
        return conversions.monthly?.monthlyMultiplier ?? defaultMultipliers.monthly;
      case "everyfourweeks":
        return defaultMultipliers.everyfourweeks;
      case "bimonthly":
        return conversions.bimonthly?.monthlyMultiplier ?? defaultMultipliers.bimonthly;
      case "quarterly":
        return conversions.quarterly?.monthlyMultiplier ?? defaultMultipliers.quarterly;
    }
  }

  const transformedMeta = transformBackendFrequencyMeta(backendConfig?.frequencyMetadata);
  if (transformedMeta && transformedMeta[normalizedFrequency]) {
    return transformedMeta[normalizedFrequency].monthlyMultiplier;
  }
  return defaultMultipliers[normalizedFrequency] ?? 1.0;
}

export function createDefaultArea(
  backendConfig?: BackendRefreshPowerScrubConfig | null
): RefreshAreaCalcState {
  return {
    enabled: false,
    pricingType: "preset",
    workers: 2,
    hours: 0,
    hourlyRate: backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE,
    workerRate:
      backendConfig?.coreRates?.perWorkerRate ??
      backendConfig?.coreRates?.defaultHourlyRate ??
      FALLBACK_DEFAULT_HOURLY,
    insideSqFt: 0,
    outsideSqFt: 0,
    insideRate: backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE,
    outsideRate: backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE,
    sqFtFixedFee: backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE,
    workerRateIsCustom: false,
    hourlyRateIsCustom: false,
    insideRateIsCustom: false,
    outsideRateIsCustom: false,
    sqFtFixedFeeIsCustom: false,
    presetRateIsCustom: false,
    smallMediumRateIsCustom: false,
    largeRateIsCustom: false,
    customAmount: 0,
    presetQuantity: 1,
    presetRate: undefined,
    kitchenSize: "smallMedium",
    smallMediumQuantity: 0,
    smallMediumRate: undefined,
    smallMediumCustomAmount: 0,
    largeQuantity: 0,
    largeRate: undefined,
    largeCustomAmount: 0,
    patioMode: "standalone",
    includePatioAddon: false,
    patioAddonRate: undefined,
    frequencyLabel: "",
    contractMonths: 12,
  };
}

export const DEFAULT_AREA: RefreshAreaCalcState = {
  enabled: false,
  pricingType: "preset",
  workers: 2,
  hours: 0,
  hourlyRate: FALLBACK_PER_HOUR_RATE,
  workerRate: FALLBACK_DEFAULT_HOURLY,
  insideSqFt: 0,
  outsideSqFt: 0,
  insideRate: FALLBACK_SQFT_INSIDE_RATE,
  outsideRate: FALLBACK_SQFT_OUTSIDE_RATE,
  sqFtFixedFee: FALLBACK_SQFT_FIXED_FEE,
  workerRateIsCustom: false,
  hourlyRateIsCustom: false,
  insideRateIsCustom: false,
  outsideRateIsCustom: false,
  sqFtFixedFeeIsCustom: false,
  presetRateIsCustom: false,
  smallMediumRateIsCustom: false,
  largeRateIsCustom: false,
  customAmount: 0,
  presetQuantity: 1,
  presetRate: undefined,
  kitchenSize: "smallMedium",
  smallMediumQuantity: 0,
  smallMediumRate: undefined,
  smallMediumCustomAmount: 0,
  largeQuantity: 0,
  largeRate: undefined,
  largeCustomAmount: 0,
  patioMode: "standalone",
  includePatioAddon: false,
  patioAddonRate: undefined,
  frequencyLabel: "",
  contractMonths: 12,
};

export const resetAreaCustoms = (area: RefreshAreaCalcState): RefreshAreaCalcState => ({
  ...area,
  customAmount: 0,
  smallMediumCustomAmount: 0,
  largeCustomAmount: 0,
  patioAddonRate: undefined,
  workerRateIsCustom: false,
  hourlyRateIsCustom: false,
  insideRateIsCustom: false,
  outsideRateIsCustom: false,
  sqFtFixedFeeIsCustom: false,
  presetRateIsCustom: false,
  smallMediumRateIsCustom: false,
  largeRateIsCustom: false,
});

export const clearAllCustomOverrides = (
  state: RefreshPowerScrubFormState
): RefreshPowerScrubFormState => ({
  ...state,
  hourlyRateIsCustom: false,
  minimumVisitIsCustom: false,
  dumpster: resetAreaCustoms(state.dumpster),
  patio: resetAreaCustoms(state.patio),
  walkway: resetAreaCustoms(state.walkway),
  foh: resetAreaCustoms(state.foh),
  boh: resetAreaCustoms(state.boh),
  other: resetAreaCustoms(state.other),
});

function calcPerWorker(
  state: RefreshAreaCalcState,
  formGlobalRate: number,
  formMinimumVisit: number,
  backendConfig?: BackendRefreshPowerScrubConfig | null,
  applyMinimum: boolean = true
): number {
  const perWorkerRate =
    state.workerRate > 0
      ? state.workerRate
      : formGlobalRate > 0
      ? formGlobalRate
      : backendConfig?.coreRates?.perWorkerRate ??
        backendConfig?.coreRates?.defaultHourlyRate ??
        FALLBACK_DEFAULT_HOURLY;
  const minimumVisit =
    formMinimumVisit > 0
      ? formMinimumVisit
      : backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
  const calculatedAmount = (state.workers || 0) * perWorkerRate;
  return state.workers > 0
    ? applyMinimum
      ? Math.max(calculatedAmount, minimumVisit)
      : calculatedAmount
    : 0;
}

function calcPerHour(
  state: RefreshAreaCalcState,
  formGlobalRate: number,
  formMinimumVisit: number,
  backendConfig?: BackendRefreshPowerScrubConfig | null,
  applyMinimum: boolean = true
): number {
  const perHourRate =
    state.hourlyRate > 0
      ? state.hourlyRate
      : formGlobalRate > 0
      ? formGlobalRate
      : backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;
  const minimumVisit =
    formMinimumVisit > 0
      ? formMinimumVisit
      : backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
  const calculatedAmount = (state.hours || 0) * perHourRate;
  return state.hours > 0
    ? applyMinimum
      ? Math.max(calculatedAmount, minimumVisit)
      : calculatedAmount
    : 0;
}

function calcSquareFootage(
  state: RefreshAreaCalcState,
  formMinimumVisit: number,
  backendConfig?: BackendRefreshPowerScrubConfig | null,
  applyMinimum: boolean = true
): number {
  const fixedFee =
    state.sqFtFixedFee !== undefined && state.sqFtFixedFee !== null
      ? state.sqFtFixedFee
      : backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE;
  const insideRate =
    state.insideRate > 0
      ? state.insideRate
      : backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
  const outsideRate =
    state.outsideRate > 0
      ? state.outsideRate
      : backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
  const minimumVisit =
    formMinimumVisit > 0
      ? formMinimumVisit
      : backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
  const insideCost = (state.insideSqFt || 0) * insideRate;
  const outsideCost = (state.outsideSqFt || 0) * outsideRate;
  const calculatedAmount = fixedFee + insideCost + outsideCost;
  const hasAnyValue =
    (state.insideSqFt || 0) > 0 || (state.outsideSqFt || 0) > 0 || fixedFee > 0;
  return hasAnyValue
    ? applyMinimum
      ? Math.max(calculatedAmount, minimumVisit)
      : calculatedAmount
    : 0;
}

function calcPresetPackage(
  area: RefreshAreaKey,
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  const defaultConfig = {
    coreRates: {
      defaultHourlyRate: FALLBACK_DEFAULT_HOURLY,
      perWorkerRate: FALLBACK_DEFAULT_HOURLY,
      perHourRate: FALLBACK_PER_HOUR_RATE,
      tripCharge: FALLBACK_DEFAULT_TRIP,
      minimumVisit: FALLBACK_DEFAULT_MIN,
    },
    areaSpecificPricing: {
      kitchen: {
        smallMedium: FALLBACK_KITCHEN_SMALL_MED,
        large: FALLBACK_KITCHEN_LARGE,
      },
      frontOfHouse: FALLBACK_FOH_RATE,
      patio: { standalone: FALLBACK_PATIO_STANDALONE, upsell: FALLBACK_PATIO_UPSELL },
    },
    squareFootagePricing: {
      fixedFee: FALLBACK_SQFT_FIXED_FEE,
      insideRate: FALLBACK_SQFT_INSIDE_RATE,
      outsideRate: FALLBACK_SQFT_OUTSIDE_RATE,
    },
  };

  const config = {
    coreRates: { ...defaultConfig.coreRates, ...(backendConfig?.coreRates || {}) },
    areaSpecificPricing: {
      kitchen: {
        ...defaultConfig.areaSpecificPricing.kitchen,
        ...(backendConfig?.areaSpecificPricing?.kitchen || {}),
      },
      frontOfHouse:
        backendConfig?.areaSpecificPricing?.frontOfHouse ??
        defaultConfig.areaSpecificPricing.frontOfHouse,
      patio: {
        ...defaultConfig.areaSpecificPricing.patio,
        ...(backendConfig?.areaSpecificPricing?.patio || {}),
      },
    },
    squareFootagePricing: {
      ...defaultConfig.squareFootagePricing,
      ...(backendConfig?.squareFootagePricing || {}),
    },
  };

  let defaultRate: number;

  switch (area) {
    case "dumpster":
      defaultRate = config.coreRates.minimumVisit;
      break;
    case "patio":
      defaultRate = config.areaSpecificPricing.patio.standalone;
      break;
    case "foh":
      defaultRate = config.areaSpecificPricing.frontOfHouse;
      break;
    case "boh": {
      const smallMediumQty = state.smallMediumQuantity || 0;
      const smallMediumRate =
        state.smallMediumRate === null
          ? 0
          : state.smallMediumRate ?? config.areaSpecificPricing.kitchen.smallMedium;
      const smallMediumTotal =
        state.smallMediumCustomAmount > 0
          ? state.smallMediumCustomAmount
          : smallMediumQty * smallMediumRate;
      const largeQty = state.largeQuantity || 0;
      const largeRate =
        state.largeRate === null
          ? 0
          : state.largeRate ?? config.areaSpecificPricing.kitchen.large;
      const largeTotal =
        state.largeCustomAmount > 0 ? state.largeCustomAmount : largeQty * largeRate;
      return smallMediumTotal + largeTotal;
    }
    case "walkway":
    case "other":
    default:
      defaultRate = 0;
      break;
  }

  const quantity = state.presetQuantity && state.presetQuantity > 0 ? state.presetQuantity : 1;
  const rate = state.presetRate === null ? 0 : state.presetRate ?? defaultRate;
  let baseAmount = quantity * rate;

  if (area === "patio" && state.includePatioAddon) {
    const addonRate =
      state.patioAddonRate === null
        ? 0
        : state.patioAddonRate ?? config.areaSpecificPricing.patio.upsell;
    baseAmount += addonRate;
  }
  return baseAmount;
}

function calcBaselinePresetPackage(
  area: RefreshAreaKey,
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  const config = {
    coreRates: {
      minimumVisit: backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN,
    },
    areaSpecificPricing: {
      kitchen: {
        smallMedium:
          backendConfig?.areaSpecificPricing?.kitchen?.smallMedium ?? FALLBACK_KITCHEN_SMALL_MED,
        large: backendConfig?.areaSpecificPricing?.kitchen?.large ?? FALLBACK_KITCHEN_LARGE,
      },
      frontOfHouse: backendConfig?.areaSpecificPricing?.frontOfHouse ?? FALLBACK_FOH_RATE,
      patio: {
        standalone:
          backendConfig?.areaSpecificPricing?.patio?.standalone ?? FALLBACK_PATIO_STANDALONE,
        upsell: backendConfig?.areaSpecificPricing?.patio?.upsell ?? FALLBACK_PATIO_UPSELL,
      },
    },
  };

  let defaultRate: number;

  switch (area) {
    case "dumpster":
      defaultRate = config.coreRates.minimumVisit;
      break;
    case "patio":
      defaultRate = config.areaSpecificPricing.patio.standalone;
      break;
    case "foh":
      defaultRate = config.areaSpecificPricing.frontOfHouse;
      break;
    case "boh": {
      const smallMediumQty = state.smallMediumQuantity || 0;
      const baseSmRate = config.areaSpecificPricing.kitchen.smallMedium;
      const smallMediumTotal =
        state.smallMediumCustomAmount > 0
          ? state.smallMediumCustomAmount
          : smallMediumQty * baseSmRate;
      const largeQty = state.largeQuantity || 0;
      const baseLgRate = config.areaSpecificPricing.kitchen.large;
      const largeTotal =
        state.largeCustomAmount > 0 ? state.largeCustomAmount : largeQty * baseLgRate;
      return smallMediumTotal + largeTotal;
    }
    case "walkway":
    case "other":
    default:
      defaultRate = 0;
      break;
  }

  const quantity = state.presetQuantity && state.presetQuantity > 0 ? state.presetQuantity : 1;
  let baseAmount = quantity * defaultRate;
  if (area === "patio" && state.includePatioAddon) {
    baseAmount += config.areaSpecificPricing.patio.upsell;
  }
  return baseAmount;
}

export function calcAreaCost(
  area: RefreshAreaKey,
  form: RefreshPowerScrubFormState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): { cost: number; isPackage: boolean } {
  const state = form[area];
  if (!state.enabled) return { cost: 0, isPackage: false };
  if (state.customAmount && state.customAmount > 0) {
    return { cost: state.customAmount, isPackage: true };
  }
  switch (state.pricingType) {
    case "preset":
      return { cost: calcPresetPackage(area, state, backendConfig), isPackage: true };
    case "perWorker":
      return {
        cost: calcPerWorker(
          state,
          form.hourlyRate,
          form.minimumVisit,
          backendConfig,
          form.applyMinimum !== false
        ),
        isPackage: false,
      };
    case "perHour":
      return {
        cost: calcPerHour(
          state,
          form.hourlyRate,
          form.minimumVisit,
          backendConfig,
          form.applyMinimum !== false
        ),
        isPackage: false,
      };
    case "squareFeet":
      return {
        cost: calcSquareFootage(
          state,
          form.minimumVisit,
          backendConfig,
          form.applyMinimum !== false
        ),
        isPackage: false,
      };
    case "custom":
      return { cost: state.customAmount || 0, isPackage: true };
    default:
      return { cost: 0, isPackage: false };
  }
}

export function calcBaselineAreaCost(
  area: RefreshAreaKey,
  form: RefreshPowerScrubFormState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  const state = form[area];
  if (!state.enabled) return 0;
  const baselinePerHourRate = backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;
  const baselinePerWorkerRate =
    backendConfig?.coreRates?.perWorkerRate ??
    backendConfig?.coreRates?.defaultHourlyRate ??
    FALLBACK_DEFAULT_HOURLY;
  const baselineMinimumVisit = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
  const applyMinimum = form.applyMinimum !== false;

  if (state.customAmount && state.customAmount > 0) {
    return state.customAmount;
  }

  switch (state.pricingType) {
    case "preset":
      return calcBaselinePresetPackage(area, state, backendConfig);
    case "perWorker": {
      const calculatedAmount = (state.workers || 0) * baselinePerWorkerRate;
      return state.workers > 0
        ? applyMinimum
          ? Math.max(calculatedAmount, baselineMinimumVisit)
          : calculatedAmount
        : 0;
    }
    case "perHour": {
      const calculatedAmount = (state.hours || 0) * baselinePerHourRate;
      return state.hours > 0
        ? applyMinimum
          ? Math.max(calculatedAmount, baselineMinimumVisit)
          : calculatedAmount
        : 0;
    }
    case "squareFeet": {
      const fixedFee = backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE;
      const insideRate =
        backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
      const outsideRate =
        backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
      const insideCost = (state.insideSqFt || 0) * insideRate;
      const outsideCost = (state.outsideSqFt || 0) * outsideRate;
      const calculatedAmount = fixedFee + insideCost + outsideCost;
      const hasAnyValue =
        (state.insideSqFt || 0) > 0 || (state.outsideSqFt || 0) > 0 || fixedFee > 0;
      return hasAnyValue
        ? applyMinimum
          ? Math.max(calculatedAmount, baselineMinimumVisit)
          : calculatedAmount
        : 0;
    }
    case "custom":
      return state.customAmount || 0;
    default:
      return 0;
  }
}

export interface RefreshPowerScrubComputeResult {
  areaTotals: RefreshAreaTotals;
  areaMonthlyTotals: RefreshAreaTotals;
  areaContractTotals: RefreshAreaTotals;
  hasPackagePrice: boolean;
  baselineAreaTotals: RefreshAreaTotals;
  baselineAreaContractTotals: RefreshAreaTotals;
  perVisitPrice: number;
  monthlyRecurring: number;
  contractTotal: number;
  contractTotalWithCustomFields: number;
  originalContractTotal: number;
  detailsBreakdown: string[];
}

export function computeRefreshPowerScrub(
  form: RefreshPowerScrubFormState,
  backendConfig: BackendRefreshPowerScrubConfig | null,
  customFieldsTotal: number = 0
): RefreshPowerScrubComputeResult {
  const totals: any = {};
  const monthlyTotals: any = {};
  const contractTotals: any = {};
  let hasPackage = false;

  for (const area of AREA_KEYS) {
    const { cost, isPackage } = calcAreaCost(area, form, backendConfig);
    totals[area] = cost;

    const areaFrequencyLabel = form[area].frequencyLabel?.toLowerCase();
    const effectiveFrequency = areaFrequencyLabel || form.frequency.toLowerCase();
    const multiplier = getBillingMultiplier(effectiveFrequency, backendConfig);
    const monthlyRecurring = cost * multiplier;
    monthlyTotals[area] = monthlyRecurring;

    if (effectiveFrequency === "quarterly") {
      const quarterlyVisits = (form.contractMonths || 12) / 3;
      contractTotals[area] = cost * quarterlyVisits;
    } else if (effectiveFrequency === "bi-annual" || effectiveFrequency === "biannual") {
      const biannualVisits = (form.contractMonths || 12) / 6;
      contractTotals[area] = cost * biannualVisits;
    } else if (effectiveFrequency === "annual") {
      const annualVisits = (form.contractMonths || 12) / 12;
      contractTotals[area] = cost * annualVisits;
    } else if (
      effectiveFrequency === "every 4 weeks" ||
      effectiveFrequency === "everyfourweeks"
    ) {
      const totalVisits = Math.round((form.contractMonths || 12) * 1.0833);
      contractTotals[area] = cost * totalVisits;
    } else {
      contractTotals[area] = monthlyRecurring * (form.contractMonths || 12);
    }

    if (isPackage && cost > 0) {
      hasPackage = true;
    }
  }

  const areaTotals = totals as RefreshAreaTotals;
  const areaMonthlyTotals = monthlyTotals as RefreshAreaTotals;
  const areaContractTotals = contractTotals as RefreshAreaTotals;

  const areasSubtotal = AREA_KEYS.reduce((sum, area) => sum + areaTotals[area], 0);
  const calculatedPerVisit =
    areasSubtotal > 0
      ? form.applyMinimum !== false
        ? Math.max(areasSubtotal, form.minimumVisit)
        : areasSubtotal
      : 0;
  const rounded = Math.round(calculatedPerVisit * 100) / 100;

  const frequencyMultiplier = getBillingMultiplier(form.frequency, backendConfig);
  const monthlyRecurring = rounded * frequencyMultiplier;

  let contractTotal: number;
  if (form.frequency === "quarterly") {
    const quarterlyVisits = (form.contractMonths || 12) / 3;
    contractTotal = rounded * quarterlyVisits;
  } else if (form.frequency === "biannual") {
    const biannualVisits = (form.contractMonths || 12) / 6;
    contractTotal = rounded * biannualVisits;
  } else if (form.frequency === "annual") {
    const annualVisits = (form.contractMonths || 12) / 12;
    contractTotal = rounded * annualVisits;
  } else if (form.frequency === "everyFourWeeks") {
    const totalVisits = Math.round((form.contractMonths || 12) * 1.0833);
    contractTotal = rounded * totalVisits;
  } else {
    contractTotal = monthlyRecurring * (form.contractMonths || 12);
  }

  const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

  const details: string[] = [];
  AREA_KEYS.forEach((area) => {
    const amount = areaTotals[area];
    if (amount <= 0) return;
    const state = form[area];
    const prettyArea =
      area === "boh"
        ? "Back of House"
        : area === "foh"
        ? "Front of House"
        : area[0].toUpperCase() + area.slice(1);
    const method =
      state.pricingType === "preset"
        ? "preset package"
        : state.pricingType === "perWorker"
        ? "per worker"
        : state.pricingType === "perHour"
        ? "per hour"
        : state.pricingType === "squareFeet"
        ? "sq-ft rule"
        : "custom amount";
    details.push(`${prettyArea}: $${amount.toFixed(2)} (${method})`);
  });

  const bAreaTotals: any = {};
  const bAreaContractTotals: any = {};

  for (const area of AREA_KEYS) {
    const baselineCost = calcBaselineAreaCost(area, form, backendConfig);
    bAreaTotals[area] = baselineCost;
    const areaFrequencyLabel = form[area].frequencyLabel?.toLowerCase();
    const effectiveFrequency = areaFrequencyLabel || form.frequency.toLowerCase();
    const multiplier = getBillingMultiplier(effectiveFrequency, backendConfig);
    const monthlyRecurringBaseline = baselineCost * multiplier;
    if (effectiveFrequency === "quarterly") {
      bAreaContractTotals[area] = baselineCost * ((form.contractMonths || 12) / 3);
    } else if (effectiveFrequency === "bi-annual" || effectiveFrequency === "biannual") {
      bAreaContractTotals[area] = baselineCost * ((form.contractMonths || 12) / 6);
    } else if (effectiveFrequency === "annual") {
      bAreaContractTotals[area] = baselineCost * ((form.contractMonths || 12) / 12);
    } else if (
      effectiveFrequency === "every 4 weeks" ||
      effectiveFrequency === "everyfourweeks"
    ) {
      bAreaContractTotals[area] =
        baselineCost * Math.round((form.contractMonths || 12) * 1.0833);
    } else {
      bAreaContractTotals[area] = monthlyRecurringBaseline * (form.contractMonths || 12);
    }
  }

  const isOneTimeLabel = (label?: string) => {
    if (!label) return false;
    const normalized = label.toLowerCase().replace(/-/g, " ").trim();
    return normalized === "one time" || normalized === "one time service";
  };

  let baselineTotalServiceCost = 0;
  for (const area of AREA_KEYS) {
    const areaFreqLabel = form[area].frequencyLabel || form.frequency;
    const isOneTime = isOneTimeLabel(areaFreqLabel);
    baselineTotalServiceCost += isOneTime
      ? bAreaTotals[area] || 0
      : bAreaContractTotals[area] || 0;
  }

  const finalOriginalContractTotal = baselineTotalServiceCost + customFieldsTotal;

  return {
    areaTotals,
    areaMonthlyTotals,
    areaContractTotals,
    hasPackagePrice: hasPackage,
    baselineAreaTotals: bAreaTotals as RefreshAreaTotals,
    baselineAreaContractTotals: bAreaContractTotals as RefreshAreaTotals,
    perVisitPrice: rounded,
    monthlyRecurring,
    contractTotal,
    contractTotalWithCustomFields,
    originalContractTotal: finalOriginalContractTotal,
    detailsBreakdown: details,
  };
}
