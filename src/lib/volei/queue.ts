import type { AttendanceStatus } from "./domain";

export const queueRules = "A fila segue as regras do grupo e a ordem de inscrição dentro de cada faixa de prioridade. A turma declarada precisa ser validada pelo responsável. Convidados aguardam depois dos membros e dependem da liberação. A posição pode mudar; vagas já confirmadas são preservadas.";

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
