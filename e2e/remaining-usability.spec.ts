import { expect, test, type APIRequestContext } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";

const id = "11111111-1111-4111-8111-111111111111";
const game = `/volei/jogo/${id}`;
const configure = (request: APIRequestContext, input: object) => request.post("http://127.0.0.1:3101/__test__/usability", { data: input });
const birth = (request: APIRequestContext, input: object) => request.post("http://127.0.0.1:3101/__test__/birth-date", { data: input });
const device = { name: "volley_device_v1", value: "a".repeat(64), domain: "127.0.0.1", path: "/" };
const admin = { name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" };
test.beforeEach(async ({ request }) => { await configure(request, {}); });
test.afterEach(async ({ request, context }) => { await context.setOffline(false); await birth(request, { reset: true }); await configure(request, { reset: true }); });

for (const [width, theme] of [[320, "dark"], [1280, "light"]] as const) {
  test(`${width}px ${theme}: name searches preserve queue positions and call totals`, async ({ page, context, request }, testInfo) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
    await configure(request, { status: "espera" });
    await page.goto(game);
    const roster = page.locator(".game-roster");
    await roster.getByRole("button", { name: /Espera/ }).click();
    await roster.getByLabel("Buscar participante por nome", { exact: true }).fill("participante 3");
    await expect(roster.locator(".game-player-list > li")).toHaveCount(1);
    await expect(roster.locator(".game-player-position")).toHaveText("02");
    await roster.getByLabel("Tipo de participante", { exact: true }).selectOption("guests");
    await expect(roster.getByText("Nenhum participante encontrado", { exact: true })).toBeVisible();
    await roster.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(roster.locator(".game-player-list > li")).toHaveCount(2);
    await configure(request, { listScenario: true, pendingApproval: true });
    await context.addCookies([admin]);
    await page.goto(`/admin/volei/frequencia/${id}`);
    await expect(page.getByText("1 de 3 presentes", { exact: true })).toBeVisible();
    await page.getByLabel("Chegada", { exact: true }).selectOption("pending");
    await expect(page.locator(".vm-roll-call > label")).toHaveCount(2);
    await page.getByLabel("Tipo de participante", { exact: true }).selectOption("guests");
    await expect(page.locator(".vm-roll-call > label")).toHaveCount(1);
    if (width < 640) {
      const row = page.locator(".vm-roll-call > label").first();
      const text = row.locator(":scope > span:not([data-slot])").first();
      expect((await text.boundingBox())!.width).toBeGreaterThan((await row.boundingBox())!.width * .6);
    }
    await page.getByLabel("Buscar participante por nome", { exact: true }).fill("CONVIDADO teste");
    await expect(page.locator(".vm-roll-call > label")).toHaveCount(1);
    await page.getByRole("button", { name: "Concluir chamada", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("1 pessoas marcadas como presentes");
    await expect(dialog).toContainText("2 restantes serão registradas");
    await dialog.getByRole("button", { name: "Revisar chamada" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("filtered-call.png"), fullPage: true });
  });
}

test("today tasks show real counts and approvals open with the pending filter", async ({ page, context, request }, testInfo) => {
  test.setTimeout(120_000);
  await configure(request, { listScenario: true, pendingApproval: true });
  await context.addCookies([admin]);
  await page.goto("/admin/volei?mes=2026-01");
  const tasks = page.getByRole("region", { name: "Tarefas do jogo de hoje" });
  await expect(tasks).toContainText("1 cadastro aguardando aprovação");
  await expect(tasks).toContainText("1 de 3 presentes");
  await expect(tasks.getByRole("link", { name: /Adicionar participantes/ })).toHaveAttribute("href", `/admin/volei/${id}#adicionar-participante`);
  await expect(tasks.getByRole("link", { name: /Imprimir lista/ })).toHaveAttribute("href", `/admin/volei/${id}/portaria`);
  await page.screenshot({ path: testInfo.outputPath("today-tasks.png"), fullPage: true });
  await tasks.getByRole("link", { name: /Aprovar cadastros/ }).click();
  await expect(page).toHaveURL(/grupo=pending/, { timeout: 30_000 });
  await expect(page.getByRole("status").filter({ hasText: "1 de 2 membros" })).toBeVisible();
  await configure(request, { finalized: true });
  await page.goto("/admin/volei");
  await expect(tasks.getByRole("link", { name: /Adicionar participantes/ })).toHaveCount(0);
  await expect(tasks.getByRole("link", { name: /Revisar chamada concluída/ })).toBeVisible();
  await configure(request, { noGame: true });
  await page.reload();
  await expect(tasks).toContainText("Não há encontro marcado para hoje");
  await expect(tasks.getByRole("link", { name: "Agendar um encontro", exact: true })).toBeVisible();
});

test("offline registration preserves edits and retries only when explicitly requested", async ({ page, request, context }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await birth(request, { isNew: true });
  await page.goto(game);
  await page.getByLabel("Celular com DDD", { exact: true }).fill("(61) 99999-1234");
  await page.getByRole("button", { name: "Continuar com meu celular" }).click();
  await page.getByLabel("Seu nome completo").fill("Nome preservado");
  await page.getByLabel("Data de nascimento", { exact: true }).fill("1995-01-01");
  await page.getByRole("button", { name: "Continuar com os dados da turma" }).click();
  await page.getByLabel("Você é aluno?", { exact: true }).selectOption("no");
  let writes = 0;
  let refreshes = 0;
  page.on("request", request => {
    if (request.method() === "POST" && request.url().includes(game)) writes++;
    if (request.method() === "GET" && request.url().includes(game) && request.url().includes("_rsc")) refreshes++;
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Solicitar aprovação do cadastro" }).click();
  await expect(page.locator(".volley-action-feedback")).toContainText("A ação não foi enviada");
  await expect(page.getByLabel("Seu nome completo")).toHaveValue("Nome preservado");
  expect(writes).toBe(0);
  const before = refreshes;
  await page.locator("#volley-main").focus();
  await page.clock.fastForward(31_000);
  expect(refreshes).toBe(before);
  await expect(page.getByLabel("Seu nome completo")).toHaveValue("Nome preservado");
  await page.getByLabel("Seu nome completo").fill("Nome atualizado antes de tentar");
  await context.setOffline(false);
  await expect(page.locator(".volley-network-status")).toHaveCount(0);
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByText("Cadastro aguardando aprovação", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".game-identity")).toContainText("Nome atualizado antes de tentar");
  expect(writes).toBe(1);
});

test("a lost response is verified without replaying an accepted registration", async ({ page, context, request }) => {
  test.setTimeout(120_000);
  await birth(request, { birthDate: "1995-01-01" });
  await context.addCookies([device]);
  await page.goto(game);
  let writes = 0;
  await page.route(`**${game}`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    writes++;
    await route.fetch();
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Confirmar minha presença", exact: true }).click();
  await expect(page.locator(".volley-action-feedback").first()).toContainText("Não recebemos a confirmação", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Você está na lista!" })).toHaveCount(0);
  await page.getByRole("button", { name: "Atualizar situação", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Você está na lista!" })).toBeVisible({ timeout: 30_000 });
  expect(writes).toBe(1);
});

test("a route query failure can be retried without a document reload", async ({ page, request }) => {
  test.setTimeout(120_000);
  await configure(request, { failEvents: true });
  await page.goto("/volei");
  await expect(page.getByRole("heading", { name: "Não foi possível atualizar esta tela" })).toBeVisible();
  await expect(page.locator('main[data-slot="volley-page"]')).toHaveCount(1);
  const origin = await page.evaluate(() => performance.timeOrigin);
  await configure(request, {});
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jogos e presenças", exact: true })).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
});

test("offline guest inclusion can be resubmitted without a stuck local lock", async ({ page, context }) => {
  test.setTimeout(120_000);
  await context.addCookies([admin]);
  await page.goto(`/admin/volei/${id}`);
  await page.getByRole("button", { name: "Adicionar participante", exact: true }).click();
  await page.getByLabel("Como deseja adicionar?").selectOption("guest");
  await page.getByLabel("Responsável pelo convidado").selectOption("22222222-2222-4222-8222-222222222222");
  const name = page.getByLabel("Nome completo do convidado");
  await name.fill("Convidado preservado");
  let writes = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().includes(`/admin/volei/${id}`)) writes++; });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Adicionar convidado ao jogo" }).click();
  await expect(page.locator(".volley-action-feedback")).toContainText("A ação não foi enviada");
  expect(writes).toBe(0);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Convidado preservado:" })).toBeVisible({ timeout: 30_000 });
  await expect(name).toHaveValue("");
  expect(writes).toBe(1);
});

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: keyboard focus, dialog recovery and readable list controls`, async ({ page, context, request }) => {
    await configure(request, {});
    await context.addCookies([device]);
    await page.addInitScript(value => localStorage.setItem("volley-theme", value), theme);
    await page.goto(game);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await expect(skip).toHaveCSS("color", theme === "dark" ? "rgb(250, 250, 250)" : "rgb(0, 31, 59)");
    await page.keyboard.press("Enter");
    await expect(page.locator("#volley-main")).toBeFocused();
    const search = page.locator(".game-roster").getByLabel("Buscar participante por nome", { exact: true });
    await search.focus();
    await expect(search).toHaveCSS("outline-style", "solid");
    await expect(search).toHaveCSS("outline-width", "3px");
    const contrasts = await page.locator(".game-roster-filters button").evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      const luminance = (value: string) => {
        const components = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
        return components[0] * .2126 + components[1] * .7152 + components[2] * .0722;
      };
      const fg = luminance(style.color), bg = luminance(style.backgroundColor);
      return { name: element.textContent, ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
    }));
    for (const control of contrasts) expect(control.ratio, control.name ?? "control").toBeGreaterThanOrEqual(4.5);
    const cancel = page.getByRole("button", { name: /Não vou mais/ });
    await cancel.click();
    const dialog = page.getByRole("dialog", { name: "Liberar sua vaga?" });
    await expect(dialog.getByRole("button", { name: "Voltar", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(cancel).toBeFocused();
  });
}
