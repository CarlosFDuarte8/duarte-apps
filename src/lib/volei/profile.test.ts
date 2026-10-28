import { describe, expect, it } from "vitest";
import { ageOn, birthDateSchema, emergencyContactSchema } from "./profile";
describe("Idade do participante", () => {
  it("normaliza telefone de emergência e exige nome com telefone", () => {
    expect(
      emergencyContactSchema.parse({
        emergency_name: " Maria ",
        emergency_phone: "(61) 99999-1234",
        emergency_relationship: " mãe ",
      }),
    ).toEqual({
      emergency_name: "Maria",
      emergency_phone: "+5561999991234",
      emergency_relationship: "mãe",
    });
    expect(
      emergencyContactSchema.safeParse({
        emergency_name: "Maria",
        emergency_phone: "",
        emergency_relationship: "",
      }).success,
    ).toBe(false);
    expect(
      emergencyContactSchema.safeParse({
        emergency_name: "",
        emergency_phone: "",
        emergency_relationship: "",
      }).success,
    ).toBe(true);
  });
  it("completa 18 somente no aniversário, sem deslocamento de fuso", () => {
    expect(ageOn("2008-10-28", "2026-10-27")).toBe(17);
    expect(ageOn("2008-10-28", "2026-10-28")).toBe(18);
    expect(ageOn("2008-10-28", "2026-10-29")).toBe(18);
  });
  it("mantém nascimento desconhecido e rejeita datas inválidas ou futuras", () => {
    expect(ageOn(null)).toBeNull();
    expect(ageOn("2008-02-30")).toBeNull();
    expect(ageOn("2099-01-01", "2026-10-28")).toBeNull();
    expect(birthDateSchema.safeParse("").success).toBe(true);
    expect(birthDateSchema.safeParse("2025-02-29").success).toBe(false);
    expect(birthDateSchema.safeParse("2099-01-01").success).toBe(false);
  });
});
