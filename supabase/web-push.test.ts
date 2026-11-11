import { beforeAll, afterAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const member = "00000000-0000-4000-8000-000000000003";
const event = "00000000-0000-4000-8000-000000000004";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${admin}'),('${second}');
    create table public.volei_admins(user_id uuid primary key references auth.users(id));
    insert into public.volei_admins values ('${admin}'),('${second}');
    create table public.volei_members(id uuid primary key, name text, membership_status text);
    create table public.volei_events(id uuid primary key,date date);
    create table public.volei_attendance(event_id uuid,member_id uuid,status text,primary key(event_id,member_id));
    create table public.volei_guests(id uuid primary key,event_id uuid,name text,status text);
    insert into public.volei_events values('${event}',current_date+1);
    grant usage on schema public,auth to anon,authenticated,service_role;`);
  await db.exec(
    await readFile(
      new URL("./migrations/202611100001_volei_web_push.sql", import.meta.url),
      "utf8",
    ),
  );
}, 60000);
afterAll(() => db.close());
async function count() {
  return (
    await db.query<{ n: number }>(
      "select count(*)::int n from public.volei_web_push_outbox",
    )
  ).rows[0].n;
}
it("somente o servidor registra navegadores; dados e fila ficam privados", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await expect(
        db.query("select * from public.volei_web_push_subscriptions"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("select * from public.volei_web_push_outbox"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("select public.volei_claim_web_push(20)"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query(
          "select public.volei_save_web_subscription($1,'endpoint','key','auth')",
          [admin],
        ),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  }
  await db.query(
    "select public.volei_save_web_subscription($1,'https://fcm.googleapis.com/test','key','auth')",
    [admin],
  );
  expect(
    (await db.query("select * from public.volei_web_push_subscriptions")).rows,
  ).toHaveLength(1);
});
it("um cadastro enfileira uma vez; editar o nome ou aprovar não repete", async () => {
  await db.query(
    "insert into public.volei_members values($1,'Carlos','pending')",
    [member],
  );
  expect(await count()).toBe(1);
  await db.query(
    "update public.volei_members set name='Carlos Duarte',membership_status='pending' where id=$1",
    [member],
  );
  await db.query(
    "update public.volei_members set membership_status='approved' where id=$1",
    [member],
  );
  expect(await count()).toBe(1);
});
it("detecta confirmação, promoção da espera e convidado sem repetir atualizações estáveis", async () => {
  await db.query("insert into public.volei_attendance values($1,$2,'espera')", [
    event,
    member,
  ]);
  expect(await count()).toBe(1);
  await db.query(
    "update public.volei_attendance set status='confirmado' where event_id=$1",
    [event],
  );
  expect(await count()).toBe(2);
  await db.query(
    "update public.volei_attendance set status='confirmado' where event_id=$1",
    [event],
  );
  expect(await count()).toBe(2);
  await db.query(
    "insert into public.volei_guests values(gen_random_uuid(),$1,'Convidado','confirmado')",
    [event],
  );
  expect(await count()).toBe(3);
  const rows = await db.query<{ body: string; href: string }>(
    "select body,href from public.volei_web_push_outbox where title='Presença confirmada'",
  );
  expect(rows.rows.some((row) => row.body.includes("Carlos Duarte"))).toBe(
    true,
  );
  expect(rows.rows.every((row) => row.href === `/admin/volei/${event}`)).toBe(
    true,
  );
});
it("leases não entregam os mesmos itens a dois processadores; recuperação é limitada", async () => {
  await db.exec("set role service_role");
  try {
    const first = await db.query(
      "select * from public.volei_claim_web_push(20)",
    );
    expect(first.rows).toHaveLength(3);
    expect(
      (await db.query("select * from public.volei_claim_web_push(20)")).rows,
    ).toHaveLength(0);
    await db.exec(
      "update public.volei_web_push_outbox set claimed_at=now()-interval '6 minutes'",
    );
    expect(
      (await db.query("select * from public.volei_claim_web_push(20)")).rows,
    ).toHaveLength(3);
    await db.exec(
      "update public.volei_web_push_outbox set attempts=5,claimed_at=now()-interval '6 minutes'",
    );
    expect(
      (await db.query("select * from public.volei_claim_web_push(20)")).rows,
    ).toHaveLength(0);
  } finally {
    await db.exec("reset role");
  }
});
it("trocar de conta no navegador descarta a fila antiga; renovação não muda a identidade", async () => {
  const before = (
    await db.query<{ id: string }>(
      "select id from public.volei_web_push_subscriptions",
    )
  ).rows[0].id;
  await db.query(
    "select public.volei_save_web_subscription($1,'https://fcm.googleapis.com/test','key','auth')",
    [admin],
  );
  expect(
    (
      await db.query<{ id: string }>(
        "select id from public.volei_web_push_subscriptions",
      )
    ).rows[0].id,
  ).toBe(before);
  await db.query(
    "select public.volei_save_web_subscription($1,'https://fcm.googleapis.com/test','key','auth')",
    [second],
  );
  expect(await count()).toBe(0);
  expect(
    (
      await db.query<{ id: string }>(
        "select id from public.volei_web_push_subscriptions",
      )
    ).rows[0].id,
  ).not.toBe(before);
});
it("administrador removido e inscrição expirada não recebem novos itens nem são reivindicados", async () => {
  await db.exec(
    "update public.volei_attendance set status='espera'; update public.volei_attendance set status='confirmado'",
  );
  expect(await count()).toBe(1);
  await db.query("delete from public.volei_admins where user_id=$1", [second]);
  expect(
    (await db.query("select * from public.volei_claim_web_push(20)")).rows,
  ).toHaveLength(0);
  await db.exec(
    "update public.volei_attendance set status='espera'; update public.volei_attendance set status='confirmado'",
  );
  expect(await count()).toBe(1);
  await db.query("insert into public.volei_admins values($1)", [second]);
  await db.exec(
    "update public.volei_web_push_subscriptions set expires_at=now()-interval '1 minute'",
  );
  expect(
    (await db.query("select * from public.volei_claim_web_push(20)")).rows,
  ).toHaveLength(0);
});
