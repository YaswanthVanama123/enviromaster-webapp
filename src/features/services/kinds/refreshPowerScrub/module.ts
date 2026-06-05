import type { ServiceModule } from "../../engine/types";
import type {
  RefreshPowerScrubFormState,
} from "../../../../components/services/refreshPowerScrub/refreshPowerScrubTypes";
import { registerService } from "../registry";
import {
  type BackendRefreshPowerScrubConfig,
  type RefreshPowerScrubComputeResult,
  computeRefreshPowerScrub,
  createDefaultArea,
  DEFAULT_AREA,
  AREA_KEYS,
  FALLBACK_DEFAULT_HOURLY,
  FALLBACK_DEFAULT_MIN,
  FALLBACK_DEFAULT_TRIP,
  FALLBACK_PER_HOUR_RATE,
  FALLBACK_SQFT_FIXED_FEE,
  FALLBACK_SQFT_INSIDE_RATE,
  FALLBACK_SQFT_OUTSIDE_RATE,
} from "./compute";

const DEFAULT_FORM: RefreshPowerScrubFormState = {
  frequency: "monthly" as any,
  tripChargeIncluded: true,
  notes: "",
  tripCharge: FALLBACK_DEFAULT_TRIP,
  hourlyRate: FALLBACK_DEFAULT_HOURLY,
  minimumVisit: FALLBACK_DEFAULT_MIN,
  hourlyRateIsCustom: false,
  minimumVisitIsCustom: false,
  applyMinimum: true,
  contractMonths: 12,
  dumpster: { ...DEFAULT_AREA },
  patio: { ...DEFAULT_AREA },
  walkway: { ...DEFAULT_AREA },
  foh: { ...DEFAULT_AREA },
  boh: { ...DEFAULT_AREA },
  other: { ...DEFAULT_AREA },
} as RefreshPowerScrubFormState;

export const refreshPowerScrubModule: ServiceModule<
  RefreshPowerScrubFormState,
  BackendRefreshPowerScrubConfig | null,
  RefreshPowerScrubComputeResult
> = registerService({
  id: "refreshPowerScrub",
  displayName: "Refresh Power Scrub",

  defaults: DEFAULT_FORM,
  staticConfig: null as BackendRefreshPowerScrubConfig | null,

  mapBackendConfig: (raw) => (raw as BackendRefreshPowerScrubConfig | null) ?? null,

  applyConfigToForm: (config, form) => {
    if (!config) return {};
    const updatedDefaultArea = createDefaultArea(config);
    const patch: Partial<RefreshPowerScrubFormState> = {
      tripCharge: config.coreRates?.tripCharge,
      hourlyRate: config.coreRates?.defaultHourlyRate,
      minimumVisit: config.coreRates?.minimumVisit,
    };
    const areaPatch = {
      hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
      workerRate:
        config.coreRates?.perWorkerRate ??
        config.coreRates?.defaultHourlyRate ??
        updatedDefaultArea.workerRate,
      insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
      outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
      sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
    };
    for (const area of AREA_KEYS) {
      const existingArea = (form as any)?.[area] ?? DEFAULT_AREA;
      (patch as any)[area] = { ...existingArea, ...areaPatch };
    }
    return patch;
  },

  computeQuote: (form, config) => computeRefreshPowerScrub(form, config, 0),

  isActive: (form) => AREA_KEYS.some((area) => form[area].enabled),

  customOverrideFields: [] as ReadonlyArray<keyof RefreshPowerScrubFormState>,
});

export {
  computeRefreshPowerScrub,
  calcAreaCost,
  calcBaselineAreaCost,
  getBillingMultiplier,
  transformBackendFrequencyMeta,
  createDefaultArea,
  clearAllCustomOverrides,
  resetAreaCustoms,
  AREA_KEYS,
  DEFAULT_AREA,
  FALLBACK_DEFAULT_HOURLY,
  FALLBACK_DEFAULT_MIN,
  FALLBACK_DEFAULT_TRIP,
  FALLBACK_FOH_RATE,
  FALLBACK_KITCHEN_LARGE,
  FALLBACK_KITCHEN_SMALL_MED,
  FALLBACK_PATIO_STANDALONE,
  FALLBACK_PATIO_UPSELL,
  FALLBACK_PER_HOUR_RATE,
  FALLBACK_SQFT_FIXED_FEE,
  FALLBACK_SQFT_INSIDE_RATE,
  FALLBACK_SQFT_OUTSIDE_RATE,
} from "./compute";
export type {
  BackendRefreshPowerScrubConfig,
  RefreshPowerScrubComputeResult,
} from "./compute";
