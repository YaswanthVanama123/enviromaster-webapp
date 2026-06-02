import type { ServiceModule } from "../../engine/types";
import type { StripWaxFormState } from "../../../../components/services/stripWax/stripWaxTypes";
import { stripWaxPricingConfig as cfg } from "../../../../components/services/stripWax/stripWaxConfig";
import { registerService } from "../registry";
import {
  type BackendStripWaxConfig,
  type StripWaxActiveConfig,
  type StripWaxCalcResult,
  buildStripWaxActiveConfig,
  computeStripWaxCalc,
} from "./compute";

const DEFAULT_FORM: StripWaxFormState = {
  floorAreaSqFt: 0,
  ratePerSqFt: cfg.variants[cfg.defaultVariant].ratePerSqFt,
  minCharge: cfg.variants[cfg.defaultVariant].minCharge,
  serviceVariant: cfg.defaultVariant,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,
  weeksPerMonth: cfg.weeksPerMonth,
  standardFullRatePerSqFt: cfg.variants.standardFull.ratePerSqFt,
  standardFullMinCharge: cfg.variants.standardFull.minCharge,
  noSealantRatePerSqFt: cfg.variants.noSealant.ratePerSqFt,
  noSealantMinCharge: cfg.variants.noSealant.minCharge,
  wellMaintainedRatePerSqFt: cfg.variants.wellMaintained.ratePerSqFt,
  wellMaintainedMinCharge: cfg.variants.wellMaintained.minCharge,
  redRateMultiplier: cfg.rateCategories.redRate.multiplier,
  greenRateMultiplier: cfg.rateCategories.greenRate.multiplier,
  applyMinimum: true,
};

export const stripWaxModule: ServiceModule<
  StripWaxFormState,
  StripWaxActiveConfig,
  StripWaxCalcResult
> = registerService({
  id: "stripWax",
  displayName: "Strip & Wax",

  defaults: DEFAULT_FORM,
  staticConfig: buildStripWaxActiveConfig(null),

  mapBackendConfig: (raw) => buildStripWaxActiveConfig(raw as BackendStripWaxConfig | null),

  applyConfigToForm: (active) => ({
    weeksPerMonth: active.frequencyMultipliers?.weekly,
    standardFullRatePerSqFt: active.variants.standardFull.ratePerSqFt,
    standardFullMinCharge: active.variants.standardFull.minCharge,
    noSealantRatePerSqFt: active.variants.noSealant.ratePerSqFt,
    noSealantMinCharge: active.variants.noSealant.minCharge,
    wellMaintainedRatePerSqFt: active.variants.wellMaintained.ratePerSqFt,
    wellMaintainedMinCharge: active.variants.wellMaintained.minCharge,
    redRateMultiplier: active.rateCategories.redRate.multiplier,
    greenRateMultiplier: active.rateCategories.greenRate.multiplier,
  }),

  computeQuote: (form, active) => computeStripWaxCalc(form, active, 0),

  isActive: (form) => (form.floorAreaSqFt || 0) > 0,
});

export {
  buildStripWaxActiveConfig,
  computeStripWaxCalc,
  getStripWaxVariantConfigFromState,
} from "./compute";
export type {
  BackendStripWaxConfig,
  StripWaxActiveConfig,
  StripWaxCalcResult,
} from "./compute";
