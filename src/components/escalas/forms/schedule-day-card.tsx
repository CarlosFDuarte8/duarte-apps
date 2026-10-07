import { dayLabel } from "@/components/escalas/admin-ui";
import {
  categoryOf,
  eligible,
  eventRoles,
  labels,
  slotProgress,
  type Category,
  type Conflict,
  type Context,
  type Event,
  type Member,
  type Role,
} from "@/lib/escalas/domain";
import { CATEGORY_NAMES, KIND_NAMES } from "@/lib/escalas/names";

function AssignmentSelect({
  role,
  date,
  current,
  members,
  onChange,
}: {
  role: Role;
  date: string;
  current: string;
  members: Member[];
  onChange: (memberId: string) => void;
}) {
  return (
    <label className={`sc-slot sc-${categoryOf(role)}`}>
      <span className="sc-slot-label">
        <i aria-hidden="true" />
        {labels[role]}
      </span>
      <select
        value={current}
        data-empty={!current}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Não atribuído</option>
        {members
          .filter((m) => eligible(m, role, date) || m.id === current)
          .map((m) => (
            <option key={m.id} value={m.id} disabled={!eligible(m, role, date)}>
              {m.name}
              {!eligible(m, role, date) ? " (indisponível/inativo)" : ""}
            </option>
          ))}
      </select>
    </label>
  );
}

function ConflictList({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <ul className="sc-day-conflicts" role="alert">
      {conflicts.map((c, i) => (
        <li key={i}>
          <strong>{CATEGORY_NAMES[c.category as Category] ?? "Evento"}</strong>{" "}
          {c.rule} <em>{c.solutions}</em>
        </li>
      ))}
    </ul>
  );
}

/** Um dia da escala: seus eventos, as funções de cada um e os conflitos encontrados. */
export function ScheduleDayCard({
  date,
  events,
  conflicts,
  context,
  categories,
  onAssign,
  onNotes,
}: {
  date: string;
  events: Event[];
  conflicts: Conflict[];
  context: Context;
  categories: Category[];
  onAssign: (eventId: string, role: Role, memberId: string) => void;
  onNotes: (eventId: string, notes: string) => void;
}) {
  const { total, filled } = slotProgress(events, categories, context.rules);
  return (
    <section
      id={`dia-${date}`}
      className={`sc-card sc-day-card ${conflicts.length ? "has-conflict" : ""}`}
    >
      <header className="sc-day-card-head">
        <h2>{dayLabel(date)}</h2>
        <div className="sc-day-card-meta">
          {conflicts.length > 0 && (
            <span className="sc-badge sc-badge-danger">
              {conflicts.length} {conflicts.length === 1 ? "conflito" : "conflitos"}
            </span>
          )}
          <span
            className={`sc-badge ${filled === total ? "sc-badge-ok" : "sc-badge-warn"}`}
          >
            {filled}/{total} preenchidas
          </span>
        </div>
      </header>
      {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}
      {events.map((event) => (
        <div className="sc-event-block" key={event.id}>
          <h3>
            <span className={`sc-badge sc-kind-badge sc-kind-${event.kind}`}>
              {KIND_NAMES[event.kind] ?? event.kind}
            </span>
          </h3>
          <div className="sc-slots">
            {eventRoles(event.kind, categories, context.rules).map((role) => (
              <AssignmentSelect
                key={role}
                role={role}
                date={event.date}
                members={context.members}
                current={
                  event.assignments.find((a) => a.role === role)?.member_id ?? ""
                }
                onChange={(memberId) => onAssign(event.id, role, memberId)}
              />
            ))}
            <label className="sc-slot sc-slot-notes">
              <span className="sc-slot-label">Observação pública (opcional)</span>
              <textarea
                rows={2}
                value={event.notes}
                maxLength={2000}
                onChange={(e) => onNotes(event.id, e.target.value)}
              />
            </label>
          </div>
        </div>
      ))}
    </section>
  );
}
