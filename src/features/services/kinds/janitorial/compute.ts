import type { JanitorialFormState } from "../../../../components/services/janitorial/janitorialTypes";
import { janitorialPricingConfig as cfg } from "../../../../components/services/janitorial/janitorialConfig";

export interface BackendJanitorialConfig {
  baseRates: { recurringService: number; oneTimeService: number };
  additionalServices: {
    vacuuming: { baseHours: number; ratePerHour: number };
    dusting: { baseHours: number; ratePerHour: number };
  };
  frequencyMultipliers: Record<string, number>;
  billingConversions: Record<string, number>;
  minimums: { perVisit: number; recurringContract: number };
  tripCharges: { standard: number; insideBeltway: number; paidParking: number };
}

export type JanitorialActiveConfig = BackendJanitorialConfig;

export function buildJanitorialActiveConfig(
  backendConfig: BackendJanitorialConfig | null
): JanitorialActiveConfig {
  return (
    backendConfig ?? {
      baseRates: cfg.baseRates,
      additionalServices: cfg.additionalServices,
      frequencyMultipliers: cfg.frequencyMultipliers as Record<string, number>,
      billingConversions: cfg.billingConversions as Record<string, number>,
      minimums: cfg.minimums,
      tripCharges: cfg.tripCharges,
    }
  );
}

export interface JanitorialCalc {
  baseServiceCost: number;
  vacuumingCost: number;
  dustingCost: number;
  tripCharge: number;
  perVisit: number;
  monthlyTotal: number;
  contractTotal: number;
  frequencyMultiplier: number;
  appliedRules: string[];
}

export function computeJanitorialCalc(
  form: JanitorialFormState,
  activeConfig: JanitorialActiveConfig
): JanitorialCalc {
  const effectiveRecurringServiceRate = form.customRecurringServiceRate ?? form.recurringServiceRate;
  const effectiveOneTimeServiceRate = form.customOneTimeServiceRate ?? form.oneTimeServiceRate;
  const effectiveVacuumingRatePerHour = form.customVacuumingRatePerHour ?? form.vacuumingRatePerHour;
  const effectiveDustingRatePerHour = form.customDustingRatePerHour ?? form.dustingRatePerHour;
  const effectivePerVisitMinimum = form.customPerVisitMinimum ?? form.perVisitMinimum;
  const effectiveRecurringContractMinimum =
    form.customRecurringContractMinimum ?? form.recurringContractMinimum;
  const effectiveStandardTripCharge = form.customStandardTripCharge ?? form.standardTripCharge;
  const effectiveBeltwayTripCharge = form.customBeltwayTripCharge ?? form.beltwayTripCharge;
  const effectivePaidParkingTripCharge =
    form.customPaidParkingTripCharge ?? form.paidParkingTripCharge;
  const effectiveDailyMultiplier = form.customDailyMultiplier ?? form.dailyMultiplier;
  const effectiveWeeklyMultiplier = form.customWeeklyMultiplier ?? form.weeklyMultiplier;
  const effectiveBiweeklyMultiplier = form.customBiweeklyMultiplier ?? form.biweeklyMultiplier;
  const effectiveMonthlyMultiplier = form.customMonthlyMultiplier ?? form.monthlyMultiplier;
  const effectiveOneTimeMultiplier = form.customOneTimeMultiplier ?? form.oneTimeMultiplier;

  const baseServiceRate =
    form.serviceType === "recurringService"
      ? effectiveRecurringServiceRate
      : effectiveOneTimeServiceRate;
  const baseServiceCost = form.baseHours * baseServiceRate;

  const vacuumingCost = form.vacuumingHours * effectiveVacuumingRatePerHour;
  const dustingCost = form.dustingHours * effectiveDustingRatePerHour;

  let tripCharge = 0;
  if (form.location === "insideBeltway") {
    tripCharge = effectiveBeltwayTripCharge;
  } else {
    tripCharge = effectiveStandardTripCharge;
  }
  if (form.needsParking) {
    tripCharge += form.parkingCost || effectivePaidParkingTripCharge;
  }

  const perVisit = Math.max(
    baseServiceCost + vacuumingCost + dustingCost + tripCharge,
    effectivePerVisitMinimum
  );

  let frequencyMultiplier = 1;
  if (activeConfig.frequencyMultipliers && form.frequency in activeConfig.frequencyMultipliers) {
    frequencyMultiplier = activeConfig.frequencyMultipliers[form.frequency];
  } else {
    switch (form.frequency) {
      case "daily":
        frequencyMultiplier = effectiveDailyMultiplier;
        break;
      case "weekly":
        frequencyMultiplier = effectiveWeeklyMultiplier;
        break;
      case "biweekly":
        frequencyMultiplier = effectiveBiweeklyMultiplier;
        break;
      case "monthly":
        frequencyMultiplier = effectiveMonthlyMultiplier;
        break;
      case "oneTime":
        frequencyMultiplier = effectiveOneTimeMultiplier;
        break;
      default:
        frequencyMultiplier = 1;
    }
  }

  const monthlyTotal = perVisit * frequencyMultiplier;
  const contractTotal = Math.max(
    monthlyTotal * form.contractMonths,
    effectiveRecurringContractMinimum
  );

  const appliedRules: string[] = [];
  if (baseServiceCost + vacuumingCost + dustingCost + tripCharge < effectivePerVisitMinimum) {
    appliedRules.push(`Per visit minimum applied: $${effectivePerVisitMinimum.toFixed(2)}`);
  }
  if (
    monthlyTotal * form.contractMonths < effectiveRecurringContractMinimum &&
    form.serviceType === "recurringService"
  ) {
    appliedRules.push(`Contract minimum applied: $${effectiveRecurringContractMinimum.toFixed(2)}`);
  }

  return {
    baseServiceCost,
    vacuumingCost,
    dustingCost,
    tripCharge,
    perVisit,
    monthlyTotal,
    contractTotal,
    frequencyMultiplier,
    appliedRules,
  };
}
