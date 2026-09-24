import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EVENT_NAMES } from "@/lib/analytics-taxonomy";
import { EVENT_SEMANTICS, KEY_EVENT_NAMES, OUTCOME_METRICS, isOutcomeReport } from "./outcome-contract";

describe("canonical Key Event semantics", () => {
  it("covers stable canonical event names independently of labels", () => {
    expect(Object.keys(EVENT_SEMANTICS).sort()).toEqual([...EVENT_NAMES].sort());
    for (const name of EVENT_NAMES) expect(EVENT_SEMANTICS[name].eventName).toBe(name);
    expect(EVENT_SEMANTICS.contact_click.label).not.toBe("contact_click");
    const migrations = join(process.cwd(), "supabase", "migrations");
    const file = readdirSync(migrations).find((name) => name.endsWith("_analytics_key_events_outcomes_foundation.sql"));
    expect(file).toBeDefined();
    const sql = readFileSync(join(migrations, file!), "utf8");
    const definitions = sql.match(/with definitions\(ord,event_name\) as \(values (.+)\),\s*eligible as/s)?.[1];
    expect(definitions).toBeDefined();
    const sqlNames = [...definitions!.matchAll(/\(\d+,'([^']+)'::text\)/g)].map((match) => match[1]);
    expect(sqlNames).toEqual(KEY_EVENT_NAMES);
  });

  it("restricts outcomes to observed user choices", () => {
    expect(KEY_EVENT_NAMES).toEqual(["outbound_click", "contact_click"]);
    expect(EVENT_SEMANTICS.tracking_entry.isAcquisitionSignal).toBe(true);
    expect(EVENT_SEMANTICS.tracking_entry.isKeyEvent).toBe(false);
    expect(EVENT_SEMANTICS.contact_view.isKeyEvent).toBe(false);
    expect(EVENT_SEMANTICS.hub_resumed.category).toBe("lifecycle");
    expect(EVENT_SEMANTICS.hub_resumed.isKeyEvent).toBe(false);
    expect(EVENT_SEMANTICS.hub_resumed.modes).toEqual(["consented"]);
    expect(KEY_EVENT_NAMES.every((name) => EVENT_SEMANTICS[name].eligibleAsAttributionOutcome)).toBe(true);
  });

  it("validates a bounded mode split without a conversion denominator", () => {
    const report = {
      scope: "business", fromDate: "2032-01-10", toDateExclusive: "2032-01-11",
      outcomes: [
        { eventName: "outbound_click", cookielessEvents: 1, consentedEvents: 2, acceptedEvents: 3, consentedSessionsWithEvent: 1 },
        { eventName: "contact_click", cookielessEvents: 1, consentedEvents: 0, acceptedEvents: 1, consentedSessionsWithEvent: 0 },
      ],
    };
    expect(isOutcomeReport(report, "business", "2032-01-10", "2032-01-11")).toBe(true);
    expect(isOutcomeReport({ ...report, outcomes: [...report.outcomes].reverse() }, "business", "2032-01-10", "2032-01-11")).toBe(false);
    expect(isOutcomeReport({ ...report, outcomes: [{ ...report.outcomes[0], acceptedEvents: 4 }, report.outcomes[1]] }, "business", "2032-01-10", "2032-01-11")).toBe(false);
    expect(isOutcomeReport({ ...report, outcomes: [report.outcomes[0], { ...report.outcomes[1], eventName: "tracking_entry" }] }, "business", "2032-01-10", "2032-01-11")).toBe(false);
    expect(Object.values(OUTCOME_METRICS).every((metric) => !/conversion rate|współczynnik konwersji/i.test(metric.label))).toBe(true);
  });
});
