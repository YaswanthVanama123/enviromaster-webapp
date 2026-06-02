import { useEffect, useRef, useCallback } from "react";
import { useServicesContextOptional } from "../../../components/services/ServicesContext";
import type { ServiceModule } from "./types";

export function useGlobalContractMonths<Form, Config, Quote>(
  module: ServiceModule<Form, Config, Quote>,
  form: Form,
  setForm: React.Dispatch<React.SetStateAction<Form>>
): { setContractMonths: (months: number) => void } {
  const ctx = useServicesContextOptional();
  const hasOverride = useRef(false);
  const wasActiveRef = useRef(module.isActive ? module.isActive(form) : true);

  useEffect(() => {
    const isActive = module.isActive ? module.isActive(form) : true;
    const wasActive = wasActiveRef.current;
    const justActivated = isActive && !wasActive;
    const globalMonths = ctx?.globalContractMonths;

    if (globalMonths && !hasOverride.current && (justActivated || isActive)) {
      const current = (form as Record<string, unknown>).contractMonths;
      if (current !== globalMonths) {
        setForm((prev) => ({ ...prev, contractMonths: globalMonths } as Form));
      }
    }

    wasActiveRef.current = isActive;
  }, [ctx?.globalContractMonths, form, setForm, module]);

  const setContractMonths = useCallback(
    (months: number) => {
      hasOverride.current = true;
      setForm((prev) => ({ ...prev, contractMonths: months } as Form));
    },
    [setForm]
  );

  return { setContractMonths };
}
