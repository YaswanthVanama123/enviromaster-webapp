import type { ServiceModule } from "../../engine/types";
import type {
  MicrofiberMoppingFormState,
} from "../../../../components/services/microfiberMopping/microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "../../../../components/services/microfiberMopping/microfiberMoppingConfig";
import { registerService } from "../registry";
import {
  type BackendMicrofiberConfig,
  type MicrofiberMoppingComputeQuote,
  computeMicrofiberMopping,
  convertFrequencyMetadataToBillingConversions,
} from "./compute";

const DEFAULT_FORM: MicrofiberMoppingFormState = {
  serviceId: "microfiber_mopping",
  frequency: cfg.defaultFrequency,
  contractTermMonths: 36,
  hasExistingSaniService: true,
  bathroomCount: 0,
  isHugeBathroom: false,
  hugeBathroomSqFt: 0,
  extraAreaSqFt: 0,
  useExactExtraAreaSqft: true,
  standaloneSqFt: 0,
  useExactStandaloneSqft: true,
  chemicalGallons: 0,
  isAllInclusive: false,
  location: "insideBeltway",
  needsParking: false,
  includedBathroomRate: cfg.includedBathroomRate,
  hugeBathroomRatePerSqFt: cfg.hugeBathroomPricing.ratePerSqFt,
  extraAreaRatePerUnit: cfg.extraAreaPricing.extraAreaRatePerUnit,
  standaloneRatePerUnit: cfg.standalonePricing.standaloneRatePerUnit,
  dailyChemicalPerGallon: cfg.chemicalProducts.dailyChemicalPerGallon,
  applyMinimum: true,
} as MicrofiberMoppingFormState;

const CUSTOM_OVERRIDE_FIELDS = [
  "customIncludedBathroomRate",
  "customHugeBathroomRatePerSqFt",
  "customExtraAreaRatePerUnit",
  "customStandaloneRatePerUnit",
  "customDailyChemicalPerGallon",
  "customStandardBathroomTotal",
  "customHugeBathroomTotal",
  "customExtraAreaTotal",
  "customStandaloneTotal",
  "customChemicalTotal",
  "customPerVisitPrice",
  "customMonthlyRecurring",
  "customFirstMonthPrice",
  "customContractTotal",
] as const;

export const microfiberMoppingModule: ServiceModule<
  MicrofiberMoppingFormState,
  BackendMicrofiberConfig | null,
  MicrofiberMoppingComputeQuote
> = registerService({
  id: "microfiberMopping",
  displayName: "Microfiber Mopping",

  defaults: DEFAULT_FORM,
  staticConfig: null as BackendMicrofiberConfig | null,

  mapBackendConfig: (raw) =>
    raw ? convertFrequencyMetadataToBillingConversions(raw) : null,

  applyConfigToForm: (config) => {
    if (!config) return {};
    const c = config as BackendMicrofiberConfig;
    const patch: Partial<MicrofiberMoppingFormState> = {};
    const includedBathroomRate =
      c.bathroomMoppingPricing?.flatPricePerBathroom ?? c.includedBathroomRate;
    if (includedBathroomRate !== undefined) patch.includedBathroomRate = includedBathroomRate;
    const hugeBathroomRate =
      c.bathroomMoppingPricing?.hugeBathroomRate ?? c.hugeBathroomPricing?.ratePerSqFt;
    if (hugeBathroomRate !== undefined) patch.hugeBathroomRatePerSqFt = hugeBathroomRate;
    const extraAreaRate =
      c.nonBathroomAddonAreas?.ratePerSqFtUnit ?? c.extraAreaPricing?.extraAreaRatePerUnit;
    if (extraAreaRate !== undefined) patch.extraAreaRatePerUnit = extraAreaRate;
    const standaloneRate =
      c.standaloneMoppingPricing?.ratePerSqFtUnit ?? c.standalonePricing?.standaloneRatePerUnit;
    if (standaloneRate !== undefined) patch.standaloneRatePerUnit = standaloneRate;
    if (c.chemicalProducts?.dailyChemicalPerGallon !== undefined)
      patch.dailyChemicalPerGallon = c.chemicalProducts.dailyChemicalPerGallon;
    return patch;
  },

  computeQuote: (form, config) => computeMicrofiberMopping(form, config, 0),

  isActive: (form) =>
    (form.bathroomCount || 0) +
      (form.hugeBathroomSqFt || 0) +
      (form.extraAreaSqFt || 0) +
      (form.standaloneSqFt || 0) +
      (form.chemicalGallons || 0) >
    0,

  customOverrideFields: CUSTOM_OVERRIDE_FIELDS as ReadonlyArray<keyof MicrofiberMoppingFormState>,
});

export {
  computeMicrofiberMopping,
  convertFrequencyMetadataToBillingConversions,
  mapMicrofiberFrequency,
} from "./compute";
export type {
  BackendMicrofiberConfig,
  MicrofiberMoppingComputeQuote,
} from "./compute";
