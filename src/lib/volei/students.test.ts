import { expect, it } from "vitest";
import { studentClassSchema } from "./students";
it("normaliza dias e exige ao menos uma turma para aluno", () => {
  expect(
    studentClassSchema.parse({ isStudent: true, days: [4, 2, 2], classTime: "18:00" }),
  ).toEqual({ days: [2, 4], classTime: "18:00" });
  expect(
    studentClassSchema.parse({ isStudent: false, days: [2] }),
  ).toEqual({ days: [], classTime: null });
  for (const days of [[], [7], [-1], [2.5], [null]])
    expect(
      studentClassSchema.safeParse({ isStudent: true, days, classTime: "18:00" }).success,
    ).toBe(false);
});
it("a declaração nunca aceita dias já aprovados enviados pelo cliente", () => {
  expect(
    studentClassSchema.parse({
      isStudent: true,
      days: [3],
      classTime: "17:00",
      student_weekdays: [0, 1, 2, 3, 4, 5, 6],
      approved: true,
    }),
  ).toEqual({ days: [3], classTime: "17:00" });
});
