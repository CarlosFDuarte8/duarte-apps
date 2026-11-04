import { expect, test } from "@playwright/test";

const game = "/volei/jogo/11111111-1111-4111-8111-111111111111";
for (const width of [320, 390, 768, 1280]) {
  for (const theme of ["light", "dark"]) {
    test(`${width}px ${theme}: public pages fit their cards`, async ({ page, context }, testInfo) => {
      const browserErrors: string[] = [];
      page.on("pageerror", error => browserErrors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error" && /hydrat|server rendered|didn't match/i.test(message.text())) {
          browserErrors.push(message.text());
        }
      });
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(t => localStorage.setItem("volley-theme", t), theme);
      for (const route of ["/volei", game, "/volei/meu-cadastro", "/volei/ajuda", "/volei/entrar"]) {
        if (route === "/volei/meu-cadastro") {
          await context.addCookies([{ name: "volley_device_v1", value: "a".repeat(64), domain: "127.0.0.1", path: "/" }]);
        }
        await page.goto(route);
        await expect(page.locator(".volley-content")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-volley-theme", theme);
        const overflow = await page.evaluate(() => {
          const issues: string[] = [];
          if (document.documentElement.scrollWidth > innerWidth + 1) issues.push("page");
          for (const el of document.querySelectorAll(".volley-content input, .volley-content select, .volley-content textarea")) {
            const box = el.getBoundingClientRect();
            if (!box.width || !box.height) continue;
            const parent = el.parentElement!.getBoundingClientRect();
            if (box.right > parent.right + 1 || box.left < parent.left - 1 || box.right > innerWidth + 1) issues.push(el.outerHTML.slice(0, 120));
          }
          return issues;
        });
        expect(overflow, route).toEqual([]);
        if (route === "/volei") {
          const wrappedLabels = await page.locator(".vx-overview-stat > div > span").evaluateAll(elements =>
            elements.filter(el => el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) + 1).map(el => el.textContent),
          );
          expect(wrappedLabels).toEqual([]);
        }
        if (theme === "dark") {
          await expect.poll(() => page.locator(".volley-card, .vx-event-jumps, .vx-overview-stat").evaluateAll(elements => {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext("2d")!;
            return elements.filter(el => {
              ctx.clearRect(0, 0, 1, 1);
              ctx.fillStyle = getComputedStyle(el).backgroundColor;
              ctx.fillRect(0, 0, 1, 1);
              const [r,g,b,a] = ctx.getImageData(0, 0, 1, 1).data;
              return a > 128 && Math.min(r,g,b) > 220;
            }).map(el => el.className);
          }), { message: `Dark surfaces on ${route}` }).toEqual([]);
        }
        if (route === game) {
          await expect(page.locator(".game-summary-strip")).toContainText("15 vagas disponíveis");
          await expect(page.locator(".game-capacity")).toContainText("15 vagas livres");
          await expect(page.locator(".game-capacity")).toContainText("1 vaga reservada");
          await expect(page.locator(".game-update-time time")).toHaveAttribute("datetime", /T/);
          await page.getByRole("button", { name: "Espera", exact: false }).click();
          await expect(page.locator(".game-player-list")).toContainText("Participante 3");
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({ path: testInfo.outputPath(`${route.replace(/\W/g, "-")}.png`), fullPage: true });
        expect(browserErrors, `Browser errors on ${route}`).toEqual([]);
      }
    });
  }
}

test("dark preference applies before hydration", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: true });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("volley-theme", "dark"));
  await page.route("**/_next/**/*.js*", route => route.abort());
  await page.goto("/volei");
  await expect(page.locator("html")).toHaveAttribute("data-volley-theme", "dark");
  await context.close();
});

test("theme selection persists across navigation and reload", async ({ page }) => {
  await page.goto("/volei");
  await page.getByRole("button", { name: "Escolher tema" }).click();
  await page.getByRole("menuitemradio", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-volley-theme", "dark");
  await page.locator(".volley-sidebar").getByRole("link", { name: "Meu cadastro", exact: true }).click();
  await expect(page).toHaveURL(/meu-cadastro/);
  await expect(page.locator("html")).toHaveAttribute("data-volley-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-volley-theme", "dark");
});

test("failed clipboard fallback never reports success", async ({ page }) => {
  await page.goto("/volei");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw Error("denied"); } } });
    document.execCommand = () => false;
  });
  await page.getByRole("button", { name: "Copiar link", exact: true }).first().click();
  await expect(page.locator(".volley-operation[role='alert']")).toContainText("Não foi possível copiar");
  await expect(page.getByRole("button", { name: "Link copiado", exact: true })).toHaveCount(0);
});
