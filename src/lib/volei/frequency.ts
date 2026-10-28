import { z } from "zod";
import { weekdayOf, type VoleiMember, type AttendanceStatus } from "./domain";
export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;
export const preferencesSchema = z
  .object({
    is_core: z.boolean(),
    preferred_weekdays: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .transform((days) => [...new Set(days)].sort()),
    preferred_dates: z
      .array(z.iso.date())
      .max(50)
      .transform((d) => [...new Set(d)].sort()),
    unavailable_dates: z
      .array(z.iso.date())
      .max(50)
      .transform((d) => [...new Set(d)].sort()),
    preference_notes: z.string().trim().max(500),
  })
  .refine(
    (p) => !p.preferred_dates.some((d) => p.unavailable_dates.includes(d)),
    {
      message: "Uma data não pode ser preferida e indisponível ao mesmo tempo.",
    },
  );
export function preferenceForDate(member: VoleiMember, date: string) {
  if (member.unavailable_dates?.includes(date)) return "Indisponível";
  if (
    member.preferred_dates?.includes(date) ||
    member.preferred_weekdays?.includes(weekdayOf(date))
  )
    return "Dia preferido";
  return "Sem preferência para este dia";
}
export type FrequencyEvent = {
  id: string;
  date: string;
  title: string;
  presence_closed_at: string | null;
  attendance: {
    member_id: string;
    status: AttendanceStatus;
    checked_in_at: string | null;
  }[];
  guests: { status: AttendanceStatus; checked_in_at: string | null }[];
};
export function summarizeFrequency(
  members: VoleiMember[],
  events: FrequencyEvent[],
) {
  const completed = events.filter((e) => e.presence_closed_at !== null);
  const rows = members
    .filter((m) => !m.membership_status || m.membership_status === "approved")
    .map((member) => {
      let presences = 0,
        absences = 0,
        cancellations = 0,
        lastSeen: string | null = null;
      for (const event of completed) {
        const record = event.attendance.find((a) => a.member_id === member.id);
        if (!record) continue;
        if (record.checked_in_at && record.status === "confirmado") {
          presences++;
          if (!lastSeen || event.date > lastSeen) lastSeen = event.date;
        } else if (record.status === "ausente") absences++;
        else if (record.status === "nao_vai") cancellations++;
      }
      return {
        member,
        presences,
        absences,
        cancellations,
        lastSeen,
        percentage: completed.length
          ? Math.round((presences / completed.length) * 100)
          : 0,
      };
    })
    .sort(
      (a, b) =>
        b.presences - a.presences ||
        a.absences - b.absences ||
        a.member.name.localeCompare(b.member.name, "pt-BR"),
    );
  return {
    rows,
    completedGames: completed.length,
    pendingGames: events.length - completed.length,
    totalPresences: rows.reduce((n, r) => n + r.presences, 0),
    totalAbsences: rows.reduce((n, r) => n + r.absences, 0),
    guestPresences: completed.reduce(
      (n, e) =>
        n +
        e.guests.filter((g) => g.status === "confirmado" && g.checked_in_at)
          .length,
      0,
    ),
  };
}
