import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const event = id(100),
  member = id(1);
const secret = "a".repeat(64);
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create function public.is_volei_admin() returns boolean language sql as $$ select coalesce(current_setting('test.admin',true),'false')='true' $$;
    create table public.volei_members(id uuid primary key default gen_random_uuid(),name text,phone text unique,device_secret_hash text,token text default 'token',membership_status text default 'pending',is_core boolean default false,is_active boolean default true,blocked boolean default false);
    create table public.volei_events(id uuid primary key,date date,max_teams integer default 3,closed boolean default false,presence_closed_at timestamptz,guests_open_at timestamptz);
    create table public.volei_attendance(event_id uuid,member_id uuid,status text,updated_at timestamptz default now(),registered_at timestamptz default now(),queue_order bigint generated always as identity);
    create table public.volei_guests(id uuid primary key default gen_random_uuid(),event_id uuid,member_id uuid,name text,phone text,status text,registered_at timestamptz default now(),queue_order bigint generated always as identity);
    create table public.volei_guest_blocks(phone text);
    create function public.volei_sync_reservations(uuid) returns void language plpgsql as $$ begin end $$;
    create function public.volei_respond(uuid,uuid,text,text,text default null) returns void language plpgsql as $$ begin end $$;
    create function public.volei_occupied_slots(p_event uuid) returns integer language sql as $$ select count(*)::integer from public.volei_attendance where event_id=p_event and status='confirmado' $$;
    grant usage on schema public to anon,authenticated,service_role;
  `);
  const original = await readFile(
    new URL(
      "./migrations/202610280005_volei_international_phone.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(
    original.slice(
      original.indexOf(
        "create or replace function public.volei_phone_register",
      ),
    ),
  );
  await db.exec(
    await readFile(
      new URL("./migrations/202611110001_volei_students.sql", import.meta.url),
      "utf8",
    ),
  );
}, 60000);
beforeEach(async () => {
  await db.exec(
    "reset role; set test.admin='false'; truncate volei_attendance,volei_guests,volei_members,volei_events;",
  );
  await db.query("insert into volei_events(id,date) values($1,'2099-01-06')", [
    event,
  ]); // Tuesday
});
afterAll(() => db.close());
async function register(days: number[], hash = secret) {
  return db.query<{ id: string }>(
    "select public.volei_register_student_request($1,'Daniel','+5511999998888',$2,$3::smallint[]) id",
    [event, hash, days],
  );
}
it("cadastro público registra somente solicitação, sem prioridade", async () => {
  const result = await register([4, 2, 2]);
  const row = (
    await db.query(
      "select student_weekdays,requested_student_weekdays from volei_members where id=$1",
      [result.rows[0].id],
    )
  ).rows[0];
  expect(row).toEqual({
    student_weekdays: [],
    requested_student_weekdays: [2, 4],
  });
  await register([3]);
  expect(
    (await db.query<{ requested_student_weekdays: number[] | null }>("select requested_student_weekdays from volei_members"))
      .rows[0].requested_student_weekdays,
  ).toEqual([2, 4]);
  await expect(register([2], "b".repeat(64))).rejects.toThrow(
    /outro navegador/,
  );
});
it("não alunos não criam solicitação e dados inválidos não deixam cadastros parciais", async () => {
  await expect(register([7])).rejects.toThrow(/dias/);
  expect((await db.query("select * from volei_members")).rows).toHaveLength(0);
  await register([]);
  expect(
    (await db.query<{ requested_student_weekdays: number[] | null }>("select requested_student_weekdays from volei_members"))
      .rows[0].requested_student_weekdays,
  ).toBeNull();
});
it("somente o administrador confirma ou recusa, sem sobrescrever uma edição concorrente", async () => {
  const result = await register([2, 4]);
  const memberId = result.rows[0].id;
  const save = (days: number[], expected: number[], request: number[] | null) =>
    db.query(
      "select public.volei_save_student_days($1,$2::smallint[],$3::smallint[],$4::smallint[])",
      [memberId, days, expected, request],
    );
  await expect(save([2, 4], [], [2, 4])).rejects.toThrow(/restrito/);
  await db.exec("set test.admin='true'");
  await save([4, 2, 2], [], [2, 4]);
  expect(
    (
      await db.query(
        "select student_weekdays,requested_student_weekdays from volei_members",
      )
    ).rows[0],
  ).toEqual({ student_weekdays: [2, 4], requested_student_weekdays: null });
  await expect(save([3], [], [2, 4])).rejects.toThrow(/mudou/);
  await save([], [2, 4], null);
  expect(
    (await db.query<{ student_weekdays: number[] }>("select student_weekdays from volei_members")).rows[0]
      .student_weekdays,
  ).toEqual([]);
});
it("RPC público é exclusivo do servidor e anônimos não podem aprovar", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await expect(register([2])).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  }
  await db.exec("set role anon");
  try {
    await expect(
      db.query("select public.volei_save_student_days($1,'{}','{}',null)", [
        member,
      ]),
    ).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec("reset role");
  }
});
for (const fn of ["volei_fill_slots", "volei_admin_fill_slots"]) {
  it(`${fn}: prioridade apenas no dia aprovado; pedidos e outros dias respeitam a fila`, async () => {
    // One free place. A later Tuesday student precedes all regular requests.
    await db.query(
      "insert into volei_members(id,name,membership_status) values($1,'Presente','approved')",
      [id(50)],
    );
    for (let i = 0; i < 17; i++)
      await db.query(
        "insert into volei_attendance(event_id,member_id,status) values($1,$2,'confirmado')",
        [event, id(50)],
      );
    for (const [n, days, request] of [
      [1, [], null],
      [2, [3], null],
      [3, [], [2]],
      [4, [2, 4], null],
    ] as const) {
      await db.query(
        "insert into volei_members(id,name,membership_status,student_weekdays,requested_student_weekdays) values($1,$2,'approved',$3,$4)",
        [id(n), `Pessoa ${n}`, days, request],
      );
      await db.query(
        "insert into volei_attendance(event_id,member_id,status,registered_at) values($1,$2,'espera',$3)",
        [event, id(n), `2099-01-01T0${n}:00:00Z`],
      );
    }
    await db.query(`select public.${fn}($1)`, [event]);
    expect(
      (
        await db.query(
          "select member_id from volei_attendance where status='confirmado' and member_id<>$1",
          [id(50)],
        )
      ).rows,
    ).toEqual([{ member_id: id(4) }]);
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from volei_attendance where status='confirmado'",
        )
      ).rows[0].n,
    ).toBe(18);
  });
}
it("banco rejeita dias inválidos e elementos nulos mesmo fora dos formulários", async () => {
  for (const days of [[7], [null]])
    await expect(
      db.query(
        "insert into volei_members(name,student_weekdays) values('Inválido',$1)",
        [days],
      ),
    ).rejects.toThrow(/constraint/);
});
