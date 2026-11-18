import type { AttendanceStatus } from "./domain";

export const queueRules = "Membros prioritários e alunos no dia da aula têm preferência; dentro de cada grupo, vale a ordem de inscrição. Convidados aguardam depois dos membros e dependem da liberação. A posição pode mudar conforme essas regras.";

export function memberQueuePosition(rows: readonly { member_id: string; status: AttendanceStatus }[], memberId: string) {
  const index = rows.filter(row => row.status === "espera").findIndex(row => row.member_id === memberId);
  return index < 0 ? null : index + 1;
}

export function guestQueuePosition(rows: readonly { id: string; status: AttendanceStatus; registered_at: string; queue_order: number }[], guestId: string) {
  const index = rows.filter(row => row.status === "espera")
    .sort((a, b) => a.registered_at.localeCompare(b.registered_at) || a.queue_order - b.queue_order)
    .findIndex(row => row.id === guestId);
  return index < 0 ? null : index + 1;
}
