const defaultOrder: Record<string, number> = {
  instagram: 10,
  tiktok: 20,
  facebook: 30,
  youtube: 40,
  website: 50,
};

export function resolveDestinationSortOrder(slug: string, value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  const requested = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(requested) && requested >= 0 && requested <= 10_000
    ? requested
    : (defaultOrder[slug] ?? 100);
}
