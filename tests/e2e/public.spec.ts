import { expect, test } from "@playwright/test";

test("homepage introduces Poza Nutą and routes both audiences", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Nie musisz umieć śpiewać/ })).toBeVisible();
  await expect(page.getByRole("main").getByText("Karaoke i wydarzenia muzyczne w Trójmieście.", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Chcę zaśpiewać" }).first()).toHaveAttribute("href", "/karaoke-trojmiasto");
  await expect(page.getByRole("main").getByRole("link", { name: "Dla lokali", exact: true })).toHaveAttribute("href", "/dla-lokali");
  await expect(page.getByRole("link", { name: "Wszystkie oficjalne linki" })).toHaveAttribute("href", "/linki");
  await expect(page.getByRole("main").getByRole("link", { name: "Otwórz Instagram" })).toHaveAttribute("href", "/go/instagram");
  await expect(page.getByRole("link", { name: "Współpraca z lokalami" })).toBeVisible();
  await expect(page.getByText(/Stage/i)).toHaveCount(0);
});

test("link hub uses the official destination route and returns to the marketing site", async ({ page, request }) => {
  await page.goto("/linki");
  await expect(page.getByRole("heading", { name: "Poza Nutą", level: 1 })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Otwórz Instagram", exact: true })).toHaveAttribute("href", "/go/instagram");
  const outbound = await request.get("/go/instagram", { maxRedirects: 0 });
  expect(outbound.status()).toBe(302);
  expect(outbound.headers().location).toMatch(/^https:\/\/(www\.)?instagram\.com\//);
  expect(outbound.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("banner").getByRole("link", { name: "Poza Nutą - strona główna" })).toHaveAttribute("href", "/");
  await page.getByRole("banner").getByRole("link", { name: "Poza Nutą - strona główna" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Nie musisz umieć śpiewać/ })).toBeVisible();
});

test("contact is a first-party page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeHidden();
  const contactView = page.waitForRequest((request) => request.url().endsWith("/api/track") && request.postDataJSON()?.eventName === "contact_view");
  await page.goto("/kontakt");
  await expect(page.getByRole("heading", { name: "Kontakt / współpraca" })).toBeVisible();
  await contactView;
});

test("public content remains usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Nie musisz umieć śpiewać/ })).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Kontakt" })).toBeVisible();
  await context.close();
});

test("no analytics identity or acquisition is established before consent", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/?utm_source=chatgpt&utm_medium=referral&utm_campaign=instant");
  const cookies = await context.cookies();
  expect(cookies.some((cookie) => ["pn_session", "pn_acquisition", "pn_visitor"].includes(cookie.name))).toBe(false);
  await context.close();
});

test("consent choice is explicit and does not create a visitor when denied", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeHidden();
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_consent")).toBe(true);
  const cookies = await context.cookies();
  expect(cookies.some((cookie) => cookie.name === "pn_consent")).toBe(true);
  expect(cookies.some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);
  expect(cookies.filter((cookie) => cookie.name.startsWith("pn_")).map((cookie) => cookie.name)).toEqual(["pn_consent"]);
  expect(await page.evaluate(() => sessionStorage.getItem("pn_hub_outbound_v1"))).toBeNull();
  await page.goto("/linki");
  const outbound = await context.request.get("/go/instagram", { maxRedirects: 0 });
  expect(outbound.status()).toBe(302);
  expect((await context.cookies()).filter((cookie) => cookie.name.startsWith("pn_")).map((cookie) => cookie.name)).toEqual(["pn_consent"]);
});

test("public navigation does not start analytics before consent", async ({ page, context }) => {
  const events: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/track")) events.push(request.url()); });
  await page.goto("/");
  await page.goto("/linki");
  await page.goto("/kontakt");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  expect(events).toEqual([]);
  expect((await context.cookies()).some((cookie) => ["pn_session", "pn_visitor", "pn_acquisition"].includes(cookie.name))).toBe(false);
});

