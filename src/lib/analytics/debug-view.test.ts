import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: {} as Record<string, Array<Record<string, unknown>>>,
  failTable: null as string | null,
  calls: [] as Array<{ table: string; select: string; filters: Array<[string, unknown]>; limit: number }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const call = { table, select: "", filters: [] as Array<[string, unknown]>, limit: 0 };
      mocks.calls.push(call);
      const query = {
        select(value: string) { call.select = value; return query; },
        eq(name: string, value: unknown) { call.filters.push([name, value]); return query; },
        in(name: string, values: unknown[]) { call.filters.push([`in:${name}`, values]); return query; },
        is(name: string, value: unknown) { call.filters.push([name, value]); return query; },
        gte(name: string, value: unknown) { call.filters.push([`>=${name}`, value]); return query; },
        lt(name: string, value: unknown) { call.filters.push([`<${name}`, value]); return query; },
        order() { return query; },
        limit(value: number) { call.limit = value; return query; },
        then(resolve: (value: { data: Array<Record<string, unknown>> | null; error: Error | null }) => void) {
          if (mocks.failTable === table) { resolve({ data: null, error: new Error("local read failure") }); return; }
          const rows = (mocks.rows[table] ?? []).filter((row) => call.filters.every(([name, target]) => {
            if (name.startsWith(">=")) return String(row[name.slice(2)]) >= String(target);
            if (name.startsWith("<")) return String(row[name.slice(1)]) < String(target);
            if (name.startsWith("in:")) return (target as unknown[]).includes(row[name.slice(3)]);
            return row[name] === target;
          })).slice(0, call.limit);
          resolve({ data: rows, error: null });
        },
      };
      return query;
    },
  }),
}));

import { DEBUG_LIMIT, getDebugRecords, parseDebugFilters } from "./debug-view";
import { ANALYTICS_PROJECT_KEY } from "../analytics-project";

const now = new Date("2026-09-24T12:00:00Z");
const eventId = "12345678-1234-4123-8123-123456789012";
const base = { event_id: eventId, event_name: "contact_click", occurred_at: "2026-09-24T11:59:00Z", path: "/kontakt", traffic_class: "external" };

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.failTable = null;
  mocks.rows = {
    analytics_cookieless_events: [{ ...base, project_key: ANALYTICS_PROJECT_KEY, referrer_host: "example.com", utm_source: "instagram" }],
    analytics_events_v2: [{ ...base, event_id: "22345678-1234-4123-8123-123456789012", analytics_consent: true, observed_context: { source: "google", referrerHost: "google.com", campaign: "fall" } }],
    analytics_quality_exceptions: [
      { id: 1, project_key: ANALYTICS_PROJECT_KEY, occurred_at: "2026-09-24T11:58:00Z", event_name: null, path: null, surface: "api_track", mode: null, outcome: "rejected", reason: "forbidden_field", visitor_id: "secret", raw_body: "secret" },
      { id: 2, project_key: ANALYTICS_PROJECT_KEY, occurred_at: "2026-09-24T11:57:00Z", event_name: "contact_click", path: "/kontakt", surface: "api_track", mode: "cookieless", outcome: "duplicate", reason: "idempotent_retry" },
      { id: 3, project_key: ANALYTICS_PROJECT_KEY, occurred_at: "2026-09-24T11:56:00Z", event_name: "hub_resumed", path: null, surface: "api_track", mode: "cookieless", outcome: "filtered", reason: "unsupported_mode" },
    ],
  };
});

