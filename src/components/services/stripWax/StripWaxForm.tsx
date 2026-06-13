
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStripWaxCalc } from "./useStripWaxCalc";
import type { StripWaxFormState } from "./stripWaxTypes";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import { ServiceCardShell, RefreshButton } from "../../molecules";
import { useEditableCurrency } from "../../../features/services/engine";
import { FaCircle } from "react-icons/fa";

const FIELD_ORDER = {
  frequency: 1,
  variant: 2,
  service: 10,
  totals: {
    perVisit: 20,
    monthlyRecurring: 22,
    recurringVisit: 24,
    contract: 25,
    minimum: 26,
    totalPrice: 27,
  },
} as const;

export const StripWaxForm: React.FC<
  ServiceInitialData<StripWaxFormState>
> = ({ initialData, onRemove }) => {

  const { t } = useTranslation();
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  const { form, setForm, onChange, calc, refreshConfig, isLoadingConfig } = useStripWaxCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();

  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== form.contractMonths) {
      setForm({ ...form, contractMonths: servicesContext.globalContractMonths });
    }
  }, [servicesContext?.globalContractMonths]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const editable = useEditableCurrency(((e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    if (value === "") {
      onChange({ target: { name, value: "", type: "number" } } as any);
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) onChange({ target: { name, value: num, type: "number" } } as any);
    }
  }) as any);

  const getDisplayValue = editable.getDisplayValue;
  const handleFocus = editable.onFocus;
  const handleLocalChange = editable.onChange;
  const handleBlur = editable.onBlur;

  const prevDataRef = useRef<string>("");

  const isVisitBasedFrequency = form.frequency === "oneTime" || form.frequency === "quarterly" ||
    form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly" ||
    form.frequency === "everyFourWeeks";

  const formatDisplayNumber = (value: number | undefined): string => {
    return Number.isFinite(value) ? (value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
  };

  const formatCalcValue = (value: number | undefined): string => {
    return Number.isFinite(value) ? (value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
  };

  const generateContractMonths = () => {
    const months = [];

    if (form.frequency === "oneTime") {
      return [];
    } else if (form.frequency === "bimonthly") {
      for (let i = 2; i <= cfg.maxContractMonths; i += 2) {
        months.push(i);
      }
    } else if (form.frequency === "quarterly") {
      for (let i = 3; i <= cfg.maxContractMonths; i += 3) {
        months.push(i);
      }
    } else if (form.frequency === "biannual") {
      for (let i = 6; i <= cfg.maxContractMonths; i += 6) {
        months.push(i);
      }
    } else if (form.frequency === "annual") {
      for (let i = 12; i <= cfg.maxContractMonths; i += 12) {
        months.push(i);
      }
    } else {
      for (let i = cfg.minContractMonths; i <= cfg.maxContractMonths; i++) {
        months.push(i);
      }
    }

    return months;
  };

  const contractMonthOptions = generateContractMonths();

  useEffect(() => {
    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = (form.floorAreaSqFt ?? 0) > 0 || hasCustomFieldValues;

      const frequencyLabel = typeof form.frequency === "string"
        ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
        : String(form.frequency || "");
      const totalPriceValue = form.customPerVisit ?? calc.contractTotal;

      const data = isActive ? {
        serviceId: "stripwax",
        displayName: "Strip & Wax",
        isActive: true,
        ratePerSqFt: form.ratePerSqFt,
        minCharge: form.minCharge,
        serviceVariant: form.serviceVariant,
        rateCategory: form.rateCategory,
        contractMonths: form.contractMonths,
        applyMinimum: form.applyMinimum !== false,

        rawPrice: calc.rawPrice,  
        perVisit: calc.perVisit,  
        minCharge: form.minCharge,  

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: frequencyLabel,
          frequencyKey: form.frequency,
        },

        variant: {
          isDisplay: true,
          orderNo: FIELD_ORDER.variant,
          label: "Service Type",
          type: "text" as const,
          value: cfg.variants[form.serviceVariant]?.label || '',
        },

        service: {
          isDisplay: true,
          orderNo: FIELD_ORDER.service,
          label: "Floor Area",
          type: "calc" as const,
          qty: form.floorAreaSqFt,
          rate: form.ratePerSqFt,
          total: calc.perVisit,
          unit: "sq ft",
        },

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

          if (isVisitBasedFrequency) {

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
              amount: calc.ongoingMonthly,
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
            amount: form.minCharge,
          };

          return totals;
        })(),

        notes: "", 
        customFields: customFields,
        contractTotal: calc.contractTotal,
        originalContractTotal: calc.originalContractTotal,
        ...(form.frequency === "oneTime" ? { totalPrice: totalPriceValue } : {}),
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [StripWax] Sending to context:', JSON.stringify(data, null, 2));
        servicesContext.updateService("stripwax", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, customFields]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customPerVisit: undefined,
      customMonthly: undefined,
      customOngoingMonthly: undefined,
      customContractTotal: undefined,
    }));
  }, [
    form.floorAreaSqFt,
    form.ratePerSqFt,
    form.minCharge,
    form.serviceVariant,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    setForm,
  ]);

  const variantOptions = cfg.variants;

  return (
    <ServiceCardShell
      title={t("serviceForms.stripWax.title")}
      onAddCustom={() => setShowAddDropdown(!showAddDropdown)}
      onRemove={onRemove}
      headerActions={
        <RefreshButton onClick={() => refreshConfig(true)} loading={isLoadingConfig} />
      }
    >
      {}
      {isLoadingConfig && (
        <div className="svc-loading-overlay">
          <div className="svc-loading-spinner">
            <span className="svc-sr-only">{t("serviceForms.common.loadingConfiguration")}</span>
          </div>
          <p className="svc-loading-text">{t("serviceForms.common.loadingConfiguration")}</p>
        </div>
      )}

      {}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      {}
      <div className="svc-row">
        <label>{t("serviceForms.common.frequency")}</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="frequency"
            value={form.frequency}
            onChange={onChange}
          >
            <option value="oneTime">{t("serviceForms.stripWax.freq.oneTime")}</option>
            <option value="weekly">{t("serviceForms.stripWax.freq.weekly")}</option>
            <option value="biweekly">{t("serviceForms.stripWax.freq.biweekly")}</option>
            <option value="twicePerMonth">{t("serviceForms.stripWax.freq.twicePerMonth")}</option>
            <option value="monthly">{t("serviceForms.stripWax.freq.monthly")}</option>
            <option value="everyFourWeeks">{t("serviceForms.stripWax.freq.everyFourWeeks")}</option>
            <option value="bimonthly">{t("serviceForms.stripWax.freq.bimonthly")}</option>
            <option value="quarterly">{t("serviceForms.stripWax.freq.quarterly")}</option>
            <option value="biannual">{t("serviceForms.stripWax.freq.biannual")}</option>
            <option value="annual">{t("serviceForms.stripWax.freq.annual")}</option>
          </select>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.stripWax.serviceType")}</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="serviceVariant"
            value={form.serviceVariant}
            onChange={onChange}
          >
            {(
              Object.keys(variantOptions) as Array<
                keyof typeof variantOptions
              >
            ).map((k) => (
              <option key={k} value={k}>
                {variantOptions[k].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.stripWax.floorArea")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small field-qty"
            type="number"
            min="0"
            step={1}
            name="floorAreaSqFt"
            value={getDisplayValue('floorAreaSqFt', form.floorAreaSqFt)}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <span className="svc-multi">@</span>
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in svc-in-small field-qty"
                type="number"
                min="0"
                step={0.01}
                name="ratePerSqFt"
                value={getDisplayValue('ratePerSqFt', form.ratePerSqFt)}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title={t("serviceForms.stripWax.ratePerSqFtTitle")}
                style={{
                  backgroundColor: form.customRatePerSqFt !== undefined ? '#fffacd' : 'white',
                }}
              />
            </div>
          <span className="svc-small">/sq ft</span>
          <span className="svc-eq">=</span>
          <span className="svc-dollar">
          ${formatCalcValue(calc.perVisit)}
          </span>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label></label>
        <div className="svc-row-right">
            <span className="svc-small">
              {t("serviceForms.stripWax.directCalcNote", { rate: formatDisplayNumber(form.ratePerSqFt), min: formatDisplayNumber(form.minCharge) })}
            </span>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.common.minimumCharge")}</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              min="0"
              step={1}
              name="minCharge"
              value={form.minCharge || ""}
              onChange={onChange}
              title={t("serviceForms.stripWax.minimumChargeTitle")}
              style={{
                backgroundColor: form.customMinCharge !== undefined ? '#fffacd' : 'white',
              }}
            />
          </div>
          <span className="svc-small">{t("serviceForms.stripWax.minimum")}</span>
          <label className="svc-inline" style={{ marginLeft: '10px' }}>
            <input
              type="checkbox"
              name="applyMinimum"
              checked={form.applyMinimum !== false}
              onChange={onChange}
            />
            <span>{t("serviceForms.common.applyMinimum")}</span>
          </label>
        </div>
      </div>

      {}
      {}

      {}
      <div className="svc-row svc-row-total">
        <label>{t("serviceForms.common.perVisitTotal")}</label>
        <div className="svc-dollar">
          $<input
            type="text"
            min="0"
            readOnly
            step="1"
            name="customPerVisit"
            className="svc-in svc-in-small"
            value={getDisplayValue(
              'customPerVisit',
              form.customPerVisit !== undefined
                ? form.customPerVisit
                : calc.perVisit,
              true
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: form.customPerVisit !== undefined ? '#fffacd' : 'white',
              border: 'none',
              width: '100px'
            }}
            title={t("serviceForms.stripWax.perVisitTotalTitle")}
          />
        </div>
      </div>

            {}
      {isVisitBasedFrequency && form.frequency !== "oneTime" || form.frequency === "quarterly" ||
    form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly" && (
        <div className="svc-row svc-row-total">
          <label>{t("serviceForms.common.firstVisitTotal")}</label>
          <div className="svc-dollar">
            $<input
              type="text"
              min="0"
              step="1"
              readOnly
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.monthly,
                true
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title={t("serviceForms.stripWax.firstVisitTitle")}
            />
          </div>
        </div>
      )}

      {}
      {form.floorAreaSqFt > 0 && (
        <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {calc.contractTotal > calc.originalContractTotal * 1.30 ? (
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

      {}
      {(form.frequency === "bimonthly" || form.frequency === "quarterly" ||
        form.frequency === "biannual" || form.frequency === "annual" ||
        form.frequency === "everyFourWeeks") && (
        <div className="svc-row svc-row-total">
          <label>{t("serviceForms.common.recurringVisitTotal")}</label>
          <div className="svc-dollar">
            ${formatCalcValue(calc.perVisit)}
          </div>
        </div>
      )}

      {}
      {form.frequency === "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>{t("serviceForms.common.totalPrice")}</label>
          <div className="svc-dollar">
            $<input
              type="number"
            min="0"
              step="1"
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.contractTotal
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title={t("serviceForms.stripWax.totalPriceTitle")}
            />
          </div>
        </div>
      )}

      {}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>{t("serviceForms.common.firstMonthTotal")}</label>
          <div className="svc-dollar">
            $<input
              type="text"
              min="0"
              readOnly
              step="1"
              name="customMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customMonthly',
                form.customMonthly !== undefined
                  ? form.customMonthly
                  : calc.monthly,
                true
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title={t("serviceForms.stripWax.firstMonthTitle")}
            />
          </div>
        </div>
      )}

      {}
      {!isVisitBasedFrequency && (
        <div className="svc-row svc-row-total">
          <label>{t("serviceForms.common.monthlyRecurring")}</label>
          <div className="svc-dollar">
            $<input
              type="text"
              min="0"
              readOnly
              step="1"
              name="customOngoingMonthly"
              className="svc-in svc-in-small"
              value={getDisplayValue(
                'customOngoingMonthly',
                form.customOngoingMonthly !== undefined
                  ? form.customOngoingMonthly
                  : calc.ongoingMonthly,
                true
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customOngoingMonthly !== undefined ? '#fffacd' : 'white',
                border: 'none',
                width: '100px'
              }}
              title={t("serviceForms.stripWax.ongoingMonthlyTitle")}
            />
          </div>
        </div>
      )}

      {}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-total">
          <label>{t("serviceForms.common.contractTotal")}</label>
          <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths}
              disabled
            >
              {contractMonthOptions.map((m) => (
                <option key={m} value={m}>
                  {t("serviceForms.common.months", { count: m })}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
            <input
              type="text"
            min="0"
              step="1"
              name="customContractTotal"
              className="svc-in"
              value={getDisplayValue(
                'customContractTotal',
                form.customContractTotal !== undefined
                  ? form.customContractTotal
                  : calc.contractTotal,
                true
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                borderBottom: '2px solid #ff0000',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                backgroundColor: form.customContractTotal !== undefined ? '#fffacd' : 'transparent',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '4px',
                width: '140px'
              }}
              title={t("serviceForms.stripWax.contractTotalTitle")}
            />
          </div>
        </div>
      )}
    </ServiceCardShell>
  );
};
