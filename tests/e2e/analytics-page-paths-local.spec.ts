import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const routes = ["/", "/karaoke-trojmiasto", "/dla-lokali", "/kontakt", "/linki", "/prywatnosc", "/cookies"] as const;

test("consented public page views retain their path after API validation and database persistence", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!supabaseUrl?.startsWith("http://127.0.0.1:") || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the local Supabase stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const consent = await page.context().request.post("/api/consent", { data: { analytics: true } });
  expect(consent.ok()).toBe(true);

  for (const path of routes) {
    const tracked = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view" && response.request().postDataJSON()?.path === path);
    await page.goto(path);
    const response = await tracked;
    expect(response.status(), path).toBe(204);
    const eventId = response.request().postDataJSON().eventId as string;
    await expect.poll(async () => {
      const { data, error } = await admin.from("analytics_events_v2").select("path").eq("event_id", eventId).maybeSingle();
      expect(error).toBeNull();
      return data?.path;
    }, { message: `persisted page path for ${path}` }).toBe(path);
  }

  const invalidId = crypto.randomUUID();
  const invalid = await page.context().request.post("/api/track", { data: { eventName: "page_view", eventId: invalidId, path: "/admin" } });
  expect(invalid.status()).toBe(204);
  await expect.poll(async () => {
    const { data, error } = await admin.from("analytics_events_v2").select("path").eq("event_id", invalidId).maybeSingle();
    expect(error).toBeNull();
    return data?.path;
  }).toBe("/");

  const contactId = crypto.randomUUID();
  const invalidContact = await page.context().request.post("/api/track", { data: { eventName: "contact_view", eventId: contactId, path: "/admin" } });
  expect(invalidContact.status()).toBe(400);
  const { data: rejected } = await admin.from("analytics_events_v2").select("path").eq("event_id", contactId).maybeSingle();
  expect(rejected).toBeNull();
});
