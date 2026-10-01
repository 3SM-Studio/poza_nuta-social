import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/karaoke", "/dla-lokali", "/kontakt", "/linki", "/prywatnosc", "/cookies"] as const;
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const route of routes) {
  test(`WCAG A/AA automated rules: ${route}`, async ({ page }, testInfo) => {
    test.skip(!["desktop-chromium", "mobile-360-chromium"].includes(testInfo.project.name));
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await page.title()).toContain("Poza Nutą");
    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("public not-found state has a named recovery path", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const response = await page.goto("/nie-ma-takiej-strony");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Tu nic nie gra." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wróć do Poza Nutą" })).toHaveAttribute("href", "/");
  expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);
});

test("privacy settings remain reachable before the first choice", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  const headerTop = await page.getByRole("banner").evaluate((element) => element.getBoundingClientRect().top);
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Przejdź do treści" });
  if (testInfo.project.name === "desktop-webkit") {
    // WebKit Tab navigation depends on the platform keyboard preference.
    if (await skipLink.evaluate((element) => document.activeElement !== element)) {
      await expect(page.getByRole("button", { name: "Odrzuć analitykę" })).toBeFocused();
      await skipLink.focus();
    }
  } else {
    await expect(skipLink).toBeFocused();
  }
  const skipGeometry = await skipLink.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { left: rect.left, top: rect.top, outline: parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset) };
  });
  expect(skipGeometry.left).toBeGreaterThan(skipGeometry.outline);
  expect(skipGeometry.top).toBeGreaterThan(skipGeometry.outline);
  expect(await page.getByRole("banner").evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(headerTop, 0);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const control = page.getByRole("contentinfo").getByRole("button", { name: "Ustawienia prywatności" });
  await control.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Ustawienia prywatności" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(control).toBeFocused();
});

test("consent banner and privacy dialog expose meaningful keyboard states", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/");
  const banner = page.getByRole("complementary", { name: "Wybór analityki" });
  await expect(banner).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);

  const tabbedNames: string[] = [];
  for (let index = 0; index < 18; index += 1) {
    await page.keyboard.press("Tab");
    tabbedNames.push(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim() || ""));
    if (tabbedNames.some((name) => name.includes("Odrzuć analitykę"))) break;
  }
  expect(tabbedNames.some((name) => name.includes("Przejdź do treści"))).toBe(true);
  await expect(banner.getByRole("button", { name: "Odrzuć analitykę" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(banner).toBeHidden();

  const privacyControl = page.getByRole("button", { name: "Ustawienia prywatności" });
  await expect(privacyControl).toBeVisible();
  await expect(page.getByRole("link", { name: "Przejdź do treści" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Analityka została wyłączona." })).toBeAttached();
  await privacyControl.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Ustawienia prywatności" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Tylko niezbędne" })).toHaveAttribute("aria-pressed", "true");
  expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(privacyControl).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  const enableAnalytics = dialog.getByRole("button", { name: "Włącz analitykę" });
  await expect(enableAnalytics).toBeEnabled();
  await page.route("**/api/consent", async (route) => {
    if (route.request().method() === "POST" && route.request().postDataJSON()?.analytics === true) await route.fulfill({ status: 503, body: "{}" });
    else await route.continue();
  });
  await enableAnalytics.focus();
  await expect(enableAnalytics).toBeFocused();
  await page.keyboard.press("Space");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await expect(page.getByText(/Zgoda zapisana w tej przeglądarce/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(privacyControl).toBeFocused();
});

test("public pages reflow at 320 CSS px and focused controls remain visible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth, overflowing: [...document.querySelectorAll("body *")].filter((item) => item.getBoundingClientRect().right > document.documentElement.clientWidth).slice(0, 8).map((item) => `${item.tagName}.${item.className?.toString().slice(0, 40)}:${Math.round(item.getBoundingClientRect().right)}:${item.textContent?.trim().slice(0, 40)}`) }));
    expect(width.page, `${route} horizontal overflow: ${width.overflowing.join(", ")}`).toBeLessThanOrEqual(width.viewport);
  }
  // This check targets the hydrated footer interaction after the route sweep.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("contentinfo").getByRole("button", { name: "Ustawienia prywatności" }).click();
  const dialog = page.getByRole("dialog", { name: "Ustawienia prywatności" });
  await expect(dialog).toBeVisible();
  const panel = await dialog.evaluate((element) => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, viewport: innerWidth }));
  expect(panel.left).toBeGreaterThanOrEqual(0);
  expect(panel.right).toBeLessThanOrEqual(panel.viewport);
  await expect(dialog.getByRole("button", { name: "Włącz analitykę" })).toBeVisible();
});

