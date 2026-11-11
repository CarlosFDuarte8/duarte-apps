import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind } from "typescript";
import * as domain from "./domain";

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
      if (name === "./photos") return { signPhotos: async (rows: unknown[]) => rows };
      throw new Error(name);
    },
  });
  return { api: exports, client, reads, syncs, peak: () => peak };
}
it("opening one game syncs and reads only that game, preserving guests and roster priority", async () => {
  const f = fixture();
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
