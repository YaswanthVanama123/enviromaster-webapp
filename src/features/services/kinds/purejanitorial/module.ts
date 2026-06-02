import type { ServiceModule } from "../../engine/types";
import type {
  JanitorialFormState,
  JanitorialAdminRates,
  JanitorialCalcResult,
} from "../../../../components/services/purejanitorial/janitorialTypes";
import { janitorialPricingConfig as cfg } from "../../../../components/services/purejanitorial/janitorialConfig";
import {
  DEFAULT_SUPPLIES,
  DEFAULT_ADMIN_RATES,
  buildAdminRates,
  computeJanitorialCalc,
} from "./compute";
import { registerService } from "../registry";

export const purejanitorialModule: ServiceModule<
  JanitorialFormState,
  JanitorialAdminRates,
  JanitorialCalcResult
> = registerService({
  id: "pureJanitorial",
  displayName: "Pure Janitorial",

  defaults: (): JanitorialFormState => ({
    frequency: "weekly",
    visitsPerWeek: 1,
    placeType: "office",
    sqFt: 0,
    costPerHour: DEFAULT_ADMIN_RATES.costPerHour,
    laborTaxPct: DEFAULT_ADMIN_RATES.laborTaxPct,
    grossProfitPct: DEFAULT_ADMIN_RATES.grossProfitPct,
    supplies: DEFAULT_SUPPLIES,
    contractMonths: cfg.minContractMonths ?? 12,
  }),

  staticConfig: DEFAULT_ADMIN_RATES,

  mapBackendConfig: (raw) => buildAdminRates(raw),

  applyConfigToForm: (rates, form) => {
    const availableTypes = Object.keys(rates.productionRates);
    const placeTypePatch =
      availableTypes.length > 0 && !availableTypes.includes(form.placeType)
        ? { placeType: availableTypes[0] }
        : {};
    return {
      ...placeTypePatch,
      costPerHour: rates.costPerHour,
      laborTaxPct: rates.laborTaxPct,
      grossProfitPct: rates.grossProfitPct,
      supplies: rates.defaultSupplies,
    };
  },

  computeQuote: (form, rates) => computeJanitorialCalc(form, rates),
});
