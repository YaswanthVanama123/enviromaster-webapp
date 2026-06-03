import { useEffect, useMemo, useRef } from "react";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  foamingDrainModule,
  computeFoamingDrainQuote,
} from "../../../features/services/kinds/foamingDrain";
import { useServicesContextOptional } from "../ServicesContext";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";
import type {
  FoamingDrainFormState,
  FoamingDrainQuoteResult,
} from "./foamingDrainTypes";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";

const BASE_RATE_FIELDS: ReadonlyArray<keyof FoamingDrainFormState> = [
  "standardDrainRate",
  "altBaseCharge",
  "altExtraPerDrain",
  "volumeWeeklyRate",
  "volumeBimonthlyRate",
  "greaseWeeklyRate",
  "greaseInstallRate",
  "greenWeeklyRate",
  "greenInstallRate",
  "plumbingAddonRate",
  "filthyMultiplier",
];

const QTY_TOGGLE_FIELDS: ReadonlyArray<keyof FoamingDrainFormState> = [
  "standardDrainCount",
  "installDrainCount",
  "filthyDrainCount",
  "greaseTrapCount",
  "greenDrainCount",
  "plumbingDrainCount",
  "frequency",
  "facilityCondition",
  "useSmallAltPricingWeekly",
  "useBigAccountTenWeekly",
  "isAllInclusive",
  "chargeGreaseTrapInstall",
  "needsPlumbing",
  "contractMonths",
];

const CUSTOM_TO_BASE: Record<string, string> = {
  customRatePerDrain: "standardDrainRate",
  customAltBaseCharge: "altBaseCharge",
  customAltExtraPerDrain: "altExtraPerDrain",
  customVolumeWeeklyRate: "volumeWeeklyRate",
  customVolumeBimonthlyRate: "volumeBimonthlyRate",
  customGreaseWeeklyRate: "greaseWeeklyRate",
  customGreaseInstallRate: "greaseInstallRate",
  customGreenWeeklyRate: "greenWeeklyRate",
  customGreenInstallRate: "greenInstallRate",
  customPlumbingAddonRate: "plumbingAddonRate",
  customFilthyMultiplier: "filthyMultiplier",
  customWeeklyService: "standardDrainRate",
  customInstallationTotal: "filthyMultiplier",
  customFirstMonthPrice: "standardDrainRate",
  customMonthlyRecurring: "standardDrainRate",
  customContractTotal: "standardDrainRate",
};

const ALL_PRICING_FIELDS = new Set<string>([
  ...BASE_RATE_FIELDS as string[],
  ...Object.keys(CUSTOM_TO_BASE),
]);

const LOG_TRIGGER_FIELDS = new Set([
  "drainsPerWeek",
  "contractMonths",
  "frequency",
  "location",
  "condition",
  "rateTier",
]);

