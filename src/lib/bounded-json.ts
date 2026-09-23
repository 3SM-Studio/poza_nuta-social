export type BoundedJsonResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: "payload-too-large" | "invalid-json" };

export async function readBoundedJson(request: Request, maxBytes: number): Promise<BoundedJsonResult> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return { ok: false, error: "payload-too-large" };
  if (!request.body) return { ok: false, error: "invalid-json" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, error: "payload-too-large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "invalid-json" };
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, error: "invalid-json" };
  } finally {
    reader.releaseLock();
  }
}
