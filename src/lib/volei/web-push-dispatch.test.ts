import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  send: vi.fn(),
  updates: [] as Record<string, unknown>[],
  deletes: [] as string[],
  authorized: true,
}));
vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({ sendNotification: mocks.send }));
vi.mock("@/lib/escalas/supabase", () => ({
  serviceClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
import { dispatchWebPush } from "./web-push";
const job = {
  id: "job",
  subscription_id: "sub",
  title: "Presença confirmada",
  body: "Carlos",
  href: "/admin/volei/game",
  attempts: 1,
  claimed_at: "lease",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.updates.length = 0;
  mocks.deletes.length = 0;
  mocks.authorized = true;
  for (const [name, value] of Object.entries({
    VOLEI_WEB_PUSH_ENABLED: "true",
    VOLEI_WEB_PUSH_PUBLIC_KEY: "public",
    VOLEI_WEB_PUSH_PRIVATE_KEY: "private",
    VOLEI_WEB_PUSH_SUBJECT: "mailto:test@example.com",
  }))
    vi.stubEnv(name, value);
  mocks.rpc.mockResolvedValue({ data: [job], error: null });
  mocks.send.mockResolvedValue({ statusCode: 201 });
  mocks.from.mockImplementation((table: string) => {
    const query: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve),
    };
    for (const method of ["select", "eq", "lt"]) query[method] = () => query;
    query.update = (changes: Record<string, unknown>) => {
      mocks.updates.push(changes);
      return query;
    };
    query.delete = () => {
      mocks.deletes.push(table);
      return query;
    };
    query.maybeSingle = async () => ({
      error: null,
      data:
        table === "volei_admins"
          ? mocks.authorized
            ? { user_id: "admin" }
            : null
          : {
              id: "sub",
              user_id: "admin",
              endpoint: "https://fcm.googleapis.com/test",
              p256dh: "key",
              auth: "auth",
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
    });
    return query;
  });
});
it("envia com VAPID e registra aceitação sem declarar entrega no aparelho", async () => {
  expect(await dispatchWebPush()).toEqual({ processed: 1, sent: 1 });
  expect(mocks.send).toHaveBeenCalledWith(
    expect.objectContaining({ endpoint: "https://fcm.googleapis.com/test" }),
    expect.stringContaining("Presença confirmada"),
    expect.objectContaining({
      TTL: 3600,
      timeout: 10000,
      vapidDetails: expect.objectContaining({ privateKey: "private" }),
    }),
  );
  expect(mocks.updates).toContainEqual({ status: "sent" });
});
it("apaga assinaturas expiradas no provedor", async () => {
  mocks.send.mockRejectedValue({ statusCode: 410 });
  await dispatchWebPush();
  expect(mocks.deletes).toContain("volei_web_push_subscriptions");
});
it("falha temporária volta à fila e a quinta tentativa encerra o item", async () => {
  mocks.send.mockRejectedValue({ statusCode: 503 });
  await dispatchWebPush();
  expect(mocks.updates[0]).toMatchObject({ status: "pending" });
  mocks.rpc.mockResolvedValue({ data: [{ ...job, attempts: 5 }], error: null });
  await dispatchWebPush();
  expect(mocks.updates.at(-1)).toMatchObject({ status: "failed" });
});
it("revalida o administrador antes de enviar um item já reivindicado", async () => {
  mocks.authorized = false;
  await dispatchWebPush();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.updates).toContainEqual({ status: "failed" });
});
it("envio desativado não acessa a fila nem o provedor", async () => {
  vi.stubEnv("VOLEI_WEB_PUSH_ENABLED", "false");
  await expect(dispatchWebPush()).rejects.toThrow();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
