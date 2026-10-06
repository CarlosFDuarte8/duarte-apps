import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import october from "./imports/2026-10.json";

const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    insert into auth.users values ('${admin}');`);
  await db.exec(
    await readFile(
      new URL("./migrations/202609140001_escalas.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(await readFile(new URL("./seed.sql", import.meta.url), "utf8"));
  await db.query("insert into public.users values ($1,'admin')", [admin]);
}, 60000);
afterAll(async () => {
  await db.close();
});
async function commit(revision: number, period: typeof october) {
  return db.query(
    "select public.commit_schedule_change($1,$2,'periods',$3::jsonb)",
    [revision, admin, JSON.stringify({ periods: [period] })],
  );
}
describe("Migration PostgreSQL e limites de acesso", () => {
  it("semeia 17 membros, sem telefones públicos", async () => {
    const result = await db.query<{ count: number }>(
      "select count(*)::int as count from public.members",
    );
    expect(result.rows[0].count).toBe(17);
  });
  it("grava atribuições normalizadas em uma transação", async () => {
    await commit(0, october);
    const result = await db.query<{ count: number }>(
      "select count(*)::int as count from public.schedule_assignments",
    );
    expect(result.rows[0].count).toBe(58);
  });
  it("rascunhos não aparecem no RPC público", async () => {
    await db.exec("set role anon");
    try {
      const result = await db.query<{ data: unknown[] }>(
        "select public.published_schedule('2026-10') as data",
      );
      expect(result.rows[0].data).toEqual([]);
    } finally {
      await db.exec("reset role");
    }
  });
  it("anônimos não podem ler membros ou escrever por RPC", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from public.members")).rejects.toThrow(
        /permission denied/,
      );
      await expect(commit(1, october)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
  it("autenticados comuns não leem dados nem promovem a própria conta", async () => {
    await db.exec("set role authenticated");
    try {
      const result = await db.query("select * from public.members");
      expect(result.rows).toEqual([]);
      await expect(
        db.query("insert into public.users values ($1,'admin')", [
          crypto.randomUUID(),
        ]),
      ).rejects.toThrow(/permission denied/);
      await expect(commit(1, october)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
  it("administrador autenticado lê mas não burla validação escrevendo direto", async () => {
    await db.exec(
      `set request.jwt.claim.sub='${admin}'; set role authenticated;`,
    );
    try {
      const result = await db.query("select * from public.members");
      expect(result.rows).toHaveLength(17);
      await expect(
        db.query("update public.schedule_periods set status='published'"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role; reset request.jwt.claim.sub;");
    }
  });
  it("rejeita revisão obsoleta e reverte o lote inteiro", async () => {
    await expect(
      commit(0, { ...october, status: "published" }),
    ).rejects.toThrow(/Recarregue/);
    const bad = structuredClone(october);
    bad.events[0].assignments[0].member_id = crypto.randomUUID();
    await expect(commit(1, bad)).rejects.toThrow();
    const result = await db.query<{ revision: number }>(
      "select revision from public.schedule_rules",
    );
    expect(result.rows[0].revision).toBe(1);
  });
  it("publicação entrega só nomes, funções e observações públicas", async () => {
    await commit(1, { ...october, status: "published" });
    await db.exec("set role anon");
    try {
      const result = await db.query<{
        data: { assignments: Record<string, unknown>[] }[];
      }>("select public.published_schedule('2026-10') as data");
      expect(result.rows[0].data).toHaveLength(14);
      const assignment = result.rows[0].data[0].assignments[0];
      expect(Object.keys(assignment).sort()).toEqual(["name", "role"]);
      expect(JSON.stringify(result.rows)).not.toContain("phone");
    } finally {
      await db.exec("reset role");
    }
  });
  it("despublicar retira o mês do acesso público e mantém auditoria", async () => {
    await commit(2, october);
    const result = await db.query<{ data: unknown[] }>(
      "select public.published_schedule('2026-10') as data",
    );
    expect(result.rows[0].data).toEqual([]);
    const logs = await db.query("select * from public.generation_logs");
    expect(logs.rows).toHaveLength(3);
  });
});
