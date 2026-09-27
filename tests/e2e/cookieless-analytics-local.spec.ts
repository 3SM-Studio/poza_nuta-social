import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const local = Boolean(url?.startsWith("http://127.0.0.1:") && key);
const admin = local ? createClient(url!, key!, { auth: { persistSession: false } }) : null;

async function pageEvent(page: Page, path: string, eventName = "page_view") {
  const pending = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === eventName);
  await page.goto(path);
  const response = await pending;
  expect(response.status()).toBe(204);
  return response.request().postDataJSON().eventId as string;
}

async function stored(table: string, eventId: string) {
  const { data, error } = await admin!.from(table).select(table === "analytics_cookieless_events" ? "event_id,event_name,path,project_key,environment,traffic_class" : "event_id,event_name,path,environment,traffic_class").eq("event_id", eventId).maybeSingle();
  expect(error).toBeNull();
  return data;
}

test("unknown, rejected and pending page views stay cookieless; later consent never backfills", async ({ page, context }, testInfo) => {
  test.skip(!local || testInfo.project.name !== "desktop-chromium", "local Supabase desktop proof");
  const unknown = await pageEvent(page, "/");
  await expect.poll(() => stored("analytics_cookieless_events", unknown)).toMatchObject({ event_name: "page_view", path: "/", project_key: "poza_nuta", environment: "preview", traffic_class: "external" });
  expect(await stored("analytics_events_v2", unknown)).toBeNull();
  expect((await context.cookies()).some((cookie) => ["pn_visitor", "pn_session", "pn_acquisition"].includes(cookie.name))).toBe(false);

  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  const rejected = await pageEvent(page, "/linki");
  await expect.poll(() => stored("analytics_cookieless_events", rejected)).toMatchObject({ path: "/linki" });
  expect(await stored("analytics_events_v2", rejected)).toBeNull();

  await page.route("**/api/consent", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ status: 503, body: "{}" });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await page.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Włącz analitykę" }).click();
  const pending = await pageEvent(page, "/cookies");
  await expect.poll(() => stored("analytics_cookieless_events", pending)).toMatchObject({ path: "/cookies" });
  expect(await stored("analytics_events_v2", pending)).toBeNull();
  expect((await context.cookies()).some((cookie) => ["pn_visitor", "pn_session"].includes(cookie.name))).toBe(false);

  await page.unroute("**/api/consent");
  await page.reload();
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_visitor")).toBe(true);
  const consented = await pageEvent(page, "/prywatnosc");
  await expect.poll(() => stored("analytics_events_v2", consented)).toMatchObject({ path: "/prywatnosc", environment: "preview", traffic_class: "external" });
  expect(await stored("analytics_cookieless_events", consented)).toBeNull();
  expect(await stored("analytics_events_v2", unknown)).toBeNull();
  const consentedContact = await pageEvent(page, "/kontakt", "contact_view");
  await expect.poll(() => stored("analytics_events_v2", consentedContact)).toMatchObject({ event_name: "contact_view" });
  expect(await stored("analytics_cookieless_events", consentedContact)).toBeNull();

  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await page.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Tylko niezbędne" }).click();
  const withdrawn = await pageEvent(page, "/kontakt");
  await expect.poll(() => stored("analytics_cookieless_events", withdrawn)).toMatchObject({ path: "/kontakt" });
  expect(await stored("analytics_events_v2", withdrawn)).toBeNull();
  expect(unknown).not.toBe(rejected);
  expect(rejected).not.toBe(pending);
});

test("contact events and public payload boundary", async ({ page, context }, testInfo) => {
  test.skip(!local || testInfo.project.name !== "desktop-chromium", "local Supabase desktop proof");
  const contactView = await pageEvent(page, "/kontakt", "contact_view");
  await expect.poll(() => stored("analytics_cookieless_events", contactView)).toMatchObject({ event_name: "contact_view", path: "/kontakt" });
  const { count: before } = await admin!.from("analytics_cookieless_events").select("event_id", { count: "exact", head: true }).eq("event_name", "contact_click");
  await page.getByRole("link", { name: /kontakt@pozanuta.test/ }).click();
  await expect.poll(async () => {
    const { count } = await admin!.from("analytics_cookieless_events").select("event_id", { count: "exact", head: true }).eq("event_name", "contact_click");
    return count || 0;
  }).toBeGreaterThan(before || 0);

  for (const extra of [{ projectKey: "another_project" }, { project_key: "another_project" }, { visitorId: crypto.randomUUID() }, { sessionId: crypto.randomUUID() }, { acquisitionId: crypto.randomUUID() }, { properties: { arbitrary: "value" } }]) {
    const response = await context.request.post("/api/track", { data: { eventId: crypto.randomUUID(), eventName: "page_view", path: "/", ...extra } });
    expect(response.status()).toBe(400);
  }
  const forgedUtmId = crypto.randomUUID();
  const forgedUtm = await context.request.post("/api/track", { data: { eventId: forgedUtmId, eventName: "page_view", path: "/", utmSource: "spoofed" } });
  expect(forgedUtm.status()).toBe(204);
  await expect.poll(async () => {
    const { data } = await admin!.from("analytics_cookieless_events").select("utm_source").eq("event_id", forgedUtmId).maybeSingle();
    return data?.utm_source;
  }).toBeNull();
});

