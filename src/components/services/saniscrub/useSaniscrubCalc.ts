import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  saniscrubModule,
  computeSaniscrubCalc,
  clampSaniscrubFrequency,
  clampSaniscrubContractMonths,
  type SaniscrubActiveConfig,
} from "../../../features/services/kinds/saniscrub";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import type { SaniscrubFormState } from "./saniscrubTypes";

const BASE_RATE_FIELDS = [
  "fixtureRateMonthly",
  "fixtureRateBimonthly",
  "fixtureRateQuarterly",
  "minimumMonthly",
  "minimumBimonthly",
  "nonBathroomFirstUnitRate",
  "nonBathroomAdditionalUnitRate",
  "installMultiplierDirty",
  "installMultiplierClean",
  "twoTimesPerMonthDiscount",
] as const;

const CUSTOM_OVERRIDE_FIELDS = [
  "customInstallationFee",
  "customPerVisitPrice",
  "customMonthlyRecurring",
  "customFirstMonthPrice",
  "customContractTotal",
] as const;

const QTY_TOGGLE_FIELDS = [
  "fixtureCount",
  "nonBathroomSqFt",
  "frequency",
  "hasSaniClean",
  "includeInstall",
  "isDirtyInstall",
  "contractMonths",
  "useExactNonBathroomSqft",
] as const;

const ALL_PRICING_FIELDS = new Set<string>([
  ...(BASE_RATE_FIELDS as readonly string[]),
  ...(CUSTOM_OVERRIDE_FIELDS as readonly string[]),
]);

const CUSTOM_TO_BASE_FOR_BASELINE: Record<string, string> = {
  customInstallationFee: "installMultiplierDirty",
  customPerVisitPrice: "minimumMonthly",
  customMonthlyRecurring: "minimumMonthly",
  customFirstMonthPrice: "minimumMonthly",
  customContractTotal: "minimumMonthly",
};

