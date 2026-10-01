import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { confirmAnalyticsConsent } from "./helpers/confirmed-analytics-consent";

const bannerName = "Wybór analityki";
const pendingText = /Zgoda zapisana w tej przeglądarce/;

async function outage(page: Page, delay = 0) {
  await page.route("**/api/consent", async (route) => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" }).catch(() => {});
  });
}

test("GET and POST outage: reject is immediate and persists across navigation", async ({ page, context }) => {
  await outage(page);
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: bannerName })).toBeVisible();
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  await expect(page.getByRole("complementary", { name: bannerName })).toBeHidden();
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_consent_preference")?.value).toBe("2.deny");
  await page.goto("/kontakt");
  await expect(page.getByRole("complementary", { name: bannerName })).toBeHidden();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor")).toBe(false);
});

test("GET and evidence outage: accept stays pending without visitor identity", async ({ page, context }) => {
  const events: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/track")) events.push(request.url()); });
  await outage(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
  await expect(page.getByRole("complementary", { name: bannerName })).toBeHidden();
  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await expect(page.getByText(pendingText)).toBeVisible();
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_consent_preference")?.value).toMatch(/^2\.pending-accept\.[0-9a-f-]{36}$/);
  await page.goto("/kontakt");
  await expect.poll(() => events.length).toBeGreaterThan(0);
  expect((await context.cookies()).some((cookie) => ["pn_visitor", "pn_session"].includes(cookie.name))).toBe(false);
});

test("slow consent endpoint cannot hold reject or accept UI", async ({ page, context }) => {
  await outage(page, 6_000);
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: bannerName })).toBeVisible();
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  await expect(page.getByRole("complementary", { name: bannerName })).toBeHidden();
  await page.waitForTimeout(3_800);
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_consent_preference")?.value).toBe("2.deny");
  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await page.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Włącz analitykę" }).click();
  await expect(page.getByRole("dialog", { name: "Ustawienia prywatności" })).toBeHidden();
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_consent_preference")?.value).toMatch(/^2\.pending-accept\.[0-9a-f-]{36}$/);
  await page.waitForTimeout(3_800);
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_consent_preference")?.value).toMatch(/^2\.pending-accept\.[0-9a-f-]{36}$/);
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor")).toBe(false);
});

test("withdrawal timeout leaves old identifiers inert until proxy cleanup", async ({ page, context }) => {
  await page.goto("/");
  await confirmAnalyticsConsent(page, page.getByRole("button", { name: "Zgadzam się na analitykę" }));
  await outage(page, 6_000);
  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await page.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Tylko niezbędne" }).click();
  await expect(page.getByRole("dialog", { name: "Ustawienia prywatności" })).toBeHidden();
  const inert = await context.request.post("/api/track", { data: { eventName: "page_view", eventId: crypto.randomUUID(), path: "/" } });
  expect(inert.status()).toBe(204);
  await page.waitForTimeout(3_800);
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_consent_preference")?.value).toBe("2.deny");
  await page.goto("/kontakt");
  await expect.poll(async () => (await context.cookies()).some((cookie) => ["pn_visitor", "pn_session", "pn_acquisition"].includes(cookie.name))).toBe(false);
});

test("withdrawal during outage disables both tabs and cleans HttpOnly cookies on navigation", async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto("/");
  await confirmAnalyticsConsent(first, first.getByRole("button", { name: "Zgadzam się na analitykę" }));
  await second.goto("/linki");
  await second.evaluate(() => sessionStorage.setItem("pn_hub_outbound_v1", "temporary-test-state"));
  await outage(first);
  await first.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await first.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Tylko niezbędne" }).click();
  await expect.poll(() => second.evaluate(() => sessionStorage.getItem("pn_hub_outbound_v1"))).toBeNull();
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_consent_preference")?.value).toBe("2.deny");
  const inert = await context.request.post("/api/track", { data: { eventName: "page_view", eventId: crypto.randomUUID(), path: "/" } });
  expect(inert.status()).toBe(204);
  await first.goto("/kontakt");
  await expect.poll(async () => (await context.cookies()).some((cookie) => ["pn_visitor", "pn_session", "pn_acquisition"].includes(cookie.name))).toBe(false);
  await context.close();
});

test("pending accept synchronizes after recovery before full analytics starts", async ({ page, context }) => {
  const events: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/track")) events.push(request.postDataJSON()?.eventName); });
  await outage(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
  await expect(page.getByRole("complementary", { name: bannerName })).toBeHidden();
  await expect.poll(() => events.includes("page_view")).toBe(true);
  await page.unroute("**/api/consent");
  await page.reload();
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_visitor")).toBe(true);
  await expect.poll(() => events.includes("page_view")).toBe(true);
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_consent_preference")).toBe(false);
});

test("forged local accept cannot grant analytics and replayed deny can only suppress it", async ({ page, context }) => {
  await context.addCookies([{ name: "pn_consent_preference", value: "2.accepted", url: "http://localhost:3000" }]);
  const events: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/track")) events.push(request.url()); });
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: bannerName })).toBeVisible();
  await expect.poll(() => events.length).toBeGreaterThan(0);
  await confirmAnalyticsConsent(page, page.getByRole("button", { name: "Zgadzam się na analitykę" }));
  await context.addCookies([{ name: "pn_consent_preference", value: "2.deny", url: "http://localhost:3000" }]);
  const inert = await context.request.post("/api/track", { data: { eventName: "page_view", eventId: crypto.randomUUID(), path: "/" } });
  expect(inert.status()).toBe(204);
  await page.goto("/kontakt");
  await expect.poll(async () => (await context.cookies()).some((cookie) => ["pn_visitor", "pn_session"].includes(cookie.name))).toBe(false);
});

test("a later consent GET outage does not reopen the banner after confirmed acceptance", async ({ page }) => {
  await page.goto("/");
  await confirmAnalyticsConsent(page, page.getByRole("button", { name: "Zgadzam się na analitykę" }));
  await page.route("**/api/consent", async (route) => {
    if (route.request().method() === "GET") await route.fulfill({ status: 503, body: "{}" });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await expect(page.getByText("Pełna analityka włączona dla tej przeglądarki.")).toBeVisible();
  await page.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Włącz analitykę" }).click();
  await expect(page.getByRole("complementary", { name: bannerName })).toBeHidden();
});

test("retrying one pending grant writes evidence once and reuses its visitor", async ({ page, context }) => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY, "requires local Supabase");
  await page.goto("/");
  const attemptId = crypto.randomUUID();
  await context.addCookies([{ name: "pn_consent_preference", value: `2.pending-accept.${attemptId}`, url: page.url() }]);
  const first = await context.request.post("/api/consent", { data: { analytics: true } });
  expect(first.status()).toBe(200);
  const firstVisitor = (await context.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value;
  expect(firstVisitor).toBeTruthy();
  const retry = await context.request.post("/api/consent", { data: { analytics: true } });
  expect(retry.status()).toBe(200);
  const retryVisitor = (await context.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value;
  const visitorId = (token: string) => JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")).id as string;
  expect(visitorId(retryVisitor!)).toBe(visitorId(firstVisitor!));
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { count, error } = await admin.from("analytics_consent_evidence").select("id", { count: "exact", head: true }).eq("id", attemptId);
  expect(error).toBeNull();
  expect(count).toBe(1);
});
