import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

test("participant and venue journeys each retain one independent Preview session", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!supabaseUrl?.startsWith("http://127.0.0.1:") || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase and desktop Chromium");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

  async function journey(run: (page: Page) => Promise<void>) {
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();
    const eventIds: string[] = [];
    let captureConsented = false;
    page.on("request", (request) => {
      if (!captureConsented || !request.url().endsWith("/api/track")) return;
      const payload = request.postDataJSON();
      if (typeof payload?.eventId === "string") eventIds.push(payload.eventId);
    });
    try {
      await page.goto("/");
      expect((await context.cookies()).some((cookie) => cookie.name === "pn_session")).toBe(false);
      await page.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
      await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_session")).toBe(true);
      captureConsented = true;
      await run(page);
      await expect.poll(() => eventIds.length).toBeGreaterThanOrEqual(3);
      let rows: Array<{ event_id: string; session_id: string; environment: string }> = [];
      await expect.poll(async () => {
        const result = await admin.from("analytics_events_v2").select("event_id,session_id,environment").in("event_id", eventIds);
        expect(result.error).toBeNull();
        rows = result.data || [];
        return rows.length;
      }).toBe(eventIds.length);
      expect(new Set(rows.map((row) => row.session_id)).size).toBe(1);
      expect(rows.every((row) => row.environment === "preview")).toBe(true);
      return rows[0].session_id;
    } finally {
      await context.close();
    }
  }

  const participant = await journey(async (page) => {
    await page.locator('[data-section-id="home.participation"]').scrollIntoViewIfNeeded();
    await page.locator('[data-cta-id="home.hero_karaoke"]').click();
    await expect(page).toHaveURL(/\/karaoke$/);
    await page.locator('[data-cta-id="karaoke.current_dates"]').click();
    await expect(page).toHaveURL(/\/linki$/);
    await page.reload();
  });
  const venue = await journey(async (page) => {
    await page.locator('[data-cta-id="home.case_venues"]').click();
    await expect(page).toHaveURL(/\/dla-lokali$/);
    await page.locator('[data-section-id="venues.case_study"]').scrollIntoViewIfNeeded();
    await page.locator('[data-cta-id="venues.closing_contact"]').click();
    await expect(page).toHaveURL(/\/kontakt$/);
    await page.reload();
  });
  expect(participant).not.toBe(venue);
});
