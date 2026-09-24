import { expect, test } from "@playwright/test";

const routes = ["/", "/linki", "/karaoke-trojmiasto", "/dla-lokali", "/kontakt", "/privacy"] as const;

test("marketing pages stay navigable and fit mobile and desktop", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("complementary", { name: "Ustawienia prywatności" }).getByRole("button", { name: "Tylko niezbędne" }).click();

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Nawigacja główna" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.content, `${route} horizontal overflow`).toBeLessThanOrEqual(dimensions.viewport);
    const slug = route === "/" ? "home" : route.slice(1);
    await page.screenshot({ path: `test-results/marketing-${testInfo.project.name}-${slug}.png`, fullPage: true });
  }

  await page.goto("/");
  await page.getByRole("link", { name: "Poznaj nasze karaoke" }).click();
  await expect(page).toHaveURL(/\/karaoke-trojmiasto$/);
  await page.getByRole("link", { name: "Zobacz oficjalne profile" }).click();
  await expect(page).toHaveURL(/\/linki$/);
  await expect(page.getByRole("link", { name: "Otwórz Instagram" })).toHaveAttribute("href", "/go/instagram");
});
