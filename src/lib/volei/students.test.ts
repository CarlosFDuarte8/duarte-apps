import { expect, it } from "vitest";
import { studentEnrollmentSchema } from "./students";
it("normaliza dias e exige ao menos uma turma para aluno", () => {
  expect(
    studentEnrollmentSchema.parse({ isStudent: true, days: [4, 2, 2] }),
  ).toEqual([2, 4]);
  expect(
    studentEnrollmentSchema.parse({ isStudent: false, days: [2] }),
  ).toEqual([]);
  for (const days of [[], [7], [-1], [2.5], [null]])
    expect(
      studentEnrollmentSchema.safeParse({ isStudent: true, days }).success,
    ).toBe(false);
});
it("a declaração nunca aceita dias já aprovados enviados pelo cliente", () => {
  expect(
    studentEnrollmentSchema.parse({
      isStudent: true,
      days: [3],
      student_weekdays: [0, 1, 2, 3, 4, 5, 6],
      approved: true,
    }),
  ).toEqual([3]);
});
