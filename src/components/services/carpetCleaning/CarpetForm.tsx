import React, { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useCarpetCalc } from "./useCarpetCalc";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  carpetFrequencyLabels,
  carpetFrequencyList,
  getContractOptions,
} from "./carpetConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import {
  ServiceCardShell,
  RefreshButton,
  Checkbox,
  SelectField,
} from "../../molecules";
import { useEditableCurrency } from "../../../features/services/engine";

const FIELD_ORDER = {
  frequency: 1,
  location: 2,
  service: 3,
  installation: 4,
  perVisit: 5,
  firstMonth: 6,
  recurringVisit: 7,
  recurringMonth: 8,
  contract: 9,
  totalPrice: 10,
};

const MONTHLY_RECURRING_FREQS: CarpetFrequency[] = [
  "weekly",
  "biweekly",
  "twicePerMonth",
  "monthly",
];
const VISIT_BASED_RECURRING_FREQS: CarpetFrequency[] = [
  "bimonthly",
  "quarterly",
  "biannual",
  "annual",
  "everyFourWeeks",
];

const resolveCarpetFrequency = (value: string): CarpetFrequency => {
  if (carpetFrequencyList.includes(value as CarpetFrequency)) {
    return value as CarpetFrequency;
  }
  const normalized = value?.trim().toLowerCase() || "";
  const match = carpetFrequencyList.find(
    (freq) => carpetFrequencyLabels[freq].toLowerCase() === normalized
  );
  return match || "monthly";
};

const overrideStyle = (overridden: boolean): React.CSSProperties => ({
  backgroundColor: overridden ? "#fffacd" : "white",
});

