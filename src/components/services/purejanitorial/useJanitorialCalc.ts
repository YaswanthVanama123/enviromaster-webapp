import type { ChangeEvent } from "react";
import { useServiceCalc } from "../../../features/services/engine";
import { purejanitorialModule } from "../../../features/services/kinds/purejanitorial";
import type { JanitorialFormState } from "./janitorialTypes";

export {
  DEFAULT_SUPPLIES,
  DEFAULT_ADMIN_RATES,
  buildAdminRates,
  computeJanitorialCalc,
} from "../../../features/services/kinds/purejanitorial";

export type { JanitorialFormState };

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>) {
  const { form, setForm, updateForm, quote, config, refreshConfig, isLoadingConfig } =
    useServiceCalc(purejanitorialModule, initialData);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const value =
      type === "number"
        ? target.value === ""
          ? 0
          : Math.max(0, Number(target.value) || 0)
        : target.value;
    updateForm({ [name]: value } as Partial<JanitorialFormState>);
  };

  return {
    form,
    setForm,
    onChange,
    calc: quote,
    adminRates: config,
    refreshConfig,
    isLoadingConfig,
  };
}
