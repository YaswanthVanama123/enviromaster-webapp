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
import { useTranslation } from "react-i18next";

const FREQUENCY_KEYS = [
  "one-time",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
] as const;

const FREQUENCY_TKEY: Record<string, string> = {
  "one-time": "oneTime",
  daily: "daily",
  weekly: "weekly",
  biweekly: "biweekly",
  monthly: "monthly",
};

export const GreaseTrapForm: React.FC<{
  initialData?: GreaseTrapFormState;
  onRemove?: () => void;
}> = ({ initialData, onRemove }) => {
  const { t } = useTranslation();
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
      title={t("serviceForms.greaseTrap.title")}
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
            label={t("serviceForms.greaseTrap.numberOfTraps")}
            name="numberOfTraps"
            value={form.numberOfTraps || ""}
            onChange={handleChange as any}
          />

          <NumberField
            label={t("serviceForms.greaseTrap.sizeOfTraps")}
            name="sizeOfTraps"
            value={form.sizeOfTraps || ""}
            onChange={handleChange as any}
          />

          <SelectField
            label={t("serviceForms.common.frequency")}
            name="frequency"
            value={form.frequency}
            options={FREQUENCY_KEYS.map((value) => ({
              value,
              label: t(`serviceForms.greaseTrap.freq.${FREQUENCY_TKEY[value]}`),
            }))}
            onChange={handleChange as any}
          />

          <div className="svc-summary">
            <DollarField
              label={t("serviceForms.greaseTrap.ratePerTrap")}
              name="perTrapRate"
              value={form.perTrapRate || ""}
              onChange={handleChange as any}
              title={t("serviceForms.greaseTrap.ratePerTrapTitle")}
            />
            <DollarField
              label={t("serviceForms.greaseTrap.ratePerGallon")}
              name="perGallonRate"
              value={form.perGallonRate || ""}
              onChange={handleChange as any}
              title={t("serviceForms.greaseTrap.ratePerGallonTitle")}
            />
          </div>

          <TextField
            label={t("serviceForms.common.notes")}
            name="notes"
            value={form.notes ?? ""}
            onChange={handleChange as any}
          />
        </div>

        <div className="svc-col">
          <ServiceTotals
            rows={[
              { label: t("serviceForms.greaseTrap.perVisit"), amount: quote.perVisitPrice },
              { label: t("serviceForms.greaseTrap.annualPrice"), amount: quote.annualPrice },
            ]}
            breakdown={quote.detailsBreakdown}
          />
        </div>
      </div>
    </ServiceCardShell>
  );
};
