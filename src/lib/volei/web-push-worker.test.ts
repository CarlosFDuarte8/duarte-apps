import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
function fixture() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  runInNewContext(readFileSync("public/volei-push-sw.js", "utf8"), {
    URL,
    self: {
      addEventListener: (name: string, handler: (event: unknown) => void) => {
        handlers[name] = handler;
      },
      location: { origin: "https://example.com" },
      registration: { showNotification },
      clients: { openWindow, matchAll },
    },
  });
  return { handlers, showNotification, openWindow, matchAll };
}
it("o worker exibe o push sem depender de uma página e não intercepta requisições", async () => {
  const api = fixture();
  let task: Promise<void> = Promise.resolve();
  api.handlers.push({
    data: {
      json: () => ({
        id: "notice",
        title: "Presença confirmada",
        body: "Carlos",
        href: "/admin/volei/game",
      }),
    },
    waitUntil: (value: Promise<void>) => {
      task = value;
    },
  });
  await task;
  expect(api.showNotification).toHaveBeenCalledWith(
    "Presença confirmada",
    expect.objectContaining({
      tag: "notice",
      data: { href: "/admin/volei/game" },
    }),
  );
  expect(api.handlers.fetch).toBeUndefined();
});
it("clicar abre somente uma rota administrativa na origem do app", async () => {
  const api = fixture();
  let task: Promise<void> = Promise.resolve();
  api.handlers.notificationclick({
    notification: { close() {}, data: { href: "https://evil.test" } },
    waitUntil: (value: Promise<void>) => {
      task = value;
    },
  });
  await task;
  expect(api.openWindow).toHaveBeenCalledWith(
    "https://example.com/admin/volei/notificacoes",
  );
});
it("reutiliza e foca uma janela existente ao abrir a confirmação", async () => {
  const api = fixture();
  const navigate = vi.fn().mockResolvedValue(undefined),
    focus = vi.fn();
  api.matchAll.mockResolvedValue([
    { url: "https://example.com/admin/volei", navigate, focus },
  ]);
  let task: Promise<void> = Promise.resolve();
  api.handlers.notificationclick({
    notification: { close() {}, data: { href: "/admin/volei/game" } },
    waitUntil: (value: Promise<void>) => {
      task = value;
    },
  });
  await task;
  expect(navigate).toHaveBeenCalledWith("https://example.com/admin/volei/game");
  expect(focus).toHaveBeenCalled();
  expect(api.openWindow).not.toHaveBeenCalled();
});
