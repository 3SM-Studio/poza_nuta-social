import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const status = execSync("npx supabase status -o env", { encoding: "utf8" });
const env = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="([^"]*)"$/gm)].map((match) => [match[1], match[2]]));
const secretKey = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
if (!env.API_URL || !secretKey) throw new Error("Local Supabase is not running");

const db = createClient(env.API_URL, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const direct = { channelGroup: "direct", source: "direct", medium: null };
const poster = { channelGroup: "offline", source: "poster", medium: "qr", campaign: "concurrency" };
const chatgpt = { channelGroup: "ai_referral", source: "chatgpt", medium: "referral" };
const sessions = new Map();
const eventIds = new Set();

function input({ eventId = randomUUID(), sessionId, visitorId = null, attributed = direct, eventName = "page_view", destination = null }) {
  eventIds.add(eventId);
  sessions.set(sessionId, (sessions.get(sessionId) || 0) + (eventIds.has(eventId) ? 1 : 0));
  return {
    p_event_id: eventId, p_event_name: eventName, p_session_id: sessionId, p_visitor_id: visitorId,
    p_environment: "production", p_traffic_class: "test", p_analytics_consent: Boolean(visitorId), p_marketing_consent: false,
    p_path: "/", p_observed_context: attributed, p_attributed_context: attributed,
    p_dimension_snapshots: {}, p_tracking_link_id: null, p_destination_id: null, p_destination_slug: destination,
    p_device_type: "desktop", p_browser_family: "chrome", p_os_family: "windows", p_metadata: { suite: "concurrency" },
  };
}

async function invoke(payload) {
  const { data, error } = await db.rpc("analytics_ingest_event_v1", payload);
  if (error) throw new Error(error.message);
  return data;
}

const sessionA = randomUUID();
await Promise.all([invoke(input({ sessionId: sessionA, attributed: poster })), invoke(input({ sessionId: sessionA, attributed: chatgpt }))]);

const sessionB = randomUUID();
const duplicateId = randomUUID();
const duplicateResults = await Promise.all(Array.from({ length: 8 }, () => invoke(input({ eventId: duplicateId, sessionId: sessionB }))));

const sessionC = randomUUID();
await Promise.all(Array.from({ length: 20 }, (_, index) => invoke(input({ sessionId: sessionC, eventName: index % 2 ? "outbound_click" : "page_view", destination: index % 2 ? `destination-${index % 3}` : null }))));

const sessionD = randomUUID();
await Promise.all([invoke(input({ sessionId: sessionD })), invoke(input({ sessionId: sessionD, eventName: "hub_resumed" }))]);

const sessionE = randomUUID();
await Promise.all([invoke(input({ sessionId: sessionE, attributed: poster })), invoke(input({ sessionId: sessionE, attributed: poster }))]);

const visitorF = randomUUID();
const sessionF1 = randomUUID();
const sessionF2 = randomUUID();
await invoke(input({ sessionId: sessionF1, visitorId: visitorF, attributed: poster }));
await Promise.all([
  invoke(input({ sessionId: sessionF2, visitorId: visitorF, attributed: poster })),
  invoke(input({ sessionId: sessionF1, visitorId: visitorF, attributed: chatgpt })),
  invoke(input({ sessionId: sessionF2, visitorId: visitorF, attributed: chatgpt })),
]);

const visitorG = randomUUID();
const expiredSession = randomUUID();
const renewedSession = randomUUID();
await Promise.all([
  invoke(input({ sessionId: expiredSession, visitorId: visitorG, attributed: poster })),
  invoke(input({ sessionId: renewedSession, visitorId: visitorG, attributed: poster })),
]);

const sessionIds = [sessionA, sessionB, sessionC, sessionD, sessionE, sessionF1, sessionF2, expiredSession, renewedSession];
const { data: events, error: eventsError } = await db.from("analytics_events_v2")
  .select("event_id,session_id,session_sequence,attributed_context").in("session_id", sessionIds).order("session_sequence");
if (eventsError) throw new Error(eventsError.message);
const { data: sessionRows, error: sessionsError } = await db.from("analytics_sessions_v2")
  .select("session_id,next_sequence,session_acquisition,current_attribution,visitor_id,started_at,last_seen_at,expires_at").in("session_id", sessionIds);
if (sessionsError) throw new Error(sessionsError.message);
const { data: visitorRows, error: visitorsError } = await db.from("analytics_visitors")
  .select("visitor_id,first_acquisition,first_seen_at,last_seen_at").in("visitor_id", [visitorF, visitorG]);
if (visitorsError) throw new Error(visitorsError.message);

const expected = new Map([
  [sessionA, 2], [sessionB, 1], [sessionC, 20], [sessionD, 2], [sessionE, 2],
  [sessionF1, 2], [sessionF2, 2], [expiredSession, 1], [renewedSession, 1],
]);
for (const [sessionId, count] of expected) {
  const rows = events.filter((event) => event.session_id === sessionId);
  const sequences = rows.map((event) => event.session_sequence).sort((a, b) => a - b);
  assert(rows.length === count, `session ${sessionId} expected ${count} events, got ${rows.length}`);
  assert(sequences.every((value, index) => value === index + 1), `session ${sessionId} has invalid sequence ${sequences}`);
  const storedSession = sessionRows.find((row) => row.session_id === sessionId);
  assert(storedSession?.next_sequence === count, `session ${sessionId} next_sequence mismatch`);
  const latest = rows.find((row) => row.session_sequence === count);
  assert(JSON.stringify(storedSession?.current_attribution) === JSON.stringify(latest?.attributed_context), `session ${sessionId} current attribution mismatch`);
}
assert(events.length === 33, `expected 33 unique events, got ${events.length}`);
assert(new Set(events.map((event) => event.event_id)).size === 33, "duplicate event IDs were stored");
assert(duplicateResults.filter((result) => result.duplicate === true).length === 7, "same-ID calls were not idempotent");
assert(visitorRows.length === 2, `expected two visitor rows, got ${visitorRows.length}`);
assert(visitorRows.every((row) => row.first_acquisition?.source === "poster"), "visitor first acquisition was overwritten");
assert(visitorRows.every((row) => Date.parse(row.last_seen_at) >= Date.parse(row.first_seen_at)), "visitor timestamps moved backwards");
assert(sessionRows.length === 9, `expected nine sessions, got ${sessionRows.length}`);
assert(sessionRows.every((row) => Date.parse(row.last_seen_at) >= Date.parse(row.started_at)), "session timestamps moved backwards");
assert(sessionRows.every((row) => Date.parse(row.expires_at) >= Date.parse(row.last_seen_at)), "session expiry precedes last seen");
assert(sessionRows.filter((row) => row.visitor_id === visitorF).length === 2, "consented visitor did not link exactly two sessions");

console.log(JSON.stringify({
  cases: ["simultaneous-different", "same-id", "rapid-20", "shared-session-tabs", "simultaneous-create", "consented-visitor", "expiry-boundary"],
  uniqueEvents: events.length,
  sessions: sessionRows.length,
  visitors: visitorRows.length,
  duplicateCallsAcknowledged: duplicateResults.filter((result) => result.duplicate === true).length,
  maxRapidSequence: Math.max(...events.filter((event) => event.session_id === sessionC).map((event) => event.session_sequence)),
  foreignKeysIntact: events.every((event) => sessionRows.some((session) => session.session_id === event.session_id)),
  visitorFirstSources: visitorRows.map((row) => row.first_acquisition?.source),
}, null, 2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
