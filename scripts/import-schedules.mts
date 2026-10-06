import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  periodSchema,
  memberSchema,
  dependencySchema,
  ruleSchema,
  validatePeriod,
} from "../src/lib/escalas/domain";

// Usa credencial de ADMINISTRADOR e a mesma revisão/transação da aplicação.
// Não publica: toda importação chega como rascunho para revisão.
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const actor = process.env.IMPORT_ADMIN_ID;
if (!url || !key || !actor)
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e IMPORT_ADMIN_ID.",
  );
const client = createClient(url, key, { auth: { persistSession: false } });
async function rows(table: string) {
  const result: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client
      .from(table)
      .select("*")
      .order(table === "member_unavailabilities" ? "member_id" : "id");
    if (table === "member_unavailabilities") query = query.order("date");
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    result.push(...data);
    if (data.length < 1000) return result;
  }
}
const rules = (await rows("schedule_rules"))[0];
const members = await rows("members");
const unavailable = await rows("member_unavailabilities");
const dependencies = await rows("member_dependencies");
const context = {
  members: z.array(memberSchema).parse(
    members.map((m) => ({
      ...m,
      unavailable_dates: unavailable
        .filter((u) => u.member_id === m.id)
        .map((u) => u.date),
    })),
  ),
  rules: ruleSchema.parse(rules.config),
  dependencies: z.array(dependencySchema).parse(dependencies),
};
const existing = await rows("schedule_periods");
const periods = await Promise.all(
  ["10", "11", "12"].map(async (month) =>
    periodSchema.parse(
      JSON.parse(
        await readFile(
          new URL(`../supabase/imports/2026-${month}.json`, import.meta.url),
          "utf8",
        ),
      ),
    ),
  ),
);
if (existing.some((p) => periods.some((n) => n.month === p.month)))
  throw new Error(
    "Um dos meses já existe. Importação cancelada para não sobrescrever dados.",
  );
const conflicts = periods.flatMap((p) => validatePeriod(p, context));
const { error } = await client.rpc("commit_schedule_change", {
  p_actor: z.uuid().parse(actor),
  p_revision: rules.revision,
  p_kind: "periods",
  p_data: {
    periods: periods.map((p) => ({ ...p, status: "draft" })),
    conflicts,
    source: "PDFs de 2026",
  },
});
if (error) throw error;
console.log(
  `Importados 3 rascunhos; ${conflicts.length} conflitos para revisar na administração.`,
);
for (const c of conflicts) console.log(`${c.date}: ${c.rule}`);