test("cookieless UTM belongs only to the current page entry", async ({ page }, testInfo) => {
  test.skip(!local || testInfo.project.name !== "desktop-chromium", "local Supabase desktop proof");
  const firstId = await pageEvent(page, "/?utm_source=instagram&utm_medium=social&utm_campaign=opening");
  await expect.poll(async () => {
    const { data } = await admin!.from("analytics_cookieless_events").select("utm_source,utm_medium,utm_campaign").eq("event_id", firstId).maybeSingle();
    return data;
  }).toMatchObject({ utm_source: "instagram", utm_medium: "social", utm_campaign: "opening" });

  const next = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view" && response.request().postDataJSON()?.path === "/linki");
  await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("link", { name: "Linki" }).click();
  const nextId = (await next).request().postDataJSON().eventId as string;
  await expect.poll(async () => {
    const { data } = await admin!.from("analytics_cookieless_events").select("utm_source,utm_medium,utm_campaign,referrer_host").eq("event_id", nextId).maybeSingle();
    return data;
  }).toMatchObject({ utm_source: null, utm_medium: null, utm_campaign: null, referrer_host: null });
});

test("one Analytics owner sends one initial and one navigated page view", async ({ page }) => {
  const entries: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/track") && request.postDataJSON()?.eventName === "page_view") entries.push(request.postDataJSON());
  });
  const initial = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view" && response.request().postDataJSON()?.path === "/");
  await page.goto("/?utm_source=instagram", { referer: "https://instagram.com/" });
  await initial;
  const mobileMenu = page.getByRole("button", { name: "Otwórz menu" });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  const next = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view" && response.request().postDataJSON()?.path === "/linki");
  await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("link", { name: "Linki" }).click();
  await next;
  expect(entries).toHaveLength(2);
  expect(entries[0]).toMatchObject({ path: "/", utmSource: "instagram", referrer: "https://instagram.com/" });
  expect(entries[1]).toMatchObject({ path: "/linki", utmSource: null, referrer: null });
  expect(entries[0].eventId).not.toBe(entries[1].eventId);
});

test("redirect events persist cookieless and invalid links still redirect", async ({ context }, testInfo) => {
  test.skip(!local || testInfo.project.name !== "desktop-chromium", "local Supabase desktop proof");
  const code = "ZYWVC";
  const { data: link, error } = await admin!.from("tracking_links").upsert({ code, label: "Cookieless local proof", source: "poster", medium: "qr", channel_group: "offline", landing_path: "/", active: true }, { onConflict: "code" }).select("id").single();
  expect(error).toBeNull();
  const r = await context.request.get(`/r/${code}`, { maxRedirects: 0 });
  expect(r.status()).toBe(302);
  expect(r.headers().location).toContain("/");
  await expect.poll(async () => {
    const { data } = await admin!.from("analytics_cookieless_events").select("event_name").eq("tracking_link_id", link!.id).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    return data?.event_name;
  }).toBe("tracking_entry");

  const go = await context.request.get("/go/instagram", { maxRedirects: 0 });
  expect(go.status()).toBe(302);
  expect(go.headers().location).toContain("instagram.com");
  const { data: destination } = await admin!.from("destinations").select("id").eq("slug", "instagram").single();
  await expect.poll(async () => {
    const { data } = await admin!.from("analytics_cookieless_events").select("event_name").eq("destination_id", destination!.id).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    return data?.event_name;
  }).toBe("outbound_click");

  const fallback = await context.request.get("/r/UNKNOWN", { maxRedirects: 0 });
  expect(fallback.status()).toBe(302);
});

test("privacy and cookies copy explains both modes", async ({ page }) => {
  await page.goto("/prywatnosc");
  await expect(page.getByText(/Bez potwierdzonej zgody serwera zapisujemy ograniczone zdarzenia/)).toBeVisible();
  await expect(page.getByText(/Wcześniejszych zdarzeń bez zgody nie przypisujemy później/)).toBeVisible();
  await page.goto("/cookies");
  await expect(page.getByText(/Nadal możemy zapisać ograniczone zdarzenia bez cookies analitycznych/)).toBeVisible();
});

test("analytics API failure does not interrupt the public page or contact action", async ({ page }) => {
  await page.route("**/api/track", (route) => route.abort());
  await page.goto("/kontakt");
  await expect(page.getByRole("heading", { name: "Napisz do nas." })).toBeVisible();
  await expect(page.getByRole("link", { name: /kontakt@pozanuta.test/ })).toBeVisible();
  await page.getByRole("link", { name: /kontakt@pozanuta.test/ }).click();
  await expect(page.getByRole("heading", { name: "Napisz do nas." })).toBeVisible();
});
