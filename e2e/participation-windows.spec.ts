import { expect, test, type APIRequestContext } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";
const id = "11111111-1111-4111-8111-111111111111";
const game = `/volei/jogo/${id}`;
const member = "22222222-2222-4222-8222-222222222222";
const configure = (request: APIRequestContext, input: object) => request.post("http://127.0.0.1:3101/__test__/participation", { data: input });
const device = { name: "volley_device_v1", value: "a".repeat(64), domain: "127.0.0.1", path: "/" };
test.afterEach(async ({ request }) => { await configure(request, { reset: true }); });

for (const [width,theme] of [[320,"dark"],[1280,"light"]] as const) {
  test(`${width}px ${theme}: review asks birth first, hides evening class for minors and preserves a blocked registration`, async ({ page,context,request },testInfo) => {
    test.setTimeout(150_000);
    await configure(request, { birthDate: null,reviewed: false });
    await context.addCookies([device]);
    await page.setViewportSize({ width,height: 900 });
    await page.addInitScript(value => localStorage.setItem("volley-theme",value),theme);
    await page.goto(game);
    const trigger = page.getByRole("button", { name: "Confirmar minha presença",exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Confira seus dados" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Você é aluno?", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Continuar com os dados da turma" }).click();
    await expect(dialog.getByLabel("Você é aluno?", { exact: true })).toHaveCount(0);
    await dialog.getByLabel("Data de nascimento", { exact: true }).fill("2010-01-01");
    await dialog.getByRole("button", { name: "Continuar com os dados da turma" }).click();
    await dialog.getByLabel("Você é aluno?", { exact: true }).selectOption("yes");
    await dialog.getByRole("checkbox").first().check();
    const hour = dialog.getByLabel("Hora de início da aula", { exact: true });
    await expect(hour.locator('option[value="18"]')).toHaveCount(0);
    await hour.selectOption("17");
    await dialog.getByLabel("Minutos de início da aula", { exact: true }).selectOption("00");
    await page.screenshot({ path: testInfo.outputPath("profile-review.png"),fullPage: true });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth+1)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(hour).toHaveValue("17");
    await dialog.getByRole("button", { name: "Salvar e continuar" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Dados do cadastro atualizados.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aguardando abertura das inscrições" })).toBeDisabled();
    await expect(page.locator(".game-signup")).toContainText("Suas inscrições abrem");
    await expect(page.getByRole("heading", { name: "Você está na lista!" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("Data de nascimento", { exact: true })).toHaveCount(0);
    const html = await (await page.goto(game))!.text();
    expect(html).not.toContain("2010-01-01");
    await expect(page.getByText(/Menor de 18/)).toHaveCount(0);
    await context.addCookies([{ name: "sb-127-auth-token",value: fixtureAdminSession(),domain: "127.0.0.1",path: "/" }]);
    await page.goto(`/admin/volei/membros/${member}`);
    await expect(page.getByText(/Solicitação pendente/)).toContainText("17:00");
    await expect(page.getByLabel("Hora de início da aula", { exact: true })).toHaveValue("17");
    await expect(page.getByRole("button", { name: "Salvar turma validada" })).toBeVisible();
  });
}
test("public game and home show the personal opening without publishing class or age", async ({ page,context,request }) => {
  test.setTimeout(150_000);
  await context.addCookies([device]);
  for (const [scenario,time] of [[{ student: true },"00:00"],[{ student: true,wrongDay: true },"22:00"],[{ student: true,classTime: "17:00" },"22:00"],[{ student: true,birthDate: "2010-01-01" },"08:00"]] as const) {
    await configure(request,scenario);
    const html = await (await page.goto(game))!.text();
    expect(html).not.toContain("1995-01-01");
    expect(html).not.toContain("2010-01-01");
    await expect(page.getByText(time,{ exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aguardando abertura das inscrições" })).toBeDisabled();
    await expect(page.locator(".game-signup")).toContainText("Suas inscrições abrem");
  }
  await page.goto("/volei");
  await expect(page.locator('[data-slot="personal-game-status"]')).toContainText("Suas inscrições abrem");
  await expect(page.getByRole("link", { name: "Consultar minha inscrição",exact: true })).toBeVisible();
});
test("an existing birth date is prefilled and adults can declare their class neutrally", async ({ page,context,request }) => {
  await configure(request, { reviewed: false });
  await context.addCookies([device]);
  await page.goto(game);
  await page.getByRole("button", { name: "Confirmar minha presença",exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Confira seus dados" });
  await expect(dialog.getByLabel("Data de nascimento", { exact: true })).toHaveValue("1995-01-01");
  await dialog.getByRole("button", { name: "Continuar com os dados da turma" }).click();
  await dialog.getByLabel("Você é aluno?", { exact: true }).selectOption("yes");
  await expect(dialog.getByLabel("Hora de início da aula", { exact: true }).locator('option[value="18"]')).toHaveCount(1);
  await expect(dialog).not.toContainText("prioridade");
});
test("legacy waiter reviews private data without cancelling or losing the queue entry", async ({ page,request }) => {
  test.setTimeout(120_000);
  await configure(request, { legacy: true,status: "espera",reviewed: false });
  await page.goto(`/volei/${"a".repeat(64)}`);
  await expect(page.getByText(/O horário original da sua inscrição será mantido/)).toBeVisible();
  await page.getByRole("button", { name: "Conferir meus dados",exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Confira seus dados" });
  await dialog.getByRole("button", { name: "Continuar com os dados da turma" }).click();
  await dialog.getByLabel("Você é aluno?", { exact: true }).selectOption("no");
  await dialog.getByRole("button", { name: "Salvar e continuar" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Na lista de espera",exact: true })).toHaveAttribute("aria-pressed","true");
  await expect(page.getByText("Dados do cadastro atualizados.",{ exact: true })).toBeVisible();
});
