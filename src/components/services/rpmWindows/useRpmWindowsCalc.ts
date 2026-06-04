import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
  RpmRateCategory,
} from "./rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "./rpmWindowsConfig";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  rpmWindowsModule,
  computeRpmWindowsCalc,
  mapFrequency,
  getEffectiveFrequencyKey,
  getFrequencyMultiplier,
  getBackendBaseRates,
  type BackendRpmConfig,
  type RpmBaseWeeklyRates,
} from "../../../features/services/kinds/rpmWindows";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";

export const RPM_OVERRIDE_TOLERANCE = 0.005;

const PRICING_FIELDS = new Set([
  "smallWindowRate",
  "mediumWindowRate",
  "largeWindowRate",
  "tripCharge",
  "customSmallTotal",
  "customMediumTotal",
  "customLargeTotal",
  "customPerVisitPrice",
  "customMonthlyRecurring",
  "customFirstMonthTotal",
  "customAnnualPrice",
  "customInstallationFee",
  "customContractTotal",
  "installMultiplierFirstTime",
  "installMultiplierClean",
]);

export function useRpmWindowsCalc(
  initial?: Partial<RpmWindowsFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    config: backendConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(rpmWindowsModule, initial);

  const isEditMode = useRef(!!initial);
  const forceRefreshRef = useRef(false);
  const skipInitialOverridesRef = useRef(false);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);
  const baseRatesInitialized = useRef(false);
  const prevFrequencyRef = useRef<string | null>(initial?.frequency ?? null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const [baselineReady, setBaselineReady] = useState(false);

  const overrideFieldsList: Array<keyof RpmWindowsFormState> = [
    "smallWindowRate",
    "mediumWindowRate",
    "largeWindowRate",
    "tripCharge",
    "installMultiplierFirstTime",
    "installMultiplierClean",
  ];

  const markManualOverride = (name: string, value: number) => {
    setManualOverrides((prev) => {
      const next = { ...prev };
      const baseline = baselineValues.current[name];
      const shouldOverride =
        typeof baseline !== "number"
          ? true
          : Math.abs(value - baseline) > RPM_OVERRIDE_TOLERANCE;
      if (shouldOverride) {
        next[name] = true;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const { calcFieldsTotal, dollarFieldsTotal, total: customFieldsTotal } =
    useCustomFieldsTotal(customFields);

  const [baseWeeklyRates, setBaseWeeklyRates] = useState<RpmBaseWeeklyRates>({
    small: cfg.smallWindowRate,
    medium: cfg.mediumWindowRate,
    large: cfg.largeWindowRate,
    trip: cfg.tripCharge,
  });

  useEffect(() => {
    if (!backendConfig) return;
    const newBaseRates = getBackendBaseRates(backendConfig);
    setBaseWeeklyRates(newBaseRates);
    if (!isEditMode.current || forceRefreshRef.current) {
      setForm((prev) => ({
        ...prev,
        smallWindowRate: newBaseRates.small,
        mediumWindowRate: newBaseRates.medium,
        largeWindowRate: newBaseRates.large,
        tripCharge: newBaseRates.trip,
        installMultiplierFirstTime:
          backendConfig.installPricing?.installationMultiplier ?? prev.installMultiplierFirstTime,
        installMultiplierClean:
          backendConfig.installPricing?.cleanInstallationMultiplier ?? prev.installMultiplierClean,
      }));
    }
  }, [backendConfig, setForm]);

  useEffect(() => {
    if (!initial || baseRatesInitialized.current) return;
    const freqKey = mapFrequency(form.frequency);
    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);
    if (freqMult > 0) {
      setBaseWeeklyRates({
        small: (form.smallWindowRate || 0) / freqMult,
        medium: (form.mediumWindowRate || 0) / freqMult,
        large: (form.largeWindowRate || 0) / freqMult,
        trip: (form.tripCharge || 0) / freqMult,
      });
    }
    baseRatesInitialized.current = true;
  }, [
    initial,
    form.frequency,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    backendConfig,
  ]);

  useEffect(() => {
    setBaselineReady(false);
    if (!backendConfig) return;
    const freqKey = mapFrequency(form.frequency);
    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);
    const backendBase = getBackendBaseRates(backendConfig);
    baselineValues.current.smallWindowRate = backendBase.small * freqMult;
    baselineValues.current.mediumWindowRate = backendBase.medium * freqMult;
    baselineValues.current.largeWindowRate = backendBase.large * freqMult;
    baselineValues.current.tripCharge = backendBase.trip * freqMult;
    baselineValues.current.installMultiplierFirstTime =
      backendConfig.installPricing?.installationMultiplier ?? cfg.installMultiplierFirstTime;
    baselineValues.current.installMultiplierClean =
      backendConfig.installPricing?.cleanInstallationMultiplier ?? cfg.installMultiplierClean;
    baselineInitialized.current = true;
    setBaselineReady(true);
    if (forceRefreshRef.current) {
      setManualOverrides({});
    }
  }, [backendConfig, form.frequency]);

  useEffect(() => {
    if (skipInitialOverridesRef.current) {
      skipInitialOverridesRef.current = false;
      return;
    }
    if (forceRefreshRef.current) return;
    if (!baselineReady || !initial) return;
    const overrides: Record<string, boolean> = {};
    overrideFieldsList.forEach((field) => {
      const savedRaw = initial[field];
      const savedValue =
        typeof savedRaw === "number"
          ? savedRaw
          : typeof savedRaw === "string"
          ? parseFloat(savedRaw as string)
          : undefined;
      const baseline = baselineValues.current[field as string];
      if (
        typeof savedValue === "number" &&
        typeof baseline === "number" &&
        Math.abs(savedValue - baseline) > RPM_OVERRIDE_TOLERANCE
      ) {
        overrides[field] = true;
      }
    });
    setManualOverrides((prev) => ({ ...prev, ...overrides }));
  }, [baselineReady, initial]);

  useEffect(() => {
    const freqKey = mapFrequency(form.frequency);
    const freqChanged = prevFrequencyRef.current !== form.frequency;
    if (freqChanged) {
      prevFrequencyRef.current = form.frequency;
      setManualOverrides({});
    }
    if (isEditMode.current && !forceRefreshRef.current && !freqChanged) return;
    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);
    setForm((prev) => ({
      ...prev,
      smallWindowRate: baseWeeklyRates.small * freqMult,
      mediumWindowRate: baseWeeklyRates.medium * freqMult,
      largeWindowRate: baseWeeklyRates.large * freqMult,
      tripCharge: baseWeeklyRates.trip * freqMult,
    }));
    if (forceRefreshRef.current) {
      forceRefreshRef.current = false;
    }
  }, [form.frequency, backendConfig, baseWeeklyRates, setForm]);

  const wrappedRefreshConfig = useCallback(() => {
    forceRefreshRef.current = true;
    baselineInitialized.current = false;
    baselineValues.current = {};
    skipInitialOverridesRef.current = true;
    refreshConfig(true);
    setManualOverrides({});
  }, [refreshConfig]);

  const addServiceFieldChange = useCallback(
    (fieldName: string, originalValue: number, newValue: number) => {
      addPriceChange({
        productKey: `rpmWindows_${fieldName}`,
        productName: `RPM Windows - ${getFieldDisplayName(fieldName)}`,
        productType: "service",
        fieldType: fieldName,
        fieldDisplayName: getFieldDisplayName(fieldName),
        originalValue,
        newValue,
        quantity:
          (form.smallQty || 0) + (form.mediumQty || 0) + (form.largeQty || 0) || 1,
        frequency: form.frequency || "",
      });
    },
    [form.smallQty, form.mediumQty, form.largeQty, form.frequency]
  );

  const pricingOverrides = useMemo(() => {
    if (!backendConfig) return {};
    const freqKey = mapFrequency(form.frequency);
    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);
    const backendBase = getBackendBaseRates(backendConfig);
    const expectedRates = {
      small: backendBase.small * freqMult,
      medium: backendBase.medium * freqMult,
      large: backendBase.large * freqMult,
      trip: backendBase.trip * freqMult,
    };
    const isOverride = (current: number, expected: number | undefined) =>
      typeof expected === "number" && Number.isFinite(expected) && current !== expected;
    return {
      smallWindowRate: isOverride(form.smallWindowRate, expectedRates.small),
      mediumWindowRate: isOverride(form.mediumWindowRate, expectedRates.medium),
      largeWindowRate: isOverride(form.largeWindowRate, expectedRates.large),
      tripCharge: isOverride(form.tripCharge, expectedRates.trip),
      installMultiplierFirstTime: isOverride(
        form.installMultiplierFirstTime,
        backendConfig.installPricing?.installationMultiplier
      ),
      installMultiplierClean: isOverride(
        form.installMultiplierClean,
        backendConfig.installPricing?.cleanInstallationMultiplier
      ),
    };
  }, [
    backendConfig,
    form.frequency,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    form.installMultiplierFirstTime,
    form.installMultiplierClean,
  ]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, checked } = e.target as any;
    setForm((prev) => {
      const originalValue = prev[name as keyof RpmWindowsFormState];
      let newFormState = prev;

      switch (name) {
        case "frequency":
          newFormState = { ...prev, frequency: mapFrequency(value) as any };
          break;
        case "selectedRateCategory":
          newFormState = { ...prev, selectedRateCategory: value as RpmRateCategory };
          break;
        case "includeMirrors":
          newFormState = { ...prev, includeMirrors: !!checked };
          break;
        case "applyMinimum":
          newFormState = { ...prev, applyMinimum: !!checked };
          break;
        case "smallQty":
        case "mediumQty":
        case "largeQty":
          newFormState = { ...prev, [name]: Number(value) || 0 };
          break;
        case "contractMonths":
          newFormState = { ...prev, contractMonths: Number(value) || 0 };
          break;
        case "customSmallTotal":
        case "customMediumTotal":
        case "customLargeTotal":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customAnnualPrice":
        case "customContractTotal": {
          if (value === "") {
            newFormState = { ...prev, [name]: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) newFormState = { ...prev, [name]: numVal };
          }
          break;
        }
        case "customInstallationFee": {
          if (value === "") {
            newFormState = { ...prev, customInstallationFee: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) newFormState = { ...prev, customInstallationFee: numVal };
          }
          break;
        }
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const displayVal = Number(value) || 0;
          const freqKey = mapFrequency(prev.frequency);
          const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
          const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);
          const weeklyBase = displayVal / freqMult;
          if (name === "smallWindowRate") setBaseWeeklyRates((b) => ({ ...b, small: weeklyBase }));
          else if (name === "mediumWindowRate") setBaseWeeklyRates((b) => ({ ...b, medium: weeklyBase }));
          else if (name === "largeWindowRate") setBaseWeeklyRates((b) => ({ ...b, large: weeklyBase }));
          else if (name === "tripCharge") setBaseWeeklyRates((b) => ({ ...b, trip: weeklyBase }));
          markManualOverride(name, displayVal);
          newFormState = { ...prev, [name]: displayVal };
          break;
        }
        case "installMultiplierFirstTime":
        case "installMultiplierClean": {
          const displayVal = Number(value) || 0;
          markManualOverride(name, displayVal);
          newFormState = { ...prev, [name]: displayVal };
          break;
        }
        default:
          newFormState = prev;
          break;
      }

      if (PRICING_FIELDS.has(name)) {
        const newValue = newFormState[name as keyof RpmWindowsFormState] as number | undefined;
        const oldValue = originalValue as number | undefined;
        const baselineValue = baselineValues.current[name] ?? oldValue;
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

  const addExtraCharge = () => {
    setForm((prev) => ({
      ...prev,
      extraCharges: [
        ...prev.extraCharges,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          calcText: "",
          description: "",
          amount: 0,
        },
      ],
    }));
  };

  const updateExtraCharge = (
    id: string,
    field: "calcText" | "description" | "amount",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.map((line) =>
        line.id === id
          ? { ...line, [field]: field === "amount" ? Number(value) || 0 : value }
          : line
      ),
    }));
  };

  const removeExtraCharge = (id: string) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.filter((line) => line.id !== id),
    }));
  };

  const calc = useMemo(
    () => computeRpmWindowsCalc(form, baseWeeklyRates, backendConfig, customFieldsTotal),
    [form, baseWeeklyRates, backendConfig, customFieldsTotal]
  );

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: calc.recurringPerVisitRated,
    annualPrice: calc.contractTotalRated,
    detailsBreakdown: [],
  };

  return {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
    calc,
    quote,
    pricingOverrides,
    manualOverrides,
    persistedOverrides: manualOverrides,
    baselineValues: baselineValues.current,
    baselineReady,
    refreshConfig: wrappedRefreshConfig,
    isLoadingConfig,
    setContractMonths,
  };
}
