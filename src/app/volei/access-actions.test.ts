import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), secret: vi.fn(), bind: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/escalas/supabase", () => ({ serviceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/volei/player-session", () => ({ deviceSecret: mocks.secret, hashDevice: (secret: string) => `hash:${secret}`, bindDevice: mocks.bind }));
vi.mock("@/lib/volei/phone", () => import("../../lib/volei/phone"));
import { identifyByPhone } from "./access-actions";

beforeEach(() => { vi.clearAllMocks(); mocks.secret.mockResolvedValue("existing-secret"); mocks.rpc.mockResolvedValue({ data: "member-id", error: null }); });
it("reuses the browser binding and normalizes the phone for the existing identity RPC", async () => {
  expect(await identifyByPhone("(61) 99999-1234")).toEqual({ error: "", found: true });
  expect(mocks.rpc).toHaveBeenCalledWith("volei_phone_identify", { p_phone: "+5561999991234", p_secret_hash: "hash:existing-secret" });
  expect(mocks.bind).toHaveBeenCalledWith("existing-secret");
  expect(mocks.revalidate).toHaveBeenCalledWith("/volei", "layout");
});
it("does not grant access after another device is rejected", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001", message: "Peça a liberação ao responsável." } });
  expect(await identifyByPhone("(61) 99999-1234")).toEqual({ error: "Peça a liberação ao responsável.", found: false });
  expect(mocks.bind).not.toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("reports an unknown phone without creating a member, and rejects invalid input before database access", async () => {
  mocks.secret.mockResolvedValue(null);
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  expect(await identifyByPhone("(61) 99999-1234")).toEqual({ error: "", found: false });
  expect(mocks.bind.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  mocks.rpc.mockClear();
  expect((await identifyByPhone("123")).error).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
