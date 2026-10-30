import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  fetch: vi.fn(),
  updates: [] as Record<string, unknown>[],
  deletes: [] as string[],
  receipts: [] as { id: string; token: string; ticket_id: string }[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/escalas/supabase", () => ({
  serviceClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/volei/push-dispatch", () => import("./push-dispatch"));
import { dispatchPush } from "./push-dispatch";
import { GET } from "../../app/api/admin/volei/push-dispatch/route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.updates.length = 0;
  mocks.deletes.length = 0;
  mocks.receipts.length = 0;
  vi.stubEnv("VOLEI_PUSH_ENABLED", "true");
  vi.stubEnv(
    "VOLEI_PUSH_CRON_SECRET",
    "test-secret-123456789012345678901234567890",
  );
  mocks.rpc.mockResolvedValue({
    data: [{ id: "job", token: "ExpoPushToken[test]", attempts: 1 }],
    error: null,
  });
  mocks.from.mockImplementation((table: string) => {
    let action = "";
    const query: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: action === "select" ? mocks.receipts : null,
          error: null,
        }).then(resolve),
    };
    for (const method of [
      "eq",
      "is",
      "not",
      "lte",
      "gte",
      "order",
      "limit",
      "lt",
    ])
      query[method] = () => query;
    query.select = () => {
      action = "select";
      return query;
    };
    query.update = (changes: Record<string, unknown>) => {
      mocks.updates.push(changes);
      action = "update";
      return query;
    };
    query.delete = () => {
      mocks.deletes.push(table);
      action = "delete";
      return query;
    };
    return query;
  });
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [{ status: "ok", id: "ticket" }] }),
  });
  vi.stubGlobal("fetch", mocks.fetch);
});
it("requires explicit activation and cron bearer secret, never a public user session", async () => {
  expect(
    (
      await GET(
        new Request("https://example.com/api/admin/volei/push-dispatch"),
      )
    ).status,
  ).toBe(401);
  vi.stubEnv("VOLEI_PUSH_ENABLED", "false");
  expect(
    (
      await GET(
        new Request("https://example.com/api/admin/volei/push-dispatch"),
      )
    ).status,
  ).toBe(503);
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("dispatches only generic messages without names, phones or complaint descriptions", async () => {
  expect((await dispatchPush()).processed).toBe(1);
  const payload = JSON.parse(mocks.fetch.mock.calls[0][1].body);
  expect(payload[0].data).toEqual({ kind: "volei_requests" });
  expect(payload[0].body).toBe(
    "Há novas solicitações para acompanhar no grupo.",
  );
  expect(mocks.updates[0]).toEqual({ status: "sent", ticket_id: "ticket" });
});
it("backs off transient failures and stops after five attempts", async () => {
  mocks.fetch.mockRejectedValue(Error("offline"));
  await dispatchPush();
  expect(mocks.updates[0].status).toBe("pending");
  mocks.rpc.mockResolvedValue({
    data: [{ id: "job", token: "ExpoPushToken[test]", attempts: 5 }],
    error: null,
  });
  await dispatchPush();
  expect(mocks.updates[1].status).toBe("failed");
});
it("removes expired Expo registrations reported by tickets and receipts", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
    }),
  });
  await dispatchPush();
  expect(mocks.deletes).toContain("volei_push_devices");
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.receipts.push({
    id: "job",
    token: "ExpoPushToken[test]",
    ticket_id: "ticket",
  });
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        ticket: { status: "error", details: { error: "DeviceNotRegistered" } },
      },
    }),
  });
  await dispatchPush();
  expect(
    mocks.deletes.filter((table) => table === "volei_push_devices"),
  ).toHaveLength(2);
});
