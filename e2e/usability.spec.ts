import { expect, test, type APIRequestContext } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";

const id = "11111111-1111-4111-8111-111111111111";
const game = `/volei/jogo/${id}`;
const configure = (request: APIRequestContext, input: object) => request.post("http://127.0.0.1:3101/__test__/usability", { data: input });
const device = { name: "volley_device_v1", value: "a".repeat(64), domain: "127.0.0.1", path: "/" };
test.afterEach(async ({ request }) => { await configure(request, { reset: true }); });

for (const [width, theme] of [[320, "dark"], [390, "light"]] as const) {
  test(`${width}px ${theme}: mobile puts the next game action before metrics`, async ({ page, request }, testInfo) => {
    await configure(request, { calendarEnabled: true });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text()); });
    await page.goto("/volei");
    const action = page.locator(".vx-feature-actions a").first();
    await expect(action).toHaveAttribute("href", `${game}#minha-presenca`);
    const box = (await action.boundingBox())!;
    const metrics = (await page.locator('[data-mobile-compact="true"]').last().boundingBox())!;
    expect(box.y).toBeLessThan(metrics.y);
    expect(box.y + box.height).toBeLessThan(800);
    await expect(page.locator(".vx-feature h2")).toHaveCSS("font-size", "20px");
    await expect(page.locator(".vx-feature").getByRole("link", { name: "Salvar no calendário" })).toHaveCSS("color", theme === "dark" ? "rgb(250, 250, 250)" : "rgb(255, 255, 255)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("mobile-home.png"), fullPage: true });
    await action.click();
    await expect(page.locator("#minha-presenca")).toBeInViewport({ timeout: 30_000 });
    expect(errors).toEqual([]);
  });
}

test("identified home keeps a closed game's confirmation and offers management", async ({ page, context, request }) => {
  await configure(request, { closed: true });
  await context.addCookies([device]);
  await page.goto("/volei");
  await expect(page.locator('[data-slot="personal-game-status"]')).toContainText("Você está confirmado");
  await expect(page.getByRole("link", { name: "Gerenciar minha presença" })).toHaveAttribute("href", `${game}#minha-presenca`);
});

test("home and participation show member and guest positions separately", async ({ page, context, request }) => {
  await configure(request, { status: "espera" });
  await context.addCookies([device]);
  await page.goto("/volei");
  await expect(page.locator('[data-slot="personal-game-status"]')).toContainText("1º na fila de membros");
  await page.getByRole("link", { name: "Acompanhar minha posição" }).click();
  await expect(page.locator('[data-slot="queue-position"]').first()).toContainText("Você é o 1º na fila de membros");
  await expect(page.locator('[data-slot="queue-position"]').last()).toContainText("Seu convidado é o 1º na fila de convidados");
  await expect(page.getByText(/A promoção depende das vagas/)).toBeVisible();
});

test("Meu cadastro identifies an existing member directly and handles unknown phones", async ({ page, request }) => {
  await configure(request, { bound: false });
  await page.goto("/volei/meu-cadastro");
  await page.getByLabel("Celular com DDD", { exact: true }).fill("(61) 99999-1234");
  await page.getByRole("button", { name: "Acessar meu cadastro" }).click();
  await expect(page.getByText("Não encontramos um cadastro", { exact: false })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Celular com DDD", { exact: true }).fill("(61) 99999-9999");
  await page.getByRole("button", { name: "Acessar meu cadastro" }).click();
  await expect(page.getByRole("heading", { name: "Acesse com seu celular" })).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Foto de identificação" })).toBeVisible();
});

test("direct access rejects a different device", async ({ page, request }) => {
  await configure(request, {});
  await page.goto("/volei/meu-cadastro");
  await page.getByLabel("Celular com DDD", { exact: true }).fill("(61) 99999-9999");
  await page.getByRole("button", { name: "Acessar meu cadastro" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "outro aparelho" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Acesse com seu celular" })).toBeVisible();
});

test("calendar download contains public metadata, uses Brasília time, and route links to the venue", async ({ page, request }) => {
  await configure(request, { calendarEnabled: true, directionsEnabled: true, directionsURL: "https://maps.app.goo.gl/Quadra" });
  await page.goto(game);
  await expect(page.getByRole("link", { name: "Abrir rota" })).toHaveAttribute("href", "https://maps.app.goo.gl/Quadra");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Salvar no calendário" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^volei-\d{4}-\d{2}-\d{2}\.ics$/);
  const response = await request.get(`${game}/calendario`);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  const content = await response.text();
  expect(content).toContain("T230000Z");
  expect(content).not.toMatch(/1995-01-01|5561999999999|ATTENDEE|Participante/);
  expect((await request.get("/volei/jogo/invalid/calendario")).status()).toBe(404);
});

test("administrator finds members by phone and can switch between new members and guests", async ({ page, context, request }, testInfo) => {
  await configure(request, {});
  await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
  await page.goto(`/admin/volei/${id}`);
  await page.getByRole("button", { name: "Adicionar participante", exact: true }).click();
  await page.getByLabel("Buscar membro por nome ou telefone").fill("(61) 99999-9999");
  await page.getByLabel("Membro para incluir").selectOption("22222222-2222-4222-8222-222222222222");
  await page.getByRole("button", { name: "Incluir membro no jogo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "participação registrada" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Como deseja adicionar?").selectOption("new");
  await page.getByLabel("Nome completo do novo membro").fill("Novo participante");
  await page.getByLabel("Celular com DDD", { exact: true }).fill("(61) 99999-1234");
  const birthDate = page.getByLabel("Data de nascimento", { exact: true });
  await expect(birthDate).toHaveAttribute("required", "");
  await birthDate.fill("1995-01-01");
  await page.getByRole("button", { name: "Cadastrar e incluir no jogo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Novo participante: confirmado" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Como deseja adicionar?").selectOption("guest");
  await expect(page.getByLabel("Responsável pelo convidado")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("admin-add-participant.png"), fullPage: true });
});
