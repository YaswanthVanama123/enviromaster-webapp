import { useMemo, useState, useCallback } from "react";
import { useServicesContextOptional } from "../../../components/services/ServicesContext";
import type { ServiceModule, ServiceCalcResult } from "./types";
import { useBackendConfigSync } from "./useBackendConfigSync";
import { useGlobalContractMonths } from "./useGlobalContractMonths";
import { useAutoClearRules } from "./useAutoClearRules";
import { usePriceChangeLogger } from "./usePriceChangeLogger";

function resolveDefaults<Form>(defaults: Form | (() => Form)): Form {
  return typeof defaults === "function" ? (defaults as () => Form)() : defaults;
}

export function useServiceCalc<Form extends object, Config, Quote>(
  module: ServiceModule<Form, Config, Quote>,
  initial?: Partial<Form>
): ServiceCalcResult<Form, Config, Quote> {
  const ctx = useServicesContextOptional();
  const hasInitialData = !!initial && Object.keys(initial).length > 0;

  const [form, setForm] = useState<Form>(() => {
    const base = resolveDefaults(module.defaults);
    const merged = { ...base, ...(initial ?? {}) } as Form;
    const ctxMonths = ctx?.globalContractMonths;
    if (
      ctxMonths &&
      !(initial as Record<string, unknown> | undefined)?.contractMonths &&
      "contractMonths" in (merged as object)
    ) {
      (merged as Record<string, unknown>).contractMonths = ctxMonths;
    }
    return merged;
  });

  const { config, isLoadingConfig, refresh } = useBackendConfigSync(
    module,
    setForm,
    hasInitialData
  );

  useAutoClearRules(module, form, setForm);

  const { setContractMonths } = useGlobalContractMonths(module, form, setForm);

  const logChange = usePriceChangeLogger(module, form);

  const updateForm = useCallback(
    (patch: Partial<Form>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch } as Form;
        if (module.priceChangeLog && module.pricingFields) {
          for (const key of Object.keys(patch) as (keyof Form)[]) {
            if (!module.pricingFields.includes(key)) continue;
            const oldV = (prev as Record<string, unknown>)[key as string];
            const newV = (next as Record<string, unknown>)[key as string];
            if (
              typeof oldV === "number" &&
              typeof newV === "number" &&
              oldV !== newV &&
              newV > 0
            ) {
              logChange(String(key), oldV, newV);
            }
          }
        }
        if (module.baseInputFields && module.customOverrideFields) {
          const isBaseChange = (Object.keys(patch) as (keyof Form)[]).some(
            (k) => module.baseInputFields!.includes(k)
          );
          if (isBaseChange) {
            for (const f of module.customOverrideFields) {
              (next as Record<string, unknown>)[f as string] = undefined;
            }
          }
        }
        return next;
      });
    },
    [module, logChange]
  );

  const setField = useCallback(
    <K extends keyof Form>(field: K, value: Form[K]) => {
      updateForm({ [field]: value } as unknown as Partial<Form>);
    },
    [updateForm]
  );

  const quote = useMemo(
    () => module.computeQuote(form, config),
    [form, config, module]
  );

  const refreshConfig = useCallback(
    (force: boolean = false) => {
      refresh(force);
      if (force && module.customOverrideFields && module.customOverrideFields.length > 0) {
        setForm((prev) => {
          const next = { ...prev } as Form;
          for (const f of module.customOverrideFields!) {
            (next as Record<string, unknown>)[f as string] = undefined;
          }
          return next;
        });
      }
    },
    [refresh, module]
  );

  return {
    form,
    setForm,
    updateForm,
    setField,
    quote,
    config,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  };
}
