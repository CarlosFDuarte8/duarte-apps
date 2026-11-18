import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/volei/auth", () => ({ requireVoleiAdmin: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/volei/whatsapp", () => import("../../lib/volei/whatsapp"));
import { saveWhatsAppGroup } from "./volei-settings-actions";

const query = {
  update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(),
};
const from = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  for (const name of ["update", "eq", "select"] as const) query[name].mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { whatsapp_invite_url: null }, error: null });
  from.mockReturnValue(query);
  mocks.auth.mockResolvedValue({ client: { from } });
});
it("checks the administrator session before any write", async () => {
  mocks.auth.mockRejectedValue(new Error("Not authorized"));
  await expect(saveWhatsAppGroup("https://chat.whatsapp.com/AbC123")).rejects.toThrow("Not authorized");
  expect(from).not.toHaveBeenCalled();
});
it("does not persist invalid invitations", async () => {
  expect((await saveWhatsAppGroup("https://evil.example/invite")).error).toBeTruthy();
  expect(from).not.toHaveBeenCalled();
});
it("persists normalized links and refreshes public and administrative pages", async () => {
  expect(await saveWhatsAppGroup(" https://chat.whatsapp.com/AbC123?mode=gi_t ")).toEqual({ error: "" });
  expect(query.update).toHaveBeenCalledWith({ whatsapp_invite_url: "https://chat.whatsapp.com/AbC123" });
  expect(query.eq).toHaveBeenCalledWith("id", true);
  expect(mocks.revalidate).toHaveBeenCalledWith("/volei", "layout");
  expect(mocks.revalidate).toHaveBeenCalledWith("/admin/volei", "layout");
});
it("clears the invitation and reports persistence failures", async () => {
  await saveWhatsAppGroup("");
  expect(query.update).toHaveBeenCalledWith({ whatsapp_invite_url: null });
  mocks.revalidate.mockClear();
  query.maybeSingle.mockResolvedValue({ data: null, error: { code: "42P01" } });
  expect((await saveWhatsAppGroup("https://chat.whatsapp.com/AbC123")).error).toBeTruthy();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
