
import React, { useEffect, useRef, useState } from "react";
import { RPM_OVERRIDE_TOLERANCE, useRpmWindowsCalc } from "./useRpmWindowsCalc";
import type { RpmWindowsFormState } from "./rpmWindowsTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import { ServiceCardShell, RefreshButton } from "../../molecules";
import { useEditableCurrency } from "../../../features/services/engine";
import { FaCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return "0";
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const FIELD_ORDER = {
  serviceFrequency: 1,
  rateCategory: 2,
  mirrorCleaning: 3,
  installType: 4,
  installationFee: 14,
  windows: {
    small: 10,
    medium: 11,
    large: 12,
  },
  extraChargesBase: 20,
  totals: {
    installationFee: 14,
    perVisit: 90,
    monthly: 91,
    monthlyRecurring: 92,
    firstVisit: 93,
    recurringVisit: 94,
    contract: 95,
    totalPrice: 96,
  },
} as const;

export const RpmWindowsForm: React.FC<
  ServiceInitialData<RpmWindowsFormState>
> = ({ initialData, onRemove }) => {

  const { t } = useTranslation();

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  const {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    calc,
    quote,
    refreshConfig,
    isLoadingConfig,
    pricingOverrides,
    manualOverrides,
    persistedOverrides,
    baselineValues,
    baselineReady,
  } = useRpmWindowsCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();

  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== form.contractMonths) {
      setForm({ ...form, contractMonths: servicesContext.globalContractMonths });
    }
  }, [servicesContext?.globalContractMonths]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const getOverrideStyle = (
    isOverride: boolean,
    baseStyle?: React.CSSProperties
  ): React.CSSProperties => ({
    ...(baseStyle || {}),
    backgroundColor: isOverride ? "#fffacd" : (baseStyle?.backgroundColor ?? "white"),
  });

  const hasPricingOverride = (fieldName: string): boolean => {
    if (manualOverrides[fieldName] || persistedOverrides[fieldName]) {
      return baselineReady;
    }

    if (!baselineReady) {
      return false;
    }

    const baseline = baselineValues[fieldName];
    const currentValue = Number(form[fieldName]);

    if (typeof baseline === "number" && !Number.isNaN(currentValue)) {
      return Math.abs(currentValue - baseline) > RPM_OVERRIDE_TOLERANCE;
    }

    return false;
  };

  const {
    onFocus: handleFocus,
    onChange: handleLocalChange,
    onBlur: handleBlur,
    getDisplayValue,
  } = useEditableCurrency((e) => onChange({ target: { name: e.target.name, value: e.target.value } } as any));

  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = (form.smallQty ?? 0) > 0 || (form.mediumQty ?? 0) > 0 || (form.largeQty ?? 0) > 0 || hasCustomFieldValues;

      const formatDollars = (value: number) => `$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      const frequencyLabel =
        typeof form.frequency === "string"
          ? form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)
          : String(form.frequency || "");
      const installationFeeDisplay = form.isFirstTimeInstall
        ? calc.firstVisitTotalRated
        : 0;
      const pdfExtras = form.extraCharges.map((charge, index) => ({
        label: charge.description || "Extra Charge",
        value: formatDollars(charge.amount),
        type: "line" as const,
        orderNo: FIELD_ORDER.extraChargesBase + index * 0.1,
        isDisplay: true,
      }));
      const frequencyField = {
        isDisplay: true,
        orderNo: FIELD_ORDER.serviceFrequency,
        label: "Service Frequency",
        type: "text" as const,
        value: frequencyLabel,
        frequencyKey: form.frequency,
      };
      const installTypeField = {
        isDisplay: true,
        orderNo: FIELD_ORDER.installType,
        label: "Install Type",
        type: "text" as const,
        value: form.isFirstTimeInstall ? "First Time (Install)" : "Ongoing / Clean",
      };
      const mirrorCleaningField = {
        isDisplay: true,
        orderNo: FIELD_ORDER.mirrorCleaning,
        label: "Mirror Cleaning",
        type: "text" as const,
        value: form.includeMirrors ? "Include (same chemicals)" : "Not included",
      };
      const rateCategoryField = {
        isDisplay: true,
        orderNo: FIELD_ORDER.rateCategory,
        label: "Rate Category",
        type: "text" as const,
        value: form.selectedRateCategory === "redRate" ? "Red Rate" : "Green Rate",
      };

      const data = isActive ? {
        serviceId: "rpmWindows",
        displayName: "RPM Window",
        isActive: true,

        perVisitBase: calc.subtotal,  
        perVisit: calc.perVisit,  
        minimumChargePerVisit: calc.minimumChargePerVisit,  
        originalContractTotal: calc.originalContractTotal,  

        smallWindowRate: form.smallWindowRate,
        mediumWindowRate: form.mediumWindowRate,
        largeWindowRate: form.largeWindowRate,
        tripCharge: form.tripCharge,
        installMultiplierFirstTime: form.installMultiplierFirstTime,
        installMultiplierClean: form.installMultiplierClean,
        contractMonths: form.contractMonths,
        applyMinimum: form.applyMinimum !== false,
        customSmallTotal: form.customSmallTotal,
        customMediumTotal: form.customMediumTotal,
        customLargeTotal: form.customLargeTotal,
        customInstallationFee: form.customInstallationFee,
        customPerVisitPrice: form.customPerVisitPrice,
        customFirstMonthTotal: form.customFirstMonthTotal,
        customMonthlyRecurring: form.customMonthlyRecurring,
        customAnnualPrice: form.customAnnualPrice,
        customContractTotal: form.customContractTotal,

        windows: [
          ...(form.smallQty > 0 ? [{
            isDisplay: true,
            orderNo: FIELD_ORDER.windows.small,
            label: "Small Windows",
            type: "calc" as const,
            qty: form.smallQty,
            rate: calc.effSmall,
            total: form.customSmallTotal ?? (form.smallQty * calc.effSmall),
          }] : []),
          ...(form.mediumQty > 0 ? [{
            isDisplay: true,
            orderNo: FIELD_ORDER.windows.medium,
            label: "Medium Windows",
            type: "calc" as const,
            qty: form.mediumQty,
            rate: calc.effMedium,
            total: form.customMediumTotal ?? (form.mediumQty * calc.effMedium),
          }] : []),
          ...(form.largeQty > 0 ? [{
            isDisplay: true,
            orderNo: FIELD_ORDER.windows.large,
            label: "Large Windows",
            type: "calc" as const,
            qty: form.largeQty,
            rate: calc.effLarge,
            total: form.customLargeTotal ?? (form.largeQty * calc.effLarge),
          }] : []),
        ],
        installationFee: {
          isDisplay: true,
          orderNo: FIELD_ORDER.installationFee,
          label: "Installation Fee",
          type: "dollar" as const,
          amount: form.customInstallationFee ?? installationFeeDisplay,
          isCustom: form.customInstallationFee !== undefined,
        },
        frequency: frequencyField,
        serviceFrequency: frequencyField,
        installType: installTypeField,
        mirrorCleaning: mirrorCleaningField,
        rateCategory: rateCategoryField,
        extraCharges: form.extraCharges.map((charge, index) => ({
          isDisplay: true,
          orderNo: FIELD_ORDER.extraChargesBase + index * 0.1,
          label: charge.description || "Extra Charge",
          type: "dollar" as const,
          amount: charge.amount,
        })),
        totals: {
          perVisit: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.perVisit,
            label: "Per Visit",
            type: "dollar" as const,
            amount: form.customPerVisitPrice ?? quote.perVisitPrice,
          },
          monthly: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.monthly,
            label: "First Month Total",
            type: "dollar" as const,
            amount: form.customFirstMonthTotal ?? calc.firstMonthBillRated,
          },
          monthlyRecurring: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.monthlyRecurring,
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: form.customMonthlyRecurring ?? calc.monthlyBillRated,
            gap: "normal",
          },
          firstVisit: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.firstVisit,
            label: "First Visit Total",
            type: "dollar" as const,
            amount: calc.firstVisitTotalRated,
          },
          recurringVisit: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.recurringVisit,
            label: "Recurring Visit Total",
            type: "dollar" as const,
            amount: calc.recurringPerVisitRated,
            gap: "normal",
          },
          annual: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.contract,
            label: "Annual Price",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: form.customAnnualPrice ?? quote.annualPrice,
          },
          totalPrice: {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.totalPrice,
            label: "Total Price",
            type: "dollar" as const,
            amount: calc.firstVisitTotalRated,
          },
        },
        pdfExtras,
        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("rpmWindows", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, quote, customFields]);

  const handleInstallTypeChange = (value: "first" | "clean") =>
    setForm((prev) => ({ ...prev, isFirstTimeInstall: value === "first" }));

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customSmallTotal: undefined,
    }));
  }, [form.smallQty, calc.effSmall]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customMediumTotal: undefined,
    }));
  }, [form.mediumQty, calc.effMedium]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customLargeTotal: undefined,
    }));
  }, [form.largeQty, calc.effLarge]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customInstallationFee: undefined,
    }));
  }, [form.isFirstTimeInstall, calc.firstVisitTotalRated]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customPerVisitPrice: undefined,
      customFirstMonthTotal: undefined,
      customMonthlyRecurring: undefined,
      customAnnualPrice: undefined,
    }));
  }, [
    form.smallQty,
    form.mediumQty,
    form.largeQty,
    calc.effSmall,
    calc.effMedium,
    calc.effLarge,
    form.extraCharges,
    form.frequency,
    form.contractMonths,
  ]);

  const installationFeeDisplay = form.isFirstTimeInstall
    ? calc.firstVisitTotalRated
    : 0;

  return (
    <ServiceCardShell
      title={t("serviceForms.rpmWindows.title")}
      onAddCustom={() => setShowAddDropdown(!showAddDropdown)}
      onRemove={onRemove}
      headerActions={
        <>
          <RefreshButton onClick={refreshConfig} loading={isLoadingConfig} />
          <button
            type="button"
            className="svc-mini"
            onClick={addExtraCharge}
            title={t("serviceForms.rpmWindows.addExtraCharge")}
            style={{ fontSize: '12px' }}
          >
            $
          </button>
        </>
      }
    >

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
            <option value="oneTime">{t("serviceForms.rpmWindows.freq.oneTime")}</option>
            <option value="weekly">{t("serviceForms.rpmWindows.freq.weekly")}</option>
            <option value="biweekly">{t("serviceForms.rpmWindows.freq.biweekly")}</option>
            <option value="twicePerMonth">{t("serviceForms.rpmWindows.freq.twicePerMonth")}</option>
            <option value="monthly">{t("serviceForms.rpmWindows.freq.monthly")}</option>
            <option value="everyFourWeeks">{t("serviceForms.rpmWindows.freq.everyFourWeeks")}</option>
            <option value="bimonthly">{t("serviceForms.rpmWindows.freq.bimonthly")}</option>
            <option value="quarterly">{t("serviceForms.rpmWindows.freq.quarterly")}</option>
            <option value="biannual">{t("serviceForms.rpmWindows.freq.biannual")}</option>
            <option value="annual">{t("serviceForms.rpmWindows.freq.annual")}</option>
          </select>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.rpmWindows.smallWindows")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="smallQty"
            type="number"
            min="0"
            value={form.smallQty || ""}
            onChange={onChange}
          />
          <span>@</span>
          <span>$</span>
          <input
            className="svc-in field-qty"
            name="smallWindowRate"
            type="number"
            min="0"
            step="1"
            value={form.smallWindowRate || ""}
            onChange={onChange}
            title={t("serviceForms.rpmWindows.baseWeeklyRateTitle")}
            style={getOverrideStyle(hasPricingOverride("smallWindowRate"))}
          />
          <span>=</span>
          <span>$</span>
          <input
            className="svc-in-box field-qty"
            name="customSmallTotal"
            type="text"
            min="0"
            readOnly
            step="1"
            value={getDisplayValue(
              'customSmallTotal',
              form.customSmallTotal !== undefined
                ? form.customSmallTotal
                : (form.smallQty * calc.effSmall),
              true
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customSmallTotal !== undefined ? '#fffacd' : 'white' }}
            title={t("serviceForms.rpmWindows.calculatedTotalTitle", { rate: formatNumber(calc.effSmall) })}
          />
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.rpmWindows.mediumWindows")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="mediumQty"
            type="number"
            min="0"
            value={form.mediumQty || ""}
            onChange={onChange}
          />
          <span>@</span>
          <span>$</span>
          <input
            className="svc-in field-qty"
            name="mediumWindowRate"
            type="number"
            min="0"
            step="1"
            value={form.mediumWindowRate || ""}
            onChange={onChange}
            title={t("serviceForms.rpmWindows.baseWeeklyRateTitle")}
            style={getOverrideStyle(hasPricingOverride("mediumWindowRate"))}
          />
          <span>=</span>
          <span>$</span>
          <input
            className="svc-in-box field-qty"
            name="customMediumTotal"
            type="text"
            readOnly
            min="0"
            step="1"
            value={getDisplayValue(
              'customMediumTotal',
              form.customMediumTotal !== undefined
                ? form.customMediumTotal
                : (form.mediumQty * calc.effMedium),
              true
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customMediumTotal !== undefined ? '#fffacd' : 'white' }}
            title={t("serviceForms.rpmWindows.calculatedTotalTitle", { rate: formatNumber(calc.effMedium) })}
          />
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.rpmWindows.largeWindows")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            name="largeQty"
            type="number"
            min="0"
            value={form.largeQty || ""}
            onChange={onChange}
          />
          <span>@</span>
          <span>$</span>
          <input
            className="svc-in field-qty"
            name="largeWindowRate"
            type="number"
            min="0"
            step="1"
            value={form.largeWindowRate || ""}
            onChange={onChange}
            title={t("serviceForms.rpmWindows.baseWeeklyRateTitle")}
            style={getOverrideStyle(hasPricingOverride("largeWindowRate"))}
          />
          <span>=</span>
          <span>$</span>
          <input
            className="svc-in-box field-qty"
            name="customLargeTotal"
            readOnly
            type="text"
            min="0"
            step="1"
            value={getDisplayValue(
              'customLargeTotal',
              form.customLargeTotal !== undefined
                ? form.customLargeTotal
                : (form.largeQty * calc.effLarge),
              true
            )}
            onChange={handleLocalChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ backgroundColor: form.customLargeTotal !== undefined ? '#fffacd' : 'white' }}
            title={t("serviceForms.rpmWindows.calculatedTotalTitle", { rate: formatNumber(calc.effLarge) })}
          />
        </div>
      </div>

      {}
      {form.extraCharges.map((line) => (
        <div className="svc-row" key={line.id}>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="text"
              placeholder={t("serviceForms.rpmWindows.calcPlaceholder")}
              value={line.calcText}
              onChange={(e) =>
                updateExtraCharge(line.id, "calcText", e.target.value)
              }
            />
            <input
              className="svc-in"
              type="text"
              placeholder={t("serviceForms.rpmWindows.textPlaceholder")}
              value={line.description}
              onChange={(e) =>
                updateExtraCharge(line.id, "description", e.target.value)
              }
            />
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
        min="0"
          min="0"
            min="0"
                value={line.amount}
                onChange={(e) =>
                  updateExtraCharge(line.id, "amount", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      ))}

      {}
      {}

      {}
      <div className="svc-row">
        <label>{t("serviceForms.rpmWindows.installType")}</label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="radio"
              value="first"
              checked={form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("first")}
            />
            <span>{t("serviceForms.rpmWindows.firstTimeInstall")}</span>
          </label>
          <label className="svc-inline">
            <input
              type="radio"
              value="clean"
              checked={!form.isFirstTimeInstall}
              onChange={() => handleInstallTypeChange("clean")}
            />
            <span>{t("serviceForms.rpmWindows.ongoingClean")}</span>
          </label>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.rpmWindows.installMultipliers")}</label>
        <div className="svc-row-right">
          <span className="svc-small">{t("serviceForms.rpmWindows.dirty")}</span>
          <input
            name="installMultiplierFirstTime"
            type="number"
            min="0"
            step="1"
            className="svc-in multiplier-field"
            value={form.installMultiplierFirstTime}
            onChange={onChange}
            style={getOverrideStyle(hasPricingOverride("installMultiplierFirstTime"), { display: "inline", width: "60px" })}
            title={t("serviceForms.rpmWindows.dirtyMultiplierTitle")}
          />
          <span className="svc-small">{t("serviceForms.rpmWindows.multiplierClose")}</span>
          <span className="svc-small" style={{ marginLeft: '12px' }}>{t("serviceForms.rpmWindows.clean")}</span>
          <input
            name="installMultiplierClean"
            type="number"
            min="0"
            step="1"
            className="svc-in multiplier-field"
            value={form.installMultiplierClean}
            onChange={onChange}
            style={getOverrideStyle(hasPricingOverride("installMultiplierClean"), { display: "inline", width: "60px" })}
            title={t("serviceForms.rpmWindows.cleanMultiplierTitle")}
          />
          <span className="svc-small">{t("serviceForms.rpmWindows.multiplierClose")}</span>
        </div>
      </div>

      {}
      {}

            {}
      <div className="svc-row svc-row-charge">
        <label>{t("serviceForms.rpmWindows.installationFirstVisit")}</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              min="0"
              readOnly
              step="1"
              name="customInstallationFee"
              value={getDisplayValue(
                'customInstallationFee',
                form.customInstallationFee !== undefined ? form.customInstallationFee : installationFeeDisplay,
                true
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customInstallationFee !== undefined ? '#fffacd' : 'white' }}
            />
          </div>
        </div>
      </div>

      {}
      {}

      {}
      <div className="svc-row">
        <label>{t("serviceForms.common.minimumPerVisit")}</label>
        <div className="svc-row-right">
          <span className="svc-small">${calc.minimumChargePerVisit != null ? calc.minimumChargePerVisit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "0.00"}</span>
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
      <div className="svc-row svc-row-charge">
        <label>{t("serviceForms.rpmWindows.perVisitPrice")}</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              name="customPerVisitPrice"
              type="text"
              min="0"
              readOnly
              step="1"
              value={getDisplayValue(
                'customPerVisitPrice',
                form.customPerVisitPrice !== undefined ? form.customPerVisitPrice : quote.perVisitPrice,
                true
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ backgroundColor: form.customPerVisitPrice !== undefined ? '#fffacd' : 'white' }}
            />
          </div>
        </div>
      </div>

      {}
      {(form.frequency === "bimonthly" || form.frequency === "quarterly" ||
        form.frequency === "biannual" || form.frequency === "annual" ||
        form.frequency === "everyFourWeeks") && (
        <div className="svc-row svc-row-charge">
          <label>{t("serviceForms.common.recurringVisitTotal")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatNumber(calc.recurringPerVisitRated ?? 0)}
                style={{ backgroundColor: 'white' }}
                title={t("serviceForms.rpmWindows.recurringVisitTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {(form.smallQty > 0 || form.mediumQty > 0 || form.largeQty > 0) && (
        <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {calc.contractTotalRated > calc.originalContractTotal * 1.30 ? (
              <span style={{
                color: '#388e3c',
                fontSize: '13px',
                fontWeight: '600',
                padding: '4px 8px',
                backgroundColor: '#e8f5e9',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                <FaCircle color="#16a34a" /> {t("serviceForms.common.greenlinePricing")}
              </span>
            ) : (
              <span style={{
                color: '#d32f2f',
                fontSize: '13px',
                fontWeight: '600',
                padding: '4px 8px',
                backgroundColor: '#ffebee',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                <FaCircle color="#dc2626" /> {t("serviceForms.common.redlinePricing")}
              </span>
            )}
          </div>
        </div>
      )}

      {}
      {form.frequency !== "oneTime" && form.frequency !== "quarterly" && form.frequency !== "biannual" && form.frequency !== "annual" && form.frequency !== "bimonthly" && form.frequency !== "everyFourWeeks" && (
        <div className="svc-row svc-row-charge">
          <label>{t("serviceForms.common.firstMonthTotal")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatNumber(calc.firstMonthBillRated ?? 0)}
                style={{ backgroundColor: 'white', border: 'none', width: '100px' }}
                title={form.isFirstTimeInstall ? t("serviceForms.rpmWindows.firstMonthInstallTitle") : t("serviceForms.rpmWindows.firstMonthOngoingTitle")}
              />
            </div>
            {}
          </div>
        </div>
      )}

      {}
      {(form.frequency === "weekly" || form.frequency === "biweekly" ||
        form.frequency === "twicePerMonth" || form.frequency === "monthly") && (
        <div className="svc-row svc-row-charge">
          <label>{t("serviceForms.common.monthlyRecurring")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customMonthlyRecurring"
                type="text"
                min="0"
                readOnly
                step="1"
                value={getDisplayValue(
                  'customMonthlyRecurring',
                  form.customMonthlyRecurring !== undefined
                    ? form.customMonthlyRecurring
                    : calc.monthlyBillRated ?? 0,
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customMonthlyRecurring !== undefined ? '#fffacd' : 'white' }}
                title={t("serviceForms.saniscrub.monthlyRecurringTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {(form.frequency === "oneTime" || form.frequency === "quarterly" || form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly" || form.frequency === "everyFourWeeks") && (
        <div className="svc-row svc-row-charge">
          <label>{form.frequency === "oneTime" ? t("serviceForms.common.totalPrice") : t("serviceForms.common.firstVisitTotal")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customFirstMonthTotal"
                type="text"
                min="0"
                readOnly
                step="1"
                value={getDisplayValue(
                  'customFirstMonthTotal',
                  form.customFirstMonthTotal !== undefined
                    ? form.customFirstMonthTotal
                    : (form.isFirstTimeInstall
                      ? calc.firstVisitTotalRated ?? 0
                      : calc.recurringPerVisitRated ?? 0),
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customFirstMonthTotal !== undefined ? '#fffacd' : 'white' }}
                title={form.isFirstTimeInstall ? t("serviceForms.rpmWindows.firstVisitInstallTitle") : t("serviceForms.rpmWindows.firstVisitServiceTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {form.frequency !== "oneTime" && (
        <div className="svc-row svc-row-charge">
          <label>{t("serviceForms.common.contractTotal")}</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="contractMonths"
              value={form.contractMonths}
              disabled
            >
              {form.frequency === "quarterly"
                ? Array.from({ length: 12 }, (_, i) => (i + 1) * 3).map((m) => (
                    <option key={m} value={m}>{t("serviceForms.common.months", { count: m })}</option>
                  ))
                : form.frequency === "bimonthly"
                ? [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36].map((m) => (
                    <option key={m} value={m}>{t("serviceForms.common.months", { count: m })}</option>
                  ))
                : form.frequency === "biannual"
                ? [6, 12, 18, 24, 30, 36].map((m) => (
                    <option key={m} value={m}>{t("serviceForms.common.months", { count: m })}</option>
                  ))
                : form.frequency === "annual"
                ? [12, 24, 36].map((m) => (
                    <option key={m} value={m}>{t("serviceForms.common.months", { count: m })}</option>
                  ))
                : Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
                    <option key={m} value={m}>{t("serviceForms.common.months", { count: m })}</option>
                  ))
              }
            </select>
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                name="customAnnualPrice"
                type="text"
                min="0"
                step="1"
                value={getDisplayValue(
                  'customAnnualPrice',
                  form.customAnnualPrice !== undefined ? form.customAnnualPrice : quote.annualPrice ?? 0,
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ backgroundColor: form.customAnnualPrice !== undefined ? '#fffacd' : 'white', width: '140px' }}
              />
            </div>
          </div>
        </div>
      )}
    </ServiceCardShell>
  );
};
