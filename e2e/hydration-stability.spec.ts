import { expect, test, type Page } from "@playwright/test";
import { fixtureAdminSession } from "./admin-session";

function browserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("overview refreshes in the background without reloading or resetting the menu", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([{ name: "sb-127-auth-token", value: fixtureAdminSession(), domain: "127.0.0.1", path: "/" }]);
  const errors = browserErrors(page);
  let documents = 0;
  let refreshes = 0;
  page.on("request", request => {
    if (request.isNavigationRequest()) documents++;
    const url = new URL(request.url());
    if (url.pathname === "/admin/volei" && url.searchParams.has("_rsc")) refreshes++;
  });
  await page.goto("/admin/volei");
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Recolher menu lateral" }).click();
  const origin = await page.evaluate(() => performance.timeOrigin);
  const before = refreshes;
  async function advanceRefresh() {
    const response = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/admin/volei" && url.searchParams.has("_rsc");
    });
    await page.clock.fastForward(31_000);
    await (await response).finished();
    // Flush the completed transition before advancing the next interval.
    await page.clock.runFor(1000);
  }
  await advanceRefresh();
  await expect.poll(() => refreshes).toBeGreaterThan(before);
  await expect(page.getByRole("button", { name: "Expandir menu lateral" })).toBeVisible();
  await advanceRefresh();
  await expect.poll(() => refreshes).toBeGreaterThan(before + 1);
  await expect(page.getByRole("button", { name: "Expandir menu lateral" })).toBeVisible();
  await expect(page.locator('main[data-slot="volley-page"]')).toHaveCount(1);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(documents).toBe(1);
  expect(errors).toEqual([]);
});

test("theme survives public navigation, browser back and reload without hydration errors", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = browserErrors(page);
  await page.addInitScript(() => localStorage.setItem("volley-theme", "dark"));
  await page.goto("/volei");
  await expect(page.locator("html")).toHaveAttribute("data-volley-theme", "dark");
  await page.locator(".volley-sidebar").getByRole("link", { name: "Acesso administrativo", exact: true }).click();
  await expect(page).toHaveURL(/\/volei\/entrar$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/volei$/);
  await page.reload();
  await expect(page.locator(".volley-app")).toHaveAttribute("data-ui", "quadra");
  await expect(page.locator('main[data-slot="volley-page"]')).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-volley-theme", "dark");
  expect(errors).toEqual([]);
});

test("theme initialization remains safe when React recovers the document on the client", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = browserErrors(page);
  let documents = 0;
  page.on("request", request => { if (request.isNavigationRequest()) documents++; });
  await page.addInitScript(() => localStorage.setItem("volley-theme", "dark"));
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route("**/_next/**/*.js*", async route => {
    await scriptsReady;
    await route.continue();
  });
  await page.goto("/volei", { waitUntil: "domcontentloaded" });
  // Simulate old markup before the actual browser bootstrap hydrates it.
  await page.locator(".volley-brand > div").evaluate(element => {
    element.firstChild!.textContent = "Previous version";
  });
  releaseScripts();
  await page.getByRole("button", { name: "Escolher tema" }).click();
  await expect.poll(() => errors.some(message => /Hydration failed/.test(message))).toBe(true);
  await expect(page.getByRole("heading", { name: "Jogos e presenças", exact: true })).toBeVisible();
  await expect(page.locator(".volley-brand > div")).toContainText("QUADRA");
  await expect(page.locator("html")).toHaveAttribute("data-volley-theme", "dark");
  expect(errors.filter(message => !/Hydration failed/.test(message))).toEqual([]);
  expect(documents).toBe(1);
});
