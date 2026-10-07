"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  compareEvents,
  slotProgress,
  validatePeriod,
  type Conflict,
  type Context,
  type Period,
  type Role,
} from "@/lib/escalas/domain";
import { ScheduleActionBar } from "./schedule-action-bar";
import { ScheduleDayCard } from "./schedule-day-card";
import { ScheduleSummary } from "./schedule-summary";
import { useSave } from "./use-save";

function groupByDate(conflicts: Conflict[]) {
  const byDate = new Map<string, Conflict[]>();
  for (const c of conflicts) byDate.set(c.date, [...(byDate.get(c.date) ?? []), c]);
  return byDate;
}

export function ScheduleEditor({
  period,
  context,
  revision,
}: {
  period: Period;
  context: Context;
  revision: number;
}) {
  const router = useRouter();
  const { save, busy, feedback } = useSave(revision);
  const [draft, setDraft] = useState(period);
  const [onlyIssues, setOnlyIssues] = useState(false);

  const conflicts = validatePeriod(draft, context);
  const conflictsByDate = groupByDate(conflicts);
  const events = [...draft.events].sort(compareEvents);
  const dates = [...new Set(events.map((e) => e.date))];
  const visibleDates = onlyIssues
    ? dates.filter((d) => conflictsByDate.has(d))
    : dates;
  const { total, filled } = slotProgress(events, draft.categories, context.rules);
  const dirty = JSON.stringify(draft) !== JSON.stringify(period);

  function updateEvent(
    eventId: string,
    change: (event: Period["events"][number]) => Period["events"][number],
  ) {
    setDraft((prev) => ({
      ...prev,
      events: prev.events.map((ev) => (ev.id === eventId ? change(ev) : ev)),
    }));
  }
  function assign(eventId: string, role: Role, memberId: string) {
    updateEvent(eventId, (ev) => ({
      ...ev,
      assignments: [
        ...ev.assignments.filter((a) => a.role !== role),
        ...(memberId ? [{ role, member_id: memberId }] : []),
      ],
    }));
  }
  function cancel() {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    router.push("/admin/escalas");
  }

  return (
    <>
      <ScheduleSummary
        filled={filled}
        total={total}
        onlyIssues={onlyIssues}
        onOnlyIssuesChange={setOnlyIssues}
      />
      {!visibleDates.length && (
        <div className="sc-card sc-notice sc-ok">
          <strong>Nenhum dia com conflitos.</strong>
          <p>Desmarque o filtro para ver todos os dias.</p>
        </div>
      )}
      {visibleDates.map((date) => (
        <ScheduleDayCard
          key={date}
          date={date}
          events={events.filter((e) => e.date === date)}
          conflicts={conflictsByDate.get(date) ?? []}
          context={context}
          categories={draft.categories}
          onAssign={assign}
          onNotes={(eventId, notes) =>
            updateEvent(eventId, (ev) => ({ ...ev, notes }))
          }
        />
      ))}
      <ScheduleActionBar
        conflictCount={conflicts.length}
        firstConflictDate={dates.find((d) => conflictsByDate.has(d))}
        busy={busy}
        published={period.status === "published"}
        feedback={feedback}
        onPublish={() => save("period", { ...draft, status: "published" })}
        onSaveDraft={() => save("period", { ...draft, status: "draft" })}
        onCancel={cancel}
      />
    </>
  );
}
