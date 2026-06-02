import type { JanitorialFormState, JanitorialAdminRates, JanitorialCalcResult, JanitorialSupplyItem } from "../../../../components/services/purejanitorial/janitorialTypes";
import { janitorialPricingConfig as cfg } from "../../../../components/services/purejanitorial/janitorialConfig";

export const DEFAULT_SUPPLIES: JanitorialSupplyItem[] = [
  { name: "Vacuums",           amount: 100 },
  { name: "Mops",              amount: 500 },
  { name: "Mop Buckets",       amount: 200 },
  { name: "Dust Mops",         amount: 300 },
  { name: "Microfiber",        amount: 0 },
  { name: "Cleaning Products", amount: 0 },
  { name: "Consumables",       amount: 0 },
  { name: "Miscellaneous",     amount: 0 },
];

export const DEFAULT_ADMIN_RATES: JanitorialAdminRates = {
  productionRates: {},
  costPerHour: 20,
  laborTaxPct: 15,
  grossProfitPct: 33,
  defaultSupplies: DEFAULT_SUPPLIES,
};

export function buildAdminRates(rawConfig: unknown): JanitorialAdminRates {
  const config = (rawConfig ?? {}) as Record<string, unknown>;
  const adminOverrides = (config.defaultSupplies ?? {}) as Record<string, unknown>;
  const defaultSupplies: JanitorialSupplyItem[] = DEFAULT_SUPPLIES.map((item) => {
    const camelKey = item.name.replace(/\s+/g, "").charAt(0).toLowerCase() +
      item.name.replace(/\s+/g, "").slice(1);
    const variants = [
      camelKey,
      item.name.toLowerCase().replace(/\s+/g, ""),
      item.name.toLowerCase().replace(/\s+/g, "_"),
    ];
    for (const v of variants) {
      if (adminOverrides[v] !== undefined) {
        return { ...item, amount: Number(adminOverrides[v]) };
      }
    }
    return item;
  });

  return {
    productionRates: (config.productionRates as Record<string, number>) ?? {},
    costPerHour: (config.costPerHour as number) ?? 20,
    laborTaxPct: (config.laborTaxPct as number) ?? 15,
    grossProfitPct: (config.grossProfitPct as number) ?? 33,
    defaultSupplies,
  };
}

export function computeJanitorialCalc(
  form: JanitorialFormState,
  adminRates: JanitorialAdminRates
): JanitorialCalcResult {
  const productionRate = adminRates.productionRates[form.placeType] ?? 0;
  const hoursPerVisit = productionRate > 0 ? form.sqFt / productionRate : 0;

  const perOccurrenceLabor = hoursPerVisit * form.costPerHour * form.visitsPerWeek;

  const freqConversion = cfg.billingConversions[form.frequency] ?? cfg.billingConversions.weekly;
  const annualMultiplier = freqConversion.annualMultiplier;

  const weeklyLabor = perOccurrenceLabor;
  const annualBaseLabor = perOccurrenceLabor * annualMultiplier;
  const annualLaborTax = annualBaseLabor * (form.laborTaxPct / 100);
  const totalAnnualSupplies = form.supplies.reduce((s, x) => s + x.amount, 0);
  const totalAnnualCost = annualBaseLabor + annualLaborTax + totalAnnualSupplies;
  const gp = Math.min(Math.max(form.grossProfitPct / 100, 0), 0.999);
  const annualContractValue = gp < 1 ? totalAnnualCost / (1 - gp) : 0;

  const contractTotal =
    form.frequency === "oneTime"
      ? annualContractValue
      : (annualContractValue * form.contractMonths) / 12;

  const grossProfit = annualContractValue - totalAnnualCost;
  const monthlyRecurring =
    form.frequency !== "oneTime" && form.contractMonths > 0
      ? contractTotal / form.contractMonths
      : 0;

  const perVisit = annualMultiplier > 0 ? annualContractValue / annualMultiplier : 0;

  const origPerOccurrenceLabor = hoursPerVisit * adminRates.costPerHour * form.visitsPerWeek;
  const origAnnualBaseLabor = origPerOccurrenceLabor * annualMultiplier;
  const origAnnualLaborTax = origAnnualBaseLabor * (adminRates.laborTaxPct / 100);
  const origTotalAnnualSupplies = adminRates.defaultSupplies.reduce((s, x) => s + x.amount, 0);
  const origTotalAnnualCost = origAnnualBaseLabor + origAnnualLaborTax + origTotalAnnualSupplies;
  const origGp = Math.min(Math.max(adminRates.grossProfitPct / 100, 0), 0.999);
  const origAnnualContractValue = origGp < 1 ? origTotalAnnualCost / (1 - origGp) : 0;
  const originalContractTotal =
    form.frequency === "oneTime"
      ? origAnnualContractValue
      : (origAnnualContractValue * form.contractMonths) / 12;

  return {
    hoursPerVisit,
    weeklyLabor,
    annualBaseLabor,
    annualLaborTax,
    totalAnnualSupplies,
    totalAnnualCost,
    annualContractValue,
    contractTotal: form.customContractTotal ?? contractTotal,
    originalContractTotal,
    grossProfit,
    monthlyRecurring,
    perVisit,
  };
}