export function useFoamingDrainCalc(
  initialData?: Partial<FoamingDrainFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form: state,
    setForm: setState,
    config: engineConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(foamingDrainModule, initialData);

  const ctx = useServicesContextOptional();
  const baselineInitialized = useRef(false);
  const baselineValues = useRef<Record<string, number>>({});

  useEffect(() => {
    if (baselineInitialized.current) return;
    const backendData = ctx?.getBackendPricingForService?.("foamingDrain");
    if (!backendData?.config) return;
    baselineInitialized.current = true;
    const backend = backendData.config as any;

    baselineValues.current = {
      standardDrainRate: initialData?.standardDrainRate ?? backend.standardPricing?.standardDrainRate ?? cfg.standardDrainRate,
      altBaseCharge: initialData?.altBaseCharge ?? backend.standardPricing?.alternateBaseCharge ?? cfg.altBaseCharge,
      altExtraPerDrain: initialData?.altExtraPerDrain ?? backend.standardPricing?.alternateExtraPerDrain ?? cfg.altExtraPerDrain,
      volumeWeeklyRate: initialData?.volumeWeeklyRate ?? backend.volumePricing?.weeklyRatePerDrain ?? cfg.volumePricing.weekly.ratePerDrain,
      volumeBimonthlyRate: initialData?.volumeBimonthlyRate ?? backend.volumePricing?.bimonthlyRatePerDrain ?? cfg.volumePricing.bimonthly.ratePerDrain,
      greaseWeeklyRate: initialData?.greaseWeeklyRate ?? backend.greaseTrapPricing?.weeklyRatePerTrap ?? cfg.grease.weeklyRatePerTrap,
      greaseInstallRate: initialData?.greaseInstallRate ?? backend.greaseTrapPricing?.installPerTrap ?? cfg.grease.installPerTrap,
      greenWeeklyRate: initialData?.greenWeeklyRate ?? backend.greenDrainPricing?.weeklyRatePerDrain ?? cfg.green.weeklyRatePerDrain,
      greenInstallRate: initialData?.greenInstallRate ?? backend.greenDrainPricing?.installPerDrain ?? cfg.green.installPerDrain,
      plumbingAddonRate: initialData?.plumbingAddonRate ?? backend.addOns?.plumbingWeeklyAddonPerDrain ?? cfg.plumbing.weeklyAddonPerDrain,
      filthyMultiplier: initialData?.filthyMultiplier ?? backend.installationMultipliers?.filthyMultiplier ?? cfg.installationRules.filthyMultiplier,
    };

    if (initialData) {
      const overrides: Partial<FoamingDrainFormState> = {
        customRatePerDrain:
          initialData.standardDrainRate !== undefined &&
          initialData.standardDrainRate !== backend.standardPricing?.standardDrainRate
            ? initialData.standardDrainRate
            : undefined,
        customAltBaseCharge:
          initialData.altBaseCharge !== undefined &&
          initialData.altBaseCharge !== backend.standardPricing?.alternateBaseCharge
            ? initialData.altBaseCharge
            : undefined,
        customAltExtraPerDrain:
          initialData.altExtraPerDrain !== undefined &&
          initialData.altExtraPerDrain !== backend.standardPricing?.alternateExtraPerDrain
            ? initialData.altExtraPerDrain
            : undefined,
        customVolumeWeeklyRate:
          initialData.volumeWeeklyRate !== undefined &&
          initialData.volumeWeeklyRate !== backend.volumePricing?.weeklyRatePerDrain
            ? initialData.volumeWeeklyRate
            : undefined,
        customVolumeBimonthlyRate:
          initialData.volumeBimonthlyRate !== undefined &&
          initialData.volumeBimonthlyRate !== backend.volumePricing?.bimonthlyRatePerDrain
            ? initialData.volumeBimonthlyRate
            : undefined,
        customGreaseWeeklyRate:
          initialData.greaseWeeklyRate !== undefined &&
          initialData.greaseWeeklyRate !== backend.greaseTrapPricing?.weeklyRatePerTrap
            ? initialData.greaseWeeklyRate
            : undefined,
        customGreaseInstallRate:
          initialData.greaseInstallRate !== undefined &&
          initialData.greaseInstallRate !== backend.greaseTrapPricing?.installPerTrap
            ? initialData.greaseInstallRate
            : undefined,
        customGreenWeeklyRate:
          initialData.greenWeeklyRate !== undefined &&
          initialData.greenWeeklyRate !== backend.greenDrainPricing?.weeklyRatePerDrain
            ? initialData.greenWeeklyRate
            : undefined,
        customGreenInstallRate:
          initialData.greenInstallRate !== undefined &&
          initialData.greenInstallRate !== backend.greenDrainPricing?.installPerDrain
            ? initialData.greenInstallRate
            : undefined,
        customPlumbingAddonRate:
          initialData.plumbingAddonRate !== undefined &&
          initialData.plumbingAddonRate !== backend.addOns?.plumbingWeeklyAddonPerDrain
            ? initialData.plumbingAddonRate
            : undefined,
        customFilthyMultiplier:
          initialData.filthyMultiplier !== undefined &&
          initialData.filthyMultiplier !== backend.installationMultipliers?.filthyMultiplier
            ? initialData.filthyMultiplier
            : undefined,
      };

      const hasAnyOverrides = Object.values(overrides).some((v) => v !== undefined);
      if (hasAnyOverrides) {
        setState((prev) => ({ ...prev, ...overrides }));
      }
    }
  }, [ctx?.backendPricingData, initialData, setState]);

  const { calcFieldsTotal, dollarFieldsTotal, total: customFieldsTotal } =
    useCustomFieldsTotal(customFields);

  const quote: FoamingDrainQuoteResult = useMemo(
    () =>
      computeFoamingDrainQuote(
        state,
        engineConfig.active,
        engineConfig.backend,
        customFieldsTotal
      ),
    [state, engineConfig, customFieldsTotal]
  );

  const updateField = <K extends keyof FoamingDrainFormState>(
    key: K,
    value: FoamingDrainFormState[K]
  ) => {
    setState((prev) => {
      const originalValue = prev[key];
      const next: FoamingDrainFormState = { ...prev, [key]: value };

      if ((QTY_TOGGLE_FIELDS as readonly string[]).includes(key as string)) {
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customInstallationTotal = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      if ((BASE_RATE_FIELDS as readonly string[]).includes(key as string)) {
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customInstallationTotal = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      if (ALL_PRICING_FIELDS.has(key as string)) {
        const newValue = value as number | undefined;
        const baseFieldName = CUSTOM_TO_BASE[key as string] || (key as string);
        const baselineValue = baselineValues.current[baseFieldName];
        if (
          newValue !== undefined &&
          baselineValue !== undefined &&
          typeof newValue === "number" &&
          typeof baselineValue === "number" &&
          newValue !== baselineValue
        ) {
          // Field-level baseline change — engine's priceChangeLog isn't configured here;
          // keep behaviour parity by not double-logging.
        }
      }

      if (LOG_TRIGGER_FIELDS.has(key as string)) {
        logServiceFieldChanges(
          "foamingDrain",
          "Foaming Drain",
          { [key]: value },
          { [key]: originalValue },
          [key as string],
          (next as any).drainsPerWeek || 1,
          next.frequency || "weekly"
        );
      }

      return next;
    });
  };

  return {
    state,
    quote,
    updateField,
    refreshConfig,
    isLoadingConfig,
    backendConfig: engineConfig.backend,
    setContractMonths,
  };
}