export function useSaniscrubCalc(
  initial?: Partial<SaniscrubFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    config: activeConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(saniscrubModule, initial);

  const ctx = useServicesContextOptional();
  const baselineInitialized = useRef(false);
  const baselineValues = useRef<Record<string, number>>({});

  useEffect(() => {
    if (baselineInitialized.current) return;
    const backendData = ctx?.getBackendPricingForService?.("saniscrub");
    if (!backendData?.config) return;
    baselineInitialized.current = true;
    const built: SaniscrubActiveConfig = activeConfig;
    baselineValues.current = {
      fixtureRateMonthly: initial?.fixtureRateMonthly ?? built.fixtureRates.monthly,
      fixtureRateBimonthly: initial?.fixtureRateBimonthly ?? built.fixtureRates.bimonthly,
      fixtureRateQuarterly: initial?.fixtureRateQuarterly ?? built.fixtureRates.quarterly,
      minimumMonthly: initial?.minimumMonthly ?? built.minimums.monthly,
      minimumBimonthly: initial?.minimumBimonthly ?? built.minimums.bimonthly,
      nonBathroomFirstUnitRate: initial?.nonBathroomFirstUnitRate ?? built.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: initial?.nonBathroomAdditionalUnitRate ?? built.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: initial?.installMultiplierDirty ?? built.installMultipliers.dirty,
      installMultiplierClean: initial?.installMultiplierClean ?? built.installMultipliers.clean,
      twoTimesPerMonthDiscount: initial?.twoTimesPerMonthDiscount ?? built.twoTimesPerMonthDiscountFlat,
    };
  }, [ctx?.backendPricingData, initial, activeConfig]);

  const pricingOverrides = useMemo(() => {
    const isOverride = (current: number | undefined, baseline: number | undefined) =>
      Number(current ?? 0) !== Number(baseline ?? 0);
    return {
      fixtureRateMonthly: isOverride(form.fixtureRateMonthly, activeConfig.fixtureRates.monthly),
      fixtureRateBimonthly: isOverride(form.fixtureRateBimonthly, activeConfig.fixtureRates.bimonthly),
      fixtureRateQuarterly: isOverride(form.fixtureRateQuarterly, activeConfig.fixtureRates.quarterly),
      minimumMonthly: isOverride(form.minimumMonthly, activeConfig.minimums.monthly),
      minimumBimonthly: isOverride(form.minimumBimonthly, activeConfig.minimums.bimonthly),
      nonBathroomFirstUnitRate: isOverride(form.nonBathroomFirstUnitRate, activeConfig.nonBathroomFirstUnitRate),
      nonBathroomAdditionalUnitRate: isOverride(form.nonBathroomAdditionalUnitRate, activeConfig.nonBathroomAdditionalUnitRate),
      installMultiplierDirty: isOverride(form.installMultiplierDirty, activeConfig.installMultipliers.dirty),
      installMultiplierClean: isOverride(form.installMultiplierClean, activeConfig.installMultipliers.clean),
      twoTimesPerMonthDiscount: isOverride(form.twoTimesPerMonthDiscount, activeConfig.twoTimesPerMonthDiscountFlat),
    };
  }, [
    activeConfig,
    form.fixtureRateMonthly,
    form.fixtureRateBimonthly,
    form.fixtureRateQuarterly,
    form.minimumMonthly,
    form.minimumBimonthly,
    form.nonBathroomFirstUnitRate,
    form.nonBathroomAdditionalUnitRate,
    form.installMultiplierDirty,
    form.installMultiplierClean,
    form.twoTimesPerMonthDiscount,
  ]);

  const { calcFieldsTotal, dollarFieldsTotal, total: customFieldsTotal } =
    useCustomFieldsTotal(customFields);

  const calc = useMemo(
    () => computeSaniscrubCalc(form, activeConfig, customFieldsTotal),
    [form, activeConfig, customFieldsTotal]
  );

  const quote: ServiceQuoteResult = useMemo(
    () =>
      ({
        serviceId: form.serviceId,
        perVisit: calc.perVisitEffective,
        monthly: calc.monthlyTotal,
        annual: calc.annualTotal,
      }) as unknown as ServiceQuoteResult,
    [form.serviceId, calc.perVisitEffective, calc.monthlyTotal, calc.annualTotal]
  );

  const addServiceFieldChange = useCallback(
    (fieldName: string, originalValue: number, newValue: number) => {
      addPriceChange({
        productKey: `saniscrub_${fieldName}`,
        productName: `SaniScrub - ${getFieldDisplayName(fieldName)}`,
        productType: "service",
        fieldType: fieldName,
        fieldDisplayName: getFieldDisplayName(fieldName),
        originalValue,
        newValue,
        quantity: form.fixtureCount || 1,
        frequency: form.frequency || "",
      });
    },
    [form.fixtureCount, form.frequency]
  );

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => {
      const originalValue = prev[name as keyof SaniscrubFormState];
      let newFormState: SaniscrubFormState = prev;

      switch (name as keyof SaniscrubFormState) {
        case "fixtureCount":
        case "nonBathroomSqFt": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num > 0 ? num : 0,
          };
          break;
        }
        case "fixtureRateMonthly":
        case "fixtureRateBimonthly":
        case "fixtureRateQuarterly":
        case "minimumMonthly":
        case "minimumBimonthly":
        case "nonBathroomFirstUnitRate":
        case "nonBathroomAdditionalUnitRate":
        case "installMultiplierDirty":
        case "installMultiplierClean":
        case "twoTimesPerMonthDiscount": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
          break;
        }
        case "customInstallationFee":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal": {
          const numVal = value === "" ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, [name]: numVal };
          }
          break;
        }
        case "frequency":
          newFormState = { ...prev, frequency: clampSaniscrubFrequency(String(value)) };
          break;
        case "contractMonths":
          newFormState = { ...prev, contractMonths: clampSaniscrubContractMonths(value) };
          break;
        case "hasSaniClean":
        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactNonBathroomSqft":
        case "applyMinimum":
          newFormState = {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };
          break;
        case "location":
          newFormState = {
            ...prev,
            location: value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };
          break;
        case "notes":
          newFormState = { ...prev, notes: String(value ?? "") };
          break;
        default:
          break;
      }

      if ((QTY_TOGGLE_FIELDS as readonly string[]).includes(name)) {
        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }

      if ((BASE_RATE_FIELDS as readonly string[]).includes(name)) {
        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }

      if (ALL_PRICING_FIELDS.has(name)) {
        const newValue = newFormState[name as keyof SaniscrubFormState] as number | undefined;
        let baselineValue = baselineValues.current[name];
        if (baselineValue === undefined && name.startsWith("custom")) {
          const mappedBase = CUSTOM_TO_BASE_FOR_BASELINE[name];
          if (mappedBase) baselineValue = baselineValues.current[mappedBase];
        }
        if (
          newValue !== undefined &&
          baselineValue !== undefined &&
          typeof newValue === "number" &&
          typeof baselineValue === "number" &&
          newValue !== baselineValue
        ) {
          addServiceFieldChange(name, baselineValue, newValue);
        }
      }

      return newFormState;
    });
  };

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
    pricingOverrides,
    refreshConfig,
    isLoadingConfig,
    setContractMonths,
  };
}
