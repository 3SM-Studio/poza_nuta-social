import { expect, test } from "@playwright/test";

const routes = ["/", "/linki", "/karaoke-trojmiasto", "/dla-lokali", "/kontakt", "/prywatnosc", "/cookies"] as const;

test("marketing pages stay navigable and fit mobile and desktop", async ({ page, context }, testInfo) => {
  await page.goto("/");
  await page.getByRole("complementary", { name: "Wybór analityki" }).getByRole("button", { name: "Odrzuć analitykę" }).click();
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeHidden();
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "pn_consent"), { message: "server-confirmed denial writes the consent cookie" }).toBe(true);

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    const footerNavigation = page.getByRole("contentinfo").getByRole("navigation", { name: "Nawigacja w stopce" });
    await expect(footerNavigation.getByRole("link")).toHaveCount(4);
    await expect(footerNavigation.getByRole("link", { name: "Dla lokali" })).toHaveAttribute("href", "/dla-lokali");
    if (testInfo.project.name.startsWith("mobile")) {
      await page.getByRole("button", { name: "Otwórz menu" }).click();
      await expect(page.getByRole("navigation", { name: "Nawigacja główna" })).toBeVisible();
      await page.keyboard.press("Escape");
    } else await expect(page.getByRole("navigation", { name: "Nawigacja główna" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ustawienia prywatności" })).toBeVisible();
    if (route === "/prywatnosc" || route === "/cookies") await expect(page.getByText("Analityka wyłączona dla tej przeglądarki.")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.content, `${route} horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport);
    const slug = route === "/" ? "home" : route.slice(1);
    await page.screenshot({ path: `test-results/marketing-${testInfo.project.name}-${slug}.png`, fullPage: true });
  }

  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first().click();
  await expect(page).toHaveURL(/\/karaoke-trojmiasto$/);
  await page.getByRole("link", { name: "Zobacz oficjalne profile" }).click();
  await expect(page).toHaveURL(/\/linki$/);
  await expect(page.getByRole("main").getByRole("link", { name: "Otwórz Instagram", exact: true })).toHaveAttribute("href", "/go/instagram");
});

test("mobile menu keeps link semantics, restores focus, and follows a route", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.goto("/");
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  const trigger = page.getByRole("button", { name: "Otwórz menu" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const navigation = page.getByRole("navigation", { name: "Nawigacja główna" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Karaoke" })).toHaveAttribute("href", "/karaoke-trojmiasto");
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await navigation.getByRole("link", { name: "Dla lokali" }).click();
  await expect(page).toHaveURL(/\/dla-lokali$/);
  await expect(page.getByRole("heading", { name: "Współpraca z lokalami" })).toBeVisible();
});

test("V2 participant path keeps its first action visible and public theme isolated", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  const publicAccent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());

  for (const width of [360, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `homepage overflow at ${width}px`).toBeLessThanOrEqual(0);
    await expect(page.getByRole("heading", { level: 1, name: "Poza Nutą" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first()).toBeInViewport();
    await page.screenshot({ path: `test-results/v2-home-${width}.png`, fullPage: false });
  }

  await page.goto("/admin/login");
  await expect(page.locator(".admin-theme")).toBeVisible();
  const adminAccent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  expect(adminAccent).not.toBe(publicAccent);
  await page.screenshot({ path: "test-results/v2-admin-login.png", fullPage: false });
  await page.goto("/linki");
  await expect(page.locator(".admin-theme")).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim())).toBe(publicAccent);
});

test("participant and venue journeys answer the first decision and reach the right contact path", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Odrzuć analitykę" }).click();
  await expect(page.getByRole("main").getByText("Przyjdź posłuchać, spędzić czas z innymi albo zaśpiewać.", { exact: false })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first().click();
  await expect(page.getByText("Śpiewanie jest Twoim wyborem.", { exact: false })).toBeVisible();
  const steps = page.getByRole("list").filter({ has: page.getByRole("heading", { name: "Zeskanuj QR na miejscu" }) });
  await expect(steps.getByRole("listitem")).toHaveCount(4);
  await expect(page.getByText("Wpisz sześciocyfrowy kod sesji dostępny podczas wydarzenia.")).toBeVisible();
  await page.getByRole("link", { name: "Zobacz oficjalne profile" }).click();
  await expect(page).toHaveURL(/\/linki$/);

  await page.goto("/dla-lokali");
  await expect(page.getByRole("heading", { name: "Co możemy wziąć na siebie?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "iGranie w Lochu, Gdynia" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Kontakt / współpraca" }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
  await expect(page.getByRole("link", { name: /kontakt@pozanuta\.test/ })).toHaveAttribute("href", "mailto:kontakt@pozanuta.test");
});
