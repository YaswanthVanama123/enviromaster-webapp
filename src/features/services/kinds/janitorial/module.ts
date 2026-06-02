import type { ServiceModule } from "../../engine/types";
import type { JanitorialFormState } from "../../../../components/services/janitorial/janitorialTypes";
import { janitorialPricingConfig as cfg } from "../../../../components/services/janitorial/janitorialConfig";
import { registerService } from "../registry";
import {
  type BackendJanitorialConfig,
  type JanitorialActiveConfig,
  type JanitorialCalc,
  buildJanitorialActiveConfig,
  computeJanitorialCalc,
} from "./compute";

const DEFAULT_FORM: JanitorialFormState = {
  serviceId: "janitorial",
  serviceType: "recurringService",
  frequency: "weekly",
  location: "insideBeltway",
  contractMonths: 12,
  baseHours: 5.07,
  vacuumingHours: 4,
  dustingHours: 2,
  needsParking: false,
  parkingCost: 0,
  recurringServiceRate: cfg.baseRates.recurringService,
  oneTimeServiceRate: cfg.baseRates.oneTimeService,
  vacuumingRatePerHour: cfg.additionalServices.vacuuming.ratePerHour,
  dustingRatePerHour: cfg.additionalServices.dusting.ratePerHour,
  dailyMultiplier: cfg.frequencyMultipliers.daily,
  weeklyMultiplier: cfg.frequencyMultipliers.weekly,
  biweeklyMultiplier: cfg.frequencyMultipliers.biweekly,
  monthlyMultiplier: cfg.frequencyMultipliers.monthly,
  oneTimeMultiplier: cfg.frequencyMultipliers.oneTime,
  perVisitMinimum: cfg.minimums.perVisit,
  recurringContractMinimum: cfg.minimums.recurringContract,
  standardTripCharge: cfg.tripCharges.standard,
  beltwayTripCharge: cfg.tripCharges.insideBeltway,
  paidParkingTripCharge: cfg.tripCharges.paidParking,
};

export const janitorialModule: ServiceModule<
  JanitorialFormState,
  JanitorialActiveConfig,
  JanitorialCalc
> = registerService({
  id: "janitorial",
  displayName: "Janitorial Services",

  defaults: DEFAULT_FORM,
  staticConfig: buildJanitorialActiveConfig(null),

  mapBackendConfig: (raw) => buildJanitorialActiveConfig(raw as BackendJanitorialConfig | null),

  applyConfigToForm: (active) => ({
    recurringServiceRate: active.baseRates.recurringService,
    oneTimeServiceRate: active.baseRates.oneTimeService,
    vacuumingRatePerHour: active.additionalServices.vacuuming.ratePerHour,
    dustingRatePerHour: active.additionalServices.dusting.ratePerHour,
    perVisitMinimum: active.minimums.perVisit,
    recurringContractMinimum: active.minimums.recurringContract,
    standardTripCharge: active.tripCharges.standard,
    beltwayTripCharge: active.tripCharges.insideBeltway,
    paidParkingTripCharge: active.tripCharges.paidParking,
  }),

  computeQuote: (form, active) => computeJanitorialCalc(form, active),

  isActive: (form) => (form.baseHours || 0) > 0,
});

export { computeJanitorialCalc, buildJanitorialActiveConfig };
export type { BackendJanitorialConfig, JanitorialActiveConfig, JanitorialCalc };
