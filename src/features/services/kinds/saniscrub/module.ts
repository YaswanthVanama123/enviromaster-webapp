import type { ServiceModule } from "../../engine/types";
import type {
  SaniscrubFormState,
} from "../../../../components/services/saniscrub/saniscrubTypes";
import {
  saniscrubPricingConfig as cfg,
} from "../../../../components/services/saniscrub/saniscrubConfig";
import { registerService } from "../registry";
import {
  type BackendSaniscrubConfig,
  type SaniscrubActiveConfig,
  type SaniscrubCalcResult,
  buildSaniscrubActiveConfig,
  computeSaniscrubCalc,
} from "./compute";

const DEFAULT_FORM: SaniscrubFormState = {
  serviceId: "saniscrub",
  fixtureCount: 0,
  nonBathroomSqFt: 0,
  useExactNonBathroomSqft: true,
  frequency: "monthly",
  hasSaniClean: true,
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true,
  includeInstall: false,
  isDirtyInstall: false,
  notes: "",
  contractMonths: 12,
  fixtureRateMonthly: cfg.fixtureRates.monthly,
  fixtureRateBimonthly: cfg.fixtureRates.bimonthly,
  fixtureRateQuarterly: cfg.fixtureRates.quarterly,
  minimumMonthly: cfg.minimums.monthly,
  minimumBimonthly: cfg.minimums.bimonthly,
  nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate,
  nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
  twoTimesPerMonthDiscount: cfg.twoTimesPerMonthDiscountFlat,
  applyMinimum: true,
};

export const saniscrubModule: ServiceModule<
  SaniscrubFormState,
  SaniscrubActiveConfig,
  SaniscrubCalcResult
> = registerService({
  id: "saniscrub",
  displayName: "SaniScrub",

  defaults: DEFAULT_FORM,
  staticConfig: buildSaniscrubActiveConfig(null),

  mapBackendConfig: (raw) => buildSaniscrubActiveConfig(raw as BackendSaniscrubConfig | null),

  applyConfigToForm: (active) => ({
    fixtureRateMonthly: active.fixtureRates.monthly,
    fixtureRateBimonthly: active.fixtureRates.bimonthly,
    fixtureRateQuarterly: active.fixtureRates.quarterly,
    minimumMonthly: active.minimums.monthly,
    minimumBimonthly: active.minimums.bimonthly,
    nonBathroomFirstUnitRate: active.nonBathroomFirstUnitRate,
    nonBathroomAdditionalUnitRate: active.nonBathroomAdditionalUnitRate,
    installMultiplierDirty: active.installMultipliers.dirty,
    installMultiplierClean: active.installMultipliers.clean,
    twoTimesPerMonthDiscount: active.twoTimesPerMonthDiscountFlat,
  }),

  computeQuote: (form, active) => computeSaniscrubCalc(form, active, 0),

  isActive: (form) => (form.fixtureCount || 0) > 0 || (form.nonBathroomSqFt || 0) > 0,

  customOverrideFields: [
    "customInstallationFee",
    "customPerVisitPrice",
    "customMonthlyRecurring",
    "customFirstMonthPrice",
    "customContractTotal",
  ] as const,
});

export {
  buildSaniscrubActiveConfig,
  computeSaniscrubCalc,
  clampSaniscrubFrequency,
  clampSaniscrubContractMonths,
} from "./compute";
export type {
  BackendSaniscrubConfig,
  SaniscrubActiveConfig,
  SaniscrubCalcResult,
} from "./compute";