test("persistent privacy control opens an accessible settings panel", async ({ page, context }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  const control = page.getByRole("button", { name: "Ustawienia prywatności" });
  await expect(control).toBeVisible();
  await control.click();
  const dialog = page.getByRole("dialog", { name: "Ustawienia prywatności" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Włącz analitykę" })).toBeVisible();
  await expect(dialog.getByText("Analityka wyłączona dla tej przeglądarki.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("privacy-settings.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(control).toBeFocused();
  await page.goto("/cookies");
  await expect(page.getByRole("button", { name: "Ustawienia prywatności" })).toBeVisible();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor")).toBe(false);
});

test("withdrawal clears analytics state in another open tab", async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto("/");
  await second.goto("/linki");
  await first.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
  await expect(second.getByRole("button", { name: "Ustawienia prywatności" })).toBeVisible();
  await second.evaluate(() => sessionStorage.setItem("pn_hub_outbound_v1", "temporary-test-state"));
  await first.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await first.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Tylko niezbędne" }).click();
  await expect(first.getByRole("dialog", { name: "Ustawienia prywatności" })).toBeHidden();
  await expect.poll(() => second.evaluate(() => sessionStorage.getItem("pn_hub_outbound_v1"))).toBeNull();
  await expect.poll(async () => (await context.cookies()).some((cookie) => ["pn_visitor", "pn_session", "pn_acquisition"].includes(cookie.name))).toBe(false);
  await context.close();
});

test("privacy settings change consent in both directions and persist after reload", async ({ page, context }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  await page.getByRole("complementary", { name: "Wybór analityki" }).getByRole("button", { name: "Odrzuć analitykę" }).click();
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeHidden();
  await page.goto("/prywatnosc");
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
  await expect.poll(async () => (await context.cookies()).some((cookie) => ["pn_visitor", "pn_session", "pn_acquisition"].includes(cookie.name) && cookie.value)).toBe(false);
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
    if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: `test-results/prywatnosc-${viewport.width}x${viewport.height}.png`, fullPage: true });
  }
});

test("privacy page offers the first choice without an overlapping banner", async ({ page, context }) => {
  await page.goto("/prywatnosc");
  await expect(page.getByText("Nie wybrano jeszcze ustawienia analityki.")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toHaveCount(0);
  await page.getByRole("button", { name: "Włącz analitykę" }).click();
  await expect(page.getByText("Analityka włączona dla tej przeglądarki.")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeHidden();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(true);
});

test("consent lifecycle grants, reuses, withdraws, rejects marketing and tampering", async ({ browser }) => {
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

  const marketing = await page.evaluate(() => fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics: false, marketing: true }) }).then(async (response) => ({ status: response.status, body: await response.json() })));
  expect(marketing).toEqual({ status: 400, body: { error: "invalid-consent" } });
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);

  await context.addCookies([{ name: "pn_consent", value: "forged", url: page.url() }]);
  await page.reload();
  expect((await context.cookies()).some((cookie) => cookie.name === "pn_visitor" && cookie.value)).toBe(false);
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Nie musisz umieć śpiewać/ })).toBeVisible();
  await context.close();
});

test("analytics endpoint is inert before consent and validates consented input", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  const inert = await context.request.post("/api/track", { data: { eventName: "page_view", eventId: crypto.randomUUID(), path: "/" } });
  expect(inert.status()).toBe(204);
  expect(inert.headers()["set-cookie"] || "").not.toContain("pn_session");
  const consent = await context.request.post("/api/consent", { data: { analytics: true } });
  expect(consent.status()).toBe(200);
  const request = context.request;
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
  await context.close();
});

test("hub resume requires an armed outbound and a meaningful hidden interval", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
  const initialView = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view");
  await page.goto("/linki");
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
  await page.goto("/linki");

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((heading) => heading.tagName),
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.headings[0]).toBe("H1");
  expect(layout.headings.slice(1)).toEqual(["H2", "H2", "H2"]);

  const focused = page.getByRole("main").getByRole("link", { name: "Otwórz Instagram", exact: true });
  await focused.focus();
  await expect(focused).toBeFocused();
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
