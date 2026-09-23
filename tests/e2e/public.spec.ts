import { expect, test } from "@playwright/test";

test("public business card exposes the approved surface", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "POZA NUTĄ", exact: true })).toBeVisible();
  await expect(page.getByText("Trójmiasto", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Kontakt \/ współpraca/ })).toBeVisible();
  await expect(page.getByText(/Stage/i)).toHaveCount(0);
});

test("contact is a first-party page", async ({ page }) => {
  const contactView = page.waitForRequest((request) => request.url().endsWith("/api/track") && request.postDataJSON()?.eventName === "contact_view");
  await page.goto("/kontakt");
  await expect(page.getByRole("heading", { name: "Kontakt / współpraca" })).toBeVisible();
  await contactView;
});

test("public content remains usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "POZA NUTĄ", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Kontakt \/ współpraca/ })).toBeVisible();
  await context.close();
});

test("session identity is established by the response before hydration", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/?utm_source=chatgpt&utm_medium=referral&utm_campaign=instant");
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "pn_session")?.httpOnly).toBe(true);
  expect(cookies.find((cookie) => cookie.name === "pn_acquisition")?.httpOnly).toBe(true);
  await context.close();
});

test("consent choice is explicit and does not create a visitor when denied", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Ustawienia prywatności" })).toBeVisible();
  await page.getByRole("button", { name: "Tylko niezbędne" }).click();
  await expect(page.getByRole("complementary", { name: "Ustawienia prywatności" })).toBeHidden();
  const cookies = await context.cookies();
  expect(cookies.some((cookie) => cookie.name === "pn_consent")).toBe(true);
  expect(cookies.some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);
});

