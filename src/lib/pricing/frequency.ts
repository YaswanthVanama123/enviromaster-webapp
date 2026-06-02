export type FrequencyKey =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "everyFourWeeks"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

export interface FrequencyMeta {
  key: FrequencyKey;
  label: string;
  visitsPerYear: number;
}

export const FREQUENCIES: Record<FrequencyKey, FrequencyMeta> = {
  oneTime:        { key: "oneTime",        label: "One-time",         visitsPerYear: 1 },
  weekly:         { key: "weekly",         label: "Weekly",           visitsPerYear: 52 },
  biweekly:       { key: "biweekly",       label: "Bi-weekly",        visitsPerYear: 26 },
  twicePerMonth:  { key: "twicePerMonth",  label: "Twice per month",  visitsPerYear: 24 },
  monthly:        { key: "monthly",        label: "Monthly",          visitsPerYear: 12 },
  everyFourWeeks: { key: "everyFourWeeks", label: "Every 4 weeks",    visitsPerYear: 13 },
  bimonthly:      { key: "bimonthly",      label: "Bi-monthly",       visitsPerYear: 6 },
  quarterly:      { key: "quarterly",      label: "Quarterly",        visitsPerYear: 4 },
  biannual:       { key: "biannual",       label: "Bi-annual",        visitsPerYear: 2 },
  annual:         { key: "annual",         label: "Annual",           visitsPerYear: 1 },
};

export function visitsPerYear(key: FrequencyKey): number {
  return FREQUENCIES[key].visitsPerYear;
}

export const VISITS_PER_YEAR_MAP: Record<FrequencyKey, number> = Object.fromEntries(
  (Object.keys(FREQUENCIES) as FrequencyKey[]).map((k) => [k, FREQUENCIES[k].visitsPerYear])
) as Record<FrequencyKey, number>;

export function visitsPerMonth(key: FrequencyKey): number {
  return FREQUENCIES[key].visitsPerYear / 12;
}

export function visitsInContract(key: FrequencyKey, contractMonths: number): number {
  if (key === "oneTime") return 1;
  if (contractMonths <= 0) return 0;
  return Math.round((FREQUENCIES[key].visitsPerYear * contractMonths) / 12);
}

export function annualFromPerVisit(perVisit: number, key: FrequencyKey): number {
  return perVisit * FREQUENCIES[key].visitsPerYear;
}

export function monthlyFromPerVisit(perVisit: number, key: FrequencyKey): number {
  return perVisit * visitsPerMonth(key);
}

const FREQUENCY_ALIASES: Record<string, FrequencyKey> = {
  "one-time": "oneTime",
  "onetime": "oneTime",
  "1-time": "oneTime",
  "1time": "oneTime",
  "weekly": "weekly",
  "bi-weekly": "biweekly",
  "biweekly": "biweekly",
  "twice-per-month": "twicePerMonth",
  "twicepermonth": "twicePerMonth",
  "monthly": "monthly",
  "every-four-weeks": "everyFourWeeks",
  "everyfourweeks": "everyFourWeeks",
  "bi-monthly": "bimonthly",
  "bimonthly": "bimonthly",
  "quarterly": "quarterly",
  "semi-annual": "biannual",
  "biannual": "biannual",
  "bi-annual": "biannual",
  "annual": "annual",
  "yearly": "annual",
};

export function parseFrequency(value: unknown): FrequencyKey | null {
  if (value == null) return null;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    return parseFrequency(v.frequencyKey ?? v.value ?? v.label ?? v.name ?? v.frequency);
  }
  const text = String(value).trim().toLowerCase().replace(/\s+/g, "-");
  return FREQUENCY_ALIASES[text] ?? null;
}

export function requireFrequency(value: unknown): FrequencyKey {
  const k = parseFrequency(value);
  if (!k) {
    throw new Error(
      `Unrecognized frequency: ${JSON.stringify(value)}. ` +
      `Expected one of: ${Object.keys(FREQUENCIES).join(", ")}`
    );
  }
  return k;
}
