import { useCallback } from "react";
import type { ChangeEvent } from "react";
import { useServiceCalc } from "../../../features/services/engine";
import { greaseTrapModule } from "../../../features/services/kinds/greaseTrap";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";
import type { GreaseTrapFormState } from "./greaseTrapTypes";

export function useGreaseTrapCalc(initialData: GreaseTrapFormState) {
  const {
    form,
    setForm,
    updateForm,
    quote,
    config,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(greaseTrapModule, initialData);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      const original = form[name as keyof GreaseTrapFormState];

      let patch: Partial<GreaseTrapFormState> | null = null;
      if (name === "numberOfTraps") patch = { numberOfTraps: Number(value) || 0 };
      else if (name === "sizeOfTraps") patch = { sizeOfTraps: Number(value) || 0 };
      else if (name === "frequency")
        patch = { frequency: value as GreaseTrapFormState["frequency"] };
      else if (name === "contractMonths")
        patch = { contractMonths: Number(value) || 12 };
      else if (name === "notes") patch = { notes: value };
      else if (name === "perTrapRate") patch = { perTrapRate: Number(value) || 0 };
      else if (name === "perGallonRate") patch = { perGallonRate: Number(value) || 0 };

      if (!patch) return;
      updateForm(patch);

      const allFormFields = ["trapsQuantity", "gallonsPerTrap", "frequency", "rateTier"];
      if (allFormFields.includes(name)) {
        logServiceFieldChanges(
          "greaseTrap",
          "Grease Trap",
          { [name]: (patch as Record<string, unknown>)[name] },
          { [name]: original },
          [name],
          (form.numberOfTraps as number) || 1,
          form.frequency || "monthly"
        );
      }
    },
    [form, updateForm]
  );

  return {
    form,
    setForm,
    handleChange,
    quote,
    backendConfig: config,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  };
}
