
import React, { useEffect, useRef, useState } from "react";
import { useFoamingDrainCalc } from "./useFoamingDrainCalc";
import type {
  FoamingDrainFormState,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
} from "./foamingDrainTypes";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";
import { ServiceCardShell, RefreshButton } from "../../molecules";
import { useEditableCurrency } from "../../../features/services/engine";
import { FaCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const FIELD_ORDER = {
  frequency: 1,
  installFrequency: 2,

  breakdown: {
    standard: 10,
    grease: 11,
    green: 12,
  },
  installDrains: 13,
  plumbingWork: 14,
  tripCharge: 20,
  totals: {
    perVisit: 30,
    firstMonth: 31,
    monthlyRecurring: 32,
    firstVisit: 33,
    recurringVisit: 34,
    contract: 35,
    minimum: 36,
    totalPrice: 37,
  },
} as const;

interface FoamingDrainFormProps {
  initialData?: Partial<FoamingDrainFormState>;
  onRemove?: () => void;
}

const formatAmount = (n: number): string =>
  n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

const formatNumber = (num: number): string => {
  if (!Number.isFinite(num)) {
    return "0";
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const FoamingDrainForm: React.FC<FoamingDrainFormProps> = ({
  initialData,
  onRemove,
}) => {

  const { t } = useTranslation();

  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );

  const { state, quote, updateField, refreshConfig, isLoadingConfig, backendConfig } =
    useFoamingDrainCalc(initialData, customFields);
  const servicesContext = useServicesContextOptional();

  useEffect(() => {
    if (servicesContext?.globalContractMonths && servicesContext.globalContractMonths !== state.contractMonths) {
      updateField("contractMonths", servicesContext.globalContractMonths as any);
    }
  }, [servicesContext?.globalContractMonths]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const editable = useEditableCurrency(((e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    if (value === "") {
      updateField(name as keyof FoamingDrainFormState, undefined as any);
    } else {
      const num = parseFloat(value);
      if (!isNaN(num)) updateField(name as keyof FoamingDrainFormState, num as any);
    }
  }) as any);

  const getDisplayValue = editable.getDisplayValue;
  const handleFocus = editable.onFocus;
  const handleLocalChange = editable.onChange;
  const handleBlur = editable.onBlur;

  const prevDataRef = useRef<string>("");

  const breakdown = quote.breakdown;

  useEffect(() => {

    const isVolume = state.standardDrainCount >= cfg.volumePricing.minimumDrains;

    const stdQty = state.isAllInclusive
      ? 0
      : isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive
      ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
      : state.standardDrainCount;
    const stdTotal = breakdown.weeklyStandardDrains;
    const stdRate = stdQty > 0 ? stdTotal / stdQty : state.standardDrainRate;

    const greaseQty = state.greaseTrapCount;
    const greaseTotal = breakdown.weeklyGreaseTraps;
    const greaseRate = greaseQty > 0 ? greaseTotal / greaseQty : state.greaseWeeklyRate;

    const greenQty = state.greenDrainCount;
    const greenTotal = breakdown.weeklyGreenDrains;
    const greenRate = greenQty > 0 ? greenTotal / greenQty : state.greenWeeklyRate;

    if (servicesContext) {
      const hasCustomFieldValues = customFields.some(f =>
        (f.type === 'dollar' && !!f.value && parseFloat(f.value) > 0) ||
        (f.type === 'calc' && !!f.calcValues?.right && parseFloat(f.calcValues.right) > 0)
      );
      const isActive = state.standardDrainCount > 0 || state.greaseTrapCount > 0 || state.greenDrainCount > 0 || hasCustomFieldValues;
      const dynamicMinimumDrains = backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains;
      const isVolume = state.standardDrainCount >= dynamicMinimumDrains;
      const isInstallProgram = isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;
      const installQty = isInstallProgram ? Math.max(0, state.installDrainCount) : 0;
      const installTotal = breakdown.weeklyInstallDrains || 0;
      const installRate =
        installQty > 0
          ? installTotal / installQty
          : state.installFrequency === "bimonthly"
            ? state.volumeBimonthlyRate
            : state.volumeWeeklyRate;
      const installRowQty = installQty > 0 ? installQty : (state.installDrainCount || 0);
      const plumbingQty = state.needsPlumbing ? Math.max(0, state.plumbingDrainCount) : 0;
      const plumbingTotal = breakdown.weeklyPlumbing || 0;
      const effectivePlumbingRate = state.customPlumbingAddonRate ?? state.plumbingAddonRate;
      const plumbingRate = plumbingQty > 0 ? plumbingTotal / plumbingQty : effectivePlumbingRate;
      const plumbingRowQty = plumbingQty > 0 ? plumbingQty : (state.plumbingDrainCount || 0);

      const totalPriceValue =
        state.frequency === "oneTime"
          ? state.customWeeklyService ?? quote.annualRecurring
          : undefined;

      const data = isActive ? {
        serviceId: "foamingDrain",
        displayName: "Foaming Drain",
        isActive: true,

        standardDrainRate: state.customRatePerDrain ?? state.standardDrainRate,
        altBaseCharge: state.customAltBaseCharge ?? state.altBaseCharge,
        altExtraPerDrain: state.customAltExtraPerDrain ?? state.altExtraPerDrain,
        volumeWeeklyRate: state.customVolumeWeeklyRate ?? state.volumeWeeklyRate,
        volumeBimonthlyRate: state.customVolumeBimonthlyRate ?? state.volumeBimonthlyRate,
        greaseWeeklyRate: state.customGreaseWeeklyRate ?? state.greaseWeeklyRate,
        greaseInstallRate: state.customGreaseInstallRate ?? state.greaseInstallRate,
        greenWeeklyRate: state.customGreenWeeklyRate ?? state.greenWeeklyRate,
        greenInstallRate: state.customGreenInstallRate ?? state.greenInstallRate,
        plumbingAddonRate: state.customPlumbingAddonRate ?? state.plumbingAddonRate,
        filthyMultiplier: state.customFilthyMultiplier ?? state.filthyMultiplier,

        standardDrainCount: state.standardDrainCount,
        installDrainCount: state.installDrainCount,
        filthyDrainCount: state.filthyDrainCount,
        greaseTrapCount: state.greaseTrapCount,
        greenDrainCount: state.greenDrainCount,
        plumbingDrainCount: state.plumbingDrainCount,
        frequency: state.frequency,
        installFrequency: state.installFrequency,
        contractMonths: state.contractMonths,
        facilityCondition: state.facilityCondition,

        useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
        useBigAccountTenWeekly: state.useBigAccountTenWeekly,
        isAllInclusive: state.isAllInclusive,
        chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,
        needsPlumbing: state.needsPlumbing,
        applyMinimum: state.applyMinimum !== false,

        perVisitBase: quote.weeklyService,  
        perVisit: quote.weeklyTotal,  
        minimumChargePerVisit: quote.minimumChargePerVisit,  
        contractTotal: quote.annualRecurring,
        originalContractTotal: quote.originalContractTotal,

        frequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.frequency,
          label: "Frequency",
          type: "text" as const,
          value: typeof state.frequency === "string"
            ? state.frequency.charAt(0).toUpperCase() + state.frequency.slice(1)
            : String(state.frequency || "Weekly"),
          frequencyKey: state.frequency,
        },
        installFrequency: {
          isDisplay: true,
          orderNo: FIELD_ORDER.installFrequency,
          label: "Install Frequency",
          type: "text" as const,
          value: state.installFrequency.charAt(0).toUpperCase() + state.installFrequency.slice(1),
        },

        drainBreakdown: (() => {
          const rows: any[] = [];
          if (state.standardDrainCount > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.breakdown.standard,
              label: "Standard Drains",
              type: "calc" as const,
              qty: state.standardDrainCount,
              rate: stdRate,
              total: breakdown.weeklyStandardDrains,
            });
          }
          if (state.greaseTrapCount > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.breakdown.grease,
              label: "Grease Trap Drains",
              type: "calc" as const,
              qty: state.greaseTrapCount,
              rate: greaseRate,
              total: breakdown.weeklyGreaseTraps,
            });
          }
          if (state.greenDrainCount > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.breakdown.green,
              label: "Green Drains",
              type: "calc" as const,
              qty: state.greenDrainCount,
              rate: greenRate,
              total: breakdown.weeklyGreenDrains,
            });
          }
          if (installRowQty > 0 && installTotal > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.installDrains,
              label: `Install Drains (${state.installFrequency.charAt(0).toUpperCase() + state.installFrequency.slice(1)})`,
              type: "calc" as const,
              qty: installRowQty,
              rate: installRate,
              total: installTotal,
            });
          }
          if (plumbingRowQty > 0 && plumbingTotal > 0) {
            rows.push({
              isDisplay: true,
              orderNo: FIELD_ORDER.plumbingWork,
              label: "Extra Plumbing Work",
              type: "calc" as const,
              qty: plumbingRowQty,
              rate: plumbingRate,
              total: plumbingTotal,
            });
          }
          return rows;
        })(),

        ...(breakdown.tripCharge > 0 ? {
          tripCharge: {
            isDisplay: true,
            orderNo: FIELD_ORDER.tripCharge,
            label: "Trip Charge",
            type: "dollar" as const,
            amount: breakdown.tripCharge,
          },
        } : {}),

        totals: (() => {
          const totals: any = {
            perVisit: {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.perVisit,
              label: "Per Visit Total",
              type: "dollar" as const,
              amount: quote.weeklyTotal,
            },
          };
          const monthlyGroup = new Set<FoamingDrainFrequency>(["weekly", "biweekly", "twicePerMonth", "monthly"]);
          if (monthlyGroup.has(state.frequency)) {
            totals.firstMonth = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.firstMonth,
              label: "First Month Total",
              type: "dollar" as const,
              amount: quote.firstMonthPrice,
            };
            totals.monthlyRecurring = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.monthlyRecurring,
              label: "Monthly Recurring",
              type: "dollar" as const,
              amount: quote.monthlyRecurring,
              gap: "normal",
            };
          } else {
            totals.firstVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.firstVisit,
              label: state.frequency === "oneTime" ? "Total Price" : "First Visit Total",
              type: "dollar" as const,
              amount: quote.firstVisitPrice,
            };
            totals.recurringVisit = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.recurringVisit,
              label: "Recurring Visit Total",
              type: "dollar" as const,
              amount: quote.weeklyService,
              gap: "normal",
            };
          }
          if (state.frequency === "oneTime" && totalPriceValue !== undefined) {
            totals.totalPrice = {
              isDisplay: true,
              orderNo: FIELD_ORDER.totals.totalPrice,
              label: "Total Price",
              type: "dollar" as const,
              amount: totalPriceValue,
            };
          }

          totals.contract = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.contract,
            label: "Contract Total",
            type: "dollar" as const,
            months: state.contractMonths,
            amount: quote.annualRecurring,
          };
          totals.minimum = {
            isDisplay: true,
            orderNo: FIELD_ORDER.totals.minimum,
            label: "Minimum",
            type: "dollar" as const,
            amount: quote.minimumChargePerVisit,
          };
          return totals;
        })(),

        notes: state.notes || "",
        customFields: customFields,
        ...(state.frequency === "oneTime" && totalPriceValue !== undefined
          ? { totalPrice: totalPriceValue }
          : {}),
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        console.log('🔧 [FoamingDrainForm] Sending data to context with pricing fields:', {
          standardDrainRate: data?.standardDrainRate,
          altBaseCharge: data?.altBaseCharge,
          altExtraPerDrain: data?.altExtraPerDrain,
          fullData: JSON.stringify(data, null, 2)
        });
        servicesContext.updateService("foamingDrain", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, quote, breakdown, customFields, backendConfig]);

  const dynamicMinimumDrains = backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains;
  const isWeekly = state.frequency === "weekly";
  const isVolume = state.standardDrainCount >= dynamicMinimumDrains; 

  const canUseSmallAlt =
    isWeekly && state.standardDrainCount > 0 && !isVolume;

  const canUseBigAlt = isVolume;

  const isInstallLevelUi =
    isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

  const handleNumberChange =
    (field: keyof FoamingDrainFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === "" ? 0 : Number(raw);
      const safe = Number.isFinite(num) && num >= 0 ? num : 0;

      if (field === "standardDrainCount") {
        const newCount = safe;
        const newIsVolume =
          newCount >= dynamicMinimumDrains; 
        const newCanSmallAlt =
          state.frequency === "weekly" &&
          newCount > 0 &&
          !newIsVolume;

        updateField("standardDrainCount", newCount);

        if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
          updateField("useSmallAltPricingWeekly", false);
        }

        return;
      }

      updateField(field, safe);
    };

  const handleFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newFreq = e.target.value as FoamingDrainFrequency;
    updateField("frequency", newFreq);

    if (newFreq !== "weekly") {

      updateField("useSmallAltPricingWeekly", false);
    } else {

      const count = state.standardDrainCount;
      const newIsVolume =
        count >= dynamicMinimumDrains; 
      const newCanSmallAlt = count > 0 && !newIsVolume;

      if (!newCanSmallAlt && state.useSmallAltPricingWeekly) {
        updateField("useSmallAltPricingWeekly", false);
      }
    }
  };

  const handleInstallFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newInstallFreq = e.target.value as "weekly" | "bimonthly";
    console.log(`🔧 [Foaming Drain] Install frequency changed from ${state.installFrequency} to ${newInstallFreq}`);
    updateField("installFrequency", newInstallFreq);
  };

  const handleLocationChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateField("location", e.target.value as FoamingDrainLocation);
  };

  const handleConditionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateField(
      "facilityCondition",
      e.target.value as FoamingDrainCondition
    );
  };

  const stdServiceQty = state.isAllInclusive
    ? 0
    : isInstallLevelUi
    ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
    : state.standardDrainCount;

  const stdQty = stdServiceQty;
  const stdTotal = breakdown.weeklyStandardDrains;

  const stdQtyForRateCalc = isInstallLevelUi
    ? Math.max(state.standardDrainCount - state.installDrainCount, 0)
    : state.standardDrainCount;

  const effectiveStandardRate = state.customRatePerDrain ?? state.standardDrainRate;
  let stdRate = effectiveStandardRate;
  if (!state.isAllInclusive && stdQtyForRateCalc > 0 && stdTotal > 0) {
    stdRate = stdTotal / stdQtyForRateCalc;
  }

  const greaseQty = state.greaseTrapCount;
  const greaseTotal = breakdown.weeklyGreaseTraps;
  const greaseRate = greaseQty > 0 ? greaseTotal / greaseQty : 0;

  const greenQty = state.greenDrainCount;
  const greenTotal = breakdown.weeklyGreenDrains;
  const greenRate = greenQty > 0 ? greenTotal / greenQty : 0;

  const effectivePlumbingRate = state.customPlumbingAddonRate ?? state.plumbingAddonRate;

  const pricingLabel = (() => {
    const minimumDrains = backendConfig?.volumePricing?.minimumDrains ?? 10;
    const altBase = formatNumber(state.customAltBaseCharge ?? state.altBaseCharge);
    const altPerDrain = formatNumber(state.customAltExtraPerDrain ?? state.altExtraPerDrain);
    const volumeWeekly = formatNumber(state.customVolumeWeeklyRate ?? state.volumeWeeklyRate);
    const volumeBimonthly = formatNumber(state.customVolumeBimonthlyRate ?? state.volumeBimonthlyRate);
    const standardRate = formatNumber(stdRate);

    if (breakdown.usedBigAccountAlt) {
      return t("serviceForms.foamingDrain.pricingVolumeWaived", { rate: volumeWeekly, min: minimumDrains });
    }
    if (breakdown.volumePricingApplied) {
      return t("serviceForms.foamingDrain.pricingVolumeSeparate", { min: minimumDrains, weekly: volumeWeekly, bimonthly: volumeBimonthly });
    }
    if (breakdown.usedSmallAlt) {
      return t("serviceForms.foamingDrain.pricingAlternative", { base: altBase, perDrain: altPerDrain });
    }
    return t("serviceForms.foamingDrain.pricingStandard", { rate: standardRate });
  })();

  const installQty = isInstallLevelUi ? state.installDrainCount : 0;
  const installTotal = breakdown.weeklyInstallDrains;
  const installRate =
    installQty > 0
      ? installTotal / installQty
      : isInstallLevelUi
      ? state.installFrequency === "bimonthly"  
        ? state.volumeBimonthlyRate
        : state.volumeWeeklyRate
      : 0;

  const tripInputValue =
    typeof state.tripChargeOverride === "number"
      ? state.tripChargeOverride
      : breakdown.tripCharge;

  return (
    <ServiceCardShell
      title={t("serviceForms.foamingDrain.title")}
      onAddCustom={() => setShowAddDropdown(!showAddDropdown)}
      onRemove={onRemove}
      headerActions={
        <RefreshButton onClick={() => refreshConfig(true)} loading={isLoadingConfig} />
      }
    >
      <div className="svc-card__inner">
        {}
        <CustomFieldManager
          fields={customFields}
          onFieldsChange={setCustomFields}
          showAddDropdown={showAddDropdown}
          onToggleAddDropdown={setShowAddDropdown}
        />

        {}
        <div className="svc-row">
          <div className="svc-label">
            <span>{t("serviceForms.foamingDrain.serviceFrequency")}</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.frequency}
              onChange={handleFrequencyChange}
            >
              <option value="oneTime">{t("serviceForms.foamingDrain.freq.oneTime")}</option>
              <option value="weekly">{t("serviceForms.foamingDrain.freq.weekly")}</option>
              <option value="biweekly">{t("serviceForms.foamingDrain.freq.biweekly")}</option>
              <option value="twicePerMonth">{t("serviceForms.foamingDrain.freq.twicePerMonth")}</option>
              <option value="monthly">{t("serviceForms.foamingDrain.freq.monthly")}</option>
              <option value="everyFourWeeks">{t("serviceForms.foamingDrain.freq.everyFourWeeks")}</option>
              <option value="bimonthly">{t("serviceForms.foamingDrain.freq.bimonthly")}</option>
              <option value="quarterly">{t("serviceForms.foamingDrain.freq.quarterly")}</option>
              <option value="biannual">{t("serviceForms.foamingDrain.freq.biannual")}</option>
              <option value="annual">{t("serviceForms.foamingDrain.freq.annual")}</option>
            </select>
          </div>
        </div>

        {}
        {}

        {}
        {}

        {}
        <div className="svc-row">
          <div className="svc-label">
            <span>{t("serviceForms.foamingDrain.extras")}</span>
          </div>
          <div className="svc-field">
            <div className="svc-inline">
              {}
              <label>
                <input
                  type="checkbox"
                  checked={state.needsPlumbing}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateField("needsPlumbing", checked);
                    if (!checked) {
                      updateField("plumbingDrainCount", 0);
                    }
                  }}
                />{" "}
                {t("serviceForms.foamingDrain.plumbing")}
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customPlumbingAddonRate"
                  className="svc-in field-rate"
                  style={{
                    width: "60px",
                    display: "inline-block",
                    margin: "0 2px",
                    backgroundColor: state.customPlumbingAddonRate !== undefined ? '#fffacd' : 'white'
                  }}
                  value={getDisplayValue(
                    'customPlumbingAddonRate',
                    state.customPlumbingAddonRate !== undefined
                      ? state.customPlumbingAddonRate
                      : state.plumbingAddonRate
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title={t("serviceForms.foamingDrain.plumbingAddonTitle")}
                />
                {t("serviceForms.foamingDrain.perDrainDrains")}
                {state.needsPlumbing && (
                  <input
                    type="number"
            min="0"
                    min={0}
                    className="svc-in field-medium"
                    value={state.plumbingDrainCount || ""}
                    onChange={handleNumberChange("plumbingDrainCount")}
                  />
                )}
              </label>
            </div>
          </div>
        </div>

        {}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <div className="svc-inline">
              {}
              <label>
                <input
                  type="checkbox"
                  disabled={!canUseSmallAlt}
                  checked={state.useSmallAltPricingWeekly && canUseSmallAlt}
                  onChange={(e) => {
                    const checked = e.target.checked && canUseSmallAlt;
                    updateField("useSmallAltPricingWeekly", checked);
                    if (checked && state.useBigAccountTenWeekly) {
                      updateField("useBigAccountTenWeekly", false);
                    }
                  }}
                />{" "}
                {t("serviceForms.foamingDrain.smallJobAlt")}
                <span className="svc-note">
                  {t("serviceForms.foamingDrain.weeklyLessThan", { count: backendConfig?.volumePricing?.minimumDrains ?? 10 })}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customAltBaseCharge"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customAltBaseCharge',
                    state.customAltBaseCharge !== undefined
                      ? state.customAltBaseCharge
                      : state.altBaseCharge
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title={t("serviceForms.foamingDrain.altBaseTitle")}
                  style={{
                    backgroundColor: state.customAltBaseCharge !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span className="svc-note"> + $</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customAltExtraPerDrain"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customAltExtraPerDrain',
                    state.customAltExtraPerDrain !== undefined
                      ? state.customAltExtraPerDrain
                      : state.altExtraPerDrain
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title={t("serviceForms.foamingDrain.altPerDrainTitle")}
                  style={{
                    backgroundColor: state.customAltExtraPerDrain !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span className="svc-note">{t("serviceForms.foamingDrain.perDrain")}</span>
              </label>
            </div>
            <div className="svc-inline">
              {}
              <label>
                <input
                  type="checkbox"
                  disabled={!canUseBigAlt}
                  checked={state.useBigAccountTenWeekly && canUseBigAlt}
                  onChange={(e) => {
                    const checked = e.target.checked && canUseBigAlt;
                    updateField("useBigAccountTenWeekly", checked);

                    if (checked && state.useSmallAltPricingWeekly) {
                      updateField("useSmallAltPricingWeekly", false);
                    }
                  }}
                />{" "}
                {t("serviceForms.foamingDrain.bigAccount")}
                <span className="svc-note">
                  {t("serviceForms.foamingDrain.bigAccountNote", { count: backendConfig?.volumePricing?.minimumDrains ?? 10, rate: state.standardDrainRate })}
                </span>
              </label>
            </div>
          </div>
        </div>

        {}
        {}

        {}
        <div className="svc-row">
          <div className="svc-label" />
          <div className="svc-field">
            <label>
              <input
                type="checkbox"
                checked={state.chargeGreaseTrapInstall}
                onChange={(e) =>
                  updateField(
                    "chargeGreaseTrapInstall",
                    e.target.checked
                  )
                }
              />{" "}
              {t("serviceForms.foamingDrain.greaseTrapInstall")}
              <input
                type="number"
                min={0}
                step={1}
                name="customGreaseInstallRate"
                className="svc-in field-rate"
                style={{
                  width: "80px",
                  display: "inline-block",
                  margin: "0 2px",
                  backgroundColor: state.customGreaseInstallRate !== undefined ? '#fffacd' : 'white'
                }}
                value={getDisplayValue(
                  'customGreaseInstallRate',
                  state.customGreaseInstallRate !== undefined
                    ? state.customGreaseInstallRate
                    : state.greaseInstallRate
                )}
                onChange={handleLocalChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                title={t("serviceForms.foamingDrain.greaseInstallTitle")}
              />
              {t("serviceForms.foamingDrain.ifPossible")}
            </label>
          </div>
        </div>

        {}
        <div className="svc-summary">
          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.foamingDrain.standardDrains")}</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {}
                <input
                  type="number"
                  min="0"
                  className="svc-in field-qty"
                  value={state.standardDrainCount || ""}
                  onChange={handleNumberChange("standardDrainCount")}
                />
                {isInstallLevelUi && state.installDrainCount > 0 && (
                  <span className="svc-note" style={{ marginLeft: "8px" }}>
                    {t("serviceForms.foamingDrain.serviceDrains", { count: stdQtyForRateCalc })}
                  </span>
                )}

                <span>@</span>
                {}
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  readOnly={breakdown.usedSmallAlt}
                  step={1}
                  name="customRatePerDrain"
                  className="svc-in field-rate"
                  value={getDisplayValue(
                    'customRatePerDrain',
                    state.customRatePerDrain !== undefined
                      ? state.customRatePerDrain
                      : (stdRate > 0 ? stdRate : state.standardDrainRate)
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title={breakdown.usedSmallAlt
                    ? t("serviceForms.foamingDrain.standardRateAltTitle", { base: state.altBaseCharge, perDrain: state.altExtraPerDrain })
                    : breakdown.usedBigAccountAlt
                    ? t("serviceForms.foamingDrain.standardRateBigTitle")
                    : t("serviceForms.foamingDrain.standardRateTitle")}
                  style={{
                    backgroundColor: breakdown.usedSmallAlt
                      ? '#f0f0f0'
                      : (state.customRatePerDrain !== undefined ? '#fffacd' : 'white')
                  }}
                />
                <span>=</span>
                {}
                <span>$</span>
                <input
                  readOnly
                  className="svc-in-box weekly-total-field"
                  value={formatAmount(stdTotal)}
                />
              </div>
            </div>
          </div>

          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.foamingDrain.pricingModel")}</span>
            </div>
            <div className="svc-field">
              <span className="svc-red">{pricingLabel}</span>
            </div>
          </div>

          {}
          {isInstallLevelUi && (
            <div>
                    <div className="svc-row">
          <div className="svc-label">
            <span>{t("serviceForms.foamingDrain.installFrequency")}</span>
          </div>
          <div className="svc-field">
            <select
              className="svc-in"
              value={state.installFrequency}
              onChange={handleInstallFrequencyChange}
              key="install-frequency-select"
            >
              {}
              <option value="weekly">{t("serviceForms.foamingDrain.installWeekly")}</option>
              <option value="bimonthly">{t("serviceForms.foamingDrain.installBimonthly")}</option>
            </select>
          </div>
        </div>
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.foamingDrain.installDrains")}</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  {}
                  <input
                    type="number"
                    min={0}
                    max={state.standardDrainCount}
                    className="svc-in field-qty"
                    value={state.installDrainCount || ""}
                    onChange={handleNumberChange("installDrainCount")}
                  />
                  <span>@</span>
                  {}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="svc-in field-qty"
                    name={state.installFrequency === "weekly" ? "customVolumeWeeklyRate" : "customVolumeBimonthlyRate"}
                    value={getDisplayValue(
                      state.installFrequency === "weekly" ? 'customVolumeWeeklyRate' : 'customVolumeBimonthlyRate',
                      state.installFrequency === "weekly"
                        ? (state.customVolumeWeeklyRate !== undefined ? state.customVolumeWeeklyRate : state.volumeWeeklyRate)
                        : (state.customVolumeBimonthlyRate !== undefined ? state.customVolumeBimonthlyRate : state.volumeBimonthlyRate)
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    title={t("serviceForms.foamingDrain.volumeRateTitle", { frequency: state.installFrequency })}
                    style={{
                      backgroundColor: state.installFrequency === "weekly"
                        ? (state.customVolumeWeeklyRate !== undefined ? '#fffacd' : 'white')
                        : (state.customVolumeBimonthlyRate !== undefined ? '#fffacd' : 'white')
                    }}
                  />
                  <span>=</span>
                  {}
                  <input
                    readOnly
                    className="svc-in field-qty"

                    value={formatAmount(installTotal)}
                  />
                  {}
                </div>
              </div>
            </div>
            </div>
          )}

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.foamingDrain.greaseTraps")}</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {}
                <input
                  type="number"
            min="0"
                  min={0}
                  className="svc-in field-qty"
                  className="svc-in field-qty"
                  value={state.greaseTrapCount || ""}
                  onChange={handleNumberChange("greaseTrapCount")}
                />
                <span>@</span>
                {}
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customGreaseWeeklyRate"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customGreaseWeeklyRate',
                    state.customGreaseWeeklyRate !== undefined
                      ? state.customGreaseWeeklyRate
                      : state.greaseWeeklyRate
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title={t("serviceForms.foamingDrain.greaseWeeklyTitle")}
                  style={{
                    backgroundColor: state.customGreaseWeeklyRate !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span>=</span>
                {}
                <span>$</span>
                <input
                  readOnly
                  className="svc-in field-qty"

                  value={formatAmount(greaseTotal)}
                />
              </div>
            </div>
          </div>

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.foamingDrain.greenDrains")}</span>
            </div>
            <div className="svc-field">
              <div className="svc-inline">
                {}
                <input
                  type="number"
            min="0"
                  min={0}
                  className="svc-in field-qty"
                  className="svc-in field-qty"
                  value={state.greenDrainCount || ""}
                  onChange={handleNumberChange("greenDrainCount")}
                />
                <span>@</span>
                {}
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  name="customGreenWeeklyRate"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customGreenWeeklyRate',
                    state.customGreenWeeklyRate !== undefined
                      ? state.customGreenWeeklyRate
                      : state.greenWeeklyRate
                  )}
                  onChange={handleLocalChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  title={t("serviceForms.foamingDrain.greenWeeklyTitle")}
                  style={{
                    backgroundColor: state.customGreenWeeklyRate !== undefined ? '#fffacd' : 'white'
                  }}
                />
                <span>=</span>
                {}
                <span>$</span>
                <input
                  readOnly
                  className="svc-in field-qty"

                  value={formatAmount(greenTotal)}
                />
              </div>
            </div>
          </div>

          {}
          {state.needsPlumbing && state.plumbingDrainCount > 0 && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.foamingDrain.extraPlumbingWork")}</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  {}
                  <input
                    readOnly
                    type="number"
                    min="0"
                    className="svc-in field-qty"
                    value={state.plumbingDrainCount}
                  />
                  <span>@</span>
                  {}
                  <input
                    readOnly
                    type="number"
                    min="0"
                    step={1}
                    className="svc-in field-rate"
                    value={effectivePlumbingRate}
                  />
                  <span>=</span>
                  {}
                  <input
                    readOnly
                    type="text"
                    min="0"
                    step="0.01"
                    name="customPlumbingTotal"
                    className="svc-in field-qty"
                    value={getDisplayValue(
                      'customPlumbingTotal',
                      state.customPlumbingTotal !== undefined
                        ? state.customPlumbingTotal
                        : breakdown.weeklyPlumbing,
                      true
                    )}
                    style={{
                      backgroundColor: state.customPlumbingTotal !== undefined ? '#fffacd' : 'white',
                    }}
                    title={t("serviceForms.foamingDrain.extraPlumbingTotalTitle")}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="svc-summary">

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.foamingDrain.facilityCondition")}</span>
            </div>
            <div className="svc-field">
              <select
                className="svc-in"
                value={state.facilityCondition}
                onChange={handleConditionChange}
              >
                <option value="normal">{t("serviceForms.foamingDrain.normal")}</option>
                <option value="filthy">{t("serviceForms.foamingDrain.filthy")}</option>
              </select>
            </div>
          </div>

          {}
          {state.facilityCondition === "filthy" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.foamingDrain.filthyMultiplier")}</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    name="customFilthyMultiplier"
                    className="svc-in field-rate"
                    value={getDisplayValue(
                      'customFilthyMultiplier',
                      state.customFilthyMultiplier !== undefined
                        ? state.customFilthyMultiplier
                        : state.filthyMultiplier
                    )}
                    onChange={handleLocalChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    title={t("serviceForms.foamingDrain.filthyMultiplierTitle")}
                    style={{
                      backgroundColor: state.customFilthyMultiplier !== undefined ? '#fffacd' : 'white'
                    }}
                  />
                  <span className="svc-note" style={{ marginLeft: 8 }}>
                    {t("serviceForms.foamingDrain.filthyMultiplierNote")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.common.installationTotal")}</span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                type="text"
                min="0"
                readOnly
                step="0.01"
                name="customInstallationTotal"
                className="svc-in total-field"
                value={getDisplayValue(
                  'customInstallationTotal',
                  state.customInstallationTotal !== undefined
                    ? state.customInstallationTotal
                    : quote.installation,
                  true
                )}
                style={{
                  backgroundColor: state.customInstallationTotal !== undefined ? '#fffacd' : 'white',
                }}
                title={t("serviceForms.foamingDrain.installationTotalTitle")}
              />
            </div>
          </div>
          {}
          {}

          {}
          {}

          {}
          {state.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.firstVisitTotal")}</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="text"
                  min="0"
                  step="0.01"
                  name="customFirstMonthPrice"
                  className="svc-in sm"
                  value={getDisplayValue(
                    'customFirstMonthPrice',
                    state.customFirstMonthPrice !== undefined
                      ? state.customFirstMonthPrice
                      : quote.firstVisitPrice,
                    true
                  )}
                  style={{
                    backgroundColor: state.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                  }}
                  title={t("serviceForms.foamingDrain.firstVisitTotalTitle")}
                />
              </div>
            </div>
          )}

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>{t("serviceForms.common.minimumPerVisit")}</span>
            </div>
            <div className="svc-field">
              <span className="svc-small">${quote.minimumChargePerVisit?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}</span>
              <label className="svc-inline" style={{ marginLeft: '10px' }}>
                <input
                  type="checkbox"
                  checked={state.applyMinimum !== false}
                  onChange={(e) => updateField("applyMinimum", e.target.checked)}
                />
                <span>{t("serviceForms.common.applyMinimum")}</span>
              </label>
            </div>
          </div>

          {}
          <div className="svc-row">
            <div className="svc-label">
              <span>
                {state.frequency === "bimonthly" ||
                 state.frequency === "quarterly" ||
                 state.frequency === "biannual" ||
                 state.frequency === "annual" ||
                 state.frequency === "everyFourWeeks"
                  ? t("serviceForms.common.recurringVisitTotal")
                  : t("serviceForms.foamingDrain.perVisitTotal")}
              </span>
            </div>
            <div className="svc-field svc-dollar">
              <span>$</span>
              <input
                type="text"
                min="0"
                readOnly
                step="0.01"
                name="customWeeklyService"
                className="svc-in weekly-total-field"
                value={getDisplayValue(
                  'customWeeklyService',
                  state.customWeeklyService !== undefined
                    ? state.customWeeklyService
                    : quote.weeklyTotal,
                  true
                )}
                style={{
                  backgroundColor: state.customWeeklyService !== undefined ? '#fffacd' : 'white',
                }}
                title={t("serviceForms.foamingDrain.perVisitTotalTitle")}
              />
            </div>
          </div>

          {}
          {(state.standardDrainCount > 0 || state.filthyDrainCount > 0 || state.greaseTrapCount > 0 || state.greenDrainCount > 0 || state.plumbingDrainCount > 0) && (
            <div className="svc-row" style={{ marginTop: '-10px', paddingTop: '5px' }}>
              <div className="svc-label"></div>
              <div className="svc-field">
                {quote.annualRecurring > quote.originalContractTotal * 1.30 ? (
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
          {state.frequency === "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.totalPrice")}</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  readOnly
                  type="text"
                  min="0"
                  step="0.01"
                  name="customWeeklyService"
                  className="svc-in sm"
                  value={getDisplayValue(
                    'customWeeklyService',
                    state.customWeeklyService !== undefined
                      ? state.customWeeklyService
                      : quote.annualRecurring,
                    true
                  )}
                  style={{
                    backgroundColor: state.customWeeklyService !== undefined ? '#fffacd' : 'white',
                  }}
                  title={t("serviceForms.foamingDrain.totalPriceOneTimeTitle")}
                />
              </div>
            </div>
          )}

          {}
          {state.frequency !== "oneTime" &&
           state.frequency !== "bimonthly" &&
           state.frequency !== "quarterly" &&
           state.frequency !== "biannual" &&
           state.frequency !== "annual" &&
           state.frequency !== "everyFourWeeks" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.firstMonthTotal")}</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  type="text"
                  min="0"
                  step="0.01"
                  readOnly
                  name="customFirstMonthPrice"
                  className="svc-in field-qty"
                  value={getDisplayValue(
                    'customFirstMonthPrice',
                    state.customFirstMonthPrice !== undefined
                      ? state.customFirstMonthPrice
                      : quote.firstMonthPrice,
                    true
                  )}
                  style={{
                    backgroundColor: state.customFirstMonthPrice !== undefined ? '#fffacd' : 'white',
                  }}
                  title={t("serviceForms.foamingDrain.firstMonthTotalTitle")}
                />
              </div>
            </div>
          )}

          {}
          {state.frequency !== "oneTime" &&
           state.frequency !== "bimonthly" &&
           state.frequency !== "quarterly" &&
           state.frequency !== "biannual" &&
           state.frequency !== "annual" &&
           state.frequency !== "everyFourWeeks" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.monthlyRecurring")}</span>
              </div>
              <div className="svc-field svc-dollar">
                <span>$</span>
                <input
                  type="text"
                  min="0"
                  readOnly
                  step="0.01"
                  name="customMonthlyRecurring"
                  className="svc-in monthly-total-field"
                  value={getDisplayValue(
                    'customMonthlyRecurring',
                    state.customMonthlyRecurring !== undefined
                      ? state.customMonthlyRecurring
                      : quote.monthlyRecurring,
                    true
                  )}
                  style={{
                    backgroundColor: state.customMonthlyRecurring !== undefined ? '#fffacd' : 'white',
                  }}
                  title={t("serviceForms.foamingDrain.monthlyRecurringTitle")}
                />
              </div>
            </div>
          )}

          {}
          {state.frequency !== "oneTime" && (
            <div className="svc-row">
              <div className="svc-label">
                <span>{t("serviceForms.common.contractTotal")}</span>
              </div>
              <div className="svc-field">
                <div className="svc-inline">
                <select
                  className="svc-in field-qty"
                  style={{ width: '80px', marginRight: '8px' }}
                  value={state.contractMonths}
                  disabled
                >
                  {state.frequency === "quarterly" ? (
                    Array.from({ length: 12 }, (_, i) => {
                      const months = (i + 1) * 3;
                      return <option key={months} value={months}>{t("serviceForms.common.monthsShort", { count: months })}</option>;
                    })
                  ) : state.frequency === "biannual" ? (
                    Array.from({ length: 6 }, (_, i) => {
                      const months = (i + 1) * 6;
                      return <option key={months} value={months}>{t("serviceForms.common.monthsShort", { count: months })}</option>;
                    })
                  ) : state.frequency === "annual" ? (
                    Array.from({ length: 3 }, (_, i) => {
                      const months = (i + 1) * 12;
                      return <option key={months} value={months}>{t("serviceForms.common.monthsShort", { count: months })}</option>;
                    })
                  ) : (
                    Array.from(
                      { length: cfg.contract.maxMonths - cfg.contract.minMonths + 1 },
                      (_, i) => {
                        const m = cfg.contract.minMonths + i;
                        return <option key={m} value={m}>{t("serviceForms.common.monthsShort", { count: m })}</option>;
                      }
                    )
                  )}
                </select>
                <div className="svc-field svc-dollar" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '4px' }}>$</span>
                  <input
                    type="text"
                    min="0"
                    readOnly
                    step="0.01"
                    name="customContractTotal"
                    className="svc-in contract-total-field"
                    style={{
                      width: '140px',
                      backgroundColor: state.customContractTotal !== undefined ? '#fffacd' : 'white',
                    }}
                    value={getDisplayValue(
                      'customContractTotal',
                      state.customContractTotal !== undefined
                        ? state.customContractTotal
                        : quote.annualRecurring,
                      true
                    )}
                    title="Contract total"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          <div className="svc-row" style={{ marginTop: 6 }}>
            <div className="svc-label" />
            {}
          </div>
        </div>
      </div>
    </ServiceCardShell>
  );
};
