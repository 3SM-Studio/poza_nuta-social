export function adminRows<T>(result: { data: T[] | null; error: unknown } | null): T[] | null {
  return result && !result.error && Array.isArray(result.data) ? result.data : null;
}