test("public footers reflow with WCAG text spacing at 320 CSS px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of routes) {
    await page.goto(route);
    await page.addStyleTag({ content: "* { letter-spacing: .12em !important; word-spacing: .16em !important; } p { line-height: 1.5 !important; margin-bottom: 2em !important; }" });
    const layout = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      const controls = [...(footer?.querySelectorAll("a, button") ?? [])].map((element) => element.getBoundingClientRect());
      const outside = controls.some((rect) => rect.left < -1 || rect.right > innerWidth + 1);
      const overlapping = controls.some((a, index) => controls.slice(index + 1).some((b) =>
        a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1));
      return { pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth, outside, overlapping };
    });
    expect(layout.pageWidth, `${route} page overflows`).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.outside, `${route} footer control is outside viewport`).toBe(false);
    expect(layout.overlapping, `${route} footer controls overlap`).toBe(false);
  }
});

test("consent panel does not cover venue or contact actions at narrow width", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.setViewportSize({ width: 320, height: 768 });
  for (const [route, selector] of [["/dla-lokali", ".ed-venues-action"], ["/kontakt", ".ed-contact-link"]] as const) {
    await page.goto(route);
    const banner = page.getByRole("complementary", { name: "Wybór analityki" });
    await expect(banner).toBeVisible();
    const layout = await page.evaluate((target) => {
      const panel = document.querySelector('aside[aria-label="Wybór analityki"]');
      const action = document.querySelector(target);
      const a = panel!.getBoundingClientRect();
      const b = action!.getBoundingClientRect();
      return {
        position: getComputedStyle(panel!).position,
        overlap: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
        bodyPadding: getComputedStyle(document.body).paddingBottom,
      };
    }, selector);
    expect(layout.position, route).toBe("static");
    expect(layout.overlap, route).toBe(false);
    expect(layout.bodyPadding, route).toBe("0px");
  }
});

test("keyboard focus is visible above authored fixed controls at narrow width", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  const focusNames: string[] = [];
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const active = document.activeElement;
      // Inline links can wrap into multiple painted fragments; the center of
      // their union rectangle may fall on the surrounding paragraph.
      const visible = Array.from(active?.getClientRects() || []).some((rect) => {
        if (rect.bottom <= 0 || rect.top >= innerHeight) return false;
        const centerX = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
        const centerY = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
        const hit = document.elementFromPoint(centerX, centerY);
        return active === hit || active?.contains(hit);
      });
      return { name: active?.getAttribute("aria-label") || active?.textContent?.trim() || "", visible };
    });
    if (!state.name) break;
    focusNames.push(state.name);
    expect(state.visible, `Focus obscured: ${state.name}`).toBe(true);
  }
  expect(focusNames.some((name) => name.includes("Przejdź do treści"))).toBe(true);
  expect(focusNames.some((name) => name.includes("Otwórz menu"))).toBe(true);
  expect(focusNames.some((name) => name.includes("Odrzuć analitykę"))).toBe(true);
});

test("critical public controls meet target size and reduced motion removes transitions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
  for (const control of [page.getByRole("button", { name: "Odrzuć analitykę" }), page.getByRole("button", { name: "Zgadzam się na analitykę" }), page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("link", { name: "Linki" })]) {
    const size = await control.evaluate((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
    expect(size.width).toBeGreaterThanOrEqual(24);
    expect(size.height).toBeGreaterThanOrEqual(24);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const duration = await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("link", { name: "Linki" }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(duration).toBe("1e-05s");
});

test("accessibility tree exposes navigation, destinations, and consent state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/linki");
  const navTree = await page.getByRole("navigation", { name: "Nawigacja główna" }).ariaSnapshot();
  expect(navTree).toContain("Nawigacja główna");
  expect(navTree).toContain("Karaoke");
  const destinationTree = await page.getByRole("main").getByRole("link", { name: "Otwórz Instagram w nowej karcie", exact: true }).ariaSnapshot();
  expect(destinationTree).toContain("Otwórz Instagram");
  await page.getByRole("complementary", { name: "Wybór analityki" }).getByRole("button", { name: "Odrzuć analitykę" }).click();
  await page.getByRole("button", { name: "Ustawienia prywatności" }).click();
  await expect(page.getByRole("dialog", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Tylko niezbędne" })).toHaveAttribute("aria-pressed", "true");
  const dialogTree = await page.getByRole("dialog", { name: "Ustawienia prywatności" }).ariaSnapshot();
  expect(dialogTree).toContain("Ustawienia prywatności");
  expect(dialogTree).toContain("Tylko niezbędne");
  expect(dialogTree).toContain("pressed");
});
