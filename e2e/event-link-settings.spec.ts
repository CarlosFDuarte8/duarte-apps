import { expect, test } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";

const id = "11111111-1111-4111-8111-111111111111";
const game = `/volei/jogo/${id}`;
const adminGame = `/admin/volei/${id}`;
const control = "http://127.0.0.1:3101/__test__/usability";
test.beforeEach(async ({ request }) => { await request.post(control, { data: {} }); });
test.afterEach(async ({ request }) => { await request.post(control, { data: { reset: true } }); });

test("existing games show neither button and reject calendar downloads until enabled", async ({ page, request }) => {
  for (const path of ["/volei", game]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: /Salvar.*calendário/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Abrir rota" })).toHaveCount(0);
    await expect(page.locator(".volley-event-links")).toHaveCount(0);
  }
  expect((await request.get(`${game}/calendario`)).status()).toBe(404);
});

for (const [width, theme] of [[390, "dark"], [1280, "light"]] as const) {
  test(`${width}px ${theme}: admin persists independent opt-ins and the exact venue link`, async ({ page, context, request }, testInfo) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
    await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
    await page.goto(adminGame);
    const calendar = page.getByLabel("Exibir botão Salvar no calendário");
    const directions = page.getByLabel("Exibir botão Abrir rota");
    const link = page.getByLabel("Link do local", { exact: true });
    await expect(calendar).not.toBeChecked();
    await expect(directions).not.toBeChecked();
    await directions.check();
    await expect(link).toHaveAttribute("required", "");
    await page.getByRole("button", { name: "Salvar detalhes", exact: true }).click();
    expect(await link.evaluate(element => (element as HTMLInputElement).validity.valueMissing)).toBe(true);
    const destination = "https://maps.app.goo.gl/MinhaQuadra?entrada=2";
    await link.fill(destination);
    await calendar.check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator(".volley-field-group").screenshot({ path: testInfo.outputPath("event-link-settings.png") });
    const save = async () => {
      const response = page.waitForResponse(response => response.request().method() === "POST" && response.url().includes(adminGame));
      await page.getByRole("button", { name: "Salvar detalhes", exact: true }).click();
      await (await response).finished();
    };
    await save();
    await page.reload();
    await expect(calendar).toBeChecked();
    await expect(directions).toBeChecked();
    await expect(link).toHaveValue(destination);
    for (const path of ["/volei", game]) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: "Salvar no calendário" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Abrir rota" })).toHaveAttribute("href", destination);
    }
    expect((await request.get(`${game}/calendario`)).status()).toBe(200);
    await page.goto(adminGame);
    await calendar.uncheck();
    await save();
    expect((await request.get(`${game}/calendario`)).status()).toBe(404);
    await page.goto(game);
    await expect(page.getByRole("link", { name: "Salvar no calendário" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Abrir rota" })).toHaveAttribute("href", destination);
    await page.goto(adminGame);
    await directions.uncheck();
    await save();
    await page.reload();
    await expect(link).toHaveValue(destination);
    await page.goto(game);
    await expect(page.getByRole("link", { name: "Abrir rota" })).toHaveCount(0);
  });
}
