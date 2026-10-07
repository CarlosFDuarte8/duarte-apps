import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { runMigrations, type MigrationConnection } from "./migration-runner";

const db = new PGlite();
const connection: MigrationConnection = {
  async query(sql, parameters) {
    if (parameters) return db.query<{ checksum?: string }>(sql, parameters);
    const results = await db.exec(sql);
    return {
      rows: results.flatMap((result) => result.rows) as { checksum?: string }[],
    };
  },
};
const files = [
  {
    name: "001.sql",
    sql: "create table public.example(id integer primary key);",
  },
  {
    name: "seed.sql",
    sql: "begin;\ninsert into public.example values(1);\ncommit;",
  },
];
beforeAll(async () => {
  await db.exec("create role anon; create role authenticated;");
}, 60000);
afterAll(async () => {
  await db.close();
});
it("aplica migration e seed juntos e não repete ao executar novamente", async () => {
  expect(await runMigrations(connection, files)).toEqual([
    "001.sql",
    "seed.sql",
  ]);
  expect(await runMigrations(connection, files)).toEqual([]);
  expect((await db.query("select * from public.example")).rows).toHaveLength(1);
});
it("recusa arquivos modificados após aplicação", async () => {
  await expect(
    runMigrations(connection, [
      { ...files[0], sql: files[0].sql + "-- alteração" },
    ]),
  ).rejects.toThrow("foi modificado");
});
it("reverte todo o lote e o histórico se um arquivo falhar", async () => {
  await expect(
    runMigrations(connection, [
      ...files,
      { name: "002.sql", sql: "insert into public.example values(2);" },
      { name: "003.sql", sql: "insert into public.example values(1);" },
    ]),
  ).rejects.toThrow();
  expect((await db.query("select * from public.example")).rows).toHaveLength(1);
  expect(
    (await db.query("select * from incra_migrations.applied")).rows,
  ).toHaveLength(2);
});
