import { describe, expect, it } from "vitest";
import { ageOn, birthDateSchema } from "./profile";
describe("Idade do participante", () => {
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
