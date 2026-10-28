import { describe, it, expect } from "vitest";
import { canSubmitComplaint, complaintSchema } from "./complaints";
describe("Acesso aos relatos", () => {
  const core = {
    is_core: true,
    is_active: true,
    blocked: false,
    membership_status: "approved",
  };
  it("exige grupo principal aprovado, ativo e sem bloqueio", () => {
    expect(canSubmitComplaint(core)).toBe(true);
    for (const player of [
      null,
      { ...core, is_core: false },
      { ...core, is_active: false },
      { ...core, blocked: true },
      { ...core, membership_status: "pending" },
    ])
      expect(canSubmitComplaint(player)).toBe(false);
  });
  it("valida conteúdo suficiente e IDs antes do envio", () => {
    const data = {
      targetType: "member",
      targetId: "00000000-0000-4000-8000-000000000001",
      eventId: null,
      title: "Ocorrido no jogo",
      description: "Descrição detalhada de uma situação durante o jogo.",
      submissionKey: "00000000-0000-4000-8000-000000000002",
    };
    expect(complaintSchema.safeParse(data).success).toBe(true);
    for (const invalid of [
      { ...data, description: "Curto" },
      { ...data, targetId: "outro" },
      { ...data, title: " " },
      { ...data, description: "a".repeat(3001) },
    ])
      expect(complaintSchema.safeParse(invalid).success).toBe(false);
  });
});
