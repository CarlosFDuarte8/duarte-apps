import { expect, test } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";

const event = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";

test("shared metrics remain aligned at every public breakpoint", async ({ browser }) => {
  test.setTimeout(240_000);
  for (const width of [320, 390, 768, 1280]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
      const page = await context.newPage();
      try {
        for (const route of ["/volei", "/volei/lista-presenca"]) {
          await page.goto(route);
          const metrics = page.locator(".volley-metric");
          await expect(metrics).toHaveCount(route === "/volei" ? 4 : 5);
          const boxes = await metrics.evaluateAll(elements => elements.map(el => {
            const box = el.getBoundingClientRect();
            return { x: box.x, y: box.y, right: box.right, height: box.height };
          }));
          expect(boxes[0].y).toBe(boxes[1].y);
          expect(boxes[0].x).toBeLessThan(boxes[1].x);
          if (width >= 1024) expect(boxes[0].y).toBe(boxes.at(-1)!.y);
          expect(boxes.every(box => box.right <= width && box.height >= 130)).toBe(true);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        }
      } finally {
        await context.close();
      }
    }
  }
});

for (const width of [390, 1280]) {
  for (const theme of ["light", "dark"]) {
    test(`${width}px ${theme}: administrative pages share the volleyball layout`, async ({ page, context }, testInfo) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
      await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error" && /hydrat|server rendered|didn't match/i.test(message.text())) errors.push(message.text());
      });
      const routes = [
        "/admin/volei", "/admin/volei/membros", `/admin/volei/membros/${member}`,
        "/admin/volei/convidados", "/admin/volei/convidados/33333333-3333-4333-8333-333333333333", "/admin/volei/frequencia", `/admin/volei/frequencia/${event}`,
        "/admin/volei/notificacoes", "/admin/volei/notificacoes/55555555-5555-4555-8555-555555555555", "/admin/volei/ajuda", `/admin/volei/${event}`,
        `/admin/volei/${event}/quadra`, `/admin/volei/${event}/historico`, `/admin/volei/${event}/portaria`,
      ];
      for (const route of routes) {
        const response = await page.goto(route);
        expect(response?.status(), route).toBe(200);
        await expect(page).toHaveURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
        await expect(page.locator('main[data-slot="volley-page"]')).toBeVisible();
        await expect(page.locator("main main")).toHaveCount(0);
        await expect(page.locator('[data-slot="volley-hero"]').first()).toBeVisible();
        for (const metric of await page.locator(".volley-metric:visible").all()) {
          expect((await metric.boundingBox())!.height, route).toBeGreaterThanOrEqual(width < 700 ? 130 : 150);
        }
        for (const link of await page.locator('[data-slot="volley-hero"] a.sc-btn-ghost').all()) {
          await expect(link, route).toHaveCSS("color", "rgb(255, 255, 255)");
        }
        if (route === "/admin/volei/membros") {
          const name = await page.locator(".vm-member-name").first().boundingBox();
          const action = await page.locator(".vm-member-action").first().boundingBox();
          expect(name!.y + name!.height <= action!.y || name!.x + name!.width <= action!.x, "Member names and actions must not overlap").toBe(true);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), route).toBe(false);
        for (const field of await page.locator('.volley-content input[data-slot="input"]:visible:not([type="file"]), .volley-content select[data-slot="native-select"]:visible').all()) {
          await expect(field, route).toHaveCSS("min-height", "48px");
        }
        await page.screenshot({ path: testInfo.outputPath(`${route.replace(/\W/g, "-")}.png`), fullPage: true });
        if (route.endsWith("/portaria")) {
          await page.emulateMedia({ media: "print" });
          await expect(page.locator(".gate-sheet")).toBeVisible();
          await expect(page.locator(".gate-sheet h2")).toHaveCSS("font-size", "13px");
          await expect(page.locator(".gate-actions")).toBeHidden();
          await expect(page.locator(".volley-sidebar")).toBeHidden();
          await page.emulateMedia({ media: "screen" });
        }
      }
      expect(errors).toEqual([]);
    });
  }
}
