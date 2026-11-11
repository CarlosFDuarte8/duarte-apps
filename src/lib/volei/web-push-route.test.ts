import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  send: vi.fn(),
  configured: vi.fn(),
  cookie: { set: vi.fn(), delete: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookie }));
vi.mock("@/lib/escalas/supabase", () => ({
  sessionClient: async () => ({
    auth: { getUser: mocks.user },
    rpc: mocks.rpc,
  }),
  serviceClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/volei/web-push", () => ({
  webPushConfigured: mocks.configured,
  sendWebPush: mocks.send,
}));
vi.mock(
  "@/lib/volei/web-push-validation",
  () => import("./web-push-validation"),
);
import { GET, POST } from "../../app/api/admin/volei/web-push/route";
const endpoint = "https://fcm.googleapis.com/test";
function request(body: unknown, origin = "https://example.com") {
  return new Request("https://example.com/api/admin/volei/web-push", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({
    data: { user: { id: "admin" } },
    error: null,
  });
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_volei_admin" ? true : "subscription-id",
    error: null,
  }));
  mocks.configured.mockReturnValue(true);
  vi.stubEnv("VOLEI_WEB_PUSH_PUBLIC_KEY", "public-key");
});
it("nega leitura sem sessão e não expõe configuração privada", async () => {
  mocks.user.mockResolvedValue({ data: { user: null }, error: null });
  expect((await GET()).status).toBe(401);
  expect(mocks.from).not.toHaveBeenCalled();
});
it("entrega apenas a chave pública para administradores e não permite cache", async () => {
  const response = await GET();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    configured: true,
    publicKey: "public-key",
  });
});
it("rejeita mutações de outro site antes de acessar a sessão", async () => {
  expect(
    (await POST(request({ action: "test", endpoint }, "https://other.test")))
      .status,
  ).toBe(403);
  expect(mocks.user).not.toHaveBeenCalled();
});
it("não permite registrar navegadores sem autorização administrativa", async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect((await POST(request({ action: "status", endpoint }))).status).toBe(
    401,
  );
  expect(mocks.from).not.toHaveBeenCalled();
});
it("valida endpoint antes de acessar o servidor de push", async () => {
  expect(
    (
      await POST(
        request({ action: "test", endpoint: "https://127.0.0.1/secret" }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.send).not.toHaveBeenCalled();
});
it("registro usa a identidade da sessão e guarda só um identificador em cookie HttpOnly", async () => {
  const key = Buffer.alloc(65);
  key[0] = 4;
  const response = await POST(
    request({
      action: "subscribe",
      subscription: {
        endpoint,
        keys: {
          p256dh: key.toString("base64url"),
          auth: Buffer.alloc(16).toString("base64url"),
        },
      },
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "volei_save_web_subscription",
    expect.objectContaining({ p_user: "admin", p_endpoint: endpoint }),
  );
  expect(mocks.cookie.set).toHaveBeenCalledWith(
    "volei-web-push-id",
    "subscription-id",
    expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax" }),
  );
});
it("cancelamento filtra o proprietário mesmo com envio desativado", async () => {
  mocks.configured.mockReturnValue(false);
  const filters: unknown[] = [];
  const query = {
    delete: () => query,
    eq: (...args: unknown[]) => {
      filters.push(args);
      return query;
    },
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ error: null }).then(resolve),
  };
  mocks.from.mockReturnValue(query);
  expect(
    (await POST(request({ action: "unsubscribe", endpoint }))).status,
  ).toBe(200);
  expect(filters).toContainEqual(["user_id", "admin"]);
  expect(filters).toContainEqual(["endpoint", endpoint]);
  expect(mocks.cookie.delete).toHaveBeenCalledWith("volei-web-push-id");
});
