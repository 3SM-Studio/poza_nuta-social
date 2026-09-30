import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.client }));

import { getDashboardActivation } from "./dashboard-activation";

const participant = { journey: "participant", scope: "business", eligibleSessions: 1, routeViewSessions: 1,
  steps: ["karaoke_cta", "karaoke_view", "current_info_cta", "channels_view"].map((key) => ({ key, sessions: 1 })),
  proofExposures: 0, venueProofExposures: 0 };
const venue = { journey: "venue", scope: "business", eligibleSessions: 1, routeViewSessions: 0,
  steps: ["venue_cta", "venue_view", "contact_cta", "contact_view", "contact_click"].map((key) => ({ key, sessions: 0 })),
  proofExposures: 0, venueProofExposures: 0 };
const acquisition = { scope: "business", consentedSessions: 1, trackingEntryEvents: 1,
  channels: [{ key: "ai_referral", sessions: 1 }], distributionUnits: [{ label: "Plakat · ABC12", entries: 1 }], referralParticipants: [] };

describe("Admin marketing activation read", () => {
  beforeEach(() => { mocks.client.mockReset().mockReturnValue({ rpc: mocks.rpc }); mocks.rpc.mockReset(); });

  it("reads both ordered consented journeys and aggregate acquisition independently", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: participant, error: null })
      .mockResolvedValueOnce({ data: venue, error: null })
      .mockResolvedValueOnce({ data: acquisition, error: null });
    await expect(getDashboardActivation("2026-09-01", "2026-10-01")).resolves.toEqual({ participant, venue, acquisition });
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "analytics_marketing_journey_v3", expect.objectContaining({ p_journey: "participant", p_scope: "business" }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "analytics_marketing_journey_v3", expect.objectContaining({ p_journey: "venue", p_scope: "business" }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(3, "analytics_dashboard_activation_v1", expect.objectContaining({ p_project_key: "poza_nuta" }));
  });

  it("keeps a genuine all-zero report distinct from read failure", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ...participant, eligibleSessions: 0, routeViewSessions: 0, steps: participant.steps.map((step) => ({ ...step, sessions: 0 })) }, error: null })
      .mockResolvedValueOnce({ data: venue, error: null })
      .mockResolvedValueOnce({ data: { ...acquisition, consentedSessions: 0, trackingEntryEvents: 0, channels: [], distributionUnits: [] }, error: null });
    await expect(getDashboardActivation("2026-09-01", "2026-10-01")).resolves.toMatchObject({ acquisition: { consentedSessions: 0 } });
  });

  it("rejects malformed or unavailable data rather than showing zero", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: participant, error: null })
      .mockResolvedValueOnce({ data: { ...venue, steps: venue.steps.slice(1) }, error: null })
      .mockResolvedValueOnce({ data: acquisition, error: null });
    await expect(getDashboardActivation("2026-09-01", "2026-10-01")).resolves.toBeNull();
    vi.restoreAllMocks();
  });
});
