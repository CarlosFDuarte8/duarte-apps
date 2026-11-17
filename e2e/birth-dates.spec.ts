import { expect, test, type APIRequestContext } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";

const game = "/volei/jogo/11111111-1111-4111-8111-111111111111";
const configure = (request: APIRequestContext, input: object) =>
  request.post("http://127.0.0.1:3101/__test__/birth-date", { data: input });
test.afterEach(async ({ request }) => { await configure(request, { reset: true }); });

for (const [width, theme] of [[320, "dark"], [1280, "light"]] as const) {
  test(`${width}px ${theme}: existing member completes birth date once; only admin sees age`, async ({ page, context, request }, testInfo) => {
    test.setTimeout(150_000);
    await configure(request, {});
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
    await context.addCookies([{ name: "volley_device_v1", value: "a".repeat(64), domain: "127.0.0.1", path: "/" }]);
    await page.goto(game);
    const field = page.getByLabel("Data de nascimento", { exact: true });
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute("required", "");
    await page.getByRole("button", { name: "Confirmar minha presença" }).click();
    await expect(field).toBeVisible();
    expect(await field.evaluate(el => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
    await field.fill("2099-01-01");
    expect(await field.evaluate(el => (el as HTMLInputElement).validity.rangeOverflow)).toBe(true);
    await field.fill("2010-05-10");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("complete-birth-date.png"), fullPage: true });
    await page.getByRole("button", { name: "Confirmar minha presença" }).click();
    await expect(field).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Você está na lista!" })).toBeVisible();
    await page.getByRole("button", { name: /cancelar participação/ }).click();
    await page.getByRole("button", { name: "Sim, não vou" }).click();
    await expect(page.getByRole("button", { name: "Confirmar minha presença" })).toBeVisible();
    await expect(field).toHaveCount(0);
    await page.getByRole("button", { name: "Confirmar minha presença" }).click();
    await expect(page.getByRole("heading", { name: "Você está na lista!" })).toBeVisible();
    const html = await (await page.goto(game))!.text();
    expect(html).not.toContain("2010-05-10");
    await expect(page.getByText(/Menor de 18/)).toHaveCount(0);
    await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
    await page.goto("/admin/volei/membros");
    await expect(page.getByText(/anos · Menor de 18/)).toBeVisible();
    if (width < 768) await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await page.getByLabel("Grupo e situação").selectOption("minors");
    await expect(page.getByRole("status").filter({ hasText: "1 de 1 membros" })).toBeVisible();
    await page.getByLabel("Grupo e situação").selectOption("adults");
    await expect(page.getByRole("status").filter({ hasText: "0 de 1 membros" })).toBeVisible();
  });
}

test("new registration requires birth date and keeps membership approval", async ({ page, request }) => {
  test.setTimeout(120_000);
  await configure(request, { isNew: true });
  await page.goto(game);
  await page.getByLabel("Celular com DDD").fill("(61) 99999-1234");
  await page.getByRole("button", { name: "Continuar com meu celular" }).click();
  await expect(page.getByLabel("Seu nome completo")).toBeVisible();
  await page.getByLabel("Seu nome completo").fill("Nova participante");
  const field = page.getByLabel("Data de nascimento", { exact: true });
  await expect(field).toHaveAttribute("required", "");
  await page.getByRole("button", { name: "Solicitar aprovação do cadastro" }).click();
  expect(await field.evaluate(el => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
  await field.fill("2010-05-10");
  await page.getByRole("button", { name: "Solicitar aprovação do cadastro" }).click();
  await expect(page.getByText("Cadastro aguardando aprovação", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar minha presença" })).toHaveCount(0);
});

test("legacy personal link requests birth date before confirming", async ({ page, request }) => {
  test.setTimeout(120_000);
  await configure(request, { legacy: true });
  await page.goto(`/volei/${"a".repeat(64)}`);
  const field = page.getByLabel("Data de nascimento", { exact: true });
  await field.fill("2010-05-10");
  await page.getByRole("button", { name: "Eu vou", exact: true }).click();
  await expect(field).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Eu vou", exact: true })).toHaveAttribute("aria-pressed", "true");
});
