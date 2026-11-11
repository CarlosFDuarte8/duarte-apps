import { z } from "zod";
export const studentDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .transform((days) => [...new Set(days)].sort());
export const studentEnrollmentSchema = z
  .object({
    isStudent: z.boolean(),
    days: studentDaysSchema,
  })
  .refine((value) => !value.isStudent || value.days.length > 0, {
    message: "Selecione pelo menos um dia de aula.",
    path: ["days"],
  })
  .transform((value) => (value.isStudent ? value.days : []));
