import type { GreaseTrapFormState } from "../../../../components/services/greaseTrap/greaseTrapTypes";
import type { ServiceQuoteResult, ServiceId } from "../../../../components/services/common/serviceTypes";
import { annualFromPerVisit } from "../../../../components/services/common/pricingUtils";
import {
  GREASE_TRAP_PER_TRAP_RATE,
  GREASE_TRAP_PER_GALLON_RATE,
} from "../../../../components/services/greaseTrap/greaseTrapConfig";

export interface GreaseTrapConfig {
  perTrapRate: number;
  perGallonRate: number;
  frequencyMultipliers: Record<string, number>;
  contractLimits: { minMonths: number; maxMonths: number; defaultMonths: number };
  allowedFrequencies: string[];
}

export const GREASE_TRAP_DEFAULT_CONFIG: GreaseTrapConfig = {
  perTrapRate: GREASE_TRAP_PER_TRAP_RATE,
  perGallonRate: GREASE_TRAP_PER_GALLON_RATE,
  frequencyMultipliers: {
    daily: 30,
    weekly: 4.33,
    biweekly: 2.165,
    monthly: 1,
  },
  contractLimits: { minMonths: 2, maxMonths: 36, defaultMonths: 12 },
  allowedFrequencies: ["daily", "weekly", "biweekly", "monthly"],
};

export function computeGreaseTrapQuote(
  form: GreaseTrapFormState,
  config: GreaseTrapConfig
): ServiceQuoteResult & {
  perVisitTotal: number;
  monthlyTotal: number;
  contractTotal: number;
} {
  const perVisit =
    form.numberOfTraps * form.perTrapRate + form.sizeOfTraps * form.perGallonRate;
  const annual = annualFromPerVisit(perVisit, form.frequency);

  const frequencyMultiplier =
    config.frequencyMultipliers[form.frequency] ?? config.frequencyMultipliers.weekly;
  const monthlyTotal = perVisit * frequencyMultiplier;

  const contractMonths = Math.min(
    Math.max(
      form.contractMonths || config.contractLimits.defaultMonths,
      config.contractLimits.minMonths
    ),
    config.contractLimits.maxMonths
  );
  const contractTotal = monthlyTotal * contractMonths;

  return {
    serviceId: "greaseTrap" as ServiceId,
    displayName: "Grease Trap",
    perVisitPrice: perVisit,
    perVisitTotal: perVisit,
    annualPrice: annual,
    monthlyTotal,
    contractTotal,
    detailsBreakdown: [
      `Number of traps: ${form.numberOfTraps} @ $${form.perTrapRate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Size of traps (gallons): ${form.sizeOfTraps} @ $${form.perGallonRate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Frequency: ${form.frequency}`,
    ],
  };
}
