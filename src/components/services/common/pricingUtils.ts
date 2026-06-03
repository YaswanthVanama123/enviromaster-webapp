import { annualFromPerVisit as libAnnualFromPerVisit, toNumber, FREQUENCIES } from "../../../lib/pricing";
import type { BillingFrequency } from "./serviceTypes";

export function annualFromPerVisit(perVisit: number, f: BillingFrequency): number {
  return libAnnualFromPerVisit(perVisit, f as keyof typeof FREQUENCIES);
}

export const n = toNumber;
