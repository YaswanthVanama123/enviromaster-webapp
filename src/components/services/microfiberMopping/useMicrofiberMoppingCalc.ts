import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  MicrofiberMoppingFormState,
  MicrofiberMoppingCalcResult,
} from "./microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  microfiberMoppingModule,
  computeMicrofiberMopping,
  type BackendMicrofiberConfig,
} from "../../../features/services/kinds/microfiberMopping";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

type InputChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLSelectElement>;

const CUSTOM_OVERRIDE_FIELDS = new Set([
  "customIncludedBathroomRate",
  "customHugeBathroomRatePerSqFt",
  "customExtraAreaRatePerUnit",
  "customStandaloneRatePerUnit",
  "customDailyChemicalPerGallon",
  "customStandardBathroomTotal",
  "customHugeBathroomTotal",
  "customExtraAreaTotal",
  "customStandaloneTotal",
  "customChemicalTotal",
  "customPerVisitPrice",
  "customMonthlyRecurring",
  "customFirstMonthPrice",
  "customContractTotal",
]);

const BASE_EDITABLE_FIELDS = new Set([
  "includedBathroomRate",
  "hugeBathroomRatePerSqFt",
  "extraAreaRatePerUnit",
  "standaloneRatePerUnit",
  "dailyChemicalPerGallon",
]);

const ALL_PRICING_FIELDS = new Set<string>([
  ...Array.from(BASE_EDITABLE_FIELDS),
  ...Array.from(CUSTOM_OVERRIDE_FIELDS),
]);

const CUSTOM_TO_BASE: Record<string, string> = {
  customIncludedBathroomRate: "includedBathroomRate",
  customHugeBathroomRatePerSqFt: "hugeBathroomRatePerSqFt",
  customExtraAreaRatePerUnit: "extraAreaRatePerUnit",
  customStandaloneRatePerUnit: "standaloneRatePerUnit",
  customDailyChemicalPerGallon: "dailyChemicalPerGallon",
  customStandardBathroomTotal: "includedBathroomRate",
  customHugeBathroomTotal: "hugeBathroomRatePerSqFt",
  customExtraAreaTotal: "extraAreaRatePerUnit",
  customStandaloneTotal: "standaloneRatePerUnit",
  customChemicalTotal: "dailyChemicalPerGallon",
  customPerVisitPrice: "includedBathroomRate",
  customMonthlyRecurring: "includedBathroomRate",
  customFirstMonthPrice: "includedBathroomRate",
  customContractTotal: "includedBathroomRate",
};

