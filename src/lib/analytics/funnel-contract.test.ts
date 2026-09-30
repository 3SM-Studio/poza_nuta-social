import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_FUNNEL, FUNNELS, isFunnelReport, parseFunnelKey } from "./funnel-contract";

describe("server-owned funnel contract", () => {
  it("keeps displayed presets and ordered steps aligned with the SQL read model", () => {
    const migrations = join(process.cwd(), "supabase", "migrations");
    const definitions = readdirSync(migrations).sort().flatMap((file) => {
      const sql = readFileSync(join(migrations, file), "utf8");
      return /create (?:or replace )?function public\.analytics_funnel_v1\(/i.test(sql) ? [sql] : [];
    });
    expect(definitions.length).toBeGreaterThan(0);
    const sql = definitions.at(-1)!;
    const allowed = sql.match(/p_funnel_key not in \(([^)]+)\)/)?.[1];
    expect(allowed).toBeDefined();
    const allowedKeys = [...allowed!.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(allowedKeys).toEqual(Object.keys(FUNNELS));

    const values = sql.match(/with recursive steps\(ord, step_key, event_name\) as \([\s\S]*?from \(values([\s\S]*?)\) v\(funnel_key, ord, step_key, event_name\)/)?.[1];
    expect(values).toBeDefined();
    const sqlSteps = [...values!.matchAll(/\('([^']+)',\s*(\d+),\s*'([^']+)',\s*'([^']+)'\)/g)]
      .map((match) => ({ funnel: match[1], order: Number(match[2]), key: match[3], eventName: match[4] }));
    expect(sqlSteps.length).toBeGreaterThan(0);
    expect(sqlSteps).toEqual(Object.entries(FUNNELS).flatMap(([funnel, definition]) =>
      definition.steps.map((step, index) => ({ funnel, order: index + 1, key: step.key, eventName: step.key }))));
  });

  it("accepts only stable preset keys, never labels or arbitrary event lists", () => {
    expect(DEFAULT_FUNNEL).toBe("contact_intent");
    expect(parseFunnelKey("contact_intent")).toBe("contact_intent");
    expect(parseFunnelKey(FUNNELS.contact_intent.label)).toBeNull();
    expect(parseFunnelKey("contact_view,contact_click")).toBeNull();
    expect(parseFunnelKey("__proto__")).toBeNull();
  });

  it("rejects an inconsistent RPC shape before showing metrics", () => {
    const valid = {
      funnelKey: "contact_intent", scope: "business", fromDate: "2031-01-10", toDateExclusive: "2031-01-11",
      eligibleSessions: 1, entrants: 1, completionRate: 100,
      steps: [
        { key: "contact_view", sessions: 1, previousSessions: null, conversionRate: null, dropOff: null, dropOffRate: null },
        { key: "contact_click", sessions: 1, previousSessions: 1, conversionRate: 100, dropOff: 0, dropOffRate: 0 },
      ],
    };
    expect(isFunnelReport(valid, "contact_intent", "business")).toBe(true);
    expect(isFunnelReport({ ...valid, completionRate: Number.NaN }, "contact_intent", "business")).toBe(false);
    expect(isFunnelReport({ ...valid, scope: "diagnostic" }, "contact_intent", "business")).toBe(false);
    expect(isFunnelReport({ ...valid, steps: [valid.steps[1], valid.steps[0]] }, "contact_intent", "business")).toBe(false);
  });
});
