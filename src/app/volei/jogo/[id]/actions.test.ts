import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), secret: vi.fn(), setCookie: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.setCookie }) }));
vi.mock("@/lib/escalas/supabase", () => ({ serviceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/volei/player-session", () => ({
  bindDevice: mocks.setCookie, deviceSecret: mocks.secret, hashDevice: () => "hashed-secret", currentPlayer: vi.fn(),
}));
vi.mock("@/lib/volei/photos", () => ({ deleteStoredPhotos: vi.fn() }));
vi.mock("@/lib/volei/students", () => import("../../../../lib/volei/students"));
vi.mock("@/lib/volei/phone", () => import("../../../../lib/volei/phone"));
vi.mock("@/lib/volei/profile", () => import("../../../../lib/volei/profile"));
import { manageGame, registerForGame } from "./actions";

const eventId = "11111111-1111-4111-8111-111111111111";
const registration = { eventId, name: "João da Silva", phone: "(61) 99999-1234", birthDate: "2010-05-10" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.secret.mockResolvedValue("a".repeat(64));
  mocks.rpc.mockResolvedValue({ data: "member", error: null });
});
it("valida nascimento no servidor antes de cadastrar", async () => {
  for (const birthDate of [undefined, null, "", "2099-01-01", "2008-02-30"]) {
    expect((await registerForGame({ ...registration, birthDate })).error).toBeTruthy();
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.setCookie).not.toHaveBeenCalled();
});
it("normaliza telefone e envia nascimento com o pedido de aprovação", async () => {
  expect(await registerForGame(registration)).toEqual({ error: "" });
  expect(mocks.rpc).toHaveBeenCalledWith("volei_register_member_profile", {
    p_event: eventId, p_name: "João da Silva", p_phone: "+5561999991234", p_birth_date: "2010-05-10",
    p_secret_hash: "hashed-secret", p_student_weekdays: [],
  });
  expect(mocks.setCookie).toHaveBeenCalled();
  expect(mocks.revalidate).toHaveBeenCalledWith("/admin/volei", "layout");
});
it("não cria acesso local quando o banco recusa duplicidade", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
  expect((await registerForGame(registration)).error).toMatch(/cadastro/);
  expect(mocks.setCookie).not.toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("autentica o navegador e usa a confirmação atômica com nascimento", async () => {
  mocks.secret.mockResolvedValue(null);
  expect((await manageGame({ eventId, action: "join", birthDate: "2010-05-10" })).error).toMatch(/navegador/);
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.secret.mockResolvedValue("a".repeat(64));
  expect(await manageGame({ eventId, action: "join", birthDate: "2010-05-10" })).toEqual({ error: "" });
  expect(mocks.rpc).toHaveBeenCalledWith("volei_phone_manage_profile", {
    p_event: eventId, p_secret_hash: "hashed-secret", p_action: "join", p_guest_name: null, p_birth_date: "2010-05-10",
  });
});
it("permite cancelar sem nascimento e não envia datas inválidas", async () => {
  expect(await manageGame({ eventId, action: "cancel" })).toEqual({ error: "" });
  mocks.rpc.mockClear();
  expect((await manageGame({ eventId, action: "join", birthDate: "2099-01-01" })).error).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
