export const BACKEND_TO_FREQUENCY: Record<number, string> = {
  1: 'Weekly',
  2: 'Bi-Weekly',
  3: 'Monthly',
  4: 'Quarterly',
  5: 'Semi-Annual',
  6: 'Annual',
  13: 'Twice per Month',
  14: 'Bi-Monthly',
  0: 'One-Time',
};

export const FREQUENCY_TO_BACKEND: Record<string, number> = {
  weekly: 1,
  biweekly: 2,
  twicepermonth: 13,
  monthly: 3,
  bimonthly: 14,
  quarterly: 4,
  semiannual: 5,
  annual: 6,
  onetime: 0,

  'bi-weekly': 2,
  'bi-monthly': 14,
  'semi-annual': 5,
  'one-time': 0,
  '1time': 0,
  everyfourweeks: 3,
  'every four weeks': 3,
};

export function normalizeFrequencyKey(value: any): string | null {
  if (value === undefined || value === null) return null;

  const raw = typeof value === 'object'
    ? value.frequencyKey ?? value.value ?? value.label ?? value.name ?? value.frequency ?? ''
    : value;

  const text = String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return text || null;
}

export function getFrequencyNumber(serviceData: any): number | null {
  if (!serviceData) return null;

  const candidates = [
    serviceData.frequency,
    serviceData.frequencyKey,
    serviceData.frequency?.frequencyKey,
    serviceData.frequency?.value,
    serviceData.frequency?.label,
    serviceData.frequencyDisplay?.frequencyKey,
    serviceData.frequencyDisplay?.value,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeFrequencyKey(candidate);
    if (normalized && FREQUENCY_TO_BACKEND[normalized] !== undefined) {
      return FREQUENCY_TO_BACKEND[normalized];
    }
  }

  return null;
}
