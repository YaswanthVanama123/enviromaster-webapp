import { useCallback, useMemo } from "react";
import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  refreshPowerScrubModule,
  computeRefreshPowerScrub,
  clearAllCustomOverrides,
  AREA_KEYS,
  FALLBACK_DEFAULT_HOURLY,
  FALLBACK_DEFAULT_MIN,
  FALLBACK_FOH_RATE,
  FALLBACK_KITCHEN_LARGE,
  FALLBACK_KITCHEN_SMALL_MED,
  FALLBACK_PATIO_STANDALONE,
  FALLBACK_PATIO_UPSELL,
  FALLBACK_PER_HOUR_RATE,
  FALLBACK_SQFT_FIXED_FEE,
  FALLBACK_SQFT_INSIDE_RATE,
  FALLBACK_SQFT_OUTSIDE_RATE,
  type BackendRefreshPowerScrubConfig,
} from "../../../features/services/kinds/refreshPowerScrub";
import { addPriceChange, getFieldDisplayName, updateRefreshPowerScrubFrequency } from "../../../utils/fileLogger";

const AREA_LOG_NAMES: Record<RefreshAreaKey, string> = {
  dumpster: "Dumpster",
  patio: "Patio",
  walkway: "Walkway",
  foh: "Front of House",
  boh: "Back of House",
  other: "Other",
};

const numericAreaFields: (keyof RefreshAreaCalcState)[] = [
  "workers",
  "hours",
  "hourlyRate",
  "workerRate",
  "insideSqFt",
  "outsideSqFt",
  "insideRate",
  "outsideRate",
  "sqFtFixedFee",
  "customAmount",
  "contractMonths",
  "presetQuantity",
  "presetRate",
  "smallMediumQuantity",
  "smallMediumRate",
  "smallMediumCustomAmount",
  "largeQuantity",
  "largeRate",
  "patioAddonRate",
];

const priceFieldsForLogging: (keyof RefreshAreaCalcState)[] = [
  "hourlyRate",
  "workerRate",
  "insideRate",
  "outsideRate",
  "sqFtFixedFee",
  "customAmount",
  "presetRate",
  "smallMediumRate",
  "largeRate",
  "patioAddonRate",
];

