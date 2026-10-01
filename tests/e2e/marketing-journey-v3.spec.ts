import { expect, test } from "@playwright/test";
import { confirmAnalyticsConsent } from "./helpers/confirmed-analytics-consent";

test("consented participant and venue journeys emit stable semantic actions", async ({ page }) => {
  const events: Array<{ eventName: string; path: string; properties?: Record<string, string> }> = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/track")) {
      const body = request.postDataJSON();
      if (body && typeof body.eventName === "string") events.push(body);
    }
  });
  await page.goto("/");
  await confirmAnalyticsConsent(page, page.getByRole("button", { name: "Zgadzam się na analitykę" }));

  const participantProof = page.locator('[data-section-id="home.participation"]');
  await participantProof.scrollIntoViewIfNeeded();
  await expect.poll(() => events.filter((item) => item.eventName === "section_view" && item.properties?.sectionId === "home.participation").length).toBe(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await participantProof.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  expect(events.filter((item) => item.eventName === "section_view" && item.properties?.sectionId === "home.participation")).toHaveLength(1);

  await page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first().click();
  await expect(page).toHaveURL(/\/karaoke$/);
  await expect.poll(() => events.filter((item) => item.eventName === "cta_click" && item.properties?.ctaId === "home.hero_karaoke").length).toBe(1);
  await page.getByRole("main").getByRole("link", { name: "Przejdź do oficjalnych kanałów" }).click();
  await expect(page).toHaveURL(/\/linki$/);
  await expect.poll(() => events.filter((item) => item.eventName === "cta_click" && item.properties?.ctaId === "karaoke.current_dates").length).toBe(1);

  await page.getByRole("link", { name: "Poza Nutą — strona główna" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("main").getByRole("link", { name: "Współpraca z lokalami" }).click();
  await expect(page).toHaveURL(/\/dla-lokali$/);
  await expect.poll(() => events.filter((item) => item.eventName === "cta_click" && item.properties?.ctaId === "home.case_venues").length).toBe(1);
  await page.getByRole("main").getByRole("link", { name: "Porozmawiajmy o współpracy" }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
  await expect.poll(() => events.filter((item) => item.eventName === "cta_click" && item.properties?.ctaId === "venues.hero_contact").length).toBe(1);
  expect(events.every((item) => !["cta_click", "section_view"].includes(item.eventName) || ["/", "/karaoke", "/dla-lokali", "/kontakt", "/linki"].includes(item.path))).toBe(true);
});

test("denied consent sends no semantic journey events", async ({ page, context }) => {
  const names: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/track")) {
      const body = request.postDataJSON();
      if (body && typeof body.eventName === "string") names.push(body.eventName);
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_consent")).toBe(true);
  await page.locator('[data-section-id="home.participation"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first().click();
  await expect(page).toHaveURL(/\/karaoke$/);
  expect(names).not.toContain("section_view");
  expect(names).not.toContain("cta_click");
});

test("legacy karaoke route redirects once and preserves the query", async ({ request }) => {
  const response = await request.get("/karaoke-trojmiasto?utm_source=poster&x=1", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = new URL(response.headers().location, "http://localhost:3000");
  expect(location.pathname).toBe("/karaoke");
  expect(location.searchParams.get("utm_source")).toBe("poster");
  expect(location.searchParams.get("x")).toBe("1");
  expect((await request.get(location.pathname + location.search, { maxRedirects: 0 })).status()).toBe(200);
  const legacyEvent = await request.post("/api/track", { data: {
    eventId: "11111111-1111-4111-8111-111111111111", eventName: "page_view", path: "/karaoke-trojmiasto",
  } });
  expect(legacyEvent.status()).toBe(400);
});
