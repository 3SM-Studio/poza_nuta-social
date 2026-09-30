import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), client: vi.fn(), rows: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireAdminAccess: mocks.access, canMutateAdmin: () => false }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.client }));
vi.mock("@/components/admin/campaign-form", () => ({ CampaignForm: () => null }));
vi.mock("./actions", () => ({ archiveCampaignAction: vi.fn() }));

import CampaignsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ role: "viewer" });
  mocks.client.mockReturnValue({ from: () => ({ select: () => ({ order: mocks.rows }) }) });
});

describe("Admin campaigns empty list", () => {
  it("keeps a successful zero-row catalog as a simple local message", async () => {
    mocks.rows.mockResolvedValue({ data: [], error: null });
    const html = renderToStaticMarkup(await CampaignsPage());
    expect(html).toContain("Nie ma jeszcze kampanii.");
    expect(html).not.toContain('data-slot="empty"');
    expect(html).not.toContain("Odczyt kampanii niedostępny");
  });

  it("does not present a failed read as an empty catalog", async () => {
    mocks.rows.mockResolvedValue({ data: [], error: new Error("read failed") });
    const html = renderToStaticMarkup(await CampaignsPage());
    expect(html).toContain("Odczyt kampanii niedostępny");
    expect(html).not.toContain("Nie ma jeszcze kampanii.");
  });
});