export function useRefreshPowerScrubCalc(
  initial?: Partial<RefreshPowerScrubFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    config: backendConfig,
    isLoadingConfig,
    refreshConfig: engineRefresh,
    setContractMonths: engineSetContractMonths,
  } = useServiceCalc(refreshPowerScrubModule, initial);

  const { total: customFieldsTotal } = useCustomFieldsTotal(customFields);

  const refreshConfig = useCallback(
    (forceRefresh: boolean = true) => {
      engineRefresh(forceRefresh);
      if (forceRefresh) {
        setForm((prev) => clearAllCustomOverrides(prev));
      }
    },
    [engineRefresh, setForm]
  );

  const addServiceFieldChange = useCallback(
    (
      fieldName: string,
      originalValue: number,
      newValue: number,
      frequencyOverride?: string
    ) => {
      const appliedFrequency = frequencyOverride || form.frequency || "monthly";
      addPriceChange({
        productKey: `refreshPowerScrub_${fieldName}`,
        productName: `Refresh Power Scrub - ${getFieldDisplayName(fieldName)}`,
        productType: "service",
        fieldType: fieldName,
        fieldDisplayName: getFieldDisplayName(fieldName),
        originalValue,
        newValue,
        quantity: 1,
        frequency: appliedFrequency,
      });
    },
    [form.frequency]
  );

  const toggleAreaEnabled = (area: RefreshAreaKey, enabled: boolean) => {
    setForm((prev) => {
      const current = (prev as any)[area] as RefreshAreaCalcState;
      const updatedArea = { ...current, enabled } as RefreshAreaCalcState;
      if (enabled) {
        if (updatedArea.presetRate === null) updatedArea.presetRate = undefined;
        if (updatedArea.smallMediumRate === null) updatedArea.smallMediumRate = undefined;
        if (updatedArea.largeRate === null) updatedArea.largeRate = undefined;
        if (updatedArea.patioAddonRate === null) updatedArea.patioAddonRate = undefined;
      }
      return { ...prev, [area]: updatedArea };
    });
  };

  const getPresetBaselineForArea = (
    areaKey: RefreshAreaKey,
    state: RefreshAreaCalcState,
    config?: BackendRefreshPowerScrubConfig | null
  ): number => {
    if (areaKey === "dumpster") {
      return config?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
    }
    if (areaKey === "patio") {
      return config?.areaSpecificPricing?.patio?.standalone ?? FALLBACK_PATIO_STANDALONE;
    }
    if (areaKey === "foh") {
      return config?.areaSpecificPricing?.frontOfHouse ?? FALLBACK_FOH_RATE;
    }
    if (areaKey === "boh") {
      const kitchenSize = state.kitchenSize === "large" ? "large" : "smallMedium";
      return kitchenSize === "large"
        ? config?.areaSpecificPricing?.kitchen?.large ?? FALLBACK_KITCHEN_LARGE
        : config?.areaSpecificPricing?.kitchen?.smallMedium ?? FALLBACK_KITCHEN_SMALL_MED;
    }
    return 0;
  };

  const getAreaFieldFallback = (
    areaKey: RefreshAreaKey,
    fieldName: keyof RefreshAreaCalcState,
    state: RefreshAreaCalcState
  ): number => {
    switch (fieldName) {
      case "hourlyRate":
        return backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;
      case "workerRate":
        return (
          backendConfig?.coreRates?.perWorkerRate ??
          backendConfig?.coreRates?.defaultHourlyRate ??
          FALLBACK_DEFAULT_HOURLY
        );
      case "insideRate":
        return backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
      case "outsideRate":
        return backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
      case "sqFtFixedFee":
        return backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE;
      case "patioAddonRate":
        return backendConfig?.areaSpecificPricing?.patio?.upsell ?? FALLBACK_PATIO_UPSELL;
      case "smallMediumRate":
        return (
          backendConfig?.areaSpecificPricing?.kitchen?.smallMedium ?? FALLBACK_KITCHEN_SMALL_MED
        );
      case "largeRate":
        return backendConfig?.areaSpecificPricing?.kitchen?.large ?? FALLBACK_KITCHEN_LARGE;
      case "customAmount":
        return 0;
      case "presetRate":
        return getPresetBaselineForArea(areaKey, state, backendConfig);
      default:
        return 0;
    }
  };

  const setAreaField = (
    area: RefreshAreaKey,
    field: keyof RefreshAreaCalcState,
    raw: string
  ) => {
    setForm((prev) => {
      const current = prev[area];
      let value: any = raw;
      let originalValue: any = current[field];

      if (numericAreaFields.includes(field)) {
        if (raw === "" || raw === null) {
          value = null;
        } else if (raw === undefined) {
          value = undefined;
        } else {
          const n = parseFloat(raw);
          value = Number.isFinite(n) ? n : null;
        }
        originalValue = typeof originalValue === "number" ? originalValue : 0;

        if (
          value !== undefined &&
          value !== null &&
          value !== originalValue &&
          value > 0 &&
          priceFieldsForLogging.includes(field)
        ) {
          const areaName =
            area === "boh"
              ? "Back of House"
              : area === "foh"
              ? "Front of House"
              : area.charAt(0).toUpperCase() + area.slice(1);
          const isPresetField = field === "presetRate";
          const logOriginalValue = isPresetField
            ? getPresetBaselineForArea(area, current, backendConfig)
            : getAreaFieldFallback(area, field, current);
          const areaFieldKey = `${areaName}_${field}`;
          const areaFrequency = current.frequencyLabel || form.frequency || "monthly";
          addServiceFieldChange(areaFieldKey, logOriginalValue, value, areaFrequency);
        }
      }

      const updatedArea = { ...current, [field]: value };
      const hasValidNumber = (val: number | null | undefined) =>
        val !== null && val !== undefined;
      const changedNumber = hasValidNumber(value) && value !== originalValue;

      if (field === "workerRate") updatedArea.workerRateIsCustom = changedNumber;
      if (field === "hourlyRate") updatedArea.hourlyRateIsCustom = changedNumber;
      if (field === "insideRate") updatedArea.insideRateIsCustom = changedNumber;
      if (field === "outsideRate") updatedArea.outsideRateIsCustom = changedNumber;
      if (field === "sqFtFixedFee") updatedArea.sqFtFixedFeeIsCustom = changedNumber;
      if (field === "presetRate") {
        updatedArea.presetRateIsCustom = hasValidNumber(value) && value !== originalValue;
      }
      if (field === "smallMediumRate") updatedArea.smallMediumRateIsCustom = changedNumber;
      if (field === "largeRate") updatedArea.largeRateIsCustom = changedNumber;

      if (field === "kitchenSize") {
        updatedArea.customAmount = 0;
        updatedArea.presetQuantity = 1;
        updatedArea.presetRate = undefined;
      }

      if (field === "pricingType") {
        updatedArea.customAmount = 0;
        updatedArea.presetQuantity = 1;
        updatedArea.presetRate = undefined;
        updatedArea.workers = 2;
        updatedArea.workerRate =
          backendConfig?.coreRates?.perWorkerRate ??
          backendConfig?.coreRates?.defaultHourlyRate ??
          FALLBACK_DEFAULT_HOURLY;
        updatedArea.hours = 0;
        updatedArea.hourlyRate = backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;
        updatedArea.insideSqFt = 0;
        updatedArea.outsideSqFt = 0;
        updatedArea.insideRate =
          backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
        updatedArea.outsideRate =
          backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
        updatedArea.sqFtFixedFee =
          backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE;
      }

      if (field === "frequencyLabel") {
        const areaLogLabel = AREA_LOG_NAMES[area];
        const normalizedFrequency = value || form.frequency || "monthly";
        updateRefreshPowerScrubFrequency(areaLogLabel, normalizedFrequency);
      }

      return { ...prev, [area]: updatedArea };
    });
  };

  const setHourlyRate = (raw: string) => {
    const n = parseFloat(raw);
    const newValue = Number.isFinite(n) ? n : 0;
    const originalValue = form.hourlyRate;
    const baselineHourlyRate =
      backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY;
    const hasOverride = newValue !== baselineHourlyRate;
    setForm((prev) => ({ ...prev, hourlyRate: newValue, hourlyRateIsCustom: hasOverride }));
    if (newValue !== originalValue && newValue > 0) {
      addServiceFieldChange("global_hourlyRate", originalValue, newValue);
    }
  };

  const setMinimumVisit = (raw: string) => {
    const n = parseFloat(raw);
    const newValue = Number.isFinite(n) ? n : 0;
    const originalValue = form.minimumVisit;
    const baselineMinimum = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
    const hasOverride = newValue !== baselineMinimum;
    setForm((prev) => ({ ...prev, minimumVisit: newValue, minimumVisitIsCustom: hasOverride }));
    if (newValue !== originalValue && newValue > 0) {
      addServiceFieldChange("global_minimumVisit", originalValue, newValue);
    }
  };

  const setFrequency = (frequency: string) => {
    setForm((prev) => ({ ...prev, frequency: frequency as any }));
  };

  const setContractMonths = (months: number) => {
    engineSetContractMonths(months);
    setForm((prev) => {
      const updatedAreas: any = {};
      for (const area of AREA_KEYS) {
        updatedAreas[area] = { ...prev[area], contractMonths: months };
      }
      return { ...prev, contractMonths: months, ...updatedAreas };
    });
  };

  const setNotes = (notes: string) => {
    setForm((prev) => ({ ...prev, notes }));
  };

  const setApplyMinimum = (value: boolean) => {
    setForm((prev) => ({ ...prev, applyMinimum: value }));
  };

  const computed = useMemo(
    () => computeRefreshPowerScrub(form, backendConfig, customFieldsTotal),
    [form, backendConfig, customFieldsTotal]
  );

  const quote: ServiceQuoteResult = useMemo(
    () =>
      ({
        serviceId: "refreshPowerScrub",
        displayName: "Refresh Power Scrub",
        perVisitPrice: computed.perVisitPrice,
        annualPrice: computed.contractTotalWithCustomFields,
        detailsBreakdown: computed.detailsBreakdown,
        monthlyRecurring: computed.monthlyRecurring,
        contractTotal: computed.contractTotalWithCustomFields,
      } as unknown as ServiceQuoteResult),
    [computed]
  );

  return {
    form,
    setForm,
    setHourlyRate,
    setMinimumVisit,
    setFrequency,
    setContractMonths,
    setNotes,
    setApplyMinimum,
    toggleAreaEnabled,
    setAreaField,
    areaTotals: computed.areaTotals,
    areaMonthlyTotals: computed.areaMonthlyTotals,
    areaContractTotals: computed.areaContractTotals,
    quote,
    originalContractTotal: computed.originalContractTotal,
    refreshConfig,
    isLoadingConfig,
    backendConfig,
  };
}
