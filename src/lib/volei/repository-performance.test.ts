import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import * as participationPolicy from "./participation-policy";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind } from "typescript";
import * as domain from "./domain";
import * as profile from "./profile";
import { guestQueuePosition, memberQueuePosition } from "./queue";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture() {
  const rows = Array.from({ length: 8 }, (_, index) => ({
    id: id(index + 1), date: `2026-11-${String(index + 4).padStart(2, "0")}`, title: "Vôlei", max_teams: 3,
    volei_attendance: [
      { member_id: "b", status: "confirmado", registered_at: "2026-11-01T10:00:00Z", queue_order: 1, volei_members: { name: "B", is_core: false } },
      { member_id: "a", status: "confirmado", registered_at: "2026-11-02T10:00:00Z", queue_order: 2, volei_members: { name: "A", is_core: true } },
    ],
    volei_guests: [{ id: "guest", member_id: "a", name: "Convidado", status: "confirmado", registered_at: "2026-11-03T10:00:00Z", queue_order: 3 }],
  }));
  const reads: { select: string; event?: string }[] = [];
  const syncs: string[] = [];
  let concurrent = 0, peak = 0;
  const client = {
    from() {
      const options = { select: "", event: undefined as string | undefined };
      const query = {
        select(value: string) { options.select = value; return query; },
        eq(_: string, value: string) { options.event = value; return query; },
        gte() { return query; }, lte() { return query; }, order() { return query; },
        async maybeSingle() { reads.push({ ...options }); return { data: rows.find((row) => row.id === options.event) ?? null, error: null }; },
        then(resolve: (value: unknown) => void) {
          reads.push({ ...options });
          return Promise.resolve({ data: options.select === "id" ? rows.map(({ id }) => ({ id })) : rows, error: null }).then(resolve);
        },
      };
      return query;
    },
    async rpc(method: string, args: { p_event: string }) {
      expect(method).toBe("volei_fill_slots");
      syncs.push(args.p_event); ++concurrent; peak = Math.max(peak, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 1));
      --concurrent;
      return { error: null };
    },
  };
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  runInNewContext(transpileModule(readFileSync("src/lib/volei/repository.ts", "utf8"), { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, {
    exports,
    require(name: string) {
      if (name === "server-only") return {};
      if (name === "@/lib/escalas/supabase") return { serviceClient: () => client };
      if (name === "./domain") return domain;
      if (name === "./profile") return profile;
      if (name === "./participation-policy") return participationPolicy;
      if (name === "./photos") return { signPhotos: async (rows: unknown[]) => rows };
      throw new Error(name);
    },
  });
  return { api: exports, client, rows, reads, syncs, peak: () => peak };
}
it("opening one game syncs and reads only that game, preserving guests and roster priority", async () => {
  const f = fixture();
  Object.assign(f.rows[0].volei_attendance[0].volei_members, { birth_date: "1995-01-01" });
  Object.assign(f.rows[0].volei_attendance[1].volei_members, { birth_date: "1995-01-01", student_weekdays: [domain.weekdayOf(f.rows[0].date)], student_class_time: "18:00:00" });
  const game = await f.api.publicEvent(id(1)) as { event: { id: string }; attendance: { member_id: string }[]; guests: { name: string }[] };
  expect(f.syncs).toEqual([id(1)]);
  expect(f.reads).toHaveLength(1);
  expect(f.reads[0].event).toBe(id(1));
  expect(game.event.id).toBe(id(1));
  expect(game.attendance.map((row) => row.member_id)).toEqual(["a", "b"]);
  expect(game.guests[0].name).toBe("Convidado");
});
it("invalid game IDs do not trigger database work", async () => {
  const f = fixture();
  expect(await f.api.publicEvent("invalid")).toBeNull();
  expect(f.reads).toHaveLength(0);
  expect(f.syncs).toHaveLength(0);
});
it("queue positions follow public priority, exclude unavailable members and keep a separate guest queue", async () => {
  const f = fixture();
  f.rows[0].volei_attendance = [
    { member_id: "first", status: "espera", registered_at: "2026-11-01T10:00:00Z", queue_order: 1, volei_members: { name: "Primeiro", is_core: false } },
    { member_id: "priority", status: "espera", registered_at: "2026-11-02T10:00:00Z", queue_order: 2, volei_members: { name: "Prioritário", is_core: true } },
    { member_id: "confirmed", status: "confirmado", registered_at: "2026-11-03T10:00:00Z", queue_order: 3, volei_members: { name: "Confirmado", is_core: true } },
  ];
  Object.assign(f.rows[0].volei_attendance[0].volei_members, { birth_date: "1995-01-01" });
  Object.assign(f.rows[0].volei_attendance[1].volei_members, { birth_date: "1995-01-01", student_weekdays: [domain.weekdayOf(f.rows[0].date)], student_class_time: "18:00:00" });
  Object.assign(f.rows[0].volei_attendance[2].volei_members, { blocked: true });
  f.rows[0].volei_guests = [
    { id: "guest2", member_id: "first", name: "Depois", status: "espera", registered_at: "2026-11-03T10:00:00Z", queue_order: 2 },
    { id: "guest1", member_id: "priority", name: "Antes", status: "espera", registered_at: "2026-11-03T10:00:00Z", queue_order: 1 },
  ];
  const game = await f.api.publicEvent(id(1)) as { attendance: { member_id: string; status: domain.AttendanceStatus }[]; guests: { id: string; status: domain.AttendanceStatus; registered_at: string; queue_order: number }[] };
  expect(memberQueuePosition(game.attendance, "first")).toBe(2);
  expect(memberQueuePosition(game.attendance, "priority")).toBe(1);
  expect(memberQueuePosition(game.attendance, "confirmed")).toBeNull();
  expect(guestQueuePosition(game.guests, "guest2")).toBe(2);
  expect(guestQueuePosition(game.guests, "guest1")).toBe(1);
  expect(game.guests[0].id).toBe("guest2");
  expect(JSON.stringify(game)).not.toMatch(/blocked|is_core|student_weekdays|birth_date|student_class_time|1995-01-01/);
});
it("monthly agenda syncs independent events with bounded concurrency and only two reads", async () => {
  const f = fixture();
  await f.api.publicEvents("2026-11", "2026-11-01");
  expect(f.syncs).toHaveLength(8);
  expect(f.peak()).toBe(4);
  expect(f.reads).toHaveLength(2);
});
it("the admin agenda no longer downloads and discards a second full public roster", async () => {
  const f = fixture();
  await f.api.listEvents(f.client, "2026-11");
  expect(f.reads).toHaveLength(2);
  expect(f.reads[0].select).toBe("id");
  expect(f.reads[1].select).not.toContain("volei_members(name,is_core)");
  expect(f.syncs).toHaveLength(8);
});
