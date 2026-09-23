export const HUB_RESUME_MIN_MS = 2_000;
export const HUB_RESUME_MAX_MS = 30 * 60_000;

export type HubOutboundState = {
  destination: string;
  at: number;
  hidden: boolean;
};

export function parseHubOutboundState(raw: string | null): HubOutboundState | null {
  try {
    const value = JSON.parse(raw || "null") as { destination?: unknown; at?: unknown; hidden?: unknown } | null;
    return value && typeof value.destination === "string" && typeof value.at === "number"
      ? { destination: value.destination.slice(0, 80), at: value.at, hidden: value.hidden === true }
      : null;
  } catch {
    return null;
  }
}

export function hubResumeProperties(
  state: HubOutboundState | null,
  now: number,
  visibility: DocumentVisibilityState,
  signal: string,
  bfcache: boolean,
) {
  if (
    visibility === "hidden" ||
    !state?.hidden ||
    now - state.at < HUB_RESUME_MIN_MS ||
    now - state.at > HUB_RESUME_MAX_MS
  ) return null;

  return {
    priorDestination: state.destination,
    resumeSignal: signal,
    elapsedBucket: now - state.at < 10_000 ? "2-10s" : now - state.at < 60_000 ? "10-60s" : "1-30m",
    bfcache,
  };
}
