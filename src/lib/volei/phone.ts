import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
const areaCodes = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);
export function normalizePhone(value: string) {
  if (value.trim().startsWith("+") && !value.trim().startsWith("+55")) {
    const phone = parsePhoneNumberFromString(value);
    return phone?.isValid() ? phone.number : null;
  }
  let digits = value.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  if (
    !/^[1-9]\d9\d{8}$/.test(digits) ||
    !areaCodes.has(Number(digits.slice(0, 2)))
  )
    return null;
  return `+55${digits}`;
}
export const phoneSchema = z
  .string()
  .max(30)
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um telefone válido com código do país e DDD.",
      });
      return z.NEVER;
    }
    return phone;
  });
export function displayPhone(value: string) {
  const phone = parsePhoneNumberFromString(value, "BR");
  if (!phone) return value;
  return phone.country === "BR"
    ? `+55 ${phone.formatNational()}`
    : phone.formatInternational();
}
export function defaultDeadline(date: string) {
  return `${date}T18:00:00-03:00`;
}
export const attendanceLabels = {
  reservado: "Presença confirmada",
  confirmado: "Presença confirmada",
  espera: "Na lista de espera",
  nao_vai: "Participação cancelada",
  ausente: "Ausência registrada",
} as const;

export const formatPhone = displayPhone;
