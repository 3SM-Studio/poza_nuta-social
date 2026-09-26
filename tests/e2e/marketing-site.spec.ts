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
  await page.getByRole("link", { name: "Przejdź do oficjalnych kanałów" }).click();
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
  await page.getByRole("main").getByRole("link", { name: "Daty w oficjalnych kanałach" }).click();
  await expect(page).toHaveURL(/\/linki$/);
  await expect(page.getByText("Daty i miejsca ogłaszamy w oficjalnych kanałach.", { exact: false })).toBeVisible();
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first().click();
  await expect(page.getByText("Śpiewanie jest Twoim wyborem.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gdzie sprawdzić daty i miejsca?" })).toBeVisible();
  const steps = page.getByRole("list").filter({ has: page.getByRole("heading", { name: "Zeskanuj QR na miejscu" }) });
  await expect(steps.getByRole("listitem")).toHaveCount(4);
  await expect(page.getByText("Wpisz sześciocyfrowy kod sesji dostępny podczas wydarzenia.")).toBeVisible();
  await page.getByRole("link", { name: "Przejdź do oficjalnych kanałów" }).click();
  await expect(page).toHaveURL(/\/linki$/);

  await page.goto("/dla-lokali");
  await expect(page.getByRole("heading", { name: "Co możemy wziąć na siebie?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "iGranie w Lochu, Gdynia" })).toBeVisible();
  await expect(page.getByText("Poza Nutą prowadzi tam cykliczne wieczory karaoke.")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Kontakt / współpraca" }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
  await expect(page.getByRole("link", { name: /kontakt@pozanuta\.test/ })).toHaveAttribute("href", "mailto:kontakt@pozanuta.test");
  await expect(page.getByText("Masz pytanie o Poza Nutą lub pomysł na wydarzenie?")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Przejdź do oficjalnych kanałów" }).click();
  await expect(page).toHaveURL(/\/linki$/);
});

test("mobile first-visit consent leaves the participant action visible and treats both choices equally", async ({ page }, testInfo) => {
  test.skip(!["mobile-360-chromium", "mobile-390-chromium"].includes(testInfo.project.name));
  await page.goto("/");
  const banner = page.getByRole("complementary", { name: "Wybór analityki" });
  await expect(banner).toBeVisible();
  const primary = page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first();
  const bannerTop = await banner.evaluate((element) => element.getBoundingClientRect().top);
  const primaryBottom = await primary.evaluate((element) => element.getBoundingClientRect().bottom);
  expect(primaryBottom, "consent banner must not cover the primary participant action").toBeLessThan(bannerTop);
  const reject = banner.getByRole("button", { name: "Odrzuć analitykę" });
  const accept = banner.getByRole("button", { name: "Zgadzam się na analitykę" });
  await expect(reject).toBeVisible();
  await expect(accept).toBeVisible();
  const sizes = await Promise.all([reject, accept].map((button) => button.evaluate((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }))));
  expect(Math.abs(sizes[0].width - sizes[1].width)).toBeLessThan(2);
  expect(Math.abs(sizes[0].height - sizes[1].height)).toBeLessThan(2);
  await page.screenshot({ path: `test-results/consent-first-visit-${testInfo.project.name}.png` });
  await reject.click();
  await expect(banner).toBeHidden();
  await expect(page.getByRole("main").getByRole("link", { name: "Daty w oficjalnych kanałach" })).toBeVisible();
  await page.screenshot({ path: `test-results/consent-rejected-${testInfo.project.name}.png` });
});

test("accepted mobile consent keeps the hero and current-information route usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390-chromium");
  await page.goto("/");
  await page.getByRole("complementary", { name: "Wybór analityki" }).getByRole("button", { name: "Zgadzam się na analitykę" }).click();
  await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeHidden();
  await expect(page.getByRole("main").getByRole("link", { name: "Informacje o karaoke" }).first()).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Daty w oficjalnych kanałach" }).click();
  await expect(page).toHaveURL(/\/linki$/);
  await page.screenshot({ path: "test-results/consent-accepted-linki-mobile-390.png" });
});

test("documentary media stays below the hero and loads motion only when useful", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.setViewportSize({ width: 390, height: 844 });
  const videoRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("experience-group-loop.mp4")) videoRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator('section[aria-labelledby="hero-title"] img, section[aria-labelledby="hero-title"] video')).toHaveCount(0);
  const proofTop = await page.locator('section[aria-labelledby="karaoke-heading"] figure').evaluate((element) => element.getBoundingClientRect().top);
  expect(proofTop, "documentary proof should appear at the end of the first mobile viewport").toBeLessThan(844);
  await expect(page.locator("video")).toHaveCount(0);
  expect(videoRequests).toHaveLength(0);

  await page.locator('section[aria-labelledby="karaoke-heading"] figure').scrollIntoViewIfNeeded();
  const video = page.locator("video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect.poll(() => video.evaluate((element) => !(element as HTMLVideoElement).paused)).toBe(true);
  expect(videoRequests.length).toBeGreaterThan(0);
  await page.locator('section[aria-labelledby="hero-title"]').scrollIntoViewIfNeeded();
  await expect(video).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('section[aria-labelledby="karaoke-heading"] figure').scrollIntoViewIfNeeded();
  await expect(video).toHaveCount(0);
  await expect(page.getByAltText("Dwie osoby śpiewają razem podczas wieczoru Poza Nutą.")).toBeVisible();
  await expect(page.getByAltText("Uczestniczki spędzają czas przy stoliku podczas wieczoru Poza Nutą.")).toHaveCount(1);
  await page.goto("/karaoke-trojmiasto");
  await expect(page.getByAltText("Uczestnik śpiewa z mikrofonem w lokalu podczas karaoke Poza Nutą.")).toHaveCount(1);
  await page.goto("/dla-lokali");
  await expect(page.getByAltText("Uczestniczka śpiewa w lokalu iGranie w Lochu; widać ekran i nagłośnienie.")).toHaveCount(1);
});
