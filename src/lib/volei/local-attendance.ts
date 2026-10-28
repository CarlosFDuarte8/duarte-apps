export type Status = "pendente" | "confirmado" | "espera" | "cancelado" | "ausente";
export type Participant = {
  id: string;
  nome: string;
  status: Status;
  responsible?: string;
  registeredAt?: string;
  order?: number;
  checkedInAt?: string;
};
export type Meeting = {
  title: string;
  deadline: string;
  guestsAfter: string;
  participants: Participant[];
  history: { at: string; text: string }[];
};
export const CAPACITY = 18;
export const labels: Record<Status, string> = {
  pendente: "Não inscrito", confirmado: "Confirmado", espera: "Em espera",
  cancelado: "Cancelado", ausente: "Ausente",
};
export function ordered(rows: Participant[]) {
  return [...rows].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
}
export function rebalance(meeting: Meeting, now: string): Meeting {
  const rows = meeting.participants.map(p => ({ ...p }));
  const history = [...meeting.history];
  let free = CAPACITY - rows.filter(p => p.status === "confirmado").length;
  if (meeting.deadline && now > meeting.deadline) return meeting;
  const queue = ordered(rows.filter(p => p.status === "espera"));
  // Members have priority; guests only become eligible after the configured release.
  queue.sort((a, b) => Number(!!a.responsible) - Number(!!b.responsible));
  for (const p of queue) {
    if (free <= 0) break;
    if (p.responsible && (!meeting.guestsAfter || now < meeting.guestsAfter)) continue;
    p.status = "confirmado";
    history.push({ at: now, text: `${p.nome}: confirmado por liberação de vaga.` });
    free--;
  }
  return { ...meeting, participants: rows, history };
}
export function changeStatus(meeting: Meeting, id: string, status: Status, now: string): Meeting {
  const person = meeting.participants.find(p => p.id === id);
  if (!person || person.status === status) return meeting;
  if (status === "confirmado" && meeting.deadline && now > meeting.deadline)
    throw new Error("O prazo de inscrição terminou.");
  if (status === "ausente" && (person.status !== "confirmado" || person.checkedInAt))
    throw new Error("Somente um confirmado sem check-in pode ser marcado ausente.");
  const joining = status === "confirmado";
  if (joining && (person.status === "confirmado" || person.status === "espera")) return meeting;
  if (joining && person.responsible && meeting.participants.some(p => p.id !== id && p.responsible === person.responsible && (p.status === "confirmado" || p.status === "espera")))
    throw new Error("Cada membro pode ter somente um convidado ativo por evento.");
  const next = {
    ...meeting,
    participants: meeting.participants.map(p => p.id !== id ? p : {
      ...p, status: joining ? "espera" as const : status,
      registeredAt: joining ? now : p.registeredAt,
      order: joining ? Math.max(0, ...meeting.participants.map(r => r.order ?? 0)) + 1 : p.order,
      checkedInAt: undefined,
    }),
    history: [...meeting.history, { at: now, text: `${person.nome}: ${joining ? "inscrição solicitada" : labels[status]}.` }],
  };
  return rebalance(next, now);
}
