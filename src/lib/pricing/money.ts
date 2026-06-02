export function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(n: number): string {
  return USD.format(Number.isFinite(n) ? n : 0);
}

export function formatCurrencyShort(n: number): string {
  return `$${roundCents(n).toFixed(2)}`;
}

export function applyOverride<T extends number | undefined>(
  override: T,
  computed: number
): number {
  return override !== undefined && override !== null ? (override as number) : computed;
}
