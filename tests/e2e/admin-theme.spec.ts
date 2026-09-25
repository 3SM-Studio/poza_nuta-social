import { expect, test } from "@playwright/test";
import { loginWithMagicEmail } from "./helpers/local-admin-auth";

const adminEmail = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpitUrl = process.env.LOCAL_MAILPIT_URL;

test("Admin light and dark tokens stay scoped to Admin routes", async ({ page }, testInfo) => {
  test.skip(!["desktop-chromium", "mobile-360-chromium", "desktop-webkit"].includes(testInfo.project.name));

  await page.goto("/admin/login");
  await expect(page.locator(".admin-theme")).toBeVisible();

  const readTheme = () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const card = getComputedStyle(document.querySelector<HTMLElement>("[data-slot=card]")!);
    const button = getComputedStyle(document.querySelector<HTMLElement>("[data-slot=button]")!);
    const kicker = getComputedStyle(document.querySelector<HTMLElement>("[data-slot=card-header] p")!);
    const description = getComputedStyle(document.querySelector<HTMLElement>("[data-slot=card-description]")!);
    const canvas = document.createElement("canvas").getContext("2d")!;
    const luminance = (color: string) => {
      canvas.fillStyle = color;
      canvas.fillRect(0, 0, 1, 1);
      const [red, green, blue] = canvas.getImageData(0, 0, 1, 1).data;
      const [r, g, b] = [red, green, blue].map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const values = [luminance(a), luminance(b)].sort((left, right) => right - left);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const swatch = document.createElement("div");
    document.body.append(swatch);
    const normalize = (color: string) => {
      swatch.style.backgroundColor = color;
      return getComputedStyle(swatch).backgroundColor;
    };
    const result = {
      scheme: root.colorScheme,
      radius: root.getPropertyValue("--radius").trim(),
      background: getComputedStyle(document.body).backgroundColor,
      card: card.backgroundColor,
      button: button.backgroundColor,
      font: getComputedStyle(document.body).fontFamily,
      primary: normalize(root.getPropertyValue("--primary")),
      muted: normalize(root.getPropertyValue("--muted")),
      chart: normalize(root.getPropertyValue("--chart-2")),
      popover: normalize(root.getPropertyValue("--popover")),
      contrast: {
        button: contrast(button.color, button.backgroundColor),
        kicker: contrast(kicker.color, card.backgroundColor),
        muted: contrast(description.color, card.backgroundColor),
      },
    };
    swatch.remove();
    return result;
  });

  const dark = await readTheme();
  expect(dark.scheme).toBe("dark");
  expect(dark.radius).toBe(".625rem");
  expect(dark.font).toContain("Geist");
  expect(dark.card).not.toBe(dark.background);
  expect(dark.button).toBe(dark.primary);
  expect(dark.chart).not.toBe(dark.muted);
  expect(dark.popover).toBe(dark.card);
  expect(dark.contrast.button).toBeGreaterThanOrEqual(4.5);
  expect(dark.contrast.kicker).toBeGreaterThanOrEqual(4.5);
  expect(dark.contrast.muted).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("textbox", { name: "E-mail" }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("textbox", { name: "E-mail" })).toBeFocused();
  expect(await page.getByRole("textbox", { name: "E-mail" }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");

  await page.locator(".admin-theme").evaluate((element) => element.classList.remove("dark"));
  await expect.poll(async () => (await readTheme()).scheme).toBe("light");
  await expect.poll(async () => { const theme = await readTheme(); return theme.button === theme.primary; }).toBe(true);
  const light = await readTheme();
  expect(light.background).not.toBe(dark.background);
  expect(light.card).toBe(light.background);
  expect(light.primary).not.toBe(dark.primary);
  expect(light.chart).not.toBe(light.muted);
  expect(light.popover).toBe(light.card);
  expect(light.contrast.button).toBeGreaterThanOrEqual(4.5);
  expect(light.contrast.kicker).toBeGreaterThanOrEqual(4.5);
  expect(light.contrast.muted).toBeGreaterThanOrEqual(4.5);
  expect(await page.getByRole("textbox", { name: "E-mail" }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");

  await page.goto("/");
  const publicTheme = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      adminMarker: Boolean(document.querySelector(".admin-theme")),
      background: root.getPropertyValue("--background").trim(),
      accent: root.getPropertyValue("--accent").trim(),
      radius: root.getPropertyValue("--radius").trim(),
      font: getComputedStyle(document.body).fontFamily,
    };
  });
  expect(publicTheme).toMatchObject({ adminMarker: false, background: "#0d0b0d", accent: "#ff4fa3", radius: "1rem" });
  expect(publicTheme.font).toContain("Space Grotesk");
});

test("authenticated Admin shell and forms use the same theme", async ({ page, request }, testInfo) => {
  test.skip(!adminEmail || !mailpitUrl || testInfo.project.name !== "desktop-chromium", "Requires isolated local Auth and Mailpit");

  await loginWithMagicEmail(page, request, adminEmail!);

  for (const [route, heading] of [["/admin", "Co naprawdę działa?"], ["/admin/campaigns", "Kampanie"], ["/admin/destinations", "Destynacje"]]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(page.locator("[data-slot=sidebar-wrapper].admin-theme")).toBeVisible();
    const dark = await page.evaluate(() => ({
      scheme: getComputedStyle(document.documentElement).colorScheme,
      sidebar: getComputedStyle(document.querySelector<HTMLElement>("[data-slot=sidebar-inner]")!).backgroundColor,
      card: getComputedStyle(document.querySelector<HTMLElement>("[data-slot=card]")!).backgroundColor,
    }));
    expect(dark.scheme).toBe("dark");
    if (route === "/admin") await testInfo.attach("admin-dashboard-dark", { body: await page.screenshot(), contentType: "image/png" });
    await page.locator(".admin-theme").evaluate((element) => element.classList.remove("dark"));
    const light = await page.evaluate(() => ({
      scheme: getComputedStyle(document.documentElement).colorScheme,
      sidebar: getComputedStyle(document.querySelector<HTMLElement>("[data-slot=sidebar-inner]")!).backgroundColor,
      card: getComputedStyle(document.querySelector<HTMLElement>("[data-slot=card]")!).backgroundColor,
    }));
    expect(light.scheme).toBe("light");
    expect(light.sidebar).not.toBe(dark.sidebar);
    expect(light.card).not.toBe(dark.card);
    if (route === "/admin") await testInfo.attach("admin-dashboard-light", { body: await page.screenshot(), contentType: "image/png" });
  }
  await expect(page.getByLabel("Nazwa")).toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Przełącz nawigację" }).first().click();
  const mobileSidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]');
  await expect(mobileSidebar).toBeVisible();
  const darkMobile = await mobileSidebar.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.locator(".admin-theme").evaluate((element) => element.classList.remove("dark"));
  const lightMobile = await mobileSidebar.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(lightMobile).not.toBe(darkMobile);
});