describe("DebugView server read contract", () => {
  it("combines canonical accepted and quality sources without cookieless identity or rejected payload", async () => {
    const rows = await getDebugRecords(parseDebugFilters({}), now);
    expect(rows?.map((row) => row.outcome)).toEqual(["accepted", "accepted", "rejected", "duplicate", "filtered"]);
    expect(rows?.filter((row) => row.outcome === "accepted")).toHaveLength(2);
    expect(rows?.find((row) => row.analyticsMode === "cookieless" && row.outcome === "accepted")).toMatchObject({ eventId, persistence: "cookieless", surface: "api_track", projectKey: ANALYTICS_PROJECT_KEY });
    const rejected = rows?.find((row) => row.outcome === "rejected");
    expect(rejected).toMatchObject({ reasonCode: "forbidden_field", eventId: null, canonicalPath: null, analyticsMode: "unknown" });
    expect(JSON.stringify(rejected)).not.toContain("secret");
    expect(JSON.stringify(rows)).not.toMatch(/visitor_id|session_id|raw_body/);
    expect(mocks.calls.find((call) => call.table === "analytics_quality_exceptions")?.select).not.toMatch(/raw_body|visitor_id|session_id/);
    expect(mocks.calls.find((call) => call.table === "analytics_events_v2")?.select).not.toMatch(/visitor_id|session_id|metadata/);
  });

  it("applies event, outcome, mode, surface and bounded time filters", async () => {
    mocks.rows.analytics_quality_exceptions.push({ id: 4, project_key: ANALYTICS_PROJECT_KEY, occurred_at: "2026-09-23T00:00:00Z", event_name: "contact_click", surface: "api_track", mode: "cookieless", outcome: "duplicate", reason: "idempotent_retry" });
    const rows = await getDebugRecords(parseDebugFilters({ event: "contact_click", outcome: "duplicate", mode: "cookieless", surface: "api_track", window: "1440" }), now);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].outcome).toBe("duplicate");
    expect(mocks.calls).toHaveLength(1);
    expect(mocks.calls[0].filters).toContainEqual(["project_key", ANALYTICS_PROJECT_KEY]);
    expect(mocks.calls[0].filters).toContainEqual(["event_name", "contact_click"]);
    expect(mocks.calls[0].filters).toContainEqual(["outcome", "duplicate"]);
    expect(mocks.calls[0].filters).toContainEqual(["mode", "cookieless"]);
    expect(mocks.calls[0].filters).toContainEqual(["surface", "api_track"]);
    expect(mocks.calls[0].limit).toBe(DEBUG_LIMIT);
  });

  it("never takes project or arbitrary filter expressions from the client", async () => {
    const filters = parseDebugFilters({ project: "other", window: "999999", event: "visitor_id", outcome: "accepted;drop table", surface: "sql" });
    expect(filters).toEqual({ minutes: 30, eventName: null, outcome: null, mode: null, surface: null });
    await getDebugRecords(filters, now);
    expect(mocks.calls.filter((call) => call.table !== "analytics_events_v2").every((call) => call.filters.some(([key, value]) => key === "project_key" && value === ANALYTICS_PROJECT_KEY))).toBe(true);
    expect(mocks.calls.every((call) => call.limit === DEBUG_LIMIT)).toBe(true);
  });

  it("pushes accepted surface selection into bounded source queries", async () => {
    mocks.rows.analytics_cookieless_events.push({ ...base, event_id: "32345678-1234-4123-8123-123456789012", event_name: "tracking_entry", path: "/r/ABC23", project_key: ANALYTICS_PROJECT_KEY });
    const rows = await getDebugRecords(parseDebugFilters({ outcome: "accepted", surface: "tracking_redirect" }), now);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].surface).toBe("tracking_redirect");
    expect(mocks.calls.every((call) => call.filters.some(([name, value]) => name === "in:event_name" && (value as string[]).includes("tracking_entry")))).toBe(true);
  });

  it("shows only validated canonical fields and leaves missing values absent", async () => {
    mocks.rows.analytics_cookieless_events[0].path = "/admin?token=secret";
    mocks.rows.analytics_cookieless_events[0].referrer_host = "user@example.com";
    mocks.rows.analytics_cookieless_events[0].utm_source = "bad@email.com";
    mocks.rows.analytics_events_v2[0].observed_context = { source: "bad@email.com", referrerHost: "https://example.com/path" };
    const rows = await getDebugRecords(parseDebugFilters({ outcome: "accepted" }), now);
    expect(rows?.every((row) => row.canonicalPath === null || row.canonicalPath === "/kontakt")).toBe(true);
    expect(rows?.every((row) => row.referrerHost === null)).toBe(true);
    expect(rows?.every((row) => row.utmSource === null)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("secret");
  });

  it("returns a safe unavailable state when a diagnostic source fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.failTable = "analytics_quality_exceptions";
    await expect(getDebugRecords(parseDebugFilters({}), now)).resolves.toBeNull();
    expect(log).toHaveBeenCalledWith("analytics debug read failed", { reason: "records_unavailable" });
    log.mockRestore();
  });
});
