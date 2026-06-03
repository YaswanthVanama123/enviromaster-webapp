import { useMemo } from "react";
import type { ChangeEvent } from "react";
import { useServiceCalc } from "../../../features/services/engine";
import { janitorialModule } from "../../../features/services/kinds/janitorial";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";
import type {
  JanitorialFormState,
  JanitorialQuoteResult,
} from "./janitorialTypes";

const LOG_TRIGGER_FIELDS = new Set([
  "hoursPerWeek",
  "weeksPerMonth",
  "contractMonths",
  "squareFootage",
  "frequency",
  "serviceType",
  "rateTier",
  "includesVacuuming",
  "includesDusting",
  "includesRestroom",
  "includesKitchen",
  "includesTrash",
  "includesWindows",
]);

export function useJanitorialCalc(initial?: Partial<JanitorialFormState>) {
  const {
    form,
    setForm,
    quote: calc,
    config: backendConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(janitorialModule, initial);

  const updateField = <K extends keyof JanitorialFormState>(
    field: K,
    value: JanitorialFormState[K]
  ) => {
    const originalValue = form[field];
    setForm((prev) => ({ ...prev, [field]: value }));

    if (LOG_TRIGGER_FIELDS.has(field as string)) {
      logServiceFieldChanges(
        "janitorial",
        "Janitorial",
        { [field]: value },
        { [field]: originalValue },
        [field as string],
        (form as any).hoursPerWeek || 1,
        form.frequency || "weekly"
      );
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const value =
      type === "checkbox"
        ? (target as HTMLInputElement).checked
        : type === "number"
        ? parseFloat(target.value) || 0
        : target.value;
    updateField(name as keyof JanitorialFormState, value as never);
  };

  const quote = useMemo(
    () =>
      ({
        serviceId: "janitorial",
        displayName: "Janitorial Services",
        perVisitPrice: calc.perVisit,
        monthlyTotal: calc.monthlyTotal,
        contractTotal: calc.contractTotal,
        detailsBreakdown: [
          `Base service: ${form.baseHours} hrs @ $${(
            form.serviceType === "recurringService"
              ? form.recurringServiceRate
              : form.oneTimeServiceRate
          ).toFixed(2)}/hr`,
          `Vacuuming: ${form.vacuumingHours} hrs @ $${form.vacuumingRatePerHour.toFixed(2)}/hr`,
          `Dusting: ${form.dustingHours} hrs @ $${form.dustingRatePerHour.toFixed(2)}/hr`,
          `Frequency: ${form.frequency}`,
        ],
      } as unknown as JanitorialQuoteResult),
    [form, calc]
  );

  return {
    form,
    setForm,
    updateField,
    onChange,
    calc,
    quote,
    backendConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  };
}
