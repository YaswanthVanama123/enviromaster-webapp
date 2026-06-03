import type { ServiceModule } from "../../engine/types";
import { sanipodPricingConfig as cfg } from "../../../../components/services/sanipod/sanipodConfig";
import { registerService } from "../registry";
import {
  type BackendSanipodConfig,
  type SanipodActiveConfig,
  type SanipodFormState,
  type SanipodCalcResult,
  type SanipodBaselineRates,
  buildSanipodActiveConfig,
  computeSanipodCalc,
} from "./compute";

export interface SanipodEngineConfig {
  active: SanipodActiveConfig;
  backend: BackendSanipodConfig | null;
}

const DEFAULT_FORM: SanipodFormState = {
  podQuantity: 0,
  extraBagsPerWeek: 0,
  extraBagsRecurring: true,
  weeklyRatePerUnit: cfg.weeklyRatePerUnit,
  altWeeklyRatePerUnit: cfg.altWeeklyRatePerUnit,
  extraBagPrice: cfg.extraBagPrice,
  standaloneExtraWeeklyCharge: cfg.standaloneExtraWeeklyCharge,
  includeTrip: false,
  tripChargePerVisit: cfg.tripChargePerVisit,
  isNewInstall: false,
  installQuantity: 0,
  installRatePerPod: cfg.installChargePerUnit,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,
  isStandalone: true,
};

const DEFAULT_BASELINE_RATES: SanipodBaselineRates = {
  weeklyRatePerUnit: DEFAULT_FORM.weeklyRatePerUnit,
  altWeeklyRatePerUnit: DEFAULT_FORM.altWeeklyRatePerUnit,
  extraBagPrice: DEFAULT_FORM.extraBagPrice,
  standaloneExtraWeeklyCharge: DEFAULT_FORM.standaloneExtraWeeklyCharge,
  tripChargePerVisit: DEFAULT_FORM.tripChargePerVisit,
  installRatePerPod: DEFAULT_FORM.installRatePerPod,
};

export const sanipodModule: ServiceModule<
  SanipodFormState,
  SanipodEngineConfig,
  SanipodCalcResult
> = registerService({
  id: "sanipod",
  displayName: "SaniPod",

  defaults: DEFAULT_FORM,
  staticConfig: {
    active: buildSanipodActiveConfig(null),
    backend: null,
  } as SanipodEngineConfig,

  mapBackendConfig: (raw) => {
    const backend = raw as BackendSanipodConfig | null;
    return { active: buildSanipodActiveConfig(backend), backend };
  },

  applyConfigToForm: (cfgIn) => ({
    weeklyRatePerUnit: cfgIn.active.weeklyRatePerUnit,
    altWeeklyRatePerUnit: cfgIn.active.altWeeklyRatePerUnit,
    extraBagPrice: cfgIn.active.extraBagPrice,
    standaloneExtraWeeklyCharge: cfgIn.active.standaloneExtraWeeklyCharge,
    installRatePerPod: cfgIn.active.installChargePerUnit,
    tripChargePerVisit: cfgIn.active.tripChargePerVisit,
    customInstallationFee: undefined,
    customPerVisitPrice: undefined,
    customMonthlyPrice: undefined,
    customAnnualPrice: undefined,
    customWeeklyPodRate: undefined,
    customPodServiceTotal: undefined,
    customExtraBagsTotal: undefined,
  }),

  computeQuote: (form, cfgIn) =>
    computeSanipodCalc(form, cfgIn.active, DEFAULT_BASELINE_RATES, 0),

  isActive: (form) => (form.podQuantity || 0) > 0,
});

export {
  buildSanipodActiveConfig,
  computeSanipodCalc,
} from "./compute";
export type {
  BackendSanipodConfig,
  SanipodActiveConfig,
  SanipodCalcResult,
  SanipodBaselineRates,
  SanipodFormState,
} from "./compute";
