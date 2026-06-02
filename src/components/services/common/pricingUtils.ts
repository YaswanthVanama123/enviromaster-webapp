import { FREQUENCIES, annualFromPerVisit as libAnnualFromPerVisit, toNumber } from "../../../lib/pricing";
import type { BillingFrequency } from "./serviceTypes";

export function frequencyToAnnualMultiplier(f: BillingFrequency): number {
  return FREQUENCIES[f as keyof typeof FREQUENCIES]?.visitsPerYear ?? 0;
}

export function annualFromPerVisit(perVisit: number, f: BillingFrequency): number {
  return libAnnualFromPerVisit(perVisit, f as keyof typeof FREQUENCIES);
}

export const n = toNumber;
