import React, { useEffect, useRef, useState } from "react";
import { useElectrostaticSprayCalc } from "./useElectrostaticSprayCalc";
import type { ElectrostaticSprayFormState } from "./electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "./electrostaticSprayConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import {
  ServiceCardShell,
  Banner,
  Checkbox,
  SelectField,
  CalculationRow,
  NotesField,
  RefreshButton,
} from "../../molecules";
import { useEditableCurrency } from "../../../features/services/engine";
import { FaCircle } from "react-icons/fa";

const FIELD_ORDER = {
  frequency: 1,
  combinedService: 5,
  service: 10,
  calculationMethod: 11,
  tripCharge: 12,
  totals: {
    perVisit: 20,
    monthlyRecurring: 22,
    recurringVisit: 24,
    contract: 25,
    minimum: 26,
    totalPrice: 27,
  },
} as const;

const formatNumber = (num: number): string =>
  num % 1 === 0 ? num.toString() : num.toFixed(2);

const FREQUENCY_OPTIONS = [
  { value: "oneTime", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly (every 2 weeks)" },
  { value: "twicePerMonth", label: "2× / Month" },
  { value: "monthly", label: "Monthly" },
  { value: "everyFourWeeks", label: "Every 4 Weeks" },
  { value: "bimonthly", label: "Bi-Monthly (every 2 months)" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Bi-Annual" },
  { value: "annual", label: "Annual" },
];

const VISIT_BASED_FREQUENCIES = new Set([
  "oneTime",
  "quarterly",
  "biannual",
  "annual",
  "bimonthly",
]);

export const ElectrostaticSprayForm: React.FC<
  ServiceInitialData<ElectrostaticSprayFormState>
> = ({ initialData, onRemove }) => {
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  const {
    form,
    setForm,
    onChange,
    calc,
    isLoadingConfig,
    refreshConfig,
    activeConfig,
  } = useElectrostaticSprayCalc(initialData, customFields);

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
  const isSanicleanAllInclusive = servicesContext?.isSanicleanAllInclusive ?? false;
  const prevDataRef = useRef<string>("");

  const serviceRate =
    form.pricingMethod === "byRoom" ? form.ratePerRoom : form.ratePerThousandSqFt;

  const { isVisitBasedFrequency } = calc;

  const generateContractMonths = () => {
    const months: number[] = [];
    if (form.frequency === "oneTime") return [];
    if (form.frequency === "bimonthly")
      for (let i = 2; i <= cfg.maxContractMonths; i += 2) months.push(i);
    else if (form.frequency === "quarterly")
      for (let i = 3; i <= cfg.maxContractMonths; i += 3) months.push(i);
    else if (form.frequency === "biannual")
      for (let i = 6; i <= cfg.maxContractMonths; i += 6) months.push(i);
    else if (form.frequency === "annual")
      for (let i = 12; i <= cfg.maxContractMonths; i += 12) months.push(i);
    else
      for (let i = cfg.minContractMonths; i <= cfg.maxContractMonths; i++)
        months.push(i);
    return months;
  };

  const contractMonthOptions = generateContractMonths();

  useEffect(() => {
    if (!servicesContext) return;
    const hasCustomFieldValues = customFields.some(
      (f) =>
        (f.type === "dollar" && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === "calc" &&
          !!f.calcValues?.right &&
          parseFloat(f.calcValues.right) > 0)
    );
    const isActive =
      form.roomCount > 0 || form.squareFeet > 0 || hasCustomFieldValues;

    const frequencyLabel =
      typeof form.frequency === "string"
        ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
        : String(form.frequency || "Weekly");
    const visitBasedFrequency = VISIT_BASED_FREQUENCIES.has(form.frequency);
    const totalPriceValue =
      form.customFirstMonthTotal !== undefined
        ? form.customFirstMonthTotal
        : calc.contractTotal;

    const data = isActive
      ? {
          serviceId: "electrostaticSpray",
          displayName: "Electrostatic Spray",
          isActive: true,
          ratePerRoom: form.customRatePerRoom ?? form.ratePerRoom,
          ratePerThousandSqFt:
            form.customRatePerThousandSqFt ?? form.ratePerThousandSqFt,
          tripChargePerVisit: form.customTripChargePerVisit ?? form.tripChargePerVisit,
          pricingMethod: form.pricingMethod,
          roomCount: form.roomCount,
          squareFeet: form.squareFeet,
          useExactCalculation: form.useExactCalculation,
          frequency: {
            isDisplay: true,
            orderNo: FIELD_ORDER.frequency,
            label: "Frequency",
            type: "text" as const,
            value: frequencyLabel,
            frequencyKey: form.frequency,
          },
          frequencyDisplay: {
            isDisplay: true,
            orderNo: FIELD_ORDER.frequency,
            label: "Frequency",
            type: "text" as const,
            value: frequencyLabel,
            frequencyKey: form.frequency,
          },
          contractMonths: form.contractMonths,
          isCombinedWithSaniClean: form.isCombinedWithSaniClean,
          applyMinimum: form.applyMinimum !== false,
          perVisitBase: calc.serviceCharge,
          perVisit: calc.perVisit,
          minimumChargePerVisit: calc.minimumChargePerVisit,
          pricingMethodDisplay: {
            isDisplay: true,
            label: "Pricing Method",
            type: "text" as const,
            value: form.pricingMethod === "byRoom" ? "By Room" : "By Square Feet",
          },
          ...(form.isCombinedWithSaniClean
            ? {
                combinedService: {
                  isDisplay: true,
                  orderNo: FIELD_ORDER.combinedService,
                  label: "Combined with",
                  type: "text" as const,
                  value: "Sani-Clean",
                },
              }
            : {}),
          service: {
            isDisplay: true,
            orderNo: FIELD_ORDER.service,
            label: form.pricingMethod === "byRoom" ? "Rooms" : "Square Feet",
            type: "calc" as const,
            qty: form.pricingMethod === "byRoom" ? form.roomCount : form.squareFeet,
            rate: serviceRate,
            total: calc.serviceCharge,
            unit: form.pricingMethod === "byRoom" ? "rooms" : "sq ft",
          },
          ...(form.pricingMethod === "bySqFt" && !form.useExactCalculation
            ? {
                calculationMethod: {
                  isDisplay: true,
                  orderNo: FIELD_ORDER.calculationMethod,
                  label: "Calculation Method",
                  type: "text" as const,
                  value: "Minimum Tier Pricing",
                },
              }
            : {}),
          ...(calc.tripCharge > 0
            ? {
                tripCharge: {
                  isDisplay: true,
                  orderNo: FIELD_ORDER.tripCharge,
                  label: "Trip Charge",
                  type: "dollar" as const,
                  amount: calc.tripCharge,
                },
              }
            : {}),
          totals: (() => {
            const totals: any = {
              perVisit: {
                isDisplay: true,
                orderNo: FIELD_ORDER.totals.perVisit,
                label: "Per Visit Total",
                type: "dollar" as const,
                amount: calc.perVisit,
              },
            };
            if (visitBasedFrequency) {
              totals.recurringVisit = {
                isDisplay: true,
                orderNo: FIELD_ORDER.totals.recurringVisit,
                label: "Recurring Visit Total",
                type: "dollar" as const,
                amount: calc.perVisit,
                gap: "normal",
              };
            } else {
              totals.monthlyRecurring = {
                isDisplay: true,
                orderNo: FIELD_ORDER.totals.monthlyRecurring,
                label: "Monthly Recurring",
                type: "dollar" as const,
                amount: calc.monthlyRecurring,
                gap: "normal",
              };
            }
            if (form.frequency !== "oneTime") {
              totals.contract = {
                isDisplay: true,
                orderNo: FIELD_ORDER.totals.contract,
                label: "Contract Total",
                type: "dollar" as const,
                months: form.contractMonths,
                amount: calc.contractTotal,
              };
            }
            if (form.frequency === "oneTime") {
              totals.totalPrice = {
                isDisplay: true,
                orderNo: FIELD_ORDER.totals.totalPrice,
                label: "Total Price",
                type: "dollar" as const,
                amount: totalPriceValue,
              };
            }
            totals.minimum = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.minimum,
              label: "Minimum",
              type: "dollar" as const,
              amount: calc.minimumChargePerVisit,
            };
            return totals;
          })(),
          notes: form.notes || "",
          customFields,
          contractTotal: calc.contractTotal,
          originalContractTotal: calc.originalContractTotal,
          ...(form.frequency === "oneTime" ? { totalPrice: totalPriceValue } : {}),
        }
      : null;

    const dataStr = JSON.stringify(data);
    if (dataStr !== prevDataRef.current) {
      prevDataRef.current = dataStr;
      servicesContext.updateService("electrostaticSpray", data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  useEffect(() => {
    const validMonths = generateContractMonths();
    if (!validMonths.includes(form.contractMonths)) {
      const closestMonth =
        validMonths.find((month) => month >= form.contractMonths) || validMonths[0];
      setForm((prev) => ({ ...prev, contractMonths: closestMonth }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.frequency]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customRatePerRoom: undefined,
      customRatePerThousandSqFt: undefined,
      customTripChargePerVisit: undefined,
      customServiceCharge: undefined,
      customPerVisitPrice: undefined,
      customMonthlyRecurring: undefined,
      customContractTotal: undefined,
      customFirstMonthTotal: undefined,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.roomCount,
    form.squareFeet,
    form.pricingMethod,
    form.useExactCalculation,
    form.frequency,
    form.contractMonths,
    form.isCombinedWithSaniClean,
  ]);

  return (
    <ServiceCardShell
      title="ELECTROSTATIC SPRAY"
      onAddCustom={() => setShowAddDropdown(!showAddDropdown)}
      onRemove={onRemove}
      headerActions={
        <RefreshButton onClick={() => refreshConfig(true)} loading={isLoadingConfig} />
      }
    >
      <div className="svc-card__inner">
        {isLoadingConfig && (
          <div className="svc-row">
            <div
              className="svc-field"
              style={{ textAlign: "center", padding: "10px", color: "#666" }}
            >
              Loading pricing configuration...
            </div>
          </div>
        )}

        <CustomFieldManager
          fields={customFields}
          onFieldsChange={setCustomFields}
          showAddDropdown={showAddDropdown}
          onToggleAddDropdown={setShowAddDropdown}
        />

        {isSanicleanAllInclusive && (
          <Banner
            tone="success"
            title="✓ INCLUDED in SaniClean All-Inclusive Package"
          >
            Electrostatic Spray is already included at no additional charge. This form
            is for reference only.
          </Banner>
        )}

        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <Checkbox
              name="isCombinedWithSaniClean"
              checked={form.isCombinedWithSaniClean}
              onChange={onChange as any}
              label="Combined with Sani-Clean"
              className=""
            />
          </div>
        </div>

        <div className="svc-row">
          <div className="svc-label">
            <span>Frequency</span>
          </div>
          <div className="svc-field">
            <SelectField
              label=""
              name="frequency"
              value={form.frequency}
              options={FREQUENCY_OPTIONS}
              onChange={onChange as any}
              className=""
            />
          </div>
        </div>

        <div className="svc-row">
          <div className="svc-label">
            <span>Pricing Method</span>
          </div>
          <div className="svc-field">
            <SelectField
              label=""
              name="pricingMethod"
              value={form.pricingMethod}
              options={[
                {
                  value: "byRoom",
                  label: `By Room ($${formatNumber(form.ratePerRoom)} per room)`,
                },
                {
                  value: "bySqFt",
                  label: `By Square Feet ($${formatNumber(
                    form.ratePerThousandSqFt
                  )} per ${activeConfig.standardSprayPricing.sqFtUnit} sq ft)`,
                },
              ]}
              onChange={onChange as any}
              className=""
            />
          </div>
        </div>

        <div className="svc-summary">
          {form.pricingMethod === "byRoom" && (
            <CalculationRow
              label="Room Calculation"
              qtyName="roomCount"
              qtyValue={form.roomCount || ""}
              qtyOnChange={onChange as any}
              qtyTitle="Number of rooms"
              rateName="customRatePerRoom"
              rateValue={editable.getDisplayValue(
                "customRatePerRoom",
                form.customRatePerRoom !== undefined
                  ? form.customRatePerRoom
                  : form.ratePerRoom
              )}
              rateOnChange={editable.onChange}
              rateOnFocus={editable.onFocus}
              rateOnBlur={editable.onBlur}
              rateOverridden={form.customRatePerRoom !== undefined}
              rateTitle="Rate per room (editable - changes calculation)"
              totalName="customServiceCharge"
              totalValue={editable.getDisplayValue(
                "customServiceCharge",
                form.customServiceCharge !== undefined
                  ? form.customServiceCharge
                  : calc.serviceCharge,
                true
              )}
              totalOnChange={editable.onChange}
              totalOnFocus={editable.onFocus}
              totalOnBlur={editable.onBlur}
              totalOverridden={form.customServiceCharge !== undefined}
              totalReadOnly
              totalTitle="Total service charge - editable"
            />
          )}

          {form.pricingMethod === "bySqFt" && (
            <CalculationRow
              label="Square Feet Calculation"
              qtyName="squareFeet"
              qtyValue={form.squareFeet || ""}
              qtyOnChange={onChange as any}
              qtyTitle="Total square feet"
              rateName="customRatePerThousandSqFt"
              rateValue={editable.getDisplayValue(
                "customRatePerThousandSqFt",
                form.customRatePerThousandSqFt !== undefined
                  ? form.customRatePerThousandSqFt
                  : form.ratePerThousandSqFt
              )}
              rateOnChange={editable.onChange}
              rateOnFocus={editable.onFocus}
              rateOnBlur={editable.onBlur}
              rateOverridden={form.customRatePerThousandSqFt !== undefined}
              rateTitle="Rate per 1000 sq ft (editable - changes calculation)"
              totalName="customServiceCharge"
              totalValue={editable.getDisplayValue(
                "customServiceCharge",
                form.customServiceCharge !== undefined
                  ? form.customServiceCharge
                  : calc.serviceCharge,
                true
              )}
              totalOnChange={editable.onChange}
              totalOnFocus={editable.onFocus}
              totalOnBlur={editable.onBlur}
              totalOverridden={form.customServiceCharge !== undefined}
              totalReadOnly
              totalTitle="Total service charge - editable"
            />
          )}

          {form.pricingMethod === "bySqFt" && (
            <div className="svc-row">
              <div className="svc-label" />
              <div className="svc-field">
                <Checkbox
                  name="useExactCalculation"
                  checked={form.useExactCalculation}
                  onChange={onChange as any}
                  label="Exact square feet calculation"
                  className=""
                />
                <div
                  className="svc-note"
                  style={{ marginTop: "4px", fontSize: "0.85em", color: "#666" }}
                >
                  {form.useExactCalculation
                    ? "Calculating for exact square feet entered"
                    : `Using minimum tier pricing (any amount ≤ ${activeConfig.standardSprayPricing.sqFtUnit} sq ft → ${activeConfig.standardSprayPricing.sqFtUnit} sq ft minimum, ${activeConfig.standardSprayPricing.sqFtUnit + 1} sq ft → ${activeConfig.standardSprayPricing.sqFtUnit * 2} sq ft tier, etc.)`}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="svc-summary">
          <div className="svc-row">
            <div className="svc-label">
              <span>Minimum Per Visit</span>
            </div>
            <div className="svc-field">
              <span className="svc-small">
                ${calc.minimumChargePerVisit?.toFixed(2) ?? "0.00"}
              </span>
              <span style={{ marginLeft: 10 }}>
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
            <div className="svc-label">
              <span>Per Visit Total</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                readOnly
                type="text"
                step="0.01"
                name="customPerVisitPrice"
                className="svc-in sm"
                value={editable.getDisplayValue(
                  "customPerVisitPrice",
                  form.customPerVisitPrice !== undefined
                    ? form.customPerVisitPrice
                    : calc.perVisit,
                  true
                )}
                onChange={editable.onChange}
                onFocus={editable.onFocus}
                onBlur={editable.onBlur}
                style={{
                  backgroundColor:
                    form.customPerVisitPrice !== undefined ? "#fffacd" : "white",
                }}
                title="Per visit total (service + trip) - editable"
              />
            </div>
          </div>

          {(form.roomCount > 0 || form.squareFeet > 0) && (
            <div className="svc-row" style={{ marginTop: "-10px", paddingTop: "5px" }}>
              <div className="svc-label" />
              <div className="svc-field">
                {calc.contractTotal > calc.originalContractTotal * 1.3 ? (
                  <span className="em-pricing-tier em-pricing-tier--green">
                    <FaCircle color="#16a34a" /> Greenline Pricing
                  </span>
                ) : (
                  <span className="em-pricing-tier em-pricing-tier--red">
                    <FaCircle color="#dc2626" /> Redline Pricing
                  </span>
                )}
              </div>
            </div>
          )}

          {!isVisitBasedFrequency && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Monthly Recurring</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="text"
                  step="0.01"
                  name="customMonthlyRecurring"
                  className="svc-in sm"
                  value={editable.getDisplayValue(
                    "customMonthlyRecurring",
                    form.customMonthlyRecurring !== undefined
                      ? form.customMonthlyRecurring
                      : calc.monthlyRecurring,
                    true
                  )}
                  onChange={editable.onChange}
                  onFocus={editable.onFocus}
                  onBlur={editable.onBlur}
                  style={{
                    backgroundColor:
                      form.customMonthlyRecurring !== undefined ? "#fffacd" : "white",
                  }}
                  title="Monthly recurring charge - editable"
                />
              </div>
            </div>
          )}

          {isVisitBasedFrequency && form.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Recurring Visit Total</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="text"
                  step="0.01"
                  name="customFirstMonthTotal"
                  className="svc-in sm"
                  value={editable.getDisplayValue(
                    "customFirstMonthTotal",
                    form.customFirstMonthTotal !== undefined
                      ? form.customFirstMonthTotal
                      : calc.perVisit,
                    true
                  )}
                  onChange={editable.onChange}
                  onFocus={editable.onFocus}
                  onBlur={editable.onBlur}
                  style={{
                    backgroundColor:
                      form.customFirstMonthTotal !== undefined ? "#fffacd" : "white",
                  }}
                  title="Recurring visit total - editable"
                />
              </div>
            </div>
          )}

          {form.frequency === "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Total Price</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="text"
                  step="0.01"
                  name="customFirstMonthTotal"
                  className="svc-in sm"
                  value={editable.getDisplayValue(
                    "customFirstMonthTotal",
                    form.customFirstMonthTotal !== undefined
                      ? form.customFirstMonthTotal
                      : calc.contractTotal,
                    true
                  )}
                  onChange={editable.onChange}
                  onFocus={editable.onFocus}
                  onBlur={editable.onBlur}
                  style={{
                    backgroundColor:
                      form.customFirstMonthTotal !== undefined ? "#fffacd" : "white",
                  }}
                  title="Total price for one-time service - editable"
                />
              </div>
            </div>
          )}

          {form.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>Contract Total</span>
              </div>
              <div
                className="svc-field"
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <select
                  name="contractMonths"
                  className="svc-in"
                  value={form.contractMonths}
                  disabled
                >
                  {contractMonthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "18px", fontWeight: "bold" }}>$</span>
                <input
                  readOnly
                  type="text"
                  step="0.01"
                  name="customContractTotal"
                  className="svc-in sm"
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
                      form.customContractTotal !== undefined
                        ? "#fffacd"
                        : "transparent",
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

          <NotesField
            name="notes"
            value={form.notes ?? ""}
            onChange={onChange as any}
          />
        </div>
      </div>
    </ServiceCardShell>
  );
};