export function useMicrofiberMoppingCalc(
  initialData?: unknown,
  customFields?: CustomFieldLike[]
): {
  form: MicrofiberMoppingFormState;
  setForm: React.Dispatch<React.SetStateAction<MicrofiberMoppingFormState>>;
  onChange: (ev: InputChangeEvent) => void;
  quote: ServiceQuoteResult;
  calc: MicrofiberMoppingCalcResult;
  refreshConfig: () => void;
  isLoadingConfig: boolean;
  activeConfig: any;
  setContractMonths: (months: number) => void;
} {
  const maybe = (initialData as any) || {};
  const initialForm =
    maybe && typeof maybe === "object" && "form" in maybe ? maybe.form : maybe;

  const {
    form,
    setForm,
    config: backendConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(microfiberMoppingModule, initialForm);

  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

  const { total: customFieldsTotal } = useCustomFieldsTotal(customFields);

  useEffect(() => {
    if (!backendConfig) return;
    if (baselineInitialized.current) return;
    baselineInitialized.current = true;

    const initialDataTyped = initialForm as any;
    baselineValues.current = {
      includedBathroomRate:
        initialDataTyped?.includedBathroomRate ??
        backendConfig.bathroomMoppingPricing?.flatPricePerBathroom ??
        backendConfig.includedBathroomRate ??
        form.includedBathroomRate,
      hugeBathroomRatePerSqFt:
        initialDataTyped?.hugeBathroomRatePerSqFt ??
        backendConfig.bathroomMoppingPricing?.hugeBathroomRate ??
        backendConfig.hugeBathroomPricing?.ratePerSqFt ??
        form.hugeBathroomRatePerSqFt,
      extraAreaRatePerUnit:
        initialDataTyped?.extraAreaRatePerUnit ??
        backendConfig.nonBathroomAddonAreas?.ratePerSqFtUnit ??
        backendConfig.extraAreaPricing?.extraAreaRatePerUnit ??
        form.extraAreaRatePerUnit,
      standaloneRatePerUnit:
        initialDataTyped?.standaloneRatePerUnit ??
        backendConfig.standaloneMoppingPricing?.ratePerSqFtUnit ??
        backendConfig.standalonePricing?.standaloneRatePerUnit ??
        form.standaloneRatePerUnit,
      dailyChemicalPerGallon:
        initialDataTyped?.dailyChemicalPerGallon ??
        backendConfig.chemicalProducts?.dailyChemicalPerGallon ??
        form.dailyChemicalPerGallon,
    };

    if (initialDataTyped) {
      const overrides: Partial<MicrofiberMoppingFormState> = {};
      const backendIncludedBathroom =
        backendConfig.bathroomMoppingPricing?.flatPricePerBathroom ?? backendConfig.includedBathroomRate;
      if (
        initialDataTyped.includedBathroomRate !== undefined &&
        initialDataTyped.includedBathroomRate !== backendIncludedBathroom
      ) {
        overrides.customIncludedBathroomRate = initialDataTyped.includedBathroomRate;
      }
      const backendHuge =
        backendConfig.bathroomMoppingPricing?.hugeBathroomRate ??
        backendConfig.hugeBathroomPricing?.ratePerSqFt;
      if (
        initialDataTyped.hugeBathroomRatePerSqFt !== undefined &&
        initialDataTyped.hugeBathroomRatePerSqFt !== backendHuge
      ) {
        overrides.customHugeBathroomRatePerSqFt = initialDataTyped.hugeBathroomRatePerSqFt;
      }
      const backendExtraArea =
        backendConfig.nonBathroomAddonAreas?.ratePerSqFtUnit ??
        backendConfig.extraAreaPricing?.extraAreaRatePerUnit;
      if (
        initialDataTyped.extraAreaRatePerUnit !== undefined &&
        initialDataTyped.extraAreaRatePerUnit !== backendExtraArea
      ) {
        overrides.customExtraAreaRatePerUnit = initialDataTyped.extraAreaRatePerUnit;
      }
      const backendStandalone =
        backendConfig.standaloneMoppingPricing?.ratePerSqFtUnit ??
        backendConfig.standalonePricing?.standaloneRatePerUnit;
      if (
        initialDataTyped.standaloneRatePerUnit !== undefined &&
        initialDataTyped.standaloneRatePerUnit !== backendStandalone
      ) {
        overrides.customStandaloneRatePerUnit = initialDataTyped.standaloneRatePerUnit;
      }
      const backendChem = backendConfig.chemicalProducts?.dailyChemicalPerGallon;
      if (
        initialDataTyped.dailyChemicalPerGallon !== undefined &&
        initialDataTyped.dailyChemicalPerGallon !== backendChem
      ) {
        overrides.customDailyChemicalPerGallon = initialDataTyped.dailyChemicalPerGallon;
      }
      if (Object.keys(overrides).length > 0) {
        setForm((prev) => ({ ...prev, ...overrides }));
      }
    }
  }, [backendConfig, initialForm, setForm]);

  const addServiceFieldChange = useCallback(
    (fieldName: string, originalValue: number, newValue: number) => {
      addPriceChange({
        productKey: `microfiberMopping_${fieldName}`,
        productName: `Microfiber Mopping - ${getFieldDisplayName(fieldName)}`,
        productType: "service",
        fieldType: fieldName,
        fieldDisplayName: getFieldDisplayName(fieldName),
        originalValue,
        newValue,
        quantity:
          (form.bathroomCount + form.hugeBathroomSqFt + form.extraAreaSqFt + form.standaloneSqFt) ||
          1,
        frequency: form.frequency || "",
      });
    },
    [
      form.frequency,
      form.bathroomCount,
      form.hugeBathroomSqFt,
      form.extraAreaSqFt,
      form.standaloneSqFt,
    ]
  );

  const onChange = (ev: InputChangeEvent) => {
    const target = ev.target as HTMLInputElement;
    const { name, type, value, checked } = target;

    setForm((prev) => {
      const originalValue = prev[name as keyof MicrofiberMoppingFormState];
      let nextValue: unknown = value;

      if (type === "checkbox") {
        nextValue = checked;
      } else if (CUSTOM_OVERRIDE_FIELDS.has(name)) {
        if (value === "") {
          nextValue = undefined;
        } else {
          const numVal = parseFloat(value);
          if (!isNaN(numVal)) {
            nextValue = numVal;
          } else {
            return prev;
          }
        }
      } else if (type === "number") {
        const raw = value.trim();
        if (raw === "") {
          nextValue = 0;
        } else {
          const num = Number(raw);
          nextValue = Number.isFinite(num) && num >= 0 ? num : 0;
        }
      }

      const next: MicrofiberMoppingFormState = {
        ...prev,
        [name]: nextValue as any,
      };

      if (name === "hugeBathroomSqFt") {
        const sq = Number(nextValue) || 0;
        if (sq > 0) {
          next.bathroomCount = 0;
          next.isHugeBathroom = true;
        } else if (sq === 0) {
          next.isHugeBathroom = false;
        }
      }
      if (name === "isHugeBathroom" && nextValue === true) {
        next.bathroomCount = 0;
      }

      if (ALL_PRICING_FIELDS.has(name)) {
        const newValue = nextValue as number | undefined;
        const baseFieldForLookup = CUSTOM_TO_BASE[name] || name;
        const baselineValue = baselineValues.current[baseFieldForLookup];
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

      const allFormFields = ["bathrooms", "hugeSqFtPerBathroom", "contractMonths", "frequency", "rateTier"];
      if (allFormFields.includes(name)) {
        logServiceFieldChanges(
          "microfiberMopping",
          "Microfiber Mopping",
          { [name]: next[name as keyof MicrofiberMoppingFormState] },
          { [name]: originalValue },
          [name],
          (next as any).bathrooms || 1,
          next.frequency || "weekly"
        );
      }

      return next;
    });
  };

  const computed = useMemo(
    () => computeMicrofiberMopping(form, backendConfig, customFieldsTotal),
    [form, backendConfig, customFieldsTotal]
  );

  const quote: ServiceQuoteResult = useMemo(
    () =>
      ({
        ...(computed.calc as any),
        serviceId: (form as any).serviceId ?? cfg.serviceType,
        serviceKey: "microfiberMopping",
        serviceLabel: "Microfiber Mopping",
        frequency: form.frequency,
        perVisit: computed.perVisit,
        monthly: computed.monthly,
      } as unknown as ServiceQuoteResult),
    [computed, form.frequency, form]
  );

  const activeConfig = {
    extraAreaPricing: {
      singleLargeAreaRate:
        backendConfig?.nonBathroomAddonAreas?.flatPriceSingleLargeArea ??
        backendConfig?.extraAreaPricing?.singleLargeAreaRate ??
        cfg.extraAreaPricing.singleLargeAreaRate,
      extraAreaSqFtUnit:
        backendConfig?.nonBathroomAddonAreas?.sqFtUnit ??
        backendConfig?.extraAreaPricing?.extraAreaSqFtUnit ??
        cfg.extraAreaPricing.extraAreaSqFtUnit,
    },
    standalonePricing: {
      standaloneSqFtUnit:
        backendConfig?.standaloneMoppingPricing?.sqFtUnit ??
        backendConfig?.standalonePricing?.standaloneSqFtUnit ??
        cfg.standalonePricing.standaloneSqFtUnit,
      standaloneMinimum:
        backendConfig?.standaloneMoppingPricing?.minimumPrice ??
        backendConfig?.minimumChargePerVisit ??
        backendConfig?.standalonePricing?.standaloneMinimum ??
        cfg.standalonePricing.standaloneMinimum,
    },
  };

  const wrappedRefreshConfig = useCallback(() => {
    refreshConfig(true);
  }, [refreshConfig]);

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: computed.calc,
    refreshConfig: wrappedRefreshConfig,
    isLoadingConfig,
    activeConfig,
    setContractMonths,
  };
}
