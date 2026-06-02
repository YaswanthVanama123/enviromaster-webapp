import type { ServiceModule } from "../../engine/types";
import type { GreaseTrapFormState } from "../../../../components/services/greaseTrap/greaseTrapTypes";
import { registerService } from "../registry";
import {
  GREASE_TRAP_DEFAULT_CONFIG,
  type GreaseTrapConfig,
  computeGreaseTrapQuote,
} from "./compute";

type GreaseTrapQuote = ReturnType<typeof computeGreaseTrapQuote>;

export const greaseTrapModule: ServiceModule<
  GreaseTrapFormState,
  GreaseTrapConfig,
  GreaseTrapQuote
> = registerService({
  id: "greaseTrap",
  displayName: "Grease Trap",

  defaults: (): GreaseTrapFormState => ({
    frequency: "weekly",
    numberOfTraps: 0,
    sizeOfTraps: 0,
    perTrapRate: GREASE_TRAP_DEFAULT_CONFIG.perTrapRate,
    perGallonRate: GREASE_TRAP_DEFAULT_CONFIG.perGallonRate,
    contractMonths: GREASE_TRAP_DEFAULT_CONFIG.contractLimits.defaultMonths,
  }),

  staticConfig: GREASE_TRAP_DEFAULT_CONFIG,

  mapBackendConfig: (raw) => {
    const cfg = raw as Partial<GreaseTrapConfig> | null | undefined;
    if (!cfg) return null;
    return cfg;
  },

  applyConfigToForm: (config) => ({
    perTrapRate: config.perTrapRate,
    perGallonRate: config.perGallonRate,
  }),

  computeQuote: (form, config) => computeGreaseTrapQuote(form, config),

  isActive: (form) => (form.numberOfTraps || 0) > 0,

  pricingFields: ["perTrapRate", "perGallonRate"] as const,

  priceChangeLog: {
    productKeyPrefix: "greaseTrap",
    productNamePrefix: "Grease Trap",
    quantityField: "numberOfTraps",
    frequencyField: "frequency",
  },
});