test("privacy settings change consent in both directions and persist after reload", async ({ page, context }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Ustawienia prywatności" })).toBeVisible();
  await page.getByRole("complementary", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Tylko niezbędne" }).click();
  await expect(page.getByRole("complementary", { name: "Ustawienia prywatności" })).toBeHidden();
  await page.goto("/privacy");
  await expect(page.getByText("Analityka wyłączona dla tej przeglądarki.")).toBeVisible();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);

  await page.getByRole("button", { name: "Włącz analitykę" }).click();
  await expect(page.getByText("Analityka włączona dla tej przeglądarki.")).toBeVisible();
  const firstVisitor = (await context.cookies()).find((cookie) => cookie.name === "pn_visitor");
  expect(firstVisitor?.value).toBeTruthy();
  expect(firstVisitor?.httpOnly).toBe(true);
  await page.reload();
  await expect(page.getByText("Analityka włączona dla tej przeglądarki.")).toBeVisible();
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value).toBe(firstVisitor?.value);

  await page.getByRole("button", { name: "Tylko niezbędne" }).click();
  await expect(page.getByText("Analityka wyłączona dla tej przeglądarki.")).toBeVisible();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);
  await page.reload();
  await expect(page.getByText("Analityka wyłączona dla tej przeglądarki.")).toBeVisible();
  await page.getByRole("button", { name: "Włącz analitykę" }).click();
  await expect(page.getByText("Analityka włączona dla tej przeglądarki.")).toBeVisible();
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value).toBeTruthy();
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value).not.toBe(firstVisitor?.value);
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 720, height: 450 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const width = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(width, `privacy page should not overflow at ${viewport.width}px`).toBeLessThanOrEqual(0);
    await expect(page.getByRole("button", { name: "Włącz analitykę" })).toBeVisible();
    await testInfo.attach(`privacy-${viewport.width}x${viewport.height}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: `test-results/privacy-${viewport.width}x${viewport.height}.png`, fullPage: true });
  }
});

test("privacy page offers the first choice without an overlapping banner", async ({ page, context }) => {
  await page.goto("/privacy");
  await expect(page.getByText("Nie wybrano jeszcze ustawienia analityki.")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Ustawienia prywatności" })).toHaveCount(0);
  await page.getByRole("button", { name: "Włącz analitykę" }).click();
  await expect(page.getByText("Analityka włączona dla tej przeglądarki.")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Ustawienia prywatności" })).toBeHidden();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(true);
});

test("consent lifecycle grants, reuses, withdraws, separates marketing, and rejects tampering", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor")).toBe(false);

  await page.evaluate(() => fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics: true, marketing: false }) }));
  const grantedVisitor = (await context.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value;
  expect(grantedVisitor).toBeTruthy();

  await context.clearCookies({ name: "pn_session" });
  await page.goto("/kontakt");
  expect((await context.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value).toBe(grantedVisitor);

  await page.evaluate(() => fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics: false, marketing: false }) }));
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);
  await page.reload();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);

  await context.clearCookies({ name: "pn_session" });
  await page.goto("/");
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);

  const marketing = await page.evaluate(() => fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics: false, marketing: true }) }).then((response) => response.json()));
  expect(marketing).toEqual({ analytics: false, marketing: true });
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);

  await context.addCookies([{ name: "pn_consent", value: "forged", url: page.url() }]);
  await page.reload();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);
  await expect(page.getByRole("complementary", { name: "Ustawienia prywatności" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "POZA NUTĄ", exact: true })).toBeVisible();
  await context.close();
});

test("analytics endpoint enforces its byte limit and rejects malformed events", async ({ request }) => {
  const valid = await request.post("/api/track", { data: { eventName: "page_view", eventId: crypto.randomUUID(), path: "/" } });
  expect(valid.status()).toBe(204);
  const exact = JSON.stringify({ eventName: "unsupported", padding: "x".repeat(12_000 - JSON.stringify({ eventName: "unsupported", padding: "" }).length) });
  expect(new TextEncoder().encode(exact).byteLength).toBe(12_000);
  const atLimit = await request.post("/api/track", { data: exact, headers: { "content-type": "application/json" } });
  expect(atLimit.status()).toBe(400);
  expect(await atLimit.json()).toEqual({ error: "invalid-event" });
  const tooLarge = await request.post("/api/track", { data: `${exact}x`, headers: { "content-type": "application/json" } });
  expect(tooLarge.status()).toBe(413);
  const malformed = await request.post("/api/track", { data: "{", headers: { "content-type": "application/json" } });
  expect(malformed.status()).toBe(400);
  const unsupported = await request.post("/api/track", { data: "[]", headers: { "content-type": "application/json" } });
  expect(unsupported.status()).toBe(400);
});

test("hub resume requires an armed outbound and a meaningful hidden interval", async ({ page }) => {
  const initialView = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view");
  await page.goto("/");
  await initialView;
  await expect(page.locator("html")).toHaveAttribute("data-tracking-lifecycle", "ready");
  const resumed = page.waitForRequest((request) => request.url().endsWith("/api/track"));
  const lifecycle = await page.evaluate(() => {
    sessionStorage.setItem("pn_hub_outbound_v1", JSON.stringify({ destination: "instagram", at: Date.now() - 3_000, hidden: true }));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    return { visibility: document.visibilityState, state: sessionStorage.getItem("pn_hub_outbound_v1") };
  });
  expect(lifecycle).toEqual({ visibility: "visible", state: null });
  await resumed;
  expect(await page.evaluate(() => sessionStorage.getItem("pn_hub_outbound_v1"))).toBeNull();
});

test("public surface preserves responsive and keyboard accessibility invariants", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((heading) => heading.tagName),
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.headings).toEqual(["H1", "H2"]);

  const focused = page.getByRole("link", { name: "Otwórz Instagram" });
  if (testInfo.project.name.includes("webkit")) {
    await focused.focus();
  } else {
    for (let attempt = 0; attempt < 8 && !(await focused.evaluate((element) => element === document.activeElement)); attempt++) await page.keyboard.press("Tab");
    await expect(focused).toBeFocused();
  }
  const focusStyle = await focused.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, width: rect.width, height: rect.height };
  });
  if (!testInfo.project.name.includes("webkit")) {
    expect(focusStyle.outlineStyle).not.toBe("none");
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(3);
  }
  expect(focusStyle.width).toBeGreaterThanOrEqual(44);
  expect(focusStyle.height).toBeGreaterThanOrEqual(44);

  const transitionDuration = await focused.locator("svg").last().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);
});
