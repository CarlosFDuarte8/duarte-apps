import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const outsider = "00000000-0000-4000-8000-000000000002";
const event = "00000000-0000-4000-8000-000000000100";

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    insert into auth.users values('${admin}'),('${outsider}');`);
  const directory = new URL("./migrations/", import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, directory), "utf8"));
  }
  await db.query("insert into volei_admins values($1)", [admin]);
}, 60_000);

beforeEach(async () => {
  await db.exec("reset role; reset request.jwt.claim.sub; truncate volei_events,volei_members cascade;");
  await db.query("insert into volei_events(id,date,registration_deadline,guests_open_at) values($1,(now() at time zone 'America/Sao_Paulo')::date,now()-interval '1 hour',now()-interval '1 hour')", [event]);
});
afterAll(() => db.close());

async function member(name = "Participante", status = "approved") {
  return (await db.query<{ id: string; token: string }>(
    "insert into volei_members(name,membership_status,birth_date) values($1,$2,'1995-01-01') returning id,token", [name, status],
  )).rows[0];
}
async function as(user: string | null, action: () => Promise<unknown>) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.exec(`set role ${user ? "authenticated" : "service_role"}`);
  try { return await action(); }
  finally { await db.exec("reset role; reset request.jwt.claim.sub;"); }
}
const respond = (id: string, token?: string, status = "confirmado") => db.query("select volei_respond($1,$2,$3,$4)", [event,id,status,token ?? null]);
const register = (name = "Novo participante", phone = "+5561999991234", birth: string | null = "1995-01-01") => db.query<{ volei_admin_register_player: { id: string; status: string } }>("select volei_admin_register_player($1,$2,$3,$4)", [event,name,phone,birth]);

it("event links default to disabled and only the administrator may enable valid directions", async () => {
  // Supabase grants table privileges to authenticated; RLS then restricts writes.
  await db.exec("grant select,update on volei_events to authenticated");
  const settings = async () => (await db.query<{ calendar_enabled: boolean; directions_enabled: boolean; directions_url: string | null }>("select calendar_enabled,directions_enabled,directions_url from volei_events where id=$1", [event])).rows[0];
  expect(await settings()).toEqual({ calendar_enabled: false, directions_enabled: false, directions_url: null });
  await as(outsider, () => db.query("update volei_events set calendar_enabled=true where id=$1", [event]));
  expect((await settings()).calendar_enabled).toBe(false);
  await expect(as(admin, () => db.query("update volei_events set directions_enabled=true where id=$1", [event]))).rejects.toThrow(/check constraint/);
  await expect(as(admin, () => db.query("update volei_events set directions_url='javascript:alert(1)' where id=$1", [event]))).rejects.toThrow(/check constraint/);
  await as(admin, () => db.query("update volei_events set calendar_enabled=true,directions_enabled=true,directions_url='https://maps.app.goo.gl/Quadra' where id=$1", [event]));
  expect(await settings()).toEqual({ calendar_enabled: true, directions_enabled: true, directions_url: "https://maps.app.goo.gl/Quadra" });
});

it("only the administrator creates an approved member and registers them after the public deadline", async () => {
  await expect(as(outsider, () => register())).rejects.toThrow(/restrito/);
  expect((await db.query("select id from volei_members")).rows).toHaveLength(0);
  await db.query("update volei_events set closed=true where id=$1", [event]);
  const result = await as(admin, () => register()) as Awaited<ReturnType<typeof register>>;
  const created = result.rows[0].volei_admin_register_player;
  expect(created.status).toBe("confirmado");
  expect((await db.query("select membership_status,phone,birth_date::text from volei_members where id=$1", [created.id])).rows[0]).toEqual({ membership_status: "approved", phone: "+5561999991234", birth_date: "1995-01-01" });
});

it("invalid or duplicate registrations leave no partial member or attendance", async () => {
  await expect(as(admin, () => register("Novo", "+5561999991234", null))).rejects.toThrow(/nascimento/);
  await expect(as(admin, () => register("Novo", "123"))).rejects.toThrow(/telefone/);
  await as(admin, () => register());
  await expect(as(admin, () => register("Outro nome"))).rejects.toThrow(/unique/);
  await expect(as(admin, () => register("  NOVO   PARTICIPANTE  ", "+5561999995678"))).rejects.toThrow(/unique/);
  expect((await db.query("select id from volei_members")).rows).toHaveLength(1);
  expect((await db.query("select member_id from volei_attendance")).rows).toHaveLength(1);
  await db.query("update volei_events set presence_closed_at=now() where id=$1", [event]);
  await expect(as(admin, () => register("Terceiro", "+5561999995678"))).rejects.toThrow(/concluída/);
  expect((await db.query("select id from volei_members")).rows).toHaveLength(1);
});

it("a new admin-created member joins the queue when the game is full", async () => {
  for (let i = 0; i < 18; i++) { const person = await member(`Já inscrito ${i}`); await as(admin, () => respond(person.id)); }
  const result = await as(admin, () => register()) as Awaited<ReturnType<typeof register>>;
  expect(result.rows[0].volei_admin_register_player.status).toBe("espera");
  expect((await db.query("select id from volei_members")).rows).toHaveLength(19);
  expect((await db.query("select member_id from volei_attendance where status='confirmado'")).rows).toHaveLength(18);
});
const attendance = async (id: string) => (await db.query<{ status: string; confirmed_at: Date | null; queue_order: number }>("select status,confirmed_at,queue_order from volei_attendance where event_id=$1 and member_id=$2", [event,id])).rows[0];

it("o administrador confirma e inclui convidados após o prazo e fechamento público", async () => {
  const person = await member();
  await expect(as(null, () => respond(person.id, person.token))).rejects.toThrow(/encerradas/);
  await expect(as(outsider, () => respond(person.id))).rejects.toThrow(/inválido/);
  await expect(as(outsider, () => respond(person.id, person.token))).rejects.toThrow(/encerradas/);
  await db.query("update volei_events set closed=true where id=$1", [event]);
  await as(admin, () => respond(person.id));
  expect((await attendance(person.id)).status).toBe("confirmado");
  expect((await attendance(person.id)).confirmed_at).not.toBeNull();
  await as(admin, () => db.query("select volei_admin_add_guest($1,$2,'Convidado tardio')", [event,person.id]));
  expect((await db.query("select status from volei_guests")).rows).toEqual([{ status: "confirmado" }]);
  const first = await attendance(person.id);
  await as(admin, () => respond(person.id));
  expect(await attendance(person.id)).toEqual(first);
});

it("preserva a capacidade e promove quem já aguardava antes de um novo membro", async () => {
  const people: Awaited<ReturnType<typeof member>>[] = [];
  for (let i = 0; i < 20; i++) people.push(await member(`Participante ${i}`));
  await db.query("update volei_events set closed=true where id=$1", [event]);
  for (const person of people.slice(0,19)) await as(admin, () => respond(person.id));
  expect((await attendance(people[18].id)).status).toBe("espera");
  await db.query("update volei_attendance set status='nao_vai' where member_id=$1", [people[0].id]);
  await as(admin, () => respond(people[19].id));
  expect((await attendance(people[18].id)).status).toBe("confirmado");
  expect((await attendance(people[19].id)).status).toBe("espera");
  expect((await db.query<{ count: number }>("select count(*)::integer count from volei_attendance where status='confirmado'")).rows[0].count).toBe(18);
});

it("o administrador promove uma inscrição já na espera sem mudar sua ordem", async () => {
  const person = await member();
  await db.query("insert into volei_attendance(event_id,member_id,status) values($1,$2,'espera')", [event,person.id]);
  const first = await attendance(person.id);
  await db.query("update volei_events set closed=true where id=$1", [event]);
  await as(admin, () => respond(person.id));
  expect((await attendance(person.id)).status).toBe("confirmado");
  expect((await attendance(person.id)).queue_order).toBe(first.queue_order);
});

it("não libera membros bloqueados, inativos, pendentes nem inclusões após concluir a chamada", async () => {
  for (const changes of ["blocked=true", "is_active=false", "membership_status='pending'"]) {
    const person = await member(changes);
    await db.exec(`update volei_members set ${changes} where id='${person.id}'`);
    await expect(as(admin, () => respond(person.id))).rejects.toThrow();
  }
  const person = await member();
  await db.query("update volei_events set presence_closed_at=now(),closed=true where id=$1", [event]);
  await expect(as(admin, () => respond(person.id))).rejects.toThrow(/concluída/);
  expect(await attendance(person.id)).toBeUndefined();
});

it("a vaga de quem saiu pode ser ocupada sem permitir retorno fora do controle da quadra", async () => {
  const departed = await member("Saiu");
  await as(admin, () => respond(departed.id));
  await db.query("insert into volei_court_sessions(event_id,state) values($1,$2)", [event,JSON.stringify({ arrivals: [{ key: `m:${departed.id}`, departedAt: new Date().toISOString() }] })]);
  await expect(as(admin, () => respond(departed.id))).rejects.toThrow(/retorno na quadra/);
  const person = await member("Reposição");
  await as(admin, () => respond(person.id));
  expect((await attendance(person.id)).status).toBe("confirmado");
});
