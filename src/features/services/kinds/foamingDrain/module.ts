import type { ServiceModule } from "../../engine/types";
import type { FoamingDrainFormState, FoamingDrainQuoteResult } from "../../../../components/services/foamingDrain/foamingDrainTypes";
import { FOAMING_DRAIN_CONFIG as cfg } from "../../../../components/services/foamingDrain/foamingDrainConfig";
import { registerService } from "../registry";
import {
  type BackendFoamingDrainConfig,
  type FoamingDrainActiveConfig,
  buildFoamingDrainActiveConfig,
  computeFoamingDrainQuote,
} from "./compute";

export interface FoamingDrainEngineConfig {
  active: FoamingDrainActiveConfig;
  backend: BackendFoamingDrainConfig | null;
}

const DEFAULT_FORM: FoamingDrainFormState = {
  serviceId: "foamingDrain",
  standardDrainCount: 0,
  installDrainCount: 0,
  filthyDrainCount: 0,
  greaseTrapCount: 0,
  greenDrainCount: 0,
  plumbingDrainCount: 0,
  needsPlumbing: false,
  frequency: cfg.defaultFrequency,
  installFrequency: "weekly",
  installServiceMode: "none",
  facilityCondition: "normal",
  location: "standard",
  useSmallAltPricingWeekly: false,
  useBigAccountTenWeekly: false,
  isAllInclusive: false,
  chargeGreaseTrapInstall: true,
  tripChargeOverride: undefined,
  contractMonths: cfg.contract.defaultMonths,
  notes: "",
  standardDrainRate: cfg.standardDrainRate,
  altBaseCharge: cfg.altBaseCharge,
  altExtraPerDrain: cfg.altExtraPerDrain,
  volumeWeeklyRate: cfg.volumePricing.weekly.ratePerDrain,
  volumeBimonthlyRate: cfg.volumePricing.bimonthly.ratePerDrain,
  greaseWeeklyRate: cfg.grease.weeklyRatePerTrap,
  greaseInstallRate: cfg.grease.installPerTrap,
  greenWeeklyRate: cfg.green.weeklyRatePerDrain,
  greenInstallRate: cfg.green.installPerDrain,
  plumbingAddonRate: cfg.plumbing.weeklyAddonPerDrain,
  filthyMultiplier: cfg.installationRules.filthyMultiplier,
  applyMinimum: true,
};

export const foamingDrainModule: ServiceModule<
  FoamingDrainFormState,
  FoamingDrainEngineConfig,
  FoamingDrainQuoteResult
> = registerService({
  id: "foamingDrain",
  displayName: "Foaming Drain",

  defaults: DEFAULT_FORM,
  staticConfig: {
    active: buildFoamingDrainActiveConfig(null),
    backend: null,
  } as FoamingDrainEngineConfig,

  mapBackendConfig: (raw) => {
    const backend = raw as BackendFoamingDrainConfig | null;
    return { active: buildFoamingDrainActiveConfig(backend), backend };
  },

  applyConfigToForm: (cfgIn) => ({
    standardDrainRate: cfgIn.active.standardDrainRate,
    altBaseCharge: cfgIn.active.altBaseCharge,
    altExtraPerDrain: cfgIn.active.altExtraPerDrain,
    volumeWeeklyRate: cfgIn.active.volumePricing.weeklyRatePerDrain,
    volumeBimonthlyRate: cfgIn.active.volumePricing.bimonthlyRatePerDrain,
    greaseWeeklyRate: cfgIn.active.grease.weeklyRatePerTrap,
    greaseInstallRate: cfgIn.active.grease.installPerTrap,
    greenWeeklyRate: cfgIn.active.green.weeklyRatePerDrain,
    greenInstallRate: cfgIn.active.green.installPerDrain,
    plumbingAddonRate: cfgIn.active.plumbing.weeklyAddonPerDrain,
    filthyMultiplier: cfgIn.active.installationRules.filthyMultiplier,
  }),

  computeQuote: (form, cfgIn) =>
    computeFoamingDrainQuote(form, cfgIn.active, cfgIn.backend, 0),

  isActive: (form) =>
    (form.standardDrainCount || 0) +
      (form.installDrainCount || 0) +
      (form.filthyDrainCount || 0) +
      (form.greaseTrapCount || 0) +
      (form.greenDrainCount || 0) +
      (form.plumbingDrainCount || 0) >
    0,

  customOverrideFields: [
    "customRatePerDrain",
    "customAltBaseCharge",
    "customAltExtraPerDrain",
    "customVolumeWeeklyRate",
    "customVolumeBimonthlyRate",
    "customGreaseWeeklyRate",
    "customGreaseInstallRate",
    "customGreenWeeklyRate",
    "customGreenInstallRate",
    "customPlumbingAddonRate",
    "customFilthyMultiplier",
    "customWeeklyService",
    "customInstallationTotal",
    "customMonthlyRecurring",
    "customFirstMonthPrice",
    "customContractTotal",
  ] as const,
});

export {
  buildFoamingDrainActiveConfig,
  computeFoamingDrainQuote,
  transformBackendFrequencyMeta,
} from "./compute";
export type {
  BackendFoamingDrainConfig,
  FoamingDrainActiveConfig,
} from "./compute";
