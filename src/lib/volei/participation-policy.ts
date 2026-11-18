import "server-only";
import { weekdayOf, type VoleiMember } from "./domain";
import { ageOn } from "./profile";
import type { VoleiEvent } from "./domain";
import type { AdmissionWindow } from "./admission";
import { brasiliaDateTime } from "./time-zone";

type PriorityMember = Pick<VoleiMember, "birth_date" | "student_weekdays" | "student_class_time">;

/** Mirror of volei_member_priority. Never serialize the input in public rosters. */
export function priorityForEvent(member: PriorityMember, date: string): 0 | 1 | 2 {
  const age = ageOn(member.birth_date, date);
  if (age === null || age < 18) return 2;
  return /^18:00(?::00(?:\.0+)?)?$/.test(member.student_class_time ?? "") && member.student_weekdays?.includes(weekdayOf(date)) ? 0 : 1;
}

export function registrationWindow(event: VoleiEvent, member: PriorityMember) {
  const previous = new Date(`${event.date}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const yesterday = previous.toISOString().slice(0, 10);
  const tier = priorityForEvent(member, event.date);
  const opensAt = tier === 0 ? brasiliaDateTime(yesterday, "00:00") : tier === 1 ? brasiliaDateTime(yesterday, "22:00") : brasiliaDateTime(event.date, "08:00");
  const defaultEnd = brasiliaDateTime(event.date, "18:00");
  const deadline = event.registration_deadline ?? defaultEnd;
  const closesAt = tier === 2 && Date.parse(deadline) > Date.parse(defaultEnd) ? defaultEnd : deadline;
  return { opensAt, closesAt };
}

type AdmissionMember = PriorityMember & Pick<VoleiMember, "participation_reviewed_at">;

/** UI mirror; the authoritative gate is also enforced by PostgreSQL. */
export function admissionForEvent(event: VoleiEvent, member: AdmissionMember | null, now = new Date()): AdmissionWindow {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  const fallback = event.registration_deadline ?? brasiliaDateTime(event.date, "18:00");
  const { opensAt, closesAt } = member ? registrationWindow(event, member) : { opensAt: null, closesAt: fallback };
  const base = { opensAt, closesAt, open: false };
  if (event.closed || event.presence_closed_at || event.date < day || now.getTime() > Date.parse(fallback))
    return { ...base, state: "closed", message: "Novas confirmações encerradas. Cancelamentos seguem disponíveis enquanto a chamada não for concluída." };
  if (!member) return { ...base, state: "identify", message: "Entre com seu celular para consultar o horário de abertura das suas inscrições." };
  if (!member.birth_date || !member.participation_reviewed_at) return { ...base, closesAt: member.birth_date ? closesAt : fallback, state: "review", message: "Confira seu nascimento e os dados da turma antes de continuar." };
  if (now.getTime() > Date.parse(closesAt)) return { ...base, state: "closed", message: "Novas confirmações encerradas para este jogo. Cancelamentos seguem disponíveis enquanto a chamada não for concluída." };
  if (opensAt && now.getTime() < Date.parse(opensAt)) {
    const opening = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(opensAt));
    return { ...base, state: "scheduled", message: `Suas inscrições abrem em ${opening}, no horário de Brasília.` };
  }
  return { ...base, state: "open", open: true, message: "Inscrições disponíveis para você. Confirme até o horário limite." };
}
