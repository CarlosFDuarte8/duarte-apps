import "server-only";
import { z } from "zod";
import {
  memberSchema,
  periodSchema,
  ruleSchema,
  dependencySchema,
  type Period,
} from "./domain";
import { requireAdmin, serviceClient } from "./supabase";
export async function snapshot() {
  const { client, user } = await requireAdmin();
  async function all(table: string) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      let query = client
        .from(table)
        .select("*")
        .order(
          table === "schedule_assignments"
            ? "event_id"
            : table === "member_unavailabilities"
              ? "member_id"
              : "id",
        );
      if (table === "schedule_assignments") query = query.order("role");
      if (table === "member_unavailabilities") query = query.order("date");
      const { data, error } = await query.range(from, from + 999);
      if (error)
        throw new Error(`Falha ao carregar ${table}: ${error.message}`);
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return rows;
  }
  const rules = await all("schedule_rules");
  const [members, dates, dependencies, periods, events, assignments] =
    await Promise.all([
      all("members"),
      all("member_unavailabilities"),
      all("member_dependencies"),
      all("schedule_periods"),
      all("schedule_events"),
      all("schedule_assignments"),
    ]);
  const { data: logs, error } = await client
    .from("generation_logs")
    .select("id,actor_id,created_at,action")
    .order("id", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  const { data: latest, error: latestError } = await client
    .from("schedule_rules")
    .select("revision")
    .eq("id", true)
    .single();
  if (latestError || latest.revision !== rules[0]?.revision)
    throw new Error("Os dados mudaram durante a leitura. Recarregue a página.");
  return {
    actor: user.id,
    revision: z.number().parse(rules[0]?.revision),
    rules: ruleSchema.parse(rules[0]?.config),
    dependencies: z.array(dependencySchema).parse(dependencies),
    members: z.array(memberSchema).parse(
      members.map((m) => ({
        ...m,
        unavailable_dates: dates
          .filter((d) => d.member_id === m.id)
          .map((d) => d.date),
      })),
    ),
    periods: z.array(periodSchema).parse(
      periods.map((p) => ({
        ...p,
        events: events
          .filter((e) => e.period_id === p.id)
          .map((e) => ({
            ...e,
            assignments: assignments.filter((a) => a.event_id === e.id),
          })),
      })),
    ),
    logs: logs ?? [],
  };
}
export async function commit(
  revision: number,
  actor: string,
  kind: "member" | "rules" | "periods",
  data: unknown,
) {
  const { error } = await serviceClient().rpc("commit_schedule_change", {
    p_revision: revision,
    p_actor: actor,
    p_kind: kind,
    p_data: data,
  });
  if (error) throw new Error(error.message);
}
export function history(periods: Period[]) {
  return periods.flatMap((p) => p.events);
}
