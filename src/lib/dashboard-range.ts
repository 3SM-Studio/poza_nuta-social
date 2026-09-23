export type DashboardRange = {
  from: string;
  toInclusive: string;
  toExclusive: string;
  previousFrom: string;
  previousToExclusive: string;
  label: string;
  key: "today" | "7" | "30" | "90" | "custom";
};

const WARSAW_TZ = "Europe/Warsaw";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveDashboardRange(params: Record<string, string | string[] | undefined>, now = new Date()): DashboardRange {
  const requested = one(params.range);
  const key = requested === "today" || requested === "7" || requested === "30" || requested === "90" || requested === "custom" ? requested : "30";
  const today = dateInTimeZone(now, WARSAW_TZ);

  if (key === "custom") {
    const rawFrom = one(params.from);
    const rawTo = one(params.to);
    if (isValidDate(rawFrom) && isValidDate(rawTo) && rawFrom <= rawTo) {
      return buildRange(rawFrom, rawTo, "custom", `${rawFrom} – ${rawTo}`);
    }
  }

  const days = key === "today" ? 1 : Number(key);
  const from = addDays(today, -(days - 1));
  return buildRange(from, today, key === "custom" ? "30" : key, key === "today" ? "Dziś" : `Ostatnie ${days} dni`);
}

function buildRange(from: string, toInclusive: string, key: DashboardRange["key"], label: string): DashboardRange {
  const toExclusive = addDays(toInclusive, 1);
  const days = diffDays(from, toExclusive);
  return {
    from,
    toInclusive,
    toExclusive,
    previousFrom: addDays(from, -days),
    previousToExclusive: from,
    label,
    key,
  };
}

export function comparisonNote(current: number, previous: number, unit: "percent" | "points" = "percent") {
  if (unit === "points") {
    const delta = current - previous;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)} pp vs poprzedni okres`;
  }
  if (previous === 0) return current === 0 ? "bez zmiany vs poprzedni okres" : "brak bazy porównawczej w poprzednim okresie";
  const delta = ((current - previous) / previous) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% vs poprzedni okres`;
}

function dateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, amount: number) {
  const [y, m, d] = date.split("-").map(Number);
  const value = new Date(Date.UTC(y, m - 1, d));
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function diffDays(from: string, toExclusive: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${toExclusive}T00:00:00Z`);
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

function isValidDate(value: string | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
