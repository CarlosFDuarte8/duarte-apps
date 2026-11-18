import { expect, test } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";

const settings = "/admin/volei/configuracoes";
const game = "11111111-1111-4111-8111-111111111111";
const invitation = "https://chat.whatsapp.com/AbC123def456GhI789jKlM";

for (const [width, theme] of [[390, "dark"], [1280, "light"]] as const) {
  test(`${width}px ${theme}: configure, display, print and remove the WhatsApp invitation`, async ({ page, context, browser }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
    await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
    await page.goto(settings);
    await page.getByLabel("Link de convite do WhatsApp").fill("https://example.com/invalid");
    await page.getByRole("button", { name: "Salvar link do grupo" }).click();
    await expect(page.getByRole("main").getByRole("alert").filter({ hasText: "Cole o link de convite" })).toBeVisible();
    await page.getByLabel("Link de convite do WhatsApp").fill(invitation + "?mode=gi_t");
    await page.getByRole("button", { name: "Salvar link do grupo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link do grupo salvo." })).toBeVisible();
    await expect(page.locator('[data-slot="whatsapp-group-card"] a').first()).toHaveAttribute("href", invitation);
    await page.screenshot({ path: testInfo.outputPath("admin-settings.png"), fullPage: true });

    // A visitor sees the same saved invitation without needing an account.
    const publicContext = await browser.newContext({ viewport: { width, height: 1000 } });
    await publicContext.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
    const visitor = await publicContext.newPage();
    const browserErrors: string[] = [];
    visitor.on("pageerror", error => browserErrors.push(error.message));
    visitor.on("console", message => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    let documents = 0;
    visitor.on("request", request => { if (request.isNavigationRequest()) documents++; });
    await visitor.clock.install();
    try {
      for (const route of ["/volei", `/volei/jogo/${game}`]) {
        await visitor.goto(route);
        const card = visitor.locator('[data-slot="whatsapp-group-card"]');
        await expect(card.getByRole("link", { name: "Solicitar entrada", exact: true })).toHaveAttribute("href", invitation);
        const qr = card.getByRole("img");
        await expect(qr).toHaveAttribute("src", /^data:image\/png;base64,/);
        expect(await qr.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth === 512)).toBe(true);
        expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
      // The invitation must survive background RSC refreshes without reloading
      // the document or losing the image's client component reference.
      const origin = await visitor.evaluate(() => performance.timeOrigin);
      const documentsBefore = documents;
      for (let refresh = 0; refresh < 2; refresh++) {
        const response = visitor.waitForResponse(response => {
          const url = new URL(response.url());
          return url.pathname === `/volei/jogo/${game}` && url.searchParams.has("_rsc");
        });
        await visitor.clock.fastForward(31_000);
        await (await response).finished();
        await visitor.clock.runFor(1000);
        await expect(visitor.locator('[data-slot="whatsapp-group-card"] img')).toBeVisible();
        expect(documents).toBe(documentsBefore);
        expect(await visitor.evaluate(() => performance.timeOrigin)).toBe(origin);
      }
      expect(browserErrors).toEqual([]);
      for (const [target, route] of [[page, `/admin/volei/${game}/portaria`], [visitor, "/volei/lista-presenca"]] as const) {
        await target.goto(route);
        await target.emulateMedia({ media: "print" });
        const qr = target.locator('[data-slot="whatsapp-group-print"]');
        await expect(qr).toBeVisible();
        await expect(qr.locator("a")).toHaveAttribute("href", invitation);
        await expect(qr).toHaveCSS("color", "rgb(0, 0, 0)");
        const logo = target.locator('[data-slot="volley-print-logo"]');
        await expect(logo).toBeVisible();
        expect(await logo.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
        await expect(target.locator(".volley-sidebar")).toBeHidden();
        await target.screenshot({ path: testInfo.outputPath(route.endsWith("portaria") ? "gate-print.png" : "local-print.png"), fullPage: true });
        await target.emulateMedia({ media: "screen" });
      }
      await page.goto(settings);
      await page.getByLabel("Link de convite do WhatsApp").fill("");
      await page.getByRole("button", { name: "Salvar link do grupo" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Convite ocultado" })).toBeVisible();
      await visitor.goto("/volei");
      await expect(visitor.locator('[data-slot="whatsapp-group-card"]')).toHaveCount(0);
      await page.goto(`/admin/volei/${game}/portaria`);
      await expect(page.locator('[data-slot="whatsapp-group-print"]')).toHaveCount(0);
    } finally {
      await publicContext.close();
    }
  });
}

test("visitors cannot open the invitation settings", async ({ page }) => {
  await page.goto(settings);
  await expect(page).toHaveURL(/\/admin\/login/, { timeout: 30_000 });
});

test("attendance sheets fill unused lines up to 18 and fit on one A4 sheet", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
  await page.goto(settings);
  await page.getByLabel("Link de convite do WhatsApp").fill(invitation);
  await page.getByRole("button", { name: "Salvar link do grupo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link do grupo salvo." })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/admin/volei/${game}/portaria`);
  const members = page.getByRole("table", { name: "Membros · 1", exact: true });
  await expect(members.locator("tbody tr")).toHaveCount(1);
  const manual = page.getByRole("table", { name: "Preenchimento manual · 17", exact: true });
  await expect(manual.locator('[data-slot="blank-print-row"]')).toHaveCount(17);
  await expect(page.locator(".gate-sheet tbody tr")).toHaveCount(18);
  const gatePDF = await page.pdf({ path: testInfo.outputPath("portaria-com-linhas.pdf"), format: "A4", preferCSSPageSize: true, printBackground: true });
  expect(gatePDF.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await page.addInitScript(() => {
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
    localStorage.setItem("lista-presenca-v2", JSON.stringify({ [date]: {
      title: "Vôlei", deadline: "", guestsAfter: "", history: [],
      participants: Array.from({ length: 7 }, (_, index) => ({ id: String(index + 1), nome: `Participante de teste ${index + 1}`, status: "confirmado", order: index + 1 })),
    } }));
  });
  await page.goto("/volei/lista-presenca");
  const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Assinatura", exact: true }) });
  await expect(table.locator("tbody tr")).toHaveCount(18);
  await expect(table.locator('[data-slot="blank-print-row"]')).toHaveCount(11);
  await expect(page.locator('[data-slot="whatsapp-group-print"]')).toBeVisible();
  await expect(page.locator('[data-slot="volley-print-logo"]')).toBeVisible();
  const pdf = await page.pdf({ path: testInfo.outputPath("lista-com-qr.pdf"), format: "A4", preferCSSPageSize: true, printBackground: true });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await page.goto(settings);
  await page.getByLabel("Link de convite do WhatsApp").fill("");
  await page.getByRole("button", { name: "Salvar link do grupo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Convite ocultado" })).toBeVisible();
});
