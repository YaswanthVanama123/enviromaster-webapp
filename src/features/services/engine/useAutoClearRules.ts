import { useEffect } from "react";
import type { ServiceModule } from "./types";

export function useAutoClearRules<Form, Config, Quote>(
  module: ServiceModule<Form, Config, Quote>,
  form: Form,
  setForm: React.Dispatch<React.SetStateAction<Form>>
): void {
  useEffect(() => {
    if (!module.autoClearRules || module.autoClearRules.length === 0) return;
    let updates: Partial<Form> = {};
    let dirty = false;
    for (const rule of module.autoClearRules) {
      const trigger = (form as Record<string, unknown>)[rule.when as string];
      if (!trigger) {
        for (const field of rule.clear) {
          const current = (form as Record<string, unknown>)[field as string];
          if (typeof current === "number" && current !== 0) {
            (updates as Record<string, unknown>)[field as string] = 0;
            dirty = true;
          }
        }
      }
    }
    if (dirty) setForm((prev) => ({ ...prev, ...updates }));
  }, [form, setForm, module.autoClearRules]);
}
