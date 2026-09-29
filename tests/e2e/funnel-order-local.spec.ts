import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

type StoredEvent = {
  session_id: string;
  session_sequence: number;
  event_name: string;
  path: string;
  metadata: { ctaId?: string } | null;
  environment: string;
};

test("navigation-bound CTA persists before destination view in repeated funnels", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(!supabaseUrl?.startsWith("http://127.0.0.1:") || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase and desktop Chromium");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });
  const from = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 172_800_000).toISOString().slice(0, 10);

  async function finalStage(journey: "participant" | "venue") {
    const { data, error } = await admin.rpc("analytics_marketing_journey_v3", {
      p_journey: journey, p_from_date: from, p_to_date_exclusive: to, p_scope: "diagnostic",
    });
    expect(error).toBeNull();
    const steps = (data as { steps: Array<{ sessions: number }> }).steps;
    return steps.at(-1)?.sessions ?? 0;
  }

  async function runJourney(kind: "participant" | "venue", hostileNetwork: boolean) {
    const context = await browser.newContext();
    const page: Page = await context.newPage();
    const eventIds: string[] = [];
    let collect = false;
    page.on("request", (request) => {
      if (!collect || !request.url().endsWith("/api/track")) return;
      const body = request.postDataJSON();
      if (typeof body?.eventId === "string") eventIds.push(body.eventId);
    });
    if (hostileNetwork) {
      await page.route("**/api/track", async (route) => {
        const body = route.request().postDataJSON();
        if (body?.eventName === "cta_click" && body?.properties?.ctaId === "venues.closing_contact") {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        await route.continue();
      });
    }
    try {
      await page.goto("/");
      await page.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
      await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_session")).toBe(true);
      collect = true;

      if (kind === "venue") {
        await page.locator('[data-cta-id="home.case_venues"]').click();
        await expect(page).toHaveURL(/\/dla-lokali$/);
        const proof = page.waitForRequest((request) => request.url().endsWith("/api/track")
          && request.postDataJSON()?.eventName === "section_view"
          && request.postDataJSON()?.properties?.sectionId === "venues.case_study");
        await page.locator('[data-section-id="venues.case_study"]').scrollIntoViewIfNeeded();
        await proof;
        await page.locator('[data-cta-id="venues.closing_contact"]').click();
        await expect(page).toHaveURL(/\/kontakt$/);
        await page.locator(".ed-contact-link").click();
      } else {
        await page.locator('[data-cta-id="home.hero_karaoke"]').click();
        await expect(page).toHaveURL(/\/karaoke$/);
        await page.locator('[data-cta-id="karaoke.current_dates"]').click();
        await expect(page).toHaveURL(/\/linki$/);
      }

      const expected = kind === "venue" ? 5 : 4;
      let rows: StoredEvent[] = [];
      await expect.poll(async () => {
        if (eventIds.length < expected) return false;
        const { data, error } = await admin.from("analytics_events_v2")
          .select("session_id,session_sequence,event_name,path,metadata,environment")
          .in("event_id", eventIds);
        expect(error).toBeNull();
        rows = (data || []) as StoredEvent[];
        const ordered = rows.slice().sort((a, b) => a.session_sequence - b.session_sequence);
        const stages = kind === "venue"
          ? [
              ["cta_click", "/", "home.case_venues"],
              ["page_view", "/dla-lokali"],
              ["cta_click", "/dla-lokali", "venues.closing_contact"],
              ["contact_view", "/kontakt"],
              ["contact_click", "/kontakt"],
            ]
          : [
              ["cta_click", "/", "home.hero_karaoke"],
              ["page_view", "/karaoke"],
              ["cta_click", "/karaoke", "karaoke.current_dates"],
              ["page_view", "/linki"],
            ];
        return stages.every(([name, path, ctaId]) => ordered.some((row) => row.event_name === name && row.path === path && (!ctaId || row.metadata?.ctaId === ctaId)));
      }, { timeout: 25_000 }).toBe(true);

      expect(new Set(rows.map((row) => row.session_id)).size).toBe(1);
      expect(rows.every((row) => row.environment === "preview")).toBe(true);
      const sequence = (name: string, path: string, ctaId?: string) => rows.find((row) => row.event_name === name && row.path === path && (!ctaId || row.metadata?.ctaId === ctaId))!.session_sequence;
      if (kind === "venue") {
        expect(sequence("cta_click", "/", "home.case_venues")).toBeLessThan(sequence("page_view", "/dla-lokali"));
        expect(sequence("cta_click", "/dla-lokali", "venues.closing_contact")).toBeLessThan(sequence("contact_view", "/kontakt"));
        expect(sequence("contact_view", "/kontakt")).toBeLessThan(sequence("contact_click", "/kontakt"));
        expect(rows.filter((row) => row.event_name === "cta_click" && row.metadata?.ctaId === "venues.closing_contact")).toHaveLength(1);
      } else {
        expect(sequence("cta_click", "/", "home.hero_karaoke")).toBeLessThan(sequence("page_view", "/karaoke"));
        expect(sequence("cta_click", "/karaoke", "karaoke.current_dates")).toBeLessThan(sequence("page_view", "/linki"));
      }
      return rows[0].session_id;
    } finally {
      await context.close();
    }
  }

  const beforeVenue = await finalStage("venue");
  const beforeParticipant = await finalStage("participant");
  const sessions = [
    await runJourney("venue", true),
    await runJourney("venue", true),
    await runJourney("venue", true),
    await runJourney("participant", false),
  ];
  expect(new Set(sessions).size).toBe(4);
  await expect.poll(() => finalStage("venue"), { timeout: 20_000 }).toBeGreaterThanOrEqual(beforeVenue + 3);
  await expect.poll(() => finalStage("participant"), { timeout: 20_000 }).toBeGreaterThanOrEqual(beforeParticipant + 1);
});
