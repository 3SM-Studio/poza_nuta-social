import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), getRecords: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/analytics/debug-view", () => ({
  DEBUG_LIMIT: 100,
  getDebugRecords: mocks.getRecords,
  parseDebugFilters: () => ({ minutes: 30, eventName: null, outcome: null, mode: null, surface: null }),
}));
vi.mock("@/components/admin/debug-refresh", () => ({ DebugRefresh: () => <span>Odśwież</span> }));

import DebugPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ role: "viewer" });
});

describe("Admin DebugView feedback", () => {
  it("renders a read error when the source is unavailable", async () => {
    mocks.getRecords.mockResolvedValue(null);
    const html = renderToStaticMarkup(await DebugPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Odczyt niedostępny");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('data-slot="empty"');
  });

  it("renders a legitimate empty result without an error or unusable inspector", async () => {
    mocks.getRecords.mockResolvedValue([]);
    const html = renderToStaticMarkup(await DebugPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('data-slot="empty"');
    expect(html).toContain("Brak zdarzeń dla tych filtrów");
    expect(html).not.toContain("Odczyt niedostępny");
    expect(html).not.toContain("Inspektor zdarzenia");
  });
});
