import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAcquisitionDetail, isAcquisitionOverview } from "./acquisition-contract";

const mocks = vi.hoisted(() => ({ client: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.client }));

import { getAcquisitionDetail, getAcquisitionOverview } from "./acquisition";

const campaignId = "c1000000-0000-4000-8000-000000000001";
const request = ["business", "2031-01-10", "2031-01-11"] as const;

const overview = {
  scope: "business", fromDate: "2031-01-10", toDateExclusive: "2031-01-11",
  totalEvents: 2, directEvents: 1, persistedEvents: 0, noCampaignEvents: 1,
  trackingEntries: 1, outboundClicks: 0, contactClicks: 0, contactViews: 0,
  campaignCount: 1, campaigns: [{ id: campaignId, name: "Kampania", status: "active", directEvents: 1,
    persistedEvents: 0, trackingEntries: 1, outboundClicks: 0, contactClicks: 0, contactViews: 0 }],
};

const detail = {
  scope: "business", fromDate: "2031-01-10", toDateExclusive: "2031-01-11",
  campaign: { id: campaignId, name: "Kampania", slug: "kampania", status: "active" },
  assets: [{ id: "a1000000-0000-4000-8000-000000000001", campaignId, label: "Plakat", slug: "plakat", active: true }],
  placements: [{ id: "b1000000-0000-4000-8000-000000000001", label: "Wejście", slug: "wejscie", type: "venue", active: true }],
  links: [{ id: "d1000000-0000-4000-8000-000000000001", label: "Link", code: "ABCDE", campaignId,
    assetId: "a1000000-0000-4000-8000-000000000001", placementId: "b1000000-0000-4000-8000-000000000001",
    distributionUnit: null, landingPath: "/", active: true }],
  destinations: [{ id: "e1000000-0000-4000-8000-000000000001", label: "Instagram", slug: "instagram", active: true }],
  metrics: [{ kind: "campaign", id: campaignId, association: "direct", eventName: "tracking_entry", count: 1 }],
};
const emptyOverview = { ...overview, totalEvents: 0, directEvents: 0, noCampaignEvents: 0,
  trackingEntries: 0, campaignCount: 0, campaigns: [] };
const emptyDetail = { ...detail, campaign: null, assets: [], placements: [], links: [], destinations: [], metrics: [] };

describe("Acquisition RPC response contracts", () => {
  it("accepts valid data and genuine empty reports", () => {
    expect(isAcquisitionOverview(overview, ...request)).toBe(true);
    expect(isAcquisitionOverview(emptyOverview, ...request)).toBe(true);
    expect(isAcquisitionOverview({ ...overview, campaigns: [{ ...overview.campaigns[0], name: null, status: null }] }, ...request)).toBe(true);
    expect(isAcquisitionDetail(detail, ...request, campaignId)).toBe(true);
    expect(isAcquisitionDetail(detail, ...request, campaignId.toUpperCase())).toBe(true);
    expect(isAcquisitionDetail({ ...detail, campaign: null }, ...request, campaignId)).toBe(true);
    expect(isAcquisitionDetail(emptyDetail, ...request, campaignId)).toBe(true);
  });

  it("rejects incomplete totals, malformed campaigns and the wrong request range", () => {
    expect(isAcquisitionOverview({ scope: "business", campaigns: [] }, ...request)).toBe(false);
    expect(isAcquisitionOverview({ ...overview, totalEvents: 0 }, ...request)).toBe(false);
    expect(isAcquisitionOverview({ ...overview, campaigns: [{ ...overview.campaigns[0], trackingEntries: "1" }] }, ...request)).toBe(false);
    expect(isAcquisitionOverview(overview, "business", "2031-01-09", "2031-01-11")).toBe(false);
  });

  it("rejects missing detail arrays, wrong campaign and malformed metric counts", () => {
    expect(isAcquisitionDetail({ ...detail, links: null }, ...request, campaignId)).toBe(false);
    expect(isAcquisitionDetail(detail, ...request, "c1000000-0000-4000-8000-000000000002")).toBe(false);
    expect(isAcquisitionDetail({ ...detail, metrics: [{ ...detail.metrics[0], count: -1 }] }, ...request, campaignId)).toBe(false);
    expect(isAcquisitionDetail({ ...detail, metrics: [{ ...detail.metrics[0], association: "none" }] }, ...request, campaignId)).toBe(false);
    expect(isAcquisitionDetail({ ...detail, metrics: [{ ...detail.metrics[0], id: "c1000000-0000-4000-8000-000000000002" }] }, ...request, campaignId)).toBe(false);
    expect(isAcquisitionDetail({ ...detail, links: [{ ...detail.links[0], active: "true" }] }, ...request, campaignId)).toBe(false);
    expect(isAcquisitionDetail({ ...detail, placements: [{ ...detail.placements[0], type: null }] }, ...request, campaignId)).toBe(false);
    expect(isAcquisitionDetail({ ...detail, campaign: { ...detail.campaign, status: "unknown" } }, ...request, campaignId)).toBe(false);
    expect(isAcquisitionDetail(detail, "diagnostic", "2031-01-10", "2031-01-11", campaignId)).toBe(false);
  });
});

describe("Acquisition server reads", () => {
  beforeEach(() => {
    mocks.client.mockReset().mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockReset();
  });

  it("returns validated overview and detail data", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: overview, error: null });
    await expect(getAcquisitionOverview("2031-01-10", "2031-01-11", "business")).resolves.toBe(overview);
    mocks.rpc.mockResolvedValueOnce({ data: detail, error: null });
    await expect(getAcquisitionDetail("2031-01-10", "2031-01-11", "business", detail.campaign.id)).resolves.toBe(detail);
  });

  it("returns genuine empty reports rather than unavailable", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: emptyOverview, error: null });
    await expect(getAcquisitionOverview("2031-01-10", "2031-01-11", "business")).resolves.toBe(emptyOverview);
    mocks.rpc.mockResolvedValueOnce({ data: emptyDetail, error: null });
    await expect(getAcquisitionDetail("2031-01-10", "2031-01-11", "business", campaignId)).resolves.toBe(emptyDetail);
  });

  it("accepts canonical UUIDs returned for an uppercase campaign URL", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: detail, error: null });
    await expect(getAcquisitionDetail("2031-01-10", "2031-01-11", "business", campaignId.toUpperCase())).resolves.toBe(detail);
  });

  it("treats malformed successful responses as unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: { scope: "business" }, error: null });
    await expect(getAcquisitionOverview("2031-01-10", "2031-01-11", "business")).resolves.toBeNull();
    mocks.rpc.mockResolvedValueOnce({ data: { ...detail, metrics: null }, error: null });
    await expect(getAcquisitionDetail("2031-01-10", "2031-01-11", "business", detail.campaign.id)).resolves.toBeNull();
    vi.restoreAllMocks();
  });

  it("treats a missing client or RPC error as unavailable", async () => {
    mocks.client.mockReturnValueOnce(null);
    await expect(getAcquisitionOverview("2031-01-10", "2031-01-11", "business")).resolves.toBeNull();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: overview, error: new Error("offline") });
    await expect(getAcquisitionOverview("2031-01-10", "2031-01-11", "business")).resolves.toBeNull();
    mocks.rpc.mockResolvedValueOnce({ data: detail, error: new Error("offline") });
    await expect(getAcquisitionDetail("2031-01-10", "2031-01-11", "business", detail.campaign.id)).resolves.toBeNull();
    vi.restoreAllMocks();
  });
});
