import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  stripWaxModule,
  computeStripWaxCalc,
  getStripWaxVariantConfigFromState,
} from "../../../features/services/kinds/stripWax";
import type {
  StripWaxFormState,
  StripWaxServiceVariant,
} from "./stripWaxTypes";
import type { StripWaxCalcResult } from "../../../features/services/kinds/stripWax";

const CUSTOM_OVERRIDE_FIELDS = new Set([
  "customPerVisit",
  "customMonthly",
  "customOngoingMonthly",
  "customContractTotal",
]);

export function useStripWaxCalc(
  initialData?: Partial<StripWaxFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    config: activeConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(stripWaxModule, initialData);

  const baselineRef = useRef<Record<string, number>>({});
  const setBaselineVariant = useCallback((state: StripWaxFormState) => {
    const variantDefaults = getStripWaxVariantConfigFromState(state);
    baselineRef.current.ratePerSqFt = variantDefaults.ratePerSqFt;
    baselineRef.current.minCharge = variantDefaults.minCharge;
  }, []);

  useEffect(() => {
    setBaselineVariant(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setForm((prev) => {
      const variantDefaults = getStripWaxVariantConfigFromState(prev);
      const nextCustomRate =
        prev.ratePerSqFt !== variantDefaults.ratePerSqFt ? prev.ratePerSqFt : undefined;
      const nextCustomMin =
        prev.minCharge !== variantDefaults.minCharge ? prev.minCharge : undefined;
      if (
        prev.customRatePerSqFt === nextCustomRate &&
        prev.customMinCharge === nextCustomMin
      ) {
        return prev;
      }
      return { ...prev, customRatePerSqFt: nextCustomRate, customMinCharge: nextCustomMin };
    });
  }, [
    form.ratePerSqFt,
    form.minCharge,
    form.serviceVariant,
    form.standardFullRatePerSqFt,
    form.standardFullMinCharge,
    form.noSealantRatePerSqFt,
    form.noSealantMinCharge,
    form.wellMaintainedRatePerSqFt,
    form.wellMaintainedMinCharge,
    setForm,
  ]);

  const { total: customFieldsTotal } = useCustomFieldsTotal(customFields);

  const calc: StripWaxCalcResult = useMemo(
    () => computeStripWaxCalc(form, activeConfig, customFieldsTotal),
    [form, activeConfig, customFieldsTotal]
  );

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const t = e.target as HTMLInputElement | HTMLSelectElement;

    setForm((prev) => {
      const next: StripWaxFormState = { ...prev };

      if (name === "serviceVariant") {
        const variantKey = t.value as StripWaxServiceVariant;
        next.serviceVariant = variantKey;
        if (variantKey === "standardFull") {
          next.ratePerSqFt = prev.standardFullRatePerSqFt;
          next.minCharge = prev.standardFullMinCharge;
        } else if (variantKey === "noSealant") {
          next.ratePerSqFt = prev.noSealantRatePerSqFt;
          next.minCharge = prev.noSealantMinCharge;
        } else if (variantKey === "wellMaintained") {
          next.ratePerSqFt = prev.wellMaintainedRatePerSqFt;
          next.minCharge = prev.wellMaintainedMinCharge;
        }
        setBaselineVariant(next);
        return next;
      }

      if (type === "checkbox") {
        (next as any)[name] = (t as HTMLInputElement).checked;
      } else if (CUSTOM_OVERRIDE_FIELDS.has(name)) {
        if (t.value === "") {
          (next as any)[name] = undefined;
        } else {
          const numVal = parseFloat(t.value);
          if (!isNaN(numVal)) (next as any)[name] = numVal;
        }
      } else if (type === "number") {
        const raw = t.value;
        if (raw === "") {
          (next as any)[name] = undefined;
        } else {
          const num = Number(raw);
          (next as any)[name] =
            Number.isFinite(num) && num >= 0 ? num : (next as any)[name];
        }
      } else {
        (next as any)[name] = t.value;
      }

      return next;
    });
  };

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig,
    isLoadingConfig,
    setContractMonths,
  };
}
