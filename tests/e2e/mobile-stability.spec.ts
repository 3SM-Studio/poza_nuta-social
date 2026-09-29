import { expect, test } from "@playwright/test";

const spacing = "* { letter-spacing: .12em !important; word-spacing: .16em !important; } p { line-height: 1.5 !important; margin-bottom: 2em !important; }";
const headings = [".ed-home-hero-title", ".ed-home-participation-heading h2", ".ed-home-next h2"];

test("home reflows across the responsive matrix and 320px headings fit WCAG spacing", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const wcag of [false, true]) {
      if (wcag) await page.addStyleTag({ content: spacing });
      const layout = await page.evaluate((selectors) => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        headings: selectors.map((selector) => {
          const element = document.querySelector<HTMLElement>(selector)!;
          const rect = element.getBoundingClientRect();
          return { selector, width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY, left: rect.left, right: rect.right };
        }),
      }), headings);
      expect(layout.documentWidth, `${width}px wcag=${wcag}: horizontal overflow`).toBeLessThanOrEqual(layout.viewportWidth);
      if (width > 370) continue;
      for (const heading of layout.headings) {
        expect(heading.scrollWidth, `${width}px wcag=${wcag}: ${heading.selector} horizontal clipping`).toBeLessThanOrEqual(heading.width + 1);
        if (["hidden", "clip"].includes(heading.overflowY)) {
          expect(heading.scrollHeight, `${width}px wcag=${wcag}: ${heading.selector} vertical clipping`).toBeLessThanOrEqual(heading.height + 1);
        }
        expect(heading.left, `${width}px wcag=${wcag}: ${heading.selector} outside viewport`).toBeGreaterThanOrEqual(-1);
        expect(heading.right, `${width}px wcag=${wcag}: ${heading.selector} outside viewport`).toBeLessThanOrEqual(width + 1);
      }
    }
  }
});

test("first 320px consent banner is present without app-owned layout shift", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const shifts: Array<{ value: number; sources: string[] }> = [];
      Object.assign(window, { __layoutShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean; sources?: Array<{ node?: Node }> };
          if (!shift.hadRecentInput) shifts.push({ value: shift.value, sources: shift.sources?.map((source) => source.node?.nodeName || "unknown") || [] });
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    try {
      await page.goto("/");
      await expect(page.getByRole("complementary", { name: "Wybór analityki" })).toBeVisible();
      await page.waitForTimeout(1200);
      const shifts = await page.evaluate(() => (window as unknown as { __layoutShifts: Array<{ value: number; sources: string[] }> }).__layoutShifts);
      const cls = shifts.reduce((sum, shift) => sum + shift.value, 0);
      expect(cls, `attempt ${attempt + 1}: ${JSON.stringify(shifts)}`).toBeLessThan(0.10);
    } finally {
      await context.close();
    }
  }
});
