import type { ServiceModule } from "../../engine/types";
import type {
  RpmWindowsFormState,
} from "../../../../components/services/rpmWindows/rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "../../../../components/services/rpmWindows/rpmWindowsConfig";
import { registerService } from "../registry";
import {
  type BackendRpmConfig,
  type RpmCalcResult,
  type RpmBaseWeeklyRates,
  computeRpmWindowsCalc,
} from "./compute";

const DEFAULT_FORM: RpmWindowsFormState = {
  smallQty: 0,
  mediumQty: 0,
  largeQty: 0,
  smallWindowRate: cfg.smallWindowRate,
  mediumWindowRate: cfg.mediumWindowRate,
  largeWindowRate: cfg.largeWindowRate,
  tripCharge: cfg.tripCharge,
  isFirstTimeInstall: false,
  selectedRateCategory: "redRate",
  includeMirrors: false,
  extraCharges: [],
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
  contractMonths: 12,
  installMultiplierFirstTime: cfg.installMultiplierFirstTime,
  installMultiplierClean: cfg.installMultiplierClean,
  applyMinimum: true,
};

const CUSTOM_OVERRIDE_FIELDS = [
  "customSmallTotal",
  "customMediumTotal",
  "customLargeTotal",
  "customPerVisitPrice",
  "customMonthlyRecurring",
  "customContractTotal",
  "customInstallationFee",
  "customFirstMonthTotal",
  "customAnnualPrice",
  "customFirstMonthPrice",
] as const;

const STATIC_BASE_RATES: RpmBaseWeeklyRates = {
  small: cfg.smallWindowRate,
  medium: cfg.mediumWindowRate,
  large: cfg.largeWindowRate,
  trip: cfg.tripCharge,
};

export const rpmWindowsModule: ServiceModule<
  RpmWindowsFormState,
  BackendRpmConfig | null,
  RpmCalcResult
> = registerService({
  id: "rpmWindows",
  displayName: "RPM Windows",

  defaults: DEFAULT_FORM,
  staticConfig: null as BackendRpmConfig | null,

  mapBackendConfig: (raw) => (raw as BackendRpmConfig | null) ?? null,

  computeQuote: (form, config) => computeRpmWindowsCalc(form, STATIC_BASE_RATES, config, 0),

  isActive: (form) => (form.smallQty || 0) + (form.mediumQty || 0) + (form.largeQty || 0) > 0,

  customOverrideFields: CUSTOM_OVERRIDE_FIELDS as ReadonlyArray<keyof RpmWindowsFormState>,
});

export {
  computeRpmWindowsCalc,
  mapFrequency,
  getEffectiveFrequencyKey,
  getFrequencyMultiplier,
  getBackendBaseRates,
} from "./compute";
export type { BackendRpmConfig, RpmCalcResult, RpmBaseWeeklyRates } from "./compute";
