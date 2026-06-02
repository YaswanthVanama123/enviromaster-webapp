import React, { useEffect, useRef, useState } from "react";
import { useGreaseTrapCalc } from "./useGreaseTrapCalc";
import type { GreaseTrapFormState } from "./greaseTrapTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import {
  ServiceCardShell,
  ServiceTotals,
  NumberField,
  SelectField,
  DollarField,
  TextField,
} from "../../molecules";

const FREQUENCY_OPTIONS = [
  { value: "one-time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

export const GreaseTrapForm: React.FC<{
  initialData?: GreaseTrapFormState;
  onRemove?: () => void;
}> = ({ initialData, onRemove }) => {
  const { form, handleChange, quote } = useGreaseTrapCalc(initialData!);
  const servicesContext = useServicesContextOptional();

  useEffect(() => {
    if (
      servicesContext?.globalContractMonths &&
      servicesContext.globalContractMonths !== form.contractMonths
    ) {
      handleChange({
        target: {
          name: "contractMonths",
          value: String(servicesContext.globalContractMonths),
        },
      } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesContext?.globalContractMonths]);

  const [customFields, setCustomFields] = useState<CustomField[]>(
    (initialData as any)?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (!servicesContext) return;

    const hasCustomFieldValues = customFields.some(
      (f) =>
        (f.type === "dollar" && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === "calc" && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
    );
    const customFieldsTotal = customFields.reduce((sum, f) => {
      if (f.type === "dollar" && f.value) return sum + (parseFloat(f.value) || 0);
      if (f.type === "calc" && f.calcValues?.right)
        return sum + (parseFloat(f.calcValues.right) || 0);
      return sum;
    }, 0);
    const isActive = (form.numberOfTraps ?? 0) > 0 || hasCustomFieldValues;

    const data = isActive
      ? {
          serviceId: "greaseTrap",
          displayName: "Grease Trap",
          isActive: true,
          perVisitBase:
            form.numberOfTraps * form.perTrapRate +
            form.sizeOfTraps * form.perGallonRate,
          perVisit: (quote as any).perVisitTotal,
          minimumChargePerVisit: 0,
          frequency: {
            label: "Frequency",
            type: "text" as const,
            value:
              typeof form.frequency === "string"
                ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
                : String(form.frequency || ""),
          },
          service: {
            label: "Grease Traps",
            type: "calc" as const,
            qty: form.numberOfTraps,
            rate: form.perTrapRate || 0,
            total: (quote as any).perVisitTotal,
          },
          totals: {
            perVisit: {
              label: "Per Visit Total",
              type: "dollar" as const,
              amount: (quote as any).perVisitTotal,
            },
            monthly: {
              label: "Monthly Total",
              type: "dollar" as const,
              amount: (quote as any).monthlyTotal,
            },
            contract: {
              label: "Contract Total",
              type: "dollar" as const,
              months: form.contractMonths,
              amount: (quote as any).contractTotal + customFieldsTotal,
            },
          },
          contractTotal: (quote as any).contractTotal + customFieldsTotal,
          notes: form.notes || "",
          customFields,
        }
      : null;

    const dataStr = JSON.stringify(data);
    if (dataStr !== prevDataRef.current) {
      prevDataRef.current = dataStr;
      servicesContext.updateService("greaseTrap" as any, data);
    }
  }, [form, quote, customFields, servicesContext]);

  return (
    <ServiceCardShell
      title="GREASE TRAP"
      onAddCustom={() => setShowAddDropdown(!showAddDropdown)}
      onRemove={onRemove}
    >
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      <div className="svc-row">
        <div className="svc-col">
          <NumberField
            label="Number of traps"
            name="numberOfTraps"
            value={form.numberOfTraps || ""}
            onChange={handleChange as any}
          />

          <NumberField
            label="Size of traps (gallons)"
            name="sizeOfTraps"
            value={form.sizeOfTraps || ""}
            onChange={handleChange as any}
          />

          <SelectField
            label="Frequency"
            name="frequency"
            value={form.frequency}
            options={FREQUENCY_OPTIONS}
            onChange={handleChange as any}
          />

          <div className="svc-summary">
            <DollarField
              label="Rate per trap"
              name="perTrapRate"
              value={form.perTrapRate || ""}
              onChange={handleChange as any}
              title="Rate charged per trap (editable)"
            />
            <DollarField
              label="Rate per gallon"
              name="perGallonRate"
              value={form.perGallonRate || ""}
              onChange={handleChange as any}
              title="Rate charged per gallon (editable)"
            />
          </div>

          <TextField
            label="Notes"
            name="notes"
            value={form.notes ?? ""}
            onChange={handleChange as any}
          />
        </div>

        <div className="svc-col">
          <ServiceTotals
            rows={[
              { label: "Per Visit", amount: quote.perVisitPrice },
              { label: "Annual Price", amount: quote.annualPrice },
            ]}
            breakdown={quote.detailsBreakdown}
          />
        </div>
      </div>
    </ServiceCardShell>
  );
};
