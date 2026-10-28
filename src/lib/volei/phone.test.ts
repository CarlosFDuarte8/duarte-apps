import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  phoneSchema,
  defaultDeadline,
  displayPhone,
} from "./phone";
describe("Identificação por celular", () => {
  it("normaliza formatos nacionais e com país para o mesmo número", () => {
    for (const value of [
      "(61) 99999-1234",
      "61999991234",
      "+55 61 99999-1234",
      "5561999991234",
    ])
      expect(normalizePhone(value)).toBe("+5561999991234");
    expect(normalizePhone("(55) 99999-1234")).toBe("+5555999991234");
  });
  it("rejeita números sem DDD, fixos e DDD inexistente", () => {
    for (const value of [
      "999991234",
      "(61) 3333-1234",
      "(20) 99999-1234",
      "+1 5551234567",
      "",
      "619999912345",
    ])
      expect(phoneSchema.safeParse(value).success).toBe(false);
  });
  it("usa 18h de Brasília para cada data de jogo", () => {
    expect(new Date(defaultDeadline("2026-10-28")).toISOString()).toBe(
      "2026-10-28T21:00:00.000Z",
    );
  });
  it("aceita números internacionais mantendo o código do país", () => {
    expect(normalizePhone("+351 912 345 678")).toBe("+351912345678");
    expect(normalizePhone("+1 202 555 0123")).toBe("+12025550123");
    expect(normalizePhone("+44 7911 123456")).toBe("+447911123456");
    expect(phoneSchema.safeParse("+351 12").success).toBe(false);
  });
  it("exibe o telefone formatado com o código do país", () => {
    expect(displayPhone("+5561999991234")).toBe("+55 (61) 99999-1234");
    expect(displayPhone("+351912345678")).toBe("+351 912 345 678");
  });
});
