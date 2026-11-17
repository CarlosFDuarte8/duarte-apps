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
      for (const [target, route] of [[page, `/admin/volei/${game}/portaria`], [visitor, "/volei/lista-presenca"]] as const) {
        await target.goto(route);
        await target.emulateMedia({ media: "print" });
        const qr = target.locator('[data-slot="whatsapp-group-print"]');
        await expect(qr).toBeVisible();
        await expect(qr.locator("a")).toHaveAttribute("href", invitation);
        await expect(qr).toHaveCSS("color", "rgb(0, 0, 0)");
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
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("a full attendance list and WhatsApp QR fit on one A4 sheet", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
  await page.goto(settings);
  await page.getByLabel("Link de convite do WhatsApp").fill(invitation);
  await page.getByRole("button", { name: "Salvar link do grupo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link do grupo salvo." })).toBeVisible();
  await page.addInitScript(() => {
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
    localStorage.setItem("lista-presenca-v2", JSON.stringify({ [date]: {
      title: "Vôlei", deadline: "", guestsAfter: "", history: [],
      participants: Array.from({ length: 18 }, (_, index) => ({ id: String(index + 1), nome: `Participante de teste ${index + 1}`, status: "confirmado", order: index + 1 })),
    } }));
  });
  await page.goto("/volei/lista-presenca");
  const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Assinatura", exact: true }) });
  await expect(table.locator("tbody tr")).toHaveCount(18);
  await expect(page.locator('[data-slot="whatsapp-group-print"]')).toBeVisible();
  const pdf = await page.pdf({ path: testInfo.outputPath("lista-com-qr.pdf"), format: "A4", preferCSSPageSize: true, printBackground: true });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await page.goto(settings);
  await page.getByLabel("Link de convite do WhatsApp").fill("");
  await page.getByRole("button", { name: "Salvar link do grupo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Convite ocultado" })).toBeVisible();
});
