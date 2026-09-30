import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAdminFormState } from "@/lib/admin-form-state";

const mocks = vi.hoisted(() => ({ editor: vi.fn(), client: vi.fn(), rpc: vi.fn(), revalidate: vi.fn(), code: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireEditor: mocks.editor }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/tracking-code", () => ({ createTrackingCode: mocks.code }));

import { createCampaignAction } from "./campaigns/actions";
import { createTrackingLinkAction } from "./links/actions";
import { createDestinationAction } from "./destinations/actions";

function form(values: Record<string, string>) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }

beforeEach(() => {
  vi.clearAllMocks();
  mocks.editor.mockResolvedValue({ id: "actor", email: "owner@example.com" });
  mocks.client.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.code.mockReturnValue("tracking-code");
});

describe("Admin create Server Actions", () => {
  it("creates a campaign with normalized slug and optional dates, then returns success", async () => {
    const result = await createCampaignAction(initialAdminFormState, form({ name: "  Nowa Akcja  ", startsOn: " 2026-09-20 ", endsOn: "" }));
    expect(result.status).toBe("saved");
    expect(result.values).toEqual({});
    expect(result.fieldErrors).toEqual({});
    expect(mocks.rpc).toHaveBeenCalledWith("admin_campaign_create_v1", expect.objectContaining({ p_name: "Nowa Akcja", p_slug: "nowa-akcja", p_starts_on: "2026-09-20", p_ends_on: null }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/campaigns");
  });

  it("returns campaign field errors without mutation and retains submitted values", async () => {
    const result = await createCampaignAction(initialAdminFormState, form({ name: "", slug: "!!!", startsOn: "2026-02-30" }));
    expect(result.fieldErrors).toMatchObject({ name: expect.any(String), slug: expect.any(String), startsOn: expect.any(String) });
    expect(result.values).toMatchObject({ slug: "!!!", startsOn: "2026-02-30" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("attributes a campaign uniqueness failure to its slug", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    const result = await createCampaignAction(initialAdminFormState, form({ name: "Nowa" }));
    expect(result.fieldErrors.slug).toBeTruthy();
    expect(result.status).toBe("invalid");
  });

  it("creates a link with the existing defaults and routing rules", async () => {
    const result = await createTrackingLinkAction(initialAdminFormState, form({ label: "  Plakat  ", campaignId: "", channelGroup: "offline", source: "POSTER", medium: "QR", distributionUnit: " poster-007 ", landingPath: "/kontakt" }));
    expect(result.status).toBe("saved");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_tracking_link_create_v3", expect.objectContaining({ p_label: "Plakat", p_campaign_id: null, p_source: "poster", p_medium: "qr", p_distribution_unit: "poster-007", p_landing_path: "/kontakt", p_code: "tracking-code" }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/links");
  });

  it("returns link field errors before mutation", async () => {
    const result = await createTrackingLinkAction(initialAdminFormState, form({ label: "", campaignId: "not-a-uuid", channelGroup: "unknown" }));
    expect(result.fieldErrors).toMatchObject({ label: expect.any(String), campaignId: expect.any(String), channelGroup: expect.any(String) });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed distribution-unit labels before mutation", async () => {
    const result = await createTrackingLinkAction(initialAdminFormState, form({ label: "Plakat", distributionUnit: "first\nsecond" }));
    expect(result.fieldErrors.distributionUnit).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps a stale campaign association as a field error", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "23503", message: "foreign key" } });
    const result = await createTrackingLinkAction(initialAdminFormState, form({ label: "Plakat", campaignId: "00000000-0000-0000-0000-000000000001" }));
    expect(result.fieldErrors.campaignId).toBeTruthy();
  });

  it("retries a link code collision without changing submitted values", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } }).mockResolvedValueOnce({ error: null });
    mocks.code.mockReturnValueOnce("first-code").mockReturnValueOnce("second-code");
    const result = await createTrackingLinkAction(initialAdminFormState, form({ label: "Plakat" }));
    expect(result.status).toBe("saved");
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_tracking_link_create_v3", expect.objectContaining({ p_code: "second-code", p_label: "Plakat" }));
  });

  it("creates an official destination with its domain and order rules", async () => {
    const result = await createDestinationAction(initialAdminFormState, form({ label: "Instagram", url: "https://instagram.com/pozanuta", sortOrder: "" }));
    expect(result.status).toBe("saved");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_destination_upsert_v1", expect.objectContaining({ p_slug: "instagram", p_url: "https://instagram.com/pozanuta", p_sort_order: 10 }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/destinations");
  });

  it("attributes an invalid official destination to its fields", async () => {
    const result = await createDestinationAction(initialAdminFormState, form({ label: "", slug: "other", url: "http://other.example" }));
    expect(result.fieldErrors).toMatchObject({ label: expect.any(String), slug: expect.any(String), url: expect.any(String) });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps form-level constraint errors separate from unexpected RPC failures", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "23514", message: "constraint" } });
    const invalid = await createDestinationAction(initialAdminFormState, form({ label: "Instagram", url: "https://instagram.com/pozanuta" }));
    expect(invalid.formError).toBeTruthy();
    expect(invalid.fieldErrors).toEqual({});
    mocks.rpc.mockResolvedValue({ error: { code: "XX000", message: "unavailable" } });
    await expect(createDestinationAction(initialAdminFormState, form({ label: "Instagram", url: "https://instagram.com/pozanuta" }))).rejects.toThrow("unavailable");
  });

  it("checks edit permission before reading or mutating form data", async () => {
    mocks.editor.mockRejectedValue(new Error("forbidden"));
    await expect(createCampaignAction(initialAdminFormState, form({ name: "Nowa" }))).rejects.toThrow("forbidden");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not report success when the admin client is unavailable", async () => {
    mocks.client.mockReturnValue(null);
    await expect(createCampaignAction(initialAdminFormState, form({ name: "Nowa" }))).rejects.toThrow("Supabase is not configured");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
