import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { todayTasks } from "./today-tasks";
import { today } from "./domain";

function client(event: unknown, pending = 2, error = false) {
  const filters: unknown[] = [];
  return { filters, client: { from(table: string) {
    const result = table === "volei_events" ? { data: event, error: error ? {} : null } : { count: pending, error: null };
    const query = {
      select(...args: unknown[]) { filters.push([table, ...args]); return query; },
      eq(...args: unknown[]) { filters.push([table, ...args]); return query; },
      maybeSingle: async () => result,
      then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
    }; return query;
  } } as unknown as SupabaseClient };
}
it("shows today's game, pending approvals and confirmed guests in the call totals", async () => {
  const fixture = client({ id: "game", title: "Vôlei", date: today(), presence_closed_at: null,
    volei_attendance: [{ status: "confirmado", checked_in_at: "arrived" }, { status: "espera", checked_in_at: null }],
    volei_guests: [{ status: "confirmado", checked_in_at: null }] });
  expect(await todayTasks(fixture.client)).toEqual({ pending: 2, event: { id: "game", title: "Vôlei", date: today(), finalized: false, participants: 2, present: 1 } });
  expect(fixture.filters).toContainEqual(["volei_events", "date", today()]);
  expect(fixture.filters).toContainEqual(["volei_members", "id", { count: "exact", head: true }]);
});
it("does not invent a game or hide a query failure as an empty task list", async () => {
  expect(await todayTasks(client(null, 0).client)).toEqual({ pending: 0, event: null });
  await expect(todayTasks(client(null, 0, true).client)).rejects.toThrow(/tarefas/);
});
