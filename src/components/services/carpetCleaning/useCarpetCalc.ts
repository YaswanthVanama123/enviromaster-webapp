import { useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  carpetCleaningModule,
  computeCarpetCalc,
  clampCarpetFrequency,
  clampCarpetContractMonths,
} from "../../../features/services/kinds/carpetCleaning";
import { useServicesContextOptional } from "../ServicesContext";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";
import type { CarpetFormState } from "./carpetTypes";

const CUSTOM_OVERRIDE_FIELDS = new Set([
  "customFirstUnitRate",
  "customAdditionalUnitRate",
  "customPerVisitMinimum",
  "customPerVisitPrice",
  "customMonthlyRecurring",
  "customFirstMonthPrice",
  "customContractTotal",
  "customInstallationFee",
]);

const LOG_TRIGGER_FIELDS = new Set([
  "rooms",
  "totalSqFt",
  "contractMonths",
  "frequency",
  "dirtLevel",
  "rateTier",
  "needsStainProtection",
]);

export function useCarpetCalc(
  initial?: Partial<CarpetFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    config: engineConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(carpetCleaningModule, initial);

  const ctx = useServicesContextOptional();
  const overrideDetected = useRef(false);

  useEffect(() => {
    if (overrideDetected.current) return;
    if (!initial) return;
    const backendData = ctx?.getBackendPricingForService?.("carpetCleaning");
    if (!backendData?.config) return;
    overrideDetected.current = true;

    const backend = backendData.config as {
      basePrice?: number;
      additionalUnitPrice?: number;
      minimumChargePerVisit?: number;
    };

    const hasFirstUnitRateOverride =
      initial.firstUnitRate !== undefined && initial.firstUnitRate !== backend.basePrice;
    const hasAdditionalUnitRateOverride =
      initial.additionalUnitRate !== undefined &&
      initial.additionalUnitRate !== backend.additionalUnitPrice;
    const hasPerVisitMinimumOverride =
      initial.perVisitMinimum !== undefined &&
      initial.perVisitMinimum !== backend.minimumChargePerVisit;

    if (
      hasFirstUnitRateOverride ||
      hasAdditionalUnitRateOverride ||
      hasPerVisitMinimumOverride
    ) {
      setForm((prev) => ({
        ...prev,
        customFirstUnitRate: hasFirstUnitRateOverride
          ? initial.firstUnitRate
          : prev.customFirstUnitRate,
        customAdditionalUnitRate: hasAdditionalUnitRateOverride
          ? initial.additionalUnitRate
          : prev.customAdditionalUnitRate,
        customPerVisitMinimum: hasPerVisitMinimumOverride
          ? initial.perVisitMinimum
          : prev.customPerVisitMinimum,
      }));
    }
  }, [ctx?.backendPricingData, initial, setForm]);

  const { calcFieldsTotal, dollarFieldsTotal, total: customFieldsTotal } =
    useCustomFieldsTotal(customFields);

  const calc: ReturnType<typeof computeCarpetCalc> = useMemo(
    () =>
      computeCarpetCalc(
        form,
        engineConfig.base,
        engineConfig.backend,
        customFieldsTotal
      ),
    [form, engineConfig, customFieldsTotal]
  );

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => {
      const originalValue = prev[name as keyof CarpetFormState];
      let newFormState = prev;

      switch (name as keyof CarpetFormState) {
        case "areaSqFt": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            areaSqFt: Number.isFinite(num) && num > 0 ? num : 0,
          };
          break;
        }
        case "unitSqFt":
        case "firstUnitRate":
        case "additionalUnitRate":
        case "perVisitMinimum":
        case "installMultiplierDirty":
        case "installMultiplierClean": {
          const num = parseFloat(String(value));
          if (Number.isFinite(num) && num >= 0) {
            newFormState = { ...prev, [name]: num };
          }
          break;
        }
        case "customFirstUnitRate":
        case "customAdditionalUnitRate":
        case "customPerVisitMinimum":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal":
        case "customInstallationFee": {
          const numVal = value === "" ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, [name]: numVal };
          }
          break;
        }
        case "frequency":
          newFormState = { ...prev, frequency: clampCarpetFrequency(String(value)) };
          break;
        case "contractMonths":
          newFormState = { ...prev, contractMonths: clampCarpetContractMonths(value) };
          break;
        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactSqft":
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

      if (LOG_TRIGGER_FIELDS.has(name)) {
        logServiceFieldChanges(
          "carpetCleaning",
          "Carpet Cleaning",
          { [name]: newFormState[name as keyof CarpetFormState] },
          { [name]: originalValue },
          [name],
          (newFormState as any).rooms || 1,
          newFormState.frequency || "monthly"
        );
      }

      return newFormState;
    });
  };

  const quote: ServiceQuoteResult = useMemo(
    () =>
      ({
        serviceId: form.serviceId,
        perVisit: calc.perVisitEffective,
        monthly: calc.monthlyTotal,
        annual: calc.contractTotal,
      }) as unknown as ServiceQuoteResult,
    [form.serviceId, calc.perVisitEffective, calc.monthlyTotal, calc.contractTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
    refreshConfig,
    isLoadingConfig,
    setContractMonths,
  };
}
