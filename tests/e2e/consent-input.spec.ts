import { expect, test } from "@playwright/test";

test("privacy banner leaves footer reachable before a choice, including save failure", async ({ page }, testInfo) => {
  await page.route("**/api/consent", async (route) => {
    await route.fulfill({ status: route.request().method() === "POST" ? 503 : 200, contentType: "application/json", body: JSON.stringify(route.request().method() === "POST" ? { error: "unavailable" } : { choice: null }) });
  });
  await page.goto("/");
  const banner = page.getByRole("complementary", { name: "Wybór analityki" });
  await expect(banner).toBeVisible();
  const necessary = banner.getByRole("button", { name: "Odrzuć analitykę" });
  const analytics = banner.getByRole("button", { name: "Zgadzam się na analitykę" });
  await expect(necessary).toBeVisible();
  await expect(analytics).toBeVisible();
  const firstChoice = await necessary.boundingBox();
  const secondChoice = await analytics.boundingBox();
  if (testInfo.project.name.startsWith("mobile")) expect(firstChoice!.y).toBeLessThan(secondChoice!.y);
  await necessary.focus();
  await expect(necessary).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(analytics).toBeFocused();
  await expect(analytics).toHaveCSS("outline-style", "solid");
  await necessary.click();
  await expect(banner.getByRole("alert")).toBeVisible();
  await expect.poll(async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page.locator("footer").boundingBox();
    const overlay = await banner.boundingBox();
    return Boolean(footer && overlay && footer.y + footer.height <= overlay.y);
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: testInfo.outputPath("consent-banner-footer.png") });
  await page.locator("footer").getByRole("link", { name: "Prywatność" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(banner).toHaveCount(0);
});

test("consent rejects non-object JSON without creating cookies", async ({ request }) => {
  for (const data of ["null", "[]", "true"]) {
    const response = await request.post("/api/consent", { data, headers: { "content-type": "application/json" } });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid-json" });
    expect(response.headers()["set-cookie"] || "").not.toContain("pn_consent=");
  }
});

test("consent rejects oversized payloads before token creation", async ({ request }) => {
  const response = await request.post("/api/consent", { data: { analytics: true, padding: "x".repeat(1_024) } });
  expect(response.status()).toBe(413);
  expect(await response.json()).toEqual({ error: "payload-too-large" });
  expect(response.headers()["set-cookie"] || "").not.toContain("pn_consent=");
});
