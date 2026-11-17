import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const event = "00000000-0000-4000-8000-000000000100";
const admin = "00000000-0000-4000-8000-000000000001";
const secret = "a".repeat(64);
const token = "b".repeat(64);
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    insert into auth.users values('${admin}');`);
  for (const file of [
    "202609140001_escalas.sql", "202610240001_volei.sql",
    "202610270001_volei_registration.sql", "202610280001_volei_phone.sql",
    "202610280002_volei_frequency.sql", "202610280003_volei_membership_reservations.sql",
    "202610280004_volei_core_confirmations.sql", "202610280005_volei_international_phone.sql",
    "202610280006_volei_profiles.sql", "202610280008_volei_levels_capacity_emergency.sql",
    "202611110001_volei_students.sql", "202611110002_volei_confirmation_time.sql",
    "202611170002_volei_birth_dates.sql",
  ]) {
    await db.exec(await readFile(new URL(`./migrations/${file}`, import.meta.url), "utf8"));
  }
  await db.exec(`insert into volei_admins values('${admin}'); grant select,insert,update,delete on volei_members to authenticated;`);
}, 60000);
beforeEach(async () => {
  await db.exec("reset role; reset request.jwt.claim.sub; truncate volei_members,volei_events cascade;");
  await db.query("insert into volei_events(id,date) values($1,'2099-01-06')", [event]);
});
afterAll(() => db.close());

const register = (birth: string | null, name = "João da Silva", phone = "+5561999991234", hash = secret, days: number[] = []) =>
  db.query<{ id: string }>("select volei_register_member_profile($1,$2,$3,$4,$5::date,$6::smallint[]) id", [event,name,phone,hash,birth,days]);
async function legacy(phone: string | null = "+5561999991234") {
  return (await db.query<{ id: string }>("insert into volei_members(name,phone,device_secret_hash,token,membership_status) values('Membro antigo',$1,$2,$3,'approved') returning id", [phone,secret,token])).rows[0].id;
}
const manage = (birth: string | null, action = "join", hash = secret) =>
  db.query("select volei_phone_manage_profile($1,$2,$3,null,$4::date)", [event,hash,action,birth]);
const birthOf = async (id: string) => (await db.query<{ birth: string | null }>("select birth_date::text birth from volei_members where id=$1", [id])).rows[0].birth;

it("exige nascimento válido sem deixar cadastro ou pedido parcial", async () => {
  for (const birth of [null, "1899-01-01", "2099-01-01", "2008-02-30"])
    await expect(register(birth)).rejects.toThrow();
  await expect(register("2008-02-29", undefined, undefined, undefined, [7])).rejects.toThrow();
  expect((await db.query("select id from volei_members")).rows).toHaveLength(0);
  const id = (await register("2008-02-29", undefined, undefined, undefined, [2,4,2])).rows[0].id;
  expect(await birthOf(id)).toBe("2008-02-29");
  expect((await db.query("select membership_status,student_weekdays,requested_student_weekdays from volei_members")).rows[0])
    .toEqual({ membership_status: "pending", student_weekdays: [], requested_student_weekdays: [2,4] });
  expect((await db.query("select * from volei_attendance")).rows).toHaveLength(0);
});
it("bloqueia duplicatas por telefone, dispositivo e nome com nascimento normalizado", async () => {
  await register("2008-02-29");
  await register("2008-02-29"); // Retry is idempotent.
  await expect(register("2008-02-29", "Outro nome", undefined, "c".repeat(64))).rejects.toThrow(/cadastro/);
  await expect(register("2008-02-29", "Outra pessoa", "+5561999994321")).rejects.toThrow(/unique/);
  await expect(register("2008-02-29", "  JOAO   DA SILVA  ", "+5561999994321", "c".repeat(64))).rejects.toThrow(/unique/);
  // Homonyms with different birth dates remain possible.
  await register("2009-02-28", "João da Silva", "+5561999994321", "c".repeat(64));
  expect((await db.query("select id from volei_members")).rows).toHaveLength(2);
});
it("orienta a recuperar um cadastro antigo de mesmo nome, sem criar outro", async () => {
  await legacy(null);
  await expect(register("2008-02-29", "MEMBRO  ANTIGO", "+5561999994321", "c".repeat(64))).rejects.toThrow(/recuperar/);
  expect((await db.query("select id from volei_members")).rows).toHaveLength(1);
});
it("completa nascimento na confirmação uma vez, preservando fila e cancelamentos", async () => {
  const id = await legacy();
  await expect(manage(null)).rejects.toThrow(/nascimento/);
  expect((await db.query("select * from volei_attendance")).rows).toHaveLength(0);
  await manage("2010-05-10");
  expect(await birthOf(id)).toBe("2010-05-10");
  const first = (await db.query<{ status: string; queue_order: number; registered_at: Date; confirmed_at: Date }>("select status,queue_order,registered_at,confirmed_at from volei_attendance")).rows[0];
  expect(first.status).toBe("confirmado");
  await manage(null);
  expect((await db.query("select status,queue_order,registered_at,confirmed_at from volei_attendance")).rows[0]).toEqual(first);
  await expect(manage("2011-05-10")).rejects.toThrow(/corrigir/);
  await manage(null, "cancel");
  await manage(null);
  expect(await birthOf(id)).toBe("2010-05-10");
  await expect(db.query("update volei_members set birth_date=null where id=$1", [id])).rejects.toThrow(/obrigatória/);
});
it("não salva nascimento quando a confirmação falha; não impede cancelar sem data", async () => {
  const id = await legacy();
  await db.query("update volei_events set closed=true where id=$1", [event]);
  await expect(manage("2010-05-10")).rejects.toThrow(/encerradas/);
  expect(await birthOf(id)).toBeNull();
  await manage(null, "cancel");
  expect((await db.query<{ status: string }>("select status from volei_attendance")).rows[0].status).toBe("nao_vai");
  expect(await birthOf(id)).toBeNull();
});
it("valida identidade e preserva aprovação no fluxo de nascimento", async () => {
  const id = await legacy();
  await expect(manage("2010-05-10", "join", "c".repeat(64))).rejects.toThrow(/reconhecido/);
  await db.query("update volei_members set membership_status='pending' where id=$1", [id]);
  await expect(manage("2010-05-10")).rejects.toThrow(/aprovado/);
  expect(await birthOf(id)).toBeNull();
});
it("não duplica a identidade ao completar um cadastro antigo", async () => {
  const id = await legacy();
  await db.query("insert into volei_members(name,birth_date) values('MEMBRO  ANTIGO','2010-05-10')");
  await expect(manage("2010-05-10")).rejects.toThrow(/unique/);
  expect(await birthOf(id)).toBeNull();
  expect((await db.query("select * from volei_attendance")).rows).toHaveLength(0);
});
it("cobre links antigos sem telefone e bloqueia atalhos sem nascimento", async () => {
  const id = await legacy(null);
  const respond = (birth: string | null, credential = token) => db.query("select volei_respond_profile($1,$2,'confirmado',$3,$4::date)", [event,id,credential,birth]);
  await expect(respond("2010-05-10", "c".repeat(64))).rejects.toThrow(/inválido/);
  await expect(db.query("select volei_respond($1,$2,'confirmado',$3)", [event,id,token])).rejects.toThrow(/nascimento/);
  await expect(respond(null)).rejects.toThrow(/nascimento/);
  await respond("2010-05-10");
  expect(await birthOf(id)).toBe("2010-05-10");
  await respond(null);
});
it("protege nascimento e idade de anônimos e autenticados sem permissão", async () => {
  await register("2010-05-10");
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(register("2000-01-01")).rejects.toThrow(/permission denied/);
    await expect(manage(null)).rejects.toThrow(/permission denied/);
    if (role === "anon") await expect(db.query("select birth_date from volei_members")).rejects.toThrow(/permission denied/);
    else expect((await db.query("select birth_date from volei_members")).rows).toEqual([]);
    await db.exec("reset role");
  }
  await db.exec(`set request.jwt.claim.sub='${admin}'; set role authenticated`);
  expect((await db.query("select birth_date::text birth from volei_members")).rows).toEqual([{ birth: "2010-05-10" }]);
});
