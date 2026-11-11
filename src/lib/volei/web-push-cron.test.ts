import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ configured: vi.fn(), dispatch: vi.fn() }));
vi.mock("@/lib/volei/web-push", () => ({
  webPushConfigured: mocks.configured,
  dispatchWebPush: mocks.dispatch,
}));
import { GET } from "../../app/api/admin/volei/web-push-dispatch/route";
const secret = "test-secret-with-more-than-32-characters";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.dispatch.mockResolvedValue({ processed: 0, sent: 0 });
  vi.stubEnv("VOLEI_WEB_PUSH_CRON_SECRET", secret);
});
it("não processa a fila sem segredo correto ou quando o serviço está desativado", async () => {
  const request = new Request(
    "https://example.com/api/admin/volei/web-push-dispatch",
  );
  expect((await GET(request)).status).toBe(401);
  mocks.configured.mockReturnValue(false);
  expect((await GET(request)).status).toBe(503);
  expect(mocks.dispatch).not.toHaveBeenCalled();
});
it("o agendador autorizado processa sem cache; erros internos não vazam", async () => {
  const request = new Request(
    "https://example.com/api/admin/volei/web-push-dispatch",
    { headers: { authorization: `Bearer ${secret}` } },
  );
  const response = await GET(request);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  mocks.dispatch.mockRejectedValue(Error("private key detail"));
  const failed = await GET(request);
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("private key detail");
});
