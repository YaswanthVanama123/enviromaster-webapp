export function formatTimeAgo(value: string | Date | null | undefined): string {
  if (!value) return "";

  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const plural = (count: number, unit: string) =>
    `${count} ${unit}${count > 1 ? "s" : ""} ago`;

  if (years > 0) return plural(years, "year");
  if (months > 0) return plural(months, "month");
  if (weeks > 0) return plural(weeks, "week");
  if (days > 0) return plural(days, "day");
  if (hours > 0) return plural(hours, "hour");
  if (minutes > 0) return plural(minutes, "minute");
  return `${seconds} sec ago`;
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.ceil((timestamp - Date.now()) / 86400000);
}