export const CarpetForm: React.FC<ServiceInitialData<CarpetFormState>> = ({
  initialData,
  onQuoteChange,
  onRemove,
}) => {
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  const { form, setForm, onChange, quote, calc, refreshConfig, isLoadingConfig } =
    useCarpetCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();
  const editable = useEditableCurrency(onChange as any);

  useEffect(() => {
    if (
      servicesContext?.globalContractMonths &&
      servicesContext.globalContractMonths !== form.contractMonths
    ) {
      setForm({ ...form, contractMonths: servicesContext.globalContractMonths });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesContext?.globalContractMonths]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (!servicesContext) return;
    const resolvedFrequency = resolveCarpetFrequency(form.frequency);
    const hasCustomFieldValues = customFields.some(
      (f) =>
        (f.type === "dollar" && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === "calc" &&
          !!f.calcValues?.right &&
          parseFloat(f.calcValues.right) > 0)
    );
    const isActive = (form.areaSqFt ?? 0) > 0 || hasCustomFieldValues;
    const shouldShowMonthlyRecurring = MONTHLY_RECURRING_FREQS.includes(resolvedFrequency);
    const shouldShowVisitRecurring = VISIT_BASED_RECURRING_FREQS.includes(resolvedFrequency);
    const displayFrequencyLabel =
      carpetFrequencyLabels[resolvedFrequency] || resolvedFrequency;

    const totalLabel =
      resolvedFrequency === "oneTime"
        ? "Total Price"
        : shouldShowVisitRecurring
        ? "First Visit Total"
        : "First Month Total";
    const totalAmount =
      resolvedFrequency === "oneTime"
        ? form.customFirstMonthPrice !== undefined
          ? form.customFirstMonthPrice
          : calc.contractTotal
        : calc.firstMonthTotal;

    const totals: any = {
      perVisit: {
        isDisplay: true,
        orderNo: FIELD_ORDER.perVisit,
        label: "Per Visit Total",
        type: "dollar" as const,
        amount: calc.perVisitCharge,
      },
      firstMonth: {
        isDisplay: true,
        orderNo: FIELD_ORDER.firstMonth,
        label: totalLabel,
        type: "dollar" as const,
        amount: totalAmount,
      },
    };
    if (resolvedFrequency === "oneTime") {
      totals.totalPrice = {
        isDisplay: true,
        orderNo: FIELD_ORDER.totalPrice,
        label: "Total Price",
        type: "dollar" as const,
        amount: totalAmount,
      };
    }
    if (shouldShowMonthlyRecurring) {
      totals.monthlyRecurring = {
        isDisplay: true,
        orderNo: FIELD_ORDER.recurringMonth,
        label: "Monthly Recurring",
        type: "dollar" as const,
        amount: calc.monthlyTotal,
        gap: "normal",
      };
    }
    if (shouldShowVisitRecurring) {
      totals.recurringVisit = {
        isDisplay: true,
        orderNo: FIELD_ORDER.recurringVisit,
        label: "Recurring Visit Total",
        type: "dollar" as const,
        amount: calc.perVisitCharge,
        gap: "normal",
      };
    }
    if (resolvedFrequency !== "oneTime") {
      totals.contract = {
        isDisplay: true,
        orderNo: FIELD_ORDER.contract,
        label: "Contract Total",
        type: "dollar" as const,
        months: form.contractMonths,
        amount: calc.contractTotal,
      };
    }

    const data = isActive
      ? {
          serviceId: "carpetclean",
          displayName: "Carpet Cleaning",
          isActive: true,
          firstUnitRate: form.customFirstUnitRate ?? form.firstUnitRate,
          additionalUnitRate: form.customAdditionalUnitRate ?? form.additionalUnitRate,
          perVisitMinimum: form.customPerVisitMinimum ?? form.perVisitMinimum,
          installMultiplierDirty: form.installMultiplierDirty,
          installMultiplierClean: form.installMultiplierClean,
          unitSqFt: form.unitSqFt,
          useExactSqft: form.useExactSqft,
          applyMinimum: form.applyMinimum !== false,
          areaSqFt: form.areaSqFt,
          contractMonths: form.contractMonths,
          includeInstall: form.includeInstall,
          isDirtyInstall: form.isDirtyInstall,
          location: {
            isDisplay: false,
            orderNo: FIELD_ORDER.location,
            label: "Location",
            type: "text" as const,
            value:
              form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
          },
          contractTotal: calc.contractTotal,
          originalContractTotal: calc.originalContractTotal,
          perVisitBase: calc.perVisitBase,
          perVisitCharge: calc.perVisitCharge,
          frequency: {
            isDisplay: true,
            orderNo: FIELD_ORDER.frequency,
            label: "Frequency",
            type: "text" as const,
            value: displayFrequencyLabel,
            frequencyKey: resolvedFrequency,
          },
          service: {
            isDisplay: true,
            orderNo: FIELD_ORDER.service,
            label: "Carpet Area",
            type: "calc" as const,
            qty: form.areaSqFt,
            rate: form.customFirstUnitRate ?? form.firstUnitRate,
            total: calc.perVisitCharge,
            unit: "sq ft",
          },
          ...(form.includeInstall
            ? {
                installation: {
                  isDisplay: true,
                  orderNo: FIELD_ORDER.installation,
                  label: form.isDirtyInstall ? "Installation" : "Installation",
                  type: "calc" as const,
                  qty: 1,
                  rate: calc.installOneTime,
                  total: calc.installOneTime,
                  multiplier: form.isDirtyInstall
                    ? form.installMultiplierDirty
                    : form.installMultiplierClean,
                  isDirty: form.isDirtyInstall,
                },
              }
            : {}),
          totals,
          notes: form.notes || "",
          customFields,
          pdfFieldVisibility: {
            location: false,
            useExactSqft: false,
            includeInstall: false,
            isDirtyInstall: false,
          },
        }
      : null;

    const dataStr = JSON.stringify(data);
    if (dataStr !== prevDataRef.current) {
      prevDataRef.current = dataStr;
      servicesContext.updateService("carpetclean" as any, data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  React.useEffect(() => {
    if (onQuoteChange) onQuoteChange(quote);
  }, [onQuoteChange, quote]);

  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      customPerVisitPrice: undefined,
      customInstallationFee: undefined,
      customMonthlyRecurring: undefined,
      customFirstMonthPrice: undefined,
      customContractTotal: undefined,
    }));
  }, [
    form.areaSqFt,
    form.useExactSqft,
    form.frequency,
    form.contractMonths,
    form.includeInstall,
    form.isDirtyInstall,
    setForm,
  ]);

  return (
    <ServiceCardShell
      title="CARPET CLEANING"
      onAddCustom={() => setShowAddDropdown(!showAddDropdown)}
      onRemove={onRemove}
      headerActions={
        <RefreshButton onClick={refreshConfig} loading={isLoadingConfig} />
      }
    >
      {isLoadingConfig && (
        <div className="svc-loading-overlay">
          <div className="svc-loading-spinner">
            <span className="svc-sr-only">Loading configuration...</span>
          </div>
          <p className="svc-loading-text">Loading configuration...</p>
        </div>
      )}

      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      <div className="svc-row">
        <label>Frequency</label>
        <div className="svc-row-right">
          <SelectField
            label=""
            name="frequency"
            value={form.frequency}
            options={Object.entries(carpetFrequencyLabels).map(([value, label]) => ({
              value,
              label: label as string,
            }))}
            onChange={onChange as any}
            className=""
          />
        </div>
      </div>

      <div className="svc-row">
        <label>First {form.unitSqFt || 500} sq ft Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="customFirstUnitRate"
              value={editable.getDisplayValue(
                "customFirstUnitRate",
                form.customFirstUnitRate !== undefined
                  ? form.customFirstUnitRate
                  : form.firstUnitRate
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={overrideStyle(form.customFirstUnitRate !== undefined)}
              title={`Rate for first ${form.unitSqFt || 500} sq ft (from backend, editable)`}
            />
          </div>
          <span className="svc-small">
            / {form.unitSqFt || 500} sq ft ($
            {(
              ((form.customFirstUnitRate ?? form.firstUnitRate) || 250) /
              (form.unitSqFt || 500)
            ).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            /sq ft)
          </span>
        </div>
      </div>

      <div className="svc-row">
        <label>Additional Rate</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="customAdditionalUnitRate"
              value={editable.getDisplayValue(
                "customAdditionalUnitRate",
                form.customAdditionalUnitRate !== undefined
                  ? form.customAdditionalUnitRate
                  : form.additionalUnitRate
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={overrideStyle(form.customAdditionalUnitRate !== undefined)}
              title={`Rate per additional ${form.unitSqFt || 500} sq ft block (from backend, editable)`}
            />
          </div>
          <span className="svc-small">
            / {form.unitSqFt || 500} sq ft ($
            {(
              ((form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125) /
              (form.unitSqFt || 500)
            ).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            /sq ft)
          </span>
        </div>
      </div>

      <div className="svc-row">
        <label>Minimum Charge</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="customPerVisitMinimum"
              value={editable.getDisplayValue(
                "customPerVisitMinimum",
                form.customPerVisitMinimum !== undefined
                  ? form.customPerVisitMinimum
                  : form.perVisitMinimum
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={overrideStyle(form.customPerVisitMinimum !== undefined)}
              title="Minimum charge per visit (from backend, editable)"
            />
          </div>
          <span className="svc-small">/ visit</span>
          <span style={{ marginLeft: "10px" }}>
            <Checkbox
              name="applyMinimum"
              checked={form.applyMinimum !== false}
              onChange={onChange as any}
              label="Apply Minimum"
            />
          </span>
        </div>
      </div>

      <div className="svc-row">
        <label>Carpet Area</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="areaSqFt"
            value={form.areaSqFt || ""}
            onChange={onChange as any}
          />
          <span className="svc-small">sq ft</span>
          <span>@</span>
          <span className="svc-small">
            {form.areaSqFt > 0 && form.areaSqFt <= (form.unitSqFt || 500)
              ? `first ${form.unitSqFt || 500} rate`
              : `calculated rate`}
          </span>
          <span>=</span>
          <div className="svc-dollar field-qty">
            <span>$</span>
            <input
              className="svc-in-box"
              type="text"
              readOnly
              name="customPerVisitPrice"
              value={editable.getDisplayValue(
                "customPerVisitPrice",
                form.customPerVisitPrice !== undefined
                  ? form.customPerVisitPrice
                  : calc.perVisitCharge,
                true
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={overrideStyle(form.customPerVisitPrice !== undefined)}
              title="Per visit total (editable)"
            />
          </div>
        </div>
      </div>

      <div className="svc-row">
        <label>Calculation Method</label>
        <div className="svc-row-right">
          <Checkbox
            name="useExactSqft"
            checked={form.useExactSqft}
            onChange={onChange as any}
            label="Exact sq ft calculation"
          />
          <small style={{ color: "#666", fontSize: "11px", marginLeft: "10px" }}>
            {form.useExactSqft
              ? `(Excess × $${(
                  ((form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125) /
                  (form.unitSqFt || 500)
                ).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}/sq ft)`
              : `(Excess in ${form.unitSqFt || 500} sq ft blocks × $${
                  (form.customAdditionalUnitRate ?? form.additionalUnitRate) || 125
                })`}
          </small>
        </div>
      </div>

      <div className="svc-row">
        <label>Installation</label>
        <div className="svc-row-right">
          <Checkbox
            name="includeInstall"
            checked={form.includeInstall}
            onChange={onChange as any}
            label="Include Install"
          />
          {form.includeInstall && (
            <>
              <Checkbox
                name="isDirtyInstall"
                checked={form.isDirtyInstall}
                onChange={onChange as any}
                label="Dirty"
              />
              <div className="svc-dollar">
                <span>×</span>
                <input
                  className="svc-in"
                  type="number"
                  min="0"
                  step={1}
                  name={
                    form.isDirtyInstall
                      ? "installMultiplierDirty"
                      : "installMultiplierClean"
                  }
                  value={
                    form.isDirtyInstall
                      ? form.installMultiplierDirty || ""
                      : form.installMultiplierClean || ""
                  }
                  onChange={onChange as any}
                  title={`${form.isDirtyInstall ? "Dirty" : "Clean"} install multiplier (from backend)`}
                />
              </div>
              <span className="svc-small">monthly base</span>
            </>
          )}
        </div>
      </div>

      {form.includeInstall && calc.installOneTime > 0 && (
        <div className="svc-row svc-row-charge">
          <label>Installation Total</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                name="customInstallationFee"
                value={editable.getDisplayValue(
                  "customInstallationFee",
                  form.customInstallationFee !== undefined
                    ? form.customInstallationFee
                    : calc.installOneTime,
                  true
                )}
                onChange={editable.onChange}
                onFocus={editable.onFocus}
                onBlur={editable.onBlur}
                style={overrideStyle(form.customInstallationFee !== undefined)}
                title="Installation fee total (editable)"
              />
            </div>
          </div>
        </div>
      )}

      <div className="svc-row svc-row-total">
        <label>
          {form.frequency === "bimonthly" ||
          form.frequency === "quarterly" ||
          form.frequency === "biannual" ||
          form.frequency === "annual"
            ? "Recurring Visit Total"
            : "Per Visit Total"}
        </label>
        <div className="svc-dollar">
          $
          <input
            type="text"
            readOnly
            name="customPerVisitPrice"
            className="svc-in svc-in-small"
            value={editable.getDisplayValue(
              "customPerVisitPrice",
              form.customPerVisitPrice !== undefined
                ? form.customPerVisitPrice
                : calc.perVisitCharge,
              true
            )}
            onChange={editable.onChange}
            onFocus={editable.onFocus}
            onBlur={editable.onBlur}
            style={{
              ...overrideStyle(form.customPerVisitPrice !== undefined),
              border: "none",
              width: "100px",
            }}
            title={
              form.frequency === "bimonthly" ||
              form.frequency === "quarterly" ||
              form.frequency === "biannual" ||
              form.frequency === "annual"
                ? "Recurring visit total - editable"
                : "Per visit total - editable"
            }
          />
        </div>
      </div>

      {form.areaSqFt > 0 && (
        <div className="svc-row" style={{ marginTop: "-10px", paddingTop: "5px" }}>
          <label></label>
          <div className="svc-row-right">
            {calc.contractTotal > calc.originalContractTotal * 1.3 ? (
              <span className="em-pricing-tier em-pricing-tier--green">
                🟢 Greenline Pricing
              </span>
            ) : (
              <span className="em-pricing-tier em-pricing-tier--red">
                🔴 Redline Pricing
              </span>
            )}
          </div>
        </div>
      )}

      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Total Price</label>
          <div className="svc-dollar">
            $
            <input
              type="text"
              readOnly
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={editable.getDisplayValue(
                "customFirstMonthPrice",
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.contractTotal,
                true
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={{
                ...overrideStyle(form.customFirstMonthPrice !== undefined),
                border: "none",
                width: "100px",
              }}
            />
          </div>
        </div>
      )}

      {calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Visit Total</label>
          <div className="svc-dollar">
            $
            <input
              type="text"
              readOnly
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={editable.getDisplayValue(
                "customFirstMonthPrice",
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal,
                true
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={{
                ...overrideStyle(form.customFirstMonthPrice !== undefined),
                border: "none",
                width: "100px",
              }}
              title="First visit total - editable"
            />
          </div>
        </div>
      )}

      {!calc.isVisitBasedFrequency && form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>First Month Total</label>
          <div className="svc-dollar">
            $
            <input
              type="text"
              readOnly
              name="customFirstMonthPrice"
              className="svc-in svc-in-small"
              value={editable.getDisplayValue(
                "customFirstMonthPrice",
                form.customFirstMonthPrice !== undefined
                  ? form.customFirstMonthPrice
                  : calc.firstMonthTotal,
                true
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={{
                ...overrideStyle(form.customFirstMonthPrice !== undefined),
                border: "none",
                width: "100px",
              }}
              title="First month total - editable"
            />
          </div>
        </div>
      )}

      {(form.frequency === "weekly" ||
        form.frequency === "biweekly" ||
        form.frequency === "monthly" ||
        form.frequency === "twicePerMonth") && (
        <div className="svc-row svc-row-total">
          <label>Recurring Month Total</label>
          <div className="svc-dollar">
            $
            <input
              type="text"
              readOnly
              name="customMonthlyRecurring"
              className="svc-in svc-in-small"
              value={editable.getDisplayValue(
                "customMonthlyRecurring",
                form.customMonthlyRecurring !== undefined
                  ? form.customMonthlyRecurring
                  : calc.monthlyTotal,
                true
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={{
                ...overrideStyle(form.customMonthlyRecurring !== undefined),
                border: "none",
                width: "100px",
              }}
              title="Recurring month total - editable"
            />
          </div>
        </div>
      )}

      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>Contract Total</label>
          <div
            className="svc-row-right"
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths}
              disabled
            >
              {getContractOptions(form.frequency).map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
            <span style={{ fontSize: "18px", fontWeight: "bold" }}>$</span>
            <input
              type="text"
              readOnly
              name="customContractTotal"
              className="svc-in"
              value={editable.getDisplayValue(
                "customContractTotal",
                form.customContractTotal !== undefined
                  ? form.customContractTotal
                  : calc.contractTotal,
                true
              )}
              onChange={editable.onChange}
              onFocus={editable.onFocus}
              onBlur={editable.onBlur}
              style={{
                borderBottom: "2px solid #ff0000",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                backgroundColor:
                  form.customContractTotal !== undefined ? "#fffacd" : "transparent",
                fontSize: "16px",
                fontWeight: "bold",
                padding: "4px",
                width: "140px",
              }}
              title="Contract total - editable"
            />
          </div>
        </div>
      )}
    </ServiceCardShell>
  );
};
