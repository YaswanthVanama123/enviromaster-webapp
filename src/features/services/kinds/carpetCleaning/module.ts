import type { ServiceModule } from "../../engine/types";
import type { CarpetFormState } from "../../../../components/services/carpetCleaning/carpetTypes";
import { carpetPricingConfig as cfg } from "../../../../components/services/carpetCleaning/carpetConfig";
import { registerService } from "../registry";
import {
  type BackendCarpetConfig,
  type CarpetActiveBaseConfig,
  type CarpetCalc,
  buildCarpetBaseConfig,
  computeCarpetCalc,
} from "./compute";

export interface CarpetEngineConfig {
  base: CarpetActiveBaseConfig;
  backend: BackendCarpetConfig | null;
}

const DEFAULT_FORM: CarpetFormState = {
  serviceId: "carpetCleaning",
  areaSqFt: 0,
  useExactSqft: true,
  frequency: "monthly",
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true,
  notes: "",
  contractMonths: 12,
  includeInstall: false,
  isDirtyInstall: false,
  unitSqFt: cfg.unitSqFt,
  firstUnitRate: cfg.firstUnitRate,
  additionalUnitRate: cfg.additionalUnitRate,
  perVisitMinimum: cfg.perVisitMinimum,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
  applyMinimum: true,
};

export const carpetCleaningModule: ServiceModule<
  CarpetFormState,
  CarpetEngineConfig,
  CarpetCalc
> = registerService({
  id: "carpetCleaning",
  displayName: "Carpet Cleaning",

  defaults: DEFAULT_FORM,
  staticConfig: { base: buildCarpetBaseConfig(null), backend: null } as CarpetEngineConfig,

  mapBackendConfig: (raw) => {
    const backend = raw as BackendCarpetConfig | null;
    return { base: buildCarpetBaseConfig(backend), backend };
  },

  applyConfigToForm: (cfgIn) => ({
    unitSqFt: cfgIn.base.unitSqFt,
    firstUnitRate: cfgIn.base.firstUnitRate,
    additionalUnitRate: cfgIn.base.additionalUnitRate,
    perVisitMinimum: cfgIn.base.perVisitMinimum,
    installMultiplierDirty: cfgIn.base.installMultipliers.dirty,
    installMultiplierClean: cfgIn.base.installMultipliers.clean,
  }),

  computeQuote: (form, cfgIn) =>
    computeCarpetCalc(form, cfgIn.base, cfgIn.backend, 0),

  isActive: (form) => (form.areaSqFt || 0) > 0,
});

export {
  buildCarpetBaseConfig,
  computeCarpetCalc,
  clampCarpetFrequency,
  clampCarpetContractMonths,
  transformBackendFrequencyMeta,
} from "./compute";
export type {
  BackendCarpetConfig,
  CarpetActiveBaseConfig,
  CarpetCalc,
} from "./compute";
