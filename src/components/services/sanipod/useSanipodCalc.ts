import { useEffect, useMemo, useRef, useCallback } from "react";
import type { ChangeEvent } from "react";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  sanipodModule,
  computeSanipodCalc,
  type SanipodFormState,
  type SanipodBaselineRates,
} from "../../../features/services/kinds/sanipod";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type { SanipodFrequencyKey } from "./sanipodTypes";

export type { SanipodFormState };

const PRICING_FIELDS = new Set([
  "weeklyRatePerUnit",
  "altWeeklyRatePerUnit",
  "extraBagPrice",
  "standaloneExtraWeeklyCharge",
  "tripChargePerVisit",
  "installRatePerPod",
  "customInstallationFee",
  "customPerVisitPrice",
  "customMonthlyPrice",
  "customAnnualPrice",
  "customWeeklyPodRate",
  "customPodServiceTotal",
  "customExtraBagsTotal",
]);

const CUSTOM_OVERRIDE_FIELDS = new Set([
  "customInstallationFee",
  "customPerVisitPrice",
  "customMonthlyPrice",
  "customAnnualPrice",
  "customWeeklyPodRate",
  "customPodServiceTotal",
  "customExtraBagsTotal",
]);

export function useSanipodCalc(
  initialData?: Partial<SanipodFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    config: engineConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(sanipodModule, initialData);

  const ctx = useServicesContextOptional();

  const baselineRatesRef = useRef<SanipodBaselineRates>({
    weeklyRatePerUnit: initialData?.weeklyRatePerUnit ?? cfg.weeklyRatePerUnit,
    altWeeklyRatePerUnit: initialData?.altWeeklyRatePerUnit ?? cfg.altWeeklyRatePerUnit,
    extraBagPrice: initialData?.extraBagPrice ?? cfg.extraBagPrice,
    standaloneExtraWeeklyCharge:
      initialData?.standaloneExtraWeeklyCharge ?? cfg.standaloneExtraWeeklyCharge,
    tripChargePerVisit: initialData?.tripChargePerVisit ?? cfg.tripChargePerVisit,
    installRatePerPod: initialData?.installRatePerPod ?? cfg.installChargePerUnit,
  });

  useEffect(() => {
    const backendData = ctx?.getBackendPricingForService?.("sanipod");
    if (!backendData?.config) return;
    baselineRatesRef.current = {
      weeklyRatePerUnit: engineConfig.active.weeklyRatePerUnit,
      altWeeklyRatePerUnit: engineConfig.active.altWeeklyRatePerUnit,
      standaloneExtraWeeklyCharge: engineConfig.active.standaloneExtraWeeklyCharge,
      extraBagPrice: engineConfig.active.extraBagPrice,
      tripChargePerVisit: engineConfig.active.tripChargePerVisit,
      installRatePerPod: engineConfig.active.installChargePerUnit,
    };
  }, [ctx?.backendPricingData, engineConfig]);

  const calcRef = useRef<ReturnType<typeof computeSanipodCalc> | null>(null);

  const { calcFieldsTotal, dollarFieldsTotal, total: customFieldsTotal } =
    useCustomFieldsTotal(customFields);

  const calc = useMemo(() => {
    const result = computeSanipodCalc(
      form,
      engineConfig.active,
      baselineRatesRef.current,
      customFieldsTotal
    );
    calcRef.current = result;
    return result;
  }, [form, engineConfig, customFieldsTotal]);

  const addServiceFieldChange = useCallback(
    (
      fieldName: string,
      originalValue: number | undefined,
      newValue: number | undefined
    ) => {
      if (typeof newValue !== "number" || Number.isNaN(newValue) || newValue <= 0) {
        return;
      }
      const fallbackValues: Record<string, number | undefined> = {
        ...baselineRatesRef.current,
        customWeeklyPodRate: calcRef.current?.effectiveRatePerPod,
        customPodServiceTotal: calcRef.current?.adjustedPodServiceTotal,
        customExtraBagsTotal: calcRef.current?.adjustedBagsTotal,
        customInstallationFee: calcRef.current?.installCost,
        customPerVisitPrice: calcRef.current?.adjustedPerVisit,
        customMonthlyPrice: calcRef.current?.adjustedMonthly,
        customAnnualPrice: calcRef.current?.contractTotal,
      };
      const fallbackValue = fallbackValues[fieldName];
      let resolvedOriginal = originalValue;
      if (
        (resolvedOriginal === undefined ||
          resolvedOriginal === null ||
          resolvedOriginal === 0) &&
        fallbackValue !== undefined
      ) {
        resolvedOriginal = fallbackValue;
      }
      if (resolvedOriginal === undefined || resolvedOriginal === newValue) {
        return;
      }
      addPriceChange({
        productKey: `sanipod_${fieldName}`,
        productName: `SaniPod - ${getFieldDisplayName(fieldName)}`,
        productType: "service",
        fieldType: fieldName,
        fieldDisplayName: getFieldDisplayName(fieldName),
        originalValue: resolvedOriginal,
        newValue,
        quantity: form.podQuantity || 1,
        frequency: form.frequency || "",
      });
    },
    [form.podQuantity, form.frequency]
  );

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const t = e.target as HTMLInputElement | HTMLSelectElement;

    setForm((prev) => {
      const originalValue = prev[name as keyof SanipodFormState];
      const next: SanipodFormState = { ...prev };

      if (type === "checkbox") {
        (next as any)[name] = (t as HTMLInputElement).checked;
      } else if (CUSTOM_OVERRIDE_FIELDS.has(name)) {
        if (t.value === "") {
          (next as any)[name] = undefined;
        } else {
          const numVal = parseFloat(t.value);
          if (!isNaN(numVal)) (next as any)[name] = numVal;
        }
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : parseFloat(raw);
        (next as any)[name] = Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        (next as any)[name] = t.value;
      }

      if (name === "frequency") {
        next.frequency = t.value as SanipodFrequencyKey;
      }

      if (PRICING_FIELDS.has(name)) {
        const newValue = (next as any)[name] as number | undefined;
        addServiceFieldChange(name, originalValue as number | undefined, newValue);
      }

      return next;
    });
  };

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig,
    isLoadingConfig,
    setContractMonths,
    baselineRates: baselineRatesRef.current,
  };
}
