import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const db = new PGlite();
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated;
    create table public.volei_attendance(id text primary key,status text,registered_at timestamptz,checked_in_at timestamptz);
    create table public.volei_guests(id text primary key,status text,registered_at timestamptz,checked_in_at timestamptz);
    insert into public.volei_attendance values('legacy','confirmado','2026-11-01T12:00:00Z',null);`);
  await db.exec(
    await readFile(
      new URL(
        "./migrations/202611110002_volei_confirmation_time.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 60000);
afterAll(() => db.close());
it("não inventa horários para confirmações anteriores à migration", async () => {
  expect(
    (
      await db.query<{ confirmed_at: Date | null }>(
        "select confirmed_at from volei_attendance where id='legacy'",
      )
    ).rows[0].confirmed_at,
  ).toBeNull();
});
for (const table of ["volei_attendance", "volei_guests"]) {
  it(`${table}: registra promoção da espera, preserva check-in e renova após cancelamento`, async () => {
    await db.query(
      `insert into ${table}(id,status,registered_at) values('waiting','espera','2026-11-01T12:00:00Z')`,
    );
    const read = async () =>
      (
        await db.query<{ confirmed_at: Date | null; registered_at: Date }>(
          `select confirmed_at,registered_at from ${table} where id='waiting'`,
        )
      ).rows[0];
    expect((await read()).confirmed_at).toBeNull();
    await db.query(
      `update ${table} set status='confirmado' where id='waiting'`,
    );
    const first = (await read()).confirmed_at!;
    expect(first.getTime()).toBeGreaterThan(Date.parse("2026-11-01T12:00:00Z"));
    await db.query(
      `update ${table} set checked_in_at=now(),confirmed_at='2000-01-01' where id='waiting'`,
    );
    expect((await read()).confirmed_at).toEqual(first);
    await db.query(`update ${table} set status='nao_vai' where id='waiting'`);
    expect((await read()).confirmed_at).toBeNull();
    await db.query(
      `update ${table} set status='confirmado' where id='waiting'`,
    );
    expect((await read()).confirmed_at!.getTime()).toBeGreaterThan(
      first.getTime(),
    );
    expect((await read()).registered_at.toISOString()).toBe(
      "2026-11-01T12:00:00.000Z",
    );
  });
  it(`${table}: confirmação direta usa o relógio do banco e ignora horário enviado`, async () => {
    await db.query(
      `insert into ${table}(id,status,confirmed_at) values('direct','confirmado','2000-01-01')`,
    );
    const row = (
      await db.query<{ confirmed_at: Date }>(
        `select confirmed_at from ${table} where id='direct'`,
      )
    ).rows[0];
    expect(row.confirmed_at.getTime()).toBeGreaterThan(
      Date.parse("2020-01-01"),
    );
  });
}
