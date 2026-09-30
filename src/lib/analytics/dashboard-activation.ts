import "server-only";

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { createAdminClient } from "@/lib/supabase/admin";

export type JourneyKey = "participant" | "venue";
export type JourneySnapshot = {
  journey: JourneyKey;
  scope: "business";
  eligibleSessions: number;
  routeViewSessions: number;
  steps: Array<{ key: string; sessions: number }>;
  proofExposures: number;
  venueProofExposures: number;
};
export type AcquisitionSnapshot = {
  scope: "business";
  consentedSessions: number;
  trackingEntryEvents: number;
  channels: Array<{ key: string; sessions: number }>;
  distributionUnits: Array<{ label: string; entries: number }>;
  referralParticipants: Array<{ label: string; entries: number }>;
};
export type DashboardActivation = {
  participant: JourneySnapshot;
  venue: JourneySnapshot;
  acquisition: AcquisitionSnapshot;
};

const STEP_KEYS: Record<JourneyKey, string[]> = {
  participant: ["karaoke_cta", "karaoke_view", "current_info_cta", "channels_view"],
  venue: ["venue_cta", "venue_view", "contact_cta", "contact_view", "contact_click"],
};
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function isJourneySnapshot(value: unknown, journey: JourneyKey): value is JourneySnapshot {
  if (!object(value) || value.journey !== journey || value.scope !== "business"
    || !count(value.eligibleSessions) || !count(value.routeViewSessions)
    || !count(value.proofExposures) || !count(value.venueProofExposures)
    || !Array.isArray(value.steps) || value.steps.length !== STEP_KEYS[journey].length) return false;
  return value.steps.every((step, index) => object(step)
    && step.key === STEP_KEYS[journey][index] && count(step.sessions));
}

export function isAcquisitionSnapshot(value: unknown): value is AcquisitionSnapshot {
  if (!object(value) || value.scope !== "business" || !count(value.consentedSessions)
    || !count(value.trackingEntryEvents) || !Array.isArray(value.channels)
    || !Array.isArray(value.distributionUnits) || !Array.isArray(value.referralParticipants)) return false;
  return value.channels.every((row) => object(row) && typeof row.key === "string" && count(row.sessions))
    && [value.distributionUnits, value.referralParticipants].every((rows) => rows.every((row) =>
      object(row) && typeof row.label === "string" && count(row.entries)));
}

export async function getDashboardActivation(fromDate: string, toDateExclusive: string): Promise<DashboardActivation | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const [participant, venue, acquisition] = await Promise.all([
    admin.rpc("analytics_marketing_journey_v3", { p_journey: "participant", p_from_date: fromDate, p_to_date_exclusive: toDateExclusive, p_scope: "business" }),
    admin.rpc("analytics_marketing_journey_v3", { p_journey: "venue", p_from_date: fromDate, p_to_date_exclusive: toDateExclusive, p_scope: "business" }),
    admin.rpc("analytics_dashboard_activation_v1", { p_project_key: ANALYTICS_PROJECT_KEY, p_from_date: fromDate, p_to_date_exclusive: toDateExclusive }),
  ]);
  if (participant.error || venue.error || acquisition.error
    || !isJourneySnapshot(participant.data, "participant")
    || !isJourneySnapshot(venue.data, "venue")
    || !isAcquisitionSnapshot(acquisition.data)) {
    console.error("analytics dashboard activation read failed", { reason: "report_unavailable" });
    return null;
  }
  return { participant: participant.data, venue: venue.data, acquisition: acquisition.data };
}
