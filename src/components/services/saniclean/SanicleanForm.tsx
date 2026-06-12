import React, { useEffect, useState, useRef } from "react";
import "../ServicesSection.css";
import { useSanicleanCalc } from "./useSanicleanCalc";
import { useEditableCurrency } from "../../../features/services/engine";
import type { SanicleanFormState, SanicleanFrequency } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import { ServiceCardShell, RefreshButton } from "../../molecules";
import { FaCircle, FaPen } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const formatMoney = (n: number): string => `$${(isNaN(n) ? 0 : n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const safeNumber = (n: any): number => (typeof n === "number" && !isNaN(n)) ? n : 0;

const sanicleanFrequencyLabels: Record<string, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month (with SaniClean)",
  monthly: "Monthly",
  everyFourWeeks: "Every 4 Weeks",
  bimonthly: "Bi-Monthly (Every 2 Months)",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};

const MONTHLY_OR_BELOW_FREQUENCIES = new Set(["weekly", "biweekly", "twicePerMonth", "monthly", "everyFourWeeks"]);
const ABOVE_MONTHLY_FREQUENCIES = new Set(["bimonthly", "quarterly", "biannual", "annual"]);

const FREQUENCY_MULTIPLIER_FALLBACK: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.165,
  twicePerMonth: 2.0,
  monthly: 1.0,
  everyFourWeeks: 1.0833,
  bimonthly: 0.5,
  quarterly: 0.33,
  biannual: 0.17,
  annual: 1 / 12,
};

const FIELD_ORDER = {
  frequency: 1,
  pricingMode: 2,
  location: 3,
  sinks: 4,
  urinals: 5,
  maleToilets: 6,
  femaleToilets: 7,

  totalPrice: 200,
  contractTotal: 100,
};

const EXTRA_ORDER = {
  luxuryUpgrade: 21,
  urinalScreens: 13,
  urinalMats: 14,
  toiletClips: 15,
  seatCover: 16,
  sanipods: 17,
  warranty: 18,
  microfiber: 19,
  excessSoap: 20, 
  baseServiceMonthly: 22,
  facilityComponentsMonthly: 23,
  facilityFrequency: 24,
  includedItems: 25,
  paperOverage: 26, 
};

function getSanicleanMonthlyMultiplier(frequency: string, backendConfig?: any): number {
  if (backendConfig?.frequencyMetadata?.[frequency]) {
    const metadata = backendConfig.frequencyMetadata[frequency];
    if (typeof metadata.monthlyRecurringMultiplier === "number") {
      return metadata.monthlyRecurringMultiplier;
    }
    if (typeof metadata.cycleMonths === "number") {
      return metadata.cycleMonths === 0 ? 1 : 1 / metadata.cycleMonths;
    }
  }
  return FREQUENCY_MULTIPLIER_FALLBACK[frequency] ?? FREQUENCY_MULTIPLIER_FALLBACK.weekly;
}

function IncludedItemsEditor({
  items,
  isCustomized,
  onChange,
  onReset,
}: {
  items: string[];
  isCustomized: boolean;
  onChange: (items: string[]) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState("");

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(items[index]);
    setAddingNew(false);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const next = [...items];
    next[editingIndex] = trimmed;
    onChange(next);
    setEditingIndex(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    if (editingIndex === index) { setEditingIndex(null); setEditingText(""); }
  };

  const saveNew = () => {
    const trimmed = newText.trim();
    if (!trimmed) { setAddingNew(false); setNewText(""); return; }
    onChange([...items, trimmed]);
    setNewText("");
    setAddingNew(false);
  };

  const cancelNew = () => { setAddingNew(false); setNewText(""); };

  return (
    <div style={{ width: "100%" }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
          {editingIndex === index ? (
            <>
              <input
                className="svc-in"
                style={{ flex: 1, fontSize: 12 }}
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                autoFocus
              />
              <button className="svc-btn svc-btn--small" onClick={saveEdit} title={t("serviceForms.common.save")}>✓</button>
              <button className="svc-btn svc-btn--small" onClick={cancelEdit} title={t("serviceForms.common.cancel")} style={{ opacity: 0.6 }}>✕</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 12 }}>• {item}</span>
              <button
                className="svc-btn svc-btn--small"
                onClick={() => startEdit(index)}
                title={t("serviceForms.saniclean.editItem")}
                style={{ opacity: 0.55, fontSize: 11 }}
              >
                <FaPen />
              </button>
              <button
                className="svc-btn svc-btn--small"
                onClick={() => removeItem(index)}
                title={t("serviceForms.saniclean.removeItem")}
                style={{ opacity: 0.55, fontSize: 11 }}
              >
                ✕
              </button>
            </>
          )}
        </div>
      ))}

      {addingNew ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <input
            className="svc-in"
            style={{ flex: 1, fontSize: 12 }}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") cancelNew(); }}
            placeholder={t("serviceForms.saniclean.newItemPlaceholder")}
            autoFocus
          />
          <button className="svc-btn svc-btn--small" onClick={saveNew} title={t("serviceForms.saniclean.addTitle")}>✓</button>
          <button className="svc-btn svc-btn--small" onClick={cancelNew} title={t("serviceForms.common.cancel")} style={{ opacity: 0.6 }}>✕</button>
        </div>
      ) : (
        <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="svc-btn svc-btn--small"
            onClick={() => setAddingNew(true)}
          >
            {t("serviceForms.saniclean.addItem")}
          </button>
          {isCustomized && (
            <button
              className="svc-btn svc-btn--small"
              onClick={onReset}
              style={{ opacity: 0.65 }}
              title={t("serviceForms.saniclean.resetToDefaultsTitle")}
            >
              {t("serviceForms.saniclean.resetToDefaults")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData, onRemove }) => {

  const { t } = useTranslation();

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  const {
    form,
    quote,
    fetchPricing,
    isLoadingConfig,
    pricingOverrides,
    updateForm,
    setPricingMode,
    setLocation,
    setSoapType,
    setRateTier,
    setNotes,
    backendConfig,

    setMainServiceFrequency,
    setFacilityComponentsFrequency,
  } = useSanicleanCalc(initialData, customFields);

  const servicesContext = useServicesContextOptional();

  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== form.contractMonths) {
      updateForm({ contractMonths: servicesContext.globalContractMonths });
    }
  }, [servicesContext?.globalContractMonths]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const prevDataRef = useRef<string>("");

  const getOverrideStyle = (
    isOverride: boolean,
    baseStyle?: React.CSSProperties
  ): React.CSSProperties => ({
    ...(baseStyle || {}),
    backgroundColor: isOverride ? "#fffacd" : (baseStyle?.backgroundColor ?? "white"),
  });

  const hasPricingOverride = (fieldName: string): boolean => {
    return Boolean((pricingOverrides as Record<string, boolean> | undefined)?.[fieldName]);
  };

  const commitEdit = (e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    if (value === "") {
      updateForm({ [name]: undefined });
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) updateForm({ [name]: num });
  };
  const {
    onFocus: handleFocus,
    onChange: handleLocalChange,
    onBlur: handleBlur,
    getDisplayValue,
  } = useEditableCurrency(commitEdit);

  const fixtures = form.sinks + form.urinals + form.maleToilets + form.femaleToilets;
  const soapDispensers = form.sinks; 
  const luxuryUpgradeQty = form.luxuryUpgradeQty ?? soapDispensers;

  const isAllInclusive = form.pricingMode === "all_inclusive";
  const fixtureRateFieldName = isAllInclusive
    ? "allInclusiveWeeklyRatePerFixture"
    : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture");
  const fixtureRateOverride = hasPricingOverride(fixtureRateFieldName);
  const excessSoapRateFieldName = form.soapType === "luxury" ? "excessLuxurySoapRate" : "excessStandardSoapRate";
  const excessSoapRateOverride = hasPricingOverride(excessSoapRateFieldName);

  console.log('🔍 [SaniClean Debug]', {
    pricingMode: form.pricingMode,
    isAllInclusive,
    allInclusiveRate: form.allInclusiveWeeklyRatePerFixture,
    insideBeltwayRate: form.insideBeltwayRatePerFixture
  });

  const luxuryUpgradeWeekly = form.soapType === "luxury" && luxuryUpgradeQty > 0
    ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser
    : 0;

  const extraSoapRatePerGallon = form.soapType === "luxury"
    ? form.excessLuxurySoapRate
    : form.excessStandardSoapRate;

  const extraSoapWeekly = Math.max(0, form.excessSoapGallonsPerWeek) * extraSoapRatePerGallon;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let processedValue: any = value;

    if (
      name === "customBaseService" ||
      name === "customTripCharge" ||
      name === "customFacilityComponents" ||
      name === "customSoapUpgrade" ||
      name === "customExcessSoap" ||
      name === "customMicrofiberMopping" ||
      name === "customWarrantyFees" ||
      name === "customPaperOverage" ||
      name === "customWeeklyTotal" ||
      name === "customMonthlyTotal" ||
      name === "customContractTotal"
    ) {
      const numVal = value === '' ? undefined : parseFloat(value);
      if (numVal === undefined || !isNaN(numVal)) {
        updateForm({ [name]: numVal });
      }
      return;
    }

    if (type === "checkbox") {
      processedValue = checked;
    } else if (name === "luxuryUpgradeQty") {
      processedValue = value === "" ? undefined : parseFloat(value);
    } else if (type === "number") {
      processedValue = parseFloat(value) || 0;
    }

    updateForm({ [name]: processedValue });
  };

  const sumBreakdown = Object.values(quote.breakdown || {}).reduce(
    (acc, value) => acc + (typeof value === "number" ? value : 0),
    0
  );
  const totalPriceValue =
    form.mainServiceFrequency === "oneTime"
      ? (quote.oneTimeTotal ?? sumBreakdown)
      : undefined;

  useEffect(() => {
    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = fixtures > 0 || hasCustomFieldValues;
      const frequencyLabel =
        sanicleanFrequencyLabels[form.mainServiceFrequency] ||
        form.mainServiceFrequency ||
        "TBD";
      const facilityFrequencyLabel =
        sanicleanFrequencyLabels[form.facilityComponentsFrequency] ||
        form.facilityComponentsFrequency ||
        "TBD";

      const formatDollars = (amount: number) => `$${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      type PdfExtra = {
        label: string;
        type?: "line" | "bold" | "atCharge";
        value?: string;
        v1?: string | number;
        v2?: string | number;
        v3?: string | number;
        orderNo?: number;
        isDisplay?: boolean;
        gap?: "wide";
      };
      const extras: PdfExtra[] = [];
      const addLineExtra = (
        label: string,
        amount: number | string | undefined,
        type: "line" | "bold" = "line",
        orderNo?: number,
        gap?: "wide"
      ) => {
        if (amount === undefined || amount === null) return;
        if (typeof amount === "number" && amount === 0) return;
        if (typeof amount === "string" && amount.trim() === "") return;
        const displayValue = typeof amount === "number" ? formatDollars(amount) : amount;
        extras.push({
          label,
          value: displayValue,
          type,
          isDisplay: true,
          orderNo,
          gap,
        });
        if (gap === "wide") {
          console.debug("[Saniclean PDF extra] wide gap", {
            label,
            value: displayValue,
            orderNo,
          });
        }
      };
      const addAtChargeExtra = (
        label: string,
        qty: number | undefined,
        rate: number | undefined,
        total: number,
        orderNo?: number
      ) => {
        if (!qty || qty <= 0) return;
        if (!rate || rate === 0) return;
        extras.push({
          label,
          type: "atCharge",
          v1: qty,
          v2: `${formatDollars(rate)}/mo`,
          v3: formatDollars(total),
          isDisplay: true,
          orderNo,
        });
      };

      const urinalScreensTotal =
        (form.urinalScreensQty || 0) * (form.urinalScreenMonthly || 0);
      const urinalMatsTotal =
        (form.urinalMatsQty || 0) * (form.urinalMatMonthly || 0);
      const toiletClipsTotal =
        (form.toiletClipsQty || 0) * (form.toiletClipsMonthly || 0);
      const seatCoverTotal =
        (form.seatCoverDispensersQty || 0) * (form.seatCoverDispenserMonthly || 0);
      const sanipodsTotal =
        (form.sanipodsQty || 0) * (form.sanipodServiceMonthly || 0);
      const warrantyTotal =
        (form.warrantyDispensers || 0) * (form.warrantyFeePerDispenserPerWeek || 0);
      const microfiberTotal =
        (form.microfiberBathrooms || 0) * (form.microfiberMoppingPerBathroom || 0);

      addAtChargeExtra(
        "Luxury Upgrade",
        luxuryUpgradeQty,
        form.luxuryUpgradePerDispenser,
        luxuryUpgradeWeekly,
        EXTRA_ORDER.luxuryUpgrade
      );
      addAtChargeExtra("Urinal Screens", form.urinalScreensQty, form.urinalScreenMonthly, urinalScreensTotal, EXTRA_ORDER.urinalScreens);
      addAtChargeExtra("Urinal Mats", form.urinalMatsQty, form.urinalMatMonthly, urinalMatsTotal, EXTRA_ORDER.urinalMats);
      addAtChargeExtra("Toilet Clips", form.toiletClipsQty, form.toiletClipsMonthly, toiletClipsTotal, EXTRA_ORDER.toiletClips);
      addAtChargeExtra("Seat Cover Dispensers", form.seatCoverDispensersQty, form.seatCoverDispenserMonthly, seatCoverTotal, EXTRA_ORDER.seatCover);
      addAtChargeExtra("SaniPods", form.sanipodsQty, form.sanipodServiceMonthly, sanipodsTotal, EXTRA_ORDER.sanipods);
      addAtChargeExtra("Warranty", form.warrantyDispensers, form.warrantyFeePerDispenserPerWeek, warrantyTotal, EXTRA_ORDER.warranty);
      addAtChargeExtra("Microfiber Mopping", form.microfiberBathrooms, form.microfiberMoppingPerBathroom, microfiberTotal, EXTRA_ORDER.microfiber);

      if (form.pricingMode === "all_inclusive" && form.excessSoapGallonsPerWeek > 0 && extraSoapWeekly > 0) {
        addAtChargeExtra(
          "Excess Soap",
          form.excessSoapGallonsPerWeek,
          extraSoapRatePerGallon,
          extraSoapWeekly,
          EXTRA_ORDER.excessSoap
        );
      }

      if (form.pricingMode === "all_inclusive" && paperOveragePerWeek > 0) {
        addLineExtra(
          "Paper Overage",
          paperOveragePerWeek,
          "line",
          EXTRA_ORDER.paperOverage
        );
      }

        if (form.mainServiceFrequency !== "oneTime") {

          const hasFacilityComponents = form.addUrinalComponents || form.addMaleToiletComponents || form.addFemaleToiletComponents;

          if (form.pricingMode === "per_item_charge" && hasFacilityComponents) {
            addLineExtra("Facility Components Frequency", facilityFrequencyLabel, "line", EXTRA_ORDER.facilityFrequency, "wide");
          }
          addLineExtra("Base Service Monthly Total", quote.baseServiceMonthly, "bold", EXTRA_ORDER.baseServiceMonthly, "wide");

          if (hasFacilityComponents) {
            addLineExtra("Facility Components Monthly Total", quote.facilityComponentsMonthly, "bold", EXTRA_ORDER.facilityComponentsMonthly, "wide");
          }
        }

      const includedItems = Array.isArray(quote.included)
        ? quote.included.filter(Boolean)
        : [];
      includedItems.forEach((item, index) => {
        addLineExtra("Included", item, "line", EXTRA_ORDER.includedItems + index * 0.1);
      });
      const totals: Record<string, any> = {};
      if (totalPriceValue !== undefined) {
        totals.totalPrice = {
          isDisplay: true,
          orderNo: FIELD_ORDER.totalPrice,
          label: "Total Price",
          type: "dollar" as const,
          amount: totalPriceValue,
        };
      } else {
        totals.contract = {
          isDisplay: true,
          orderNo: FIELD_ORDER.contractTotal,
          label: "Contract Total",
          type: "dollar" as const,
          months: form.contractMonths,
          amount: quote.contractTotal,
        };
      }

      const data = isActive ? {
        serviceId: "saniclean",
        displayName: "SaniClean",
        isActive: true,

        pricingMode: form.pricingMode,
        location: form.location,
        rateTier: form.rateTier,
        mainServiceFrequency: form.mainServiceFrequency,
        facilityComponentsFrequency: form.facilityComponentsFrequency,
        frequency: form.frequency, 
        facilityComponentFrequency: form.facilityComponentFrequency, 
        contractMonths: form.contractMonths,
        originalContractTotal: quote.originalContractTotal ?? quote.contractTotal,

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: frequencyLabel,
        },

        allInclusiveWeeklyRatePerFixture: form.allInclusiveWeeklyRatePerFixture,
        luxuryUpgradePerDispenser: form.luxuryUpgradePerDispenser,
        luxuryUpgradeQty: form.luxuryUpgradeQty,
        excessStandardSoapRate: form.excessStandardSoapRate,
        excessLuxurySoapRate: form.excessLuxurySoapRate,

        excessSoapGallonsPerWeek: form.excessSoapGallonsPerWeek,
        paperCreditPerFixture: form.paperCreditPerFixture,

        estimatedPaperSpendPerWeek: form.estimatedPaperSpendPerWeek,
        microfiberMoppingPerBathroom: form.microfiberMoppingPerBathroom,

        insideBeltwayRatePerFixture: form.insideBeltwayRatePerFixture,
        insideBeltwayMinimum: form.insideBeltwayMinimum,
        insideBeltwayTripCharge: form.insideBeltwayTripCharge,
        insideBeltwayParkingFee: form.insideBeltwayParkingFee,
        outsideBeltwayRatePerFixture: form.outsideBeltwayRatePerFixture,
        outsideBeltwayTripCharge: form.outsideBeltwayTripCharge,

        smallFacilityThreshold: form.smallFacilityThreshold,
        smallFacilityMinimum: form.smallFacilityMinimum,

        urinalScreenMonthly: form.urinalScreenMonthly,
        urinalMatMonthly: form.urinalMatMonthly,
        toiletClipsMonthly: form.toiletClipsMonthly,
        seatCoverDispenserMonthly: form.seatCoverDispenserMonthly,
        sanipodServiceMonthly: form.sanipodServiceMonthly,

        warrantyFeePerDispenserPerWeek: form.warrantyFeePerDispenserPerWeek,
        weeklyToMonthlyMultiplier: form.weeklyToMonthlyMultiplier,
        weeklyToAnnualMultiplier: form.weeklyToAnnualMultiplier,
        redRateMultiplier: form.redRateMultiplier,
        greenRateMultiplier: form.greenRateMultiplier,

        customBaseService: form.customBaseService,
        customTripCharge: form.customTripCharge,
        customFacilityComponents: form.customFacilityComponents,
        customSoapUpgrade: form.customSoapUpgrade,
        customExcessSoap: form.customExcessSoap,
        customMicrofiberMopping: form.customMicrofiberMopping,
        customWarrantyFees: form.customWarrantyFees,
        customPaperOverage: form.customPaperOverage,
        customWeeklyTotal: form.customWeeklyTotal,
        customMonthlyTotal: form.customMonthlyTotal,
        customContractTotal: form.customContractTotal,
        applyMinimum: form.applyMinimum !== false,

        addUrinalComponents: form.addUrinalComponents,
        urinalScreensQty: form.addUrinalComponents ? form.urinalScreensQty : 0,
        urinalMatsQty: form.addUrinalComponents ? form.urinalMatsQty : 0,
        addMaleToiletComponents: form.addMaleToiletComponents,
        toiletClipsQty: form.addMaleToiletComponents ? form.toiletClipsQty : 0,
        seatCoverDispensersQty: form.addMaleToiletComponents ? form.seatCoverDispensersQty : 0,
        addFemaleToiletComponents: form.addFemaleToiletComponents,
        sanipodsQty: form.addFemaleToiletComponents ? form.sanipodsQty : 0,
        warrantyDispensers: form.warrantyDispensers,
        addMicrofiberMopping: form.addMicrofiberMopping,
        microfiberBathrooms: form.addMicrofiberMopping ? form.microfiberBathrooms : 0,

        perVisitBase: quote.breakdown.baseService,  
        perVisit: quote.weeklyTotal,  
        minimumChargePerWeek: quote.minimumChargePerWeek,  

        pricingMode: {
          isDisplay: true,
          orderNo: FIELD_ORDER.pricingMode,
          label: "Pricing Mode",
          type: "text" as const,
          value: form.pricingMode === "all_inclusive" ? "All Inclusive" : "Per Item Charge",
        },

        location: {
          isDisplay: true,
          orderNo: FIELD_ORDER.location,
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        fixtureBreakdown: (() => {
          const fixtureRate = form.pricingMode === "all_inclusive"
            ? form.allInclusiveWeeklyRatePerFixture
            : form.location === "insideBeltway"
              ? form.insideBeltwayRatePerFixture
              : form.outsideBeltwayRatePerFixture;
          const createLine = (label: string, quantity: number, orderNo: number) => ({
            isDisplay: true,
            orderNo,
            label,
            type: "calc" as const,
            qty: quantity,
            rate: fixtureRate,
            total: quantity * fixtureRate,
          });
          return [
            ...(form.sinks > 0 ? [createLine("Sinks", form.sinks, FIELD_ORDER.sinks)] : []),
            ...(form.urinals > 0 ? [createLine("Urinals", form.urinals, FIELD_ORDER.urinals)] : []),
            ...(form.maleToilets > 0 ? [createLine("Male Toilets", form.maleToilets, FIELD_ORDER.maleToilets)] : []),
            ...(form.femaleToilets > 0 ? [createLine("Female Toilets", form.femaleToilets, FIELD_ORDER.femaleToilets)] : []),
          ];
        })(),

        facilityComponentsTotal: quote.breakdown.facilityComponents,
        facilityComponentsMonthly: quote.facilityComponentsMonthly,

        soapType: form.soapType,

          totals,
          ...(totalPriceValue !== undefined ? { totalPrice: totalPriceValue } : {}),
          ...(totalPriceValue === undefined
            ? {
                contractTotal: {
                  isDisplay: true,
                  label: "Contract Total",
                  type: "dollar" as const,
                  amount: quote.contractTotal,
                },
              }
            : {}),

        notes: form.notes || "",
        customFields: customFields,
        pdfExtras: extras,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("saniclean", data);
      }
    }
  }, [form, quote, fixtures, customFields, soapDispensers, isAllInclusive, backendConfig]);

  const paperCreditPerWeek = form.fixtureCount * form.paperCreditPerFixture;
  const paperOveragePerWeek = Math.max(0, form.estimatedPaperSpendPerWeek - paperCreditPerWeek);

  const contractMonths =
    form.contractMonths && form.contractMonths >= 2 && form.contractMonths <= 36
      ? form.contractMonths
      : 12;

  const contractTotal = quote.contractTotal;

  return (
    <ServiceCardShell
      title={t("serviceForms.saniclean.title")}
      onAddCustom={() => setShowAddDropdown(!showAddDropdown)}
      onRemove={onRemove}
      headerActions={
        <RefreshButton onClick={() => fetchPricing(true)} loading={isLoadingConfig} />
      }
    >
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

      <div className="svc-row">
        <label>{t("serviceForms.saniclean.pricingMode")}</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="pricingMode"
            value={form.pricingMode}
            onChange={onChange}
          >
            <option value="all_inclusive">{t("serviceForms.saniclean.allInclusive")}</option>
            <option value="per_item_charge">{t("serviceForms.saniclean.perItemCharge")}</option>
          </select>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.mainServiceFrequency")}</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="mainServiceFrequency"
            value={form.mainServiceFrequency}
            onChange={(e) => setMainServiceFrequency(e.target.value as SanicleanFrequency)}
          >
            {Object.keys(sanicleanFrequencyLabels).map(
              (value) => (
                <option key={value} value={value}>
                  {t(`serviceForms.saniclean.freq.${value}`)}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.common.restroomFixtures")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            min="0"
            name="fixtureCount"
            value={form.fixtureCount || ""}
            readOnly
          />
        </div>
      </div>

      {}
       {form.pricingMode === "per_item_charge" && (
        <div className="svc-row">
          <label>{t("serviceForms.common.location")}</label>
          <div className="svc-row-right">
            <select
              className="svc-in"
              name="location"
              value={form.location}
              onChange={onChange}
            >
              <option value="insideBeltway">{t("serviceForms.common.insideBeltway")}</option>
              <option value="outsideBeltway">{t("serviceForms.common.outsideBeltway")}</option>
            </select>
          </div>
        </div>
      )}

      {}
      {}

      {}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        {t("serviceForms.saniclean.fixtureBreakdown")}
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.sinks")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="sinks"
            value={form.sinks || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="1"
            name={fixtureRateFieldName}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title={t("serviceForms.saniclean.ratePerSinkTitle")}
            style={getOverrideStyle(fixtureRateOverride)}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.sinks *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.urinals")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="urinals"
            value={form.urinals || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="1"
            name={fixtureRateFieldName}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title={t("serviceForms.saniclean.ratePerUrinalTitle")}
            style={getOverrideStyle(fixtureRateOverride)}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.urinals *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.maleToilets")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="maleToilets"
            value={form.maleToilets || ""}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="1"
            name={fixtureRateFieldName}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title={t("serviceForms.saniclean.ratePerMaleToiletTitle")}
            style={getOverrideStyle(fixtureRateOverride)}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.maleToilets *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.femaleToilets")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            name="femaleToilets"
            value={form.femaleToilets || ""}
            onChange={onChange}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="1"
            name={fixtureRateFieldName}
            value={isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
                  (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)}
            onChange={onChange}
            title={t("serviceForms.saniclean.ratePerFemaleToiletTitle")}
            style={getOverrideStyle(fixtureRateOverride)}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(form.femaleToilets *
              (isAllInclusive ? form.allInclusiveWeeklyRatePerFixture :
               (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture)))}
          />
        </div>
      </div>

      {}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        {t("serviceForms.saniclean.soapAndUpgrades")}
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.soapType")}</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="soapType"
            value={form.soapType}
            onChange={onChange}
          >
            <option value="standard">{t("serviceForms.saniclean.standardIncluded")}</option>
            <option value="luxury">{t("serviceForms.saniclean.luxuryOption", { rate: form.luxuryUpgradePerDispenser })}</option>
          </select>
        </div>
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.luxuryUpgrade")}</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="1"
            name="luxuryUpgradeQty"
            value={luxuryUpgradeQty}
            onChange={onChange}
            disabled={form.soapType !== "luxury"}
            style={{
              ...getOverrideStyle(
                Boolean(form.luxuryUpgradeQty),
                { backgroundColor: form.soapType !== "luxury" ? "#f5f5f5" : "white" }
              ),
              color: form.soapType !== "luxury" ? "#999" : "black"
            }}
            title={form.soapType === "luxury"
              ? t("serviceForms.saniclean.luxuryQtyTitleEnabled")
              : t("serviceForms.saniclean.luxuryQtyTitleDisabled")}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            min="0"
            step="1"
            name="luxuryUpgradePerDispenser"
            value={form.luxuryUpgradePerDispenser || ""}
            onChange={onChange}
            disabled={form.soapType !== "luxury"}
            style={{
              ...getOverrideStyle(
                hasPricingOverride("luxuryUpgradePerDispenser"),
                { backgroundColor: form.soapType !== "luxury" ? "#f5f5f5" : "white" }
              ),
              color: form.soapType !== "luxury" ? "#999" : "black"
            }}
            title={form.soapType === "luxury"
              ? t("serviceForms.saniclean.luxuryRateTitleEnabled")
              : t("serviceForms.saniclean.luxuryRateTitleDisabled")}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(luxuryUpgradeWeekly)}
          />
        </div>
      </div>

      {}
      {isAllInclusive && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.extraSoap")}</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              name="excessSoapGallonsPerWeek"
              value={form.excessSoapGallonsPerWeek || ""}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name={form.soapType === "luxury" ? "excessLuxurySoapRate" : "excessStandardSoapRate"}
              value={extraSoapRatePerGallon}
              onChange={onChange}
              title={t("serviceForms.saniclean.extraSoapRateTitle", { type: form.soapType })}
              style={getOverrideStyle(excessSoapRateOverride)}
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(extraSoapWeekly)}
            />
          </div>
        </div>
      )}

      {}
      {!isAllInclusive && (
        <>
          <div className="svc-h-sub" style={{ marginTop: 10 }}>
            {t("serviceForms.saniclean.facilityComponents")}
          </div>

          {}
          {form.pricingMode === "per_item_charge" && form.mainServiceFrequency !== "oneTime" && (
            <div className="svc-row">
              <label>
                {t("serviceForms.saniclean.facilityComponentsFrequency")}
                <small style={{ display: 'block', fontSize: '11px', color: '#666', fontWeight: 'normal' }}>
                  {t("serviceForms.saniclean.independentOfMain")}
                </small>
              </label>
              <div className="svc-row-right">
          <select
            className="svc-in"
            name="facilityComponentsFrequency"
            value={form.facilityComponentsFrequency}
            onChange={(e) => setFacilityComponentsFrequency(e.target.value as SanicleanFrequency)}
          >
            <option value="weekly">{t("serviceForms.common.weekly")}</option>
            <option value="biweekly">{t("serviceForms.common.biweeklyAlt")}</option>
            <option value="monthly">{t("serviceForms.common.monthly")}</option>
          </select>
        </div>
      </div>
    )}

          {}
          {form.urinals > 0 && (
            <>
              <div className="svc-row">
                <label>{t("serviceForms.saniclean.urinalComponents")}</label>
                <div className="svc-row-right">
                  <label className="svc-inline">
                    <input
                      type="checkbox"
                      name="addUrinalComponents"
                      checked={form.addUrinalComponents}
                      onChange={onChange}
                    />
                    <span>{t("serviceForms.saniclean.includeScreensMats")}</span>
                  </label>
                </div>
              </div>

              {}
              {form.addUrinalComponents && (
                <>
                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>{t("serviceForms.saniclean.urinalScreens")}</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        name="urinalScreensQty"
                        value={form.urinalScreensQty || ""}
                        onChange={onChange}
                        placeholder="0"
                        title={t("serviceForms.saniclean.urinalScreensQtyTitle")}
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        step="1"
                        name="urinalScreenMonthly"
                        value={form.urinalScreenMonthly}
                        onChange={onChange}
                        title={t("serviceForms.saniclean.urinalScreensRateTitle")}
                        style={getOverrideStyle(hasPricingOverride("urinalScreenMonthly"))}
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.urinalScreensQty * form.urinalScreenMonthly)}
                      />
                    </div>
                  </div>

                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>{t("serviceForms.saniclean.urinalMats")}</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        name="urinalMatsQty"
                        value={form.urinalMatsQty || ""}
                        onChange={onChange}
                        placeholder="0"
                        title={t("serviceForms.saniclean.urinalMatsQtyTitle")}
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        step="1"
                        name="urinalMatMonthly"
                        value={form.urinalMatMonthly}
                        onChange={onChange}
                        title={t("serviceForms.saniclean.urinalMatsRateTitle")}
                        style={getOverrideStyle(hasPricingOverride("urinalMatMonthly"))}
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.urinalMatsQty * form.urinalMatMonthly)}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {}
          {form.maleToilets > 0 && (
            <>
              <div className="svc-row">
                <label>{t("serviceForms.saniclean.maleToiletComponents")}</label>
                <div className="svc-row-right">
                  <label className="svc-inline">
                    <input
                      type="checkbox"
                      name="addMaleToiletComponents"
                      checked={form.addMaleToiletComponents}
                      onChange={onChange}
                    />
                    <span>{t("serviceForms.saniclean.includeClipsSeatCovers")}</span>
                  </label>
                </div>
              </div>

              {}
              {form.addMaleToiletComponents && (
                <>
                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>{t("serviceForms.saniclean.toiletClips")}</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        name="toiletClipsQty"
                        value={form.toiletClipsQty || ""}
                        onChange={onChange}
                        placeholder="0"
                        title={t("serviceForms.saniclean.toiletClipsQtyTitle")}
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        step="1"
                        name="toiletClipsMonthly"
                        value={form.toiletClipsMonthly}
                        onChange={onChange}
                        title={t("serviceForms.saniclean.toiletClipsRateTitle")}
                        style={getOverrideStyle(hasPricingOverride("toiletClipsMonthly"))}
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.toiletClipsQty * form.toiletClipsMonthly)}
                      />
                    </div>
                  </div>

                  <div className="svc-row" style={{ paddingLeft: '20px' }}>
                    <label>{t("serviceForms.saniclean.seatCoverDispensers")}</label>
                    <div className="svc-row-right">
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        name="seatCoverDispensersQty"
                        value={form.seatCoverDispensersQty || ""}
                        onChange={onChange}
                        placeholder="0"
                        title={t("serviceForms.saniclean.seatCoverQtyTitle")}
                      />
                      <span>@</span>
                      <input
                        className="svc-in field-qty"
                        type="number"
                        min="0"
                        step="1"
                        name="seatCoverDispenserMonthly"
                        value={form.seatCoverDispenserMonthly}
                        onChange={onChange}
                        title={t("serviceForms.saniclean.seatCoverRateTitle")}
                        style={getOverrideStyle(hasPricingOverride("seatCoverDispenserMonthly"))}
                      />
                      <span>=</span>
                      <input
                        className="svc-in field-qty"
                        type="text"
                        readOnly
                        value={formatMoney(form.seatCoverDispensersQty * form.seatCoverDispenserMonthly)}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {}
          {form.femaleToilets > 0 && (
            <>
              <div className="svc-row">
                <label>{t("serviceForms.saniclean.femaleToiletComponents")}</label>
                <div className="svc-row-right">
                  <label className="svc-inline">
                    <input
                      type="checkbox"
                      name="addFemaleToiletComponents"
                      checked={form.addFemaleToiletComponents}
                      onChange={onChange}
                    />
                    <span>{t("serviceForms.saniclean.includeSanipods")}</span>
                  </label>
                </div>
              </div>

              {}
              {form.addFemaleToiletComponents && (
                <div className="svc-row" style={{ paddingLeft: '20px' }}>
                  <label>{t("serviceForms.saniclean.sanipods")}</label>
                  <div className="svc-row-right">
                    <input
                      className="svc-in field-qty"
                      type="number"
                      min="0"
                      name="sanipodsQty"
                      value={form.sanipodsQty || ""}
                      onChange={onChange}
                      placeholder="0"
                      title={t("serviceForms.saniclean.sanipodsQtyTitle")}
                    />
                    <span>@</span>
                    <input
                      className="svc-in field-qty"
                      type="number"
                      min="0"
                      step="1"
                      name="sanipodServiceMonthly"
                      value={form.sanipodServiceMonthly}
                      onChange={onChange}
                      title={t("serviceForms.saniclean.sanipodsRateTitle")}
                      style={getOverrideStyle(hasPricingOverride("sanipodServiceMonthly"))}
                    />
                    <span>=</span>
                    <input
                      className="svc-in field-qty"
                      type="text"
                      readOnly
                      value={formatMoney(form.sanipodsQty * form.sanipodServiceMonthly)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {}

          {}
          {(form.addUrinalComponents || form.addMaleToiletComponents || form.addFemaleToiletComponents) && (
            <>
              <div className="svc-row">
                <label>
                  {t("serviceForms.saniclean.totalFacilityComponents")}
                  {form.mainServiceFrequency !== "oneTime" ? t("serviceForms.saniclean.atFrequency", { frequency: form.facilityComponentsFrequency }) : ""}
                </label>
                <div className="svc-row-right">
                  <input
                    className="svc-in-box"
                    type="text"
                    readOnly
                    value={formatMoney(
                      (form.addUrinalComponents ? (form.urinalScreensQty * form.urinalScreenMonthly + form.urinalMatsQty * form.urinalMatMonthly) : 0) +
                      (form.addMaleToiletComponents ? (form.toiletClipsQty * form.toiletClipsMonthly + form.seatCoverDispensersQty * form.seatCoverDispenserMonthly) : 0) +
                      (form.addFemaleToiletComponents ? form.sanipodsQty * form.sanipodServiceMonthly : 0)
                    )}
                    title={t("serviceForms.saniclean.facilityComponentRatesTitle", { frequency: form.facilityComponentsFrequency })}
                  />
                </div>
              </div>

              {}
              {form.mainServiceFrequency !== "oneTime" && (
                <div className="svc-row">
                  <label>{t("serviceForms.saniclean.facilityComponentMonthlyTotal")}</label>
                  <div className="svc-row-right">
                    <input
                      className="svc-in-box"
                      type="text"
                      readOnly
                      value={formatMoney(quote.breakdown.facilityComponents)}
                      title={t("serviceForms.saniclean.facilityComponentMonthlyTitle")}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {}
      {!isAllInclusive && form.sinks > 0 && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.warranty")}</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              name="warrantyDispensers"
              value={form.warrantyDispensers || ""}
              onChange={onChange}
              placeholder="0"
              title={t("serviceForms.saniclean.warrantyQtyTitle")}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="warrantyFeePerDispenserPerWeek"
              value={form.warrantyFeePerDispenserPerWeek}
              onChange={onChange}
              title={t("serviceForms.saniclean.warrantyRateTitle")}
              style={getOverrideStyle(hasPricingOverride("warrantyFeePerDispenserPerWeek"))}
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek)}
            />
            <span className="svc-note" style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              {t("serviceForms.saniclean.warrantySuggested", { count: Math.ceil(form.sinks * 1.5) })}
            </span>
          </div>
        </div>
      )}

      {}
      {}

      {}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        {t("serviceForms.saniclean.microfiberMopping")}
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.microfiberMoppingLabel")}</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={t("serviceForms.saniclean.includedInBundle")}
            />
          </div>
        </div>
      ) : (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.microfiberMoppingLabel")}</label>
          <div className="svc-row-right">
            <label className="svc-inline">
              <input
                type="checkbox"
                name="addMicrofiberMopping"
                checked={form.addMicrofiberMopping}
                onChange={onChange}
              />
              <span>{t("serviceForms.saniclean.include")}</span>
            </label>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              name="microfiberBathrooms"
              disabled={!form.addMicrofiberMopping}
              value={form.microfiberBathrooms || ""}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
              type="number"
              min="0"
              step="1"
              name="microfiberMoppingPerBathroom"
              value={form.addMicrofiberMopping ? form.microfiberMoppingPerBathroom : 0}
              onChange={onChange}
              title={t("serviceForms.saniclean.microfiberRateTitle")}
              style={getOverrideStyle(hasPricingOverride("microfiberMoppingPerBathroom"))}
            />
            <span>=</span>
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value={formatMoney(
                form.addMicrofiberMopping
                  ? form.microfiberBathrooms * form.microfiberMoppingPerBathroom
                  : 0
              )}
            />
          </div>
        </div>
      )}

      {}
      {isAllInclusive && (
        <>
          <div className="svc-h-sub" style={{ marginTop: 10 }}>
            {t("serviceForms.saniclean.paper")}
          </div>

          <div className="svc-row">
            <label>{t("serviceForms.saniclean.paperSpendCreditOverage")}</label>
            <div className="svc-row-right">
              <input
                className="svc-in"
                type="number"
                min="0"
                name="estimatedPaperSpendPerWeek"
                value={form.estimatedPaperSpendPerWeek || ""}
                onChange={onChange}
              />
              <span>-</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(paperCreditPerWeek)}
              />
              <span>=</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(paperOveragePerWeek)}
              />
            </div>
          </div>
        </>
      )}

      {}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        {t("serviceForms.saniclean.whatsIncluded")}
      </div>

      <div className="svc-row">
        <label>{isAllInclusive ? t("serviceForms.saniclean.allInclusiveBundle") : t("serviceForms.saniclean.standardPackage")}</label>
        <div className="svc-row-right">
          <IncludedItemsEditor
            items={quote.included}
            isCustomized={form.includedItems != null}
            onChange={(items) => updateForm({ includedItems: items })}
            onReset={() => updateForm({ includedItems: null })}
          />
        </div>
      </div>

      {}
      {}

      {}
      {}

      {}
      <div className="svc-h-sub" style={{ marginTop: 16 }}>
        {t("serviceForms.saniclean.priceBreakdown")}
      </div>

      {}
      <div className="svc-row">
        <label>{t("serviceForms.common.minimumPerVisit")}</label>
        <div className="svc-row-right">
          <span className="svc-small">${quote.minimumChargePerWeek != null ? quote.minimumChargePerWeek.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "0.00"}</span>
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
      <div className="svc-row">
        <label>{t("serviceForms.saniclean.baseService")}</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              min="0"
              step="1"
              name="customBaseService"
              value={getDisplayValue(
                'customBaseService',
                form.customBaseService !== undefined
                  ? form.customBaseService
                  : quote.breakdown.baseService,
                true
              )}
              onChange={handleLocalChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                backgroundColor: form.customBaseService !== undefined ? '#fffacd' : 'white',
                width: '100px'
              }}
              title=""
            />
          </div>
        </div>
      </div>

      {}
      {}

      {}
      {form.pricingMode === "per_item_charge" && quote.breakdown.facilityComponents > 0 && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.facilityComponentsLabel")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                min="0"
                step="1"
                name="customFacilityComponents"
                value={getDisplayValue(
                  'customFacilityComponents',
                  form.customFacilityComponents !== undefined
                    ? form.customFacilityComponents
                    : quote.breakdown.facilityComponents,
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customFacilityComponents !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.facilityComponentsBreakdownTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {quote.breakdown.soapUpgrade > 0 && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.soapUpgrade")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                min="0"
                step="1"
                name="customSoapUpgrade"
                value={getDisplayValue(
                  'customSoapUpgrade',
                  form.customSoapUpgrade !== undefined
                    ? form.customSoapUpgrade
                    : quote.breakdown.soapUpgrade,
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customSoapUpgrade !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.soapUpgradeTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {quote.breakdown.excessSoap > 0 && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.excessSoap")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                min="0"
                step="1"
                name="customExcessSoap"
                value={getDisplayValue(
                  'customExcessSoap',
                  form.customExcessSoap !== undefined
                    ? form.customExcessSoap
                    : quote.breakdown.excessSoap
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customExcessSoap !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.excessSoapTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {quote.breakdown.microfiberMopping > 0 && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.microfiberMoppingLabel")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                min="0"
                step="1"
                name="customMicrofiberMopping"
                value={getDisplayValue(
                  'customMicrofiberMopping',
                  form.customMicrofiberMopping !== undefined
                    ? form.customMicrofiberMopping
                    : quote.breakdown.microfiberMopping,
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customMicrofiberMopping !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.microfiberMoppingTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {form.pricingMode === "per_item_charge" && quote.breakdown.warrantyFees > 0 && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.warrantyFees")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                min="0"
                step="1"
                name="customWarrantyFees"
                value={getDisplayValue(
                  'customWarrantyFees',
                  form.customWarrantyFees !== undefined
                    ? form.customWarrantyFees
                    : quote.breakdown.warrantyFees,
                  true
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customWarrantyFees !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.warrantyFeesTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {form.pricingMode === "all_inclusive" && quote.breakdown.paperOverage > 0 && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.paperOverage")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="number"
                min="0"
                step="1"
                name="customPaperOverage"
                value={getDisplayValue(
                  'customPaperOverage',
                  form.customPaperOverage !== undefined
                    ? form.customPaperOverage
                    : quote.breakdown.paperOverage
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                  backgroundColor: form.customPaperOverage !== undefined ? '#fffacd' : 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.paperOverageTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {}

      {}
      {}

      {}
      {fixtures > 0 && (
        <div className="svc-row" style={{ paddingTop: '5px' }}>
          <label></label>
          <div className="svc-row-right">
            {quote.contractTotal > (quote.originalContractTotal ?? quote.contractTotal) * 1.30 ? (
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
      {['weekly', 'biweekly', 'twicePerMonth', 'monthly', 'everyFourWeeks'].includes(form.mainServiceFrequency) && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.baseServiceMonthlyTotal")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={quote.baseServiceMonthly != null ? quote.baseServiceMonthly.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
                style={{
                  backgroundColor: 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.baseServiceMonthlyTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {}
      {form.pricingMode === "per_item_charge" &&
       (form.addUrinalComponents || form.addMaleToiletComponents || form.addFemaleToiletComponents) &&
       ['weekly', 'biweekly', 'twicePerMonth', 'monthly', 'everyFourWeeks'].includes(form.mainServiceFrequency) && (
        <div className="svc-row">
          <label>{t("serviceForms.saniclean.facilityComponentMonthlyTotal")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={quote.facilityComponentsMonthly != null ? quote.facilityComponentsMonthly.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
                style={{
                  backgroundColor: 'white',
                  width: '100px'
                }}
                title={t("serviceForms.saniclean.facilityMonthlyTitle")}
              />
            </div>
          </div>
        </div>
      )}

      {form.mainServiceFrequency !== "oneTime" && (
        <div className="svc-row">
          <label>{t("serviceForms.common.contractTotal")}</label>
          <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="svc-in"
              name="contractMonths"
              value={contractMonths}
              disabled
            >
              {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
                <option key={m} value={m}>
                  {t("serviceForms.common.monthsShort", { count: m })}
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
                  : contractTotal,
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
              title={t("serviceForms.saniclean.contractTotalTitle")}
            />
          </div>
        </div>
      )}
      {totalPriceValue !== undefined && (
        <div className="svc-row svc-row-charge">
          <label>{t("serviceForms.common.totalPrice")}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={totalPriceValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                style={{ width: "100px" }}
              />
            </div>
          </div>
        </div>
      )}

      {}
      <div className="svc-row">
        <label>{t("serviceForms.common.notes")}</label>
        <div className="svc-row-right">
          <textarea
            className="svc-in"
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={3}
          />
        </div>
      </div>
    </ServiceCardShell>
  );
};

export default SanicleanForm;
