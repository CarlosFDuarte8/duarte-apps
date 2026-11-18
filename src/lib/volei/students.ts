import { z } from "zod";
export const studentDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .transform((days) => [...new Set(days)].sort());
export const classTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Informe o horário de início da aula.");

/** A declaration never contains approval or priority flags. */
export const studentClassSchema = z.object({
  isStudent: z.boolean({ error: "Informe se você é aluno." }),
  days: studentDaysSchema,
  classTime: z.string().default(""),
}).superRefine((value, context) => {
  if (!value.isStudent) return;
  if (!value.days.length) context.addIssue({ code: "custom", path: ["days"], message: "Selecione pelo menos um dia de aula." });
  if (!classTimeSchema.safeParse(value.classTime).success) context.addIssue({ code: "custom", path: ["classTime"], message: "Informe o horário de início da aula." });
}).transform(value => ({
  days: value.isStudent ? value.days : [],
  classTime: value.isStudent ? value.classTime : null,
}));

export type EnrollmentDraft = { isStudent: boolean | null; days: number[]; classTime: string };
export type ParticipationProfile = {
  birthDate: string | null;
  days: number[];
  classTime: string | null;
  reviewed: boolean;
};
