import { z } from "zod";

export type AttendanceStatus =
  "confirmado" | "nao_vai" | "espera" | "ausente" | "reservado";

export type VoleiMember = {
  id: string;
  name: string;
  token: string;
  points: number;
  blocked: boolean;
  blocked_reason: string;
  is_active: boolean;
  phone?: string | null;
  birth_date?: string | null;
  photo_path?: string | null;
  photo_url?: string | null;
  skill_level?: number | null;
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relationship?: string;
  is_core?: boolean;
  membership_status?: "approved" | "pending" | "rejected";
  preferred_weekdays?: number[];
  preferred_dates?: string[];
  unavailable_dates?: string[];
  preference_notes?: string;
};

export type VoleiEvent = {
  max_teams?: 3 | 4;
  id: string;
  date: string;
  title: string;
  start_time: string;
  location: string;
  notes: string;
  closed: boolean;
  registration_deadline?: string | null;
  guests_open_at?: string | null;
  presence_closed_at?: string | null;
};
export function eventCapacity(event: Pick<VoleiEvent, "max_teams">) {
  return (event.max_teams ?? 3) * 6;
}

export const monthPattern = /^20\d{2}-(0[1-9]|1[0-2])$/;
export const datePattern = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const eventSchema = z.object({
  max_teams: z.union([z.literal(3), z.literal(4)]).default(3),
  dates: z.array(z.string().regex(datePattern)).min(1).max(31),
  title: z.string().trim().min(1).max(100),
  start_time: z.string().trim().max(20),
  location: z.string().trim().max(120),
  notes: z.string().trim().max(500),
  registration_time: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .default("18:00"),
});

export const memberNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome.")
  .max(100);
export const reasonSchema = z
  .string()
  .trim()
  .min(1, "Informe o motivo.")
  .max(200);

export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentMonth() {
  return today().slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Dia da semana (0 = domingo) de uma data ISO, sem depender do fuso do servidor. */
export function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function formatDate(date: string) {
  const [, m, d] = date.split("-");
  return `${WEEKDAYS[weekdayOf(date)]}, ${d}/${m}`;
}

export function formatMonth(month: string) {
  const text = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isEventOpen(event: VoleiEvent, now = today()) {
  return (
    !event.closed &&
    event.date >= now &&
    (!event.registration_deadline ||
      new Date().getTime() <= Date.parse(event.registration_deadline))
  );
}

/** Texto da lista de confirmados, pronto para colar no WhatsApp. */
export function buildWhatsAppText(event: VoleiEvent, names: string[]) {
  const sorted = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const details = [
    event.start_time && `Horário: ${event.start_time}`,
    event.location && `Local: ${event.location}`,
  ].filter(Boolean) as string[];
  return [
    `*${event.title}*`,
    formatDate(event.date),
    ...details,
    "",
    ...(sorted.length
      ? sorted.map((name, i) => `${String(i + 1).padStart(2, "0")}. ${name}`)
      : ["Ninguém confirmado ainda."]),
    "",
    `Total: ${sorted.length}`,
  ].join("\n");
}
