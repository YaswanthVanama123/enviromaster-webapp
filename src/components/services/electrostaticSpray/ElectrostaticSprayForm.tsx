import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  const FREQUENCY_OPTIONS = [
    { value: "oneTime", label: t("serviceForms.electrostatic.freq.oneTime") },
    { value: "weekly", label: t("serviceForms.electrostatic.freq.weekly") },
    { value: "biweekly", label: t("serviceForms.electrostatic.freq.biweekly") },
    { value: "twicePerMonth", label: t("serviceForms.electrostatic.freq.twicePerMonth") },
    { value: "monthly", label: t("serviceForms.electrostatic.freq.monthly") },
    { value: "everyFourWeeks", label: t("serviceForms.electrostatic.freq.everyFourWeeks") },
    { value: "bimonthly", label: t("serviceForms.electrostatic.freq.bimonthly") },
    { value: "quarterly", label: t("serviceForms.electrostatic.freq.quarterly") },
    { value: "biannual", label: t("serviceForms.electrostatic.freq.biannual") },
    { value: "annual", label: t("serviceForms.electrostatic.freq.annual") },
  ];

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
      title={t("serviceForms.electrostatic.title")}
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
              {t("serviceForms.common.loadingPricingConfiguration")}
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
            title={t("serviceForms.electrostatic.includedTitle")}
          >
            {t("serviceForms.electrostatic.includedBody")}
          </Banner>
        )}

        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <Checkbox
              name="isCombinedWithSaniClean"
              checked={form.isCombinedWithSaniClean}
              onChange={onChange as any}
              label={t("serviceForms.electrostatic.combinedWithSaniClean")}
              className=""
            />
          </div>
        </div>

        <div className="svc-row">
          <div className="svc-label">
            <span>{t("serviceForms.common.frequency")}</span>
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
            <span>{t("serviceForms.electrostatic.pricingMethod")}</span>
          </div>
          <div className="svc-field">
            <SelectField
              label=""
              name="pricingMethod"
              value={form.pricingMethod}
              options={[
                {
                  value: "byRoom",
                  label: t("serviceForms.electrostatic.byRoomOption", { rate: formatNumber(form.ratePerRoom) }),
                },
                {
                  value: "bySqFt",
                  label: t("serviceForms.electrostatic.bySqFtOption", { rate: formatNumber(form.ratePerThousandSqFt), unit: activeConfig.standardSprayPricing.sqFtUnit }),
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
              label={t("serviceForms.electrostatic.roomCalculation")}
              qtyName="roomCount"
              qtyValue={form.roomCount || ""}
              qtyOnChange={onChange as any}
              qtyTitle={t("serviceForms.electrostatic.roomCount")}
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
              rateTitle={t("serviceForms.electrostatic.ratePerRoomTitle")}
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
              totalTitle={t("serviceForms.electrostatic.totalServiceChargeTitle")}
            />
          )}

          {form.pricingMethod === "bySqFt" && (
            <CalculationRow
              label={t("serviceForms.electrostatic.squareFeetCalculation")}
              qtyName="squareFeet"
              qtyValue={form.squareFeet || ""}
              qtyOnChange={onChange as any}
              qtyTitle={t("serviceForms.electrostatic.totalSquareFeet")}
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
              rateTitle={t("serviceForms.electrostatic.ratePerThousandTitle")}
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
              totalTitle={t("serviceForms.electrostatic.totalServiceChargeTitle")}
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
                  label={t("serviceForms.electrostatic.exactSqftCalc")}
                  className=""
                />
                <div
                  className="svc-note"
                  style={{ marginTop: "4px", fontSize: "0.85em", color: "#666" }}
                >
                  {form.useExactCalculation
                    ? t("serviceForms.electrostatic.exactCalcNote")
                    : t("serviceForms.electrostatic.tierCalcNote", { unit: activeConfig.standardSprayPricing.sqFtUnit, next: activeConfig.standardSprayPricing.sqFtUnit + 1, double: activeConfig.standardSprayPricing.sqFtUnit * 2 })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="svc-summary">
          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.common.minimumPerVisit")}</span>
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
                  label={t("serviceForms.common.applyMinimum")}
                />
              </span>
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.common.perVisitTotal")}</span>
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
                title={t("serviceForms.electrostatic.perVisitTotalTitle")}
              />
            </div>
          </div>

          {(form.roomCount > 0 || form.squareFeet > 0) && (
            <div className="svc-row" style={{ marginTop: "-10px", paddingTop: "5px" }}>
              <div className="svc-label" />
              <div className="svc-field">
                {calc.contractTotal > calc.originalContractTotal * 1.3 ? (
                  <span className="em-pricing-tier em-pricing-tier--green">
                    <FaCircle color="#16a34a" /> {t("serviceForms.common.greenlinePricing")}
                  </span>
                ) : (
                  <span className="em-pricing-tier em-pricing-tier--red">
                    <FaCircle color="#dc2626" /> {t("serviceForms.common.redlinePricing")}
                  </span>
                )}
              </div>
            </div>
          )}

          {!isVisitBasedFrequency && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.monthlyRecurring")}</span>
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
                  title={t("serviceForms.electrostatic.monthlyRecurringTitle")}
                />
              </div>
            </div>
          )}

          {isVisitBasedFrequency && form.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.recurringVisitTotal")}</span>
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
                  title={t("serviceForms.electrostatic.recurringVisitTitle")}
                />
              </div>
            </div>
          )}

          {form.frequency === "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.totalPrice")}</span>
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
                  title={t("serviceForms.electrostatic.totalPriceTitle")}
                />
              </div>
            </div>
          )}

          {form.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.contractTotal")}</span>
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
                      {t("serviceForms.common.months", { count: m })}
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
                  title={t("serviceForms.electrostatic.contractTotalTitle")}
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
