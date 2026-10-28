import { z } from "zod";
import { today } from "./domain";
import { phoneSchema } from "./phone";
export const emergencyContactSchema = z
  .object({
    emergency_name: z.string().trim().max(100),
    emergency_phone: z.union([z.literal(""), phoneSchema]),
    emergency_relationship: z.string().trim().max(60),
  })
  .refine(
    (value) =>
      (!value.emergency_name &&
        !value.emergency_phone &&
        !value.emergency_relationship) ||
      !!(value.emergency_name && value.emergency_phone),
    "Preencha nome e telefone do contato de emergência, ou deixe os campos vazios.",
  );
export const skillLabels = [
  "Sem avaliação",
  "Iniciante",
  "Básico",
  "Intermediário",
  "Avançado",
  "Muito avançado",
] as const;

export function ageOn(birthDate: string | null | undefined, on = today()) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > on)
    return null;
  const date = new Date(`${birthDate}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== birthDate
  )
    return null;
  const age =
    Number(on.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    Number(on.slice(5) < birthDate.slice(5));
  return age >= 0 ? age : null;
}
export const birthDateSchema = z
  .string()
  .refine(
    (value) => value === "" || (value >= "1900-01-01" && ageOn(value) !== null),
    "Informe uma data de nascimento válida, sem data futura.",
  )
  .transform((value) => value || null);
export function ageLabel(birthDate: string | null | undefined) {
  const age = ageOn(birthDate);
  return age === null
    ? "Nascimento não informado"
    : `${age} anos · ${age < 18 ? "Menor de 18" : "18 anos ou mais"}`;
}
export type PersonProfile = {
  birth_date: string | null;
  photo_url: string | null;
};
