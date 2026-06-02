import { useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  electrostaticSprayModule,
  computeElectrostaticSprayCalc,
} from "../../../features/services/kinds/electrostaticSpray";
import { useServicesContextOptional } from "../ServicesContext";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";
import type {
  ElectrostaticSprayFormState,
  ElectrostaticSprayCalcResult,
} from "./electrostaticSprayTypes";

export {
  buildElectrostaticActiveConfig,
  computeElectrostaticSprayCalc,
  transformBackendFrequencyMeta,
} from "../../../features/services/kinds/electrostaticSpray";
export type {
  BackendElectrostaticSprayConfig,
  ElectrostaticActiveConfig,
} from "../../../features/services/kinds/electrostaticSpray";

const CUSTOM_OVERRIDE_FIELDS = new Set([
  "customRatePerRoom",
  "customRatePerThousandSqFt",
  "customTripChargePerVisit",
  "customServiceCharge",
  "customPerVisitPrice",
  "customMonthlyRecurring",
  "customContractTotal",
  "customFirstMonthTotal",
]);

const LOG_TRIGGER_FIELDS = new Set([
  "rooms",
  "squareFeet",
  "contractMonths",
  "frequency",
  "pricingMethod",
  "rateTier",
  "includesTripCharge",
]);

export function useElectrostaticSprayCalc(
  initialData?: Partial<ElectrostaticSprayFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    quote: _engineQuote,
    config: activeConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(electrostaticSprayModule, initialData);

  const { total: customFieldsTotal } = useCustomFieldsTotal(customFields);

  const calc: ElectrostaticSprayCalcResult = useMemo(
    () => computeElectrostaticSprayCalc(form, activeConfig, customFieldsTotal),
    [form, activeConfig, customFieldsTotal]
  );

  const ctx = useServicesContextOptional();
  const overrideDetected = useRef(false);

  useEffect(() => {
    if (overrideDetected.current) return;
    if (!initialData) return;
    const backendData = ctx?.getBackendPricingForService?.("electrostaticSpray");
    if (!backendData?.config) return;
    overrideDetected.current = true;

    const backend = backendData.config as {
      standardSprayPricing?: {
        sprayRatePerRoom?: number;
        sprayRatePerSqFtUnit?: number;
      };
      tripCharges?: { standard?: number };
    };

    const hasRatePerRoomOverride =
      initialData.ratePerRoom !== undefined &&
      initialData.ratePerRoom !== backend.standardSprayPricing?.sprayRatePerRoom;
    const hasRatePerSqFtOverride =
      initialData.ratePerThousandSqFt !== undefined &&
      initialData.ratePerThousandSqFt !==
        backend.standardSprayPricing?.sprayRatePerSqFtUnit;
    const hasTripChargeOverride =
      initialData.tripChargePerVisit !== undefined &&
      initialData.tripChargePerVisit !== backend.tripCharges?.standard;

    if (hasRatePerRoomOverride || hasRatePerSqFtOverride || hasTripChargeOverride) {
      setForm((prev) => ({
        ...prev,
        customRatePerRoom: hasRatePerRoomOverride
          ? initialData.ratePerRoom
          : prev.customRatePerRoom,
        customRatePerThousandSqFt: hasRatePerSqFtOverride
          ? initialData.ratePerThousandSqFt
          : prev.customRatePerThousandSqFt,
        customTripChargePerVisit: hasTripChargeOverride
          ? initialData.tripChargePerVisit
          : prev.customTripChargePerVisit,
      }));
    }
  }, [ctx?.backendPricingData, initialData, setForm]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target = e.target as HTMLInputElement | HTMLSelectElement;

    setForm((prev) => {
      const originalValue = prev[name as keyof ElectrostaticSprayFormState];
      const next: ElectrostaticSprayFormState = { ...prev };

      if (type === "checkbox") {
        (next as any)[name] = (target as HTMLInputElement).checked;
      } else if (CUSTOM_OVERRIDE_FIELDS.has(name)) {
        if (target.value === "") {
          (next as any)[name] = undefined;
        } else {
          const numVal = parseFloat(target.value);
          if (!isNaN(numVal)) {
            (next as any)[name] = numVal;
          } else {
            return prev;
          }
        }
      } else if (type === "number") {
        const val = parseFloat(target.value);
        (next as any)[name] = isNaN(val) ? 0 : val;
      } else {
        (next as any)[name] = target.value;
      }

      if (LOG_TRIGGER_FIELDS.has(name)) {
        logServiceFieldChanges(
          "electrostaticSpray",
          "Electrostatic Spray",
          { [name]: (next as any)[name] },
          { [name]: originalValue },
          [name],
          (next as any).rooms || (next as any).squareFeet || 1,
          next.frequency || "monthly"
        );
      }

      return next;
    });
  };

  return {
    form,
    setForm,
    onChange,
    calc,
    backendConfig: activeConfig,
    isLoadingConfig,
    refreshConfig,
    activeConfig,
    setContractMonths,
  };
}
