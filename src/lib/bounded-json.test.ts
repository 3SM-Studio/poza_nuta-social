import { describe, expect, it } from "vitest";
import { readBoundedJson } from "./bounded-json";

const limit = 12_000;

function request(body: string, headers?: Record<string, string>) {
  return new Request("http://localhost/api/track", { method: "POST", headers, body });
}

describe("bounded analytics JSON", () => {
  it("accepts a normal object", async () => {
    expect(await readBoundedJson(request('{"eventName":"page_view"}'), limit)).toEqual({ ok: true, value: { eventName: "page_view" } });
  });

  it("accepts exactly the byte limit", async () => {
    const body = JSON.stringify({ data: "x".repeat(limit - 11) });
    expect(new TextEncoder().encode(body).byteLength).toBe(limit);
    expect((await readBoundedJson(request(body), limit)).ok).toBe(true);
  });

  it("rejects an oversized body with a content-length header", async () => {
    expect(await readBoundedJson(request("{}", { "content-length": String(limit + 1) }), limit)).toEqual({ ok: false, error: "payload-too-large" });
  });

  it("rejects an oversized stream without a useful content-length header", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ data: "x".repeat(limit) }));
    const streamed = new Request("http://localhost/api/track", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes.slice(0, 8000)); controller.enqueue(bytes.slice(8000)); controller.close(); } }),
      duplex: "half",
    } as RequestInit);
    expect(streamed.headers.get("content-length")).toBeNull();
    expect(await readBoundedJson(streamed, limit)).toEqual({ ok: false, error: "payload-too-large" });
  });

  it("rejects malformed JSON and unsupported top-level payloads", async () => {
    expect(await readBoundedJson(request("{"), limit)).toEqual({ ok: false, error: "invalid-json" });
    expect(await readBoundedJson(request("[]"), limit)).toEqual({ ok: false, error: "invalid-json" });
  });
});
