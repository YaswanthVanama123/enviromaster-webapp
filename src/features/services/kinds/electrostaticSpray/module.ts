import type { ServiceModule } from "../../engine/types";
import type { ElectrostaticSprayFormState, ElectrostaticSprayCalcResult } from "../../../../components/services/electrostaticSpray/electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "../../../../components/services/electrostaticSpray/electrostaticSprayConfig";
import { registerService } from "../registry";
import {
  type ElectrostaticActiveConfig,
  buildElectrostaticActiveConfig,
  computeElectrostaticSprayCalc,
} from "./compute";

export const electrostaticSprayModule: ServiceModule<
  ElectrostaticSprayFormState,
  ElectrostaticActiveConfig,
  ElectrostaticSprayCalcResult
> = registerService({
  id: "electrostaticSpray",
  displayName: "Electrostatic Spray",

  defaults: (): ElectrostaticSprayFormState => ({
    serviceId: "electrostaticSpray",
    pricingMethod: "byRoom",
    roomCount: 0,
    squareFeet: 0,
    useExactCalculation: true,
    frequency: cfg.defaultFrequency,
    location: "standard",
    isCombinedWithSaniClean: false,
    contractMonths: cfg.minContractMonths,
    notes: "",
    ratePerRoom: cfg.ratePerRoom,
    ratePerThousandSqFt: cfg.ratePerThousandSqFt,
    tripChargePerVisit: cfg.tripCharges.standard,
    applyMinimum: true,
  }),

  staticConfig: buildElectrostaticActiveConfig(null),

  mapBackendConfig: (raw) => buildElectrostaticActiveConfig(raw as any),

  applyConfigToForm: (active) => ({
    ratePerRoom: active.standardSprayPricing.sprayRatePerRoom,
    ratePerThousandSqFt: active.standardSprayPricing.sprayRatePerSqFtUnit,
    tripChargePerVisit: active.tripCharges.standard,
  }),

  computeQuote: (form, active) => computeElectrostaticSprayCalc(form, active, 0),

  isActive: (form) => (form.roomCount || 0) > 0 || (form.squareFeet || 0) > 0,

  customOverrideFields: [
    "customRatePerRoom",
    "customRatePerThousandSqFt",
    "customTripChargePerVisit",
    "customServiceCharge",
    "customPerVisitPrice",
    "customMonthlyRecurring",
    "customContractTotal",
    "customFirstMonthTotal",
  ] as const,

  pricingFields: [
    "ratePerRoom",
    "ratePerThousandSqFt",
    "tripChargePerVisit",
    "customRatePerRoom",
    "customRatePerThousandSqFt",
    "customTripChargePerVisit",
    "customServiceCharge",
    "customPerVisitPrice",
    "customMonthlyRecurring",
    "customContractTotal",
    "customFirstMonthTotal",
  ] as const,

  priceChangeLog: {
    productKeyPrefix: "electrostaticSpray",
    productNamePrefix: "Electrostatic Spray",
    quantityField: "roomCount",
    frequencyField: "frequency",
  },
});
