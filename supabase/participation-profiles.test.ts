import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const event = "00000000-0000-4000-8000-000000000100";
const admin = "00000000-0000-4000-8000-000000000001";
const secret = "a".repeat(64), token = "b".repeat(64);
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    insert into auth.users values('${admin}');
    create table volei_court_sessions(event_id uuid,state jsonb);`);
  for (const file of [
    "202609140001_escalas.sql", "202610240001_volei.sql",
    "202610270001_volei_registration.sql", "202610280001_volei_phone.sql",
    "202610280002_volei_frequency.sql", "202610280003_volei_membership_reservations.sql",
    "202610280004_volei_core_confirmations.sql", "202610280005_volei_international_phone.sql",
    "202610280006_volei_profiles.sql", "202610280008_volei_levels_capacity_emergency.sql",
    "202610290001_volei_admin_guest_slots.sql",
    "202611110001_volei_students.sql", "202611110002_volei_confirmation_time.sql",
    "202611170002_volei_birth_dates.sql", "202611170003_volei_admin_late_attendance.sql",
    "202611180003_volei_participation_profiles.sql",
    "202611180004_volei_registration_windows.sql",
  ]) await db.exec(await readFile(new URL(`./migrations/${file}`, import.meta.url), "utf8"));
  await db.exec(`insert into volei_admins values('${admin}');`);
}, 60000);
beforeEach(async () => {
  await db.exec("reset role; reset request.jwt.claim.sub; truncate volei_members,volei_events cascade;");
  await db.query("insert into volei_events(id,date) values($1,'2099-01-06')", [event]);
});
afterAll(() => db.close());
const register = (days: number[] = [], time: string | null = null) => db.query<{ id: string }>(
  "select volei_register_participation_profile($1,'Pessoa nova','+5561999991234',$2,'1995-01-01',$3::smallint[],$4::time) id", [event,secret,days,time]);
const review = (days: number[] = [], time: string | null = null, hash: string | null = secret, access: string | null = null) => db.query<{ result: { joined: boolean; message: string } }>(
  "select volei_review_and_join($1,$2,$3,'1995-01-01',$4::smallint[],$5::time) result", [event,hash,access,days,time]);
async function legacy(phone: string | null = "+5561999991234") {
  return (await db.query<{ id: string }>("insert into volei_members(name,phone,device_secret_hash,token,membership_status,birth_date) values('Pessoa antiga',$1,$2,$3,'approved','1995-01-01') returning id", [phone,secret,token])).rows[0].id;
}

it("registro exige dias e horário coerentes; declaração não aprova nem reserva vaga", async () => {
  for (const [days,time] of [[[2],null], [[7],"18:00"], [[],"18:00"]] as const)
    await expect(register([...days],time)).rejects.toThrow(/dias|horário/);
  expect((await db.query("select * from volei_members")).rows).toHaveLength(0);
  await register([4,2,2],"18:00");
  expect((await db.query("select student_weekdays,student_class_time,requested_student_weekdays,requested_student_class_time::text,participation_reviewed_at is not null as reviewed from volei_members")).rows[0])
    .toEqual({ student_weekdays: [], student_class_time: null, requested_student_weekdays: [2,4], requested_student_class_time: "18:00:00", reviewed: true });
  await db.exec("update volei_members set membership_status='approved'");
  await register([2],"17:00");
  expect((await db.query("select * from volei_attendance")).rows).toHaveLength(0);
  expect((await db.query("select requested_student_class_time::text from volei_members")).rows[0]).toEqual({ requested_student_class_time: "18:00:00" });
});
it("conferência exige acesso original e salva mesmo com inscrições encerradas", async () => {
  await legacy();
  await expect(review([],null,"c".repeat(64))).rejects.toThrow(/reconhecido/);
  await db.exec("update volei_events set closed=true");
  const result = (await review([2],"17:00")).rows[0].result;
  expect(result.joined).toBe(false);
  expect(result.message).toMatch(/Dados atualizados.*encerradas/);
  expect((await db.query("select participation_reviewed_at is not null as reviewed,requested_student_weekdays from volei_members")).rows[0])
    .toEqual({ reviewed: true, requested_student_weekdays: [2] });
  expect((await db.query("select * from volei_attendance")).rows).toHaveLength(0);
});
it("links individuais não contornam a vinculação por celular", async () => {
  await legacy();
  await expect(review([],null,null,token)).rejects.toThrow(/reconhecido/);
  await db.exec("update volei_members set phone=null");
  expect((await review([],null,null,token)).rows[0].result.message).toMatch(/Dados atualizados.*abrem/);
});
it("uma turma declarada diferente invalida a aprovação antiga; não aluno limpa a turma", async () => {
  const member = await legacy();
  await db.exec("update volei_members set student_weekdays='{2}',student_class_time='18:00'");
  await review([3],"17:00");
  expect((await db.query("select student_weekdays,student_class_time,requested_student_weekdays from volei_members")).rows[0])
    .toEqual({ student_weekdays: [], student_class_time: null, requested_student_weekdays: [3] });
  await review();
  expect((await db.query("select requested_student_weekdays,requested_student_class_time from volei_members where id=$1",[member])).rows[0])
    .toEqual({ requested_student_weekdays: null, requested_student_class_time: null });
});
it("aprovar turma exige administrador e rejeita uma tela desatualizada", async () => {
  const member = (await register([2],"18:00")).rows[0].id;
  const save = (expectedTime: string | null = "18:00") => db.query(`select volei_save_student_class($1,'{2}','18:00','{}','{2}',null,$2::time,(select participation_reviewed_at from volei_members where id=$1))`, [member,expectedTime]);
  await expect(save()).rejects.toThrow(/restrito/);
  await db.exec(`set request.jwt.claim.sub='${admin}'`);
  await expect(save("17:00")).rejects.toThrow(/mudou/);
  await save();
  expect((await db.query("select student_weekdays,student_class_time::text,requested_student_weekdays from volei_members")).rows[0])
    .toEqual({ student_weekdays: [2], student_class_time: "18:00:00", requested_student_weekdays: null });
  await expect(save()).rejects.toThrow(/mudou/);
});
it("menor continua na última faixa mesmo aluno; adulto só tem prioridade na turma/dia aprovados", async () => {
  const rank = async (birth: string | null,days: number[],time: string | null,date="2026-11-24") =>
    (await db.query<{ rank: number }>("select volei_member_priority($1::date,$2::smallint[],$3::time,$4::date) rank",[birth,days,time,date])).rows[0].rank;
  expect(await rank("2010-01-01",[2],"18:00")).toBe(2);
  expect(await rank(null,[2],"18:00")).toBe(2);
  expect(await rank("1995-01-01",[2],"18:00")).toBe(0);
  expect(await rank("1995-01-01",[3],"18:00")).toBe(1);
  expect(await rank("1995-01-01",[2],"17:00")).toBe(1);
  expect(await rank("2008-11-24",[2],"18:00")).toBe(0);
  expect(await rank("2008-11-25",[2],"18:00")).toBe(2);
});
it("grupo principal não cria confirmações automáticas e conferência preserva vaga já confirmada", async () => {
  const member = await legacy();
  await db.exec("update volei_members set is_core=true");
  await db.query("select volei_fill_slots($1)",[event]);
  expect((await db.query("select * from volei_attendance")).rows).toHaveLength(0);
  await db.query("insert into volei_attendance(event_id,member_id,status) values($1,$2,'confirmado')",[event,member]);
  await db.exec("update volei_events set closed=true");
  expect((await review()).rows[0].result.joined).toBe(true);
  expect((await db.query("select status from volei_attendance")).rows[0]).toEqual({ status: "confirmado" });
});
it("conferir dados não reinicia a inscrição nem a ordem de quem já aguardava", async () => {
  const member = await legacy();
  await db.query("insert into volei_attendance(event_id,member_id,status,registered_at) values($1,$2,'espera',now()-interval '2 hours')",[event,member]);
  const before = (await db.query("select status,registered_at,queue_order from volei_attendance")).rows[0];
  expect((await review()).rows[0].result.joined).toBe(true);
  await db.query("select volei_fill_slots($1)",[event]);
  expect((await db.query("select status,registered_at,queue_order from volei_attendance")).rows[0]).toEqual(before);
});
it("RPCs de declaração são exclusivos do servidor, sem aprovação pública", async () => {
  for (const role of ["anon","authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(register()).rejects.toThrow(/permission denied/);
    await expect(review()).rejects.toThrow(/permission denied/);
    await expect(db.query("select volei_member_priority('1995-01-01','{2}','18:00','2026-11-24')")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  }
});

it("janelas no horário de Brasília distinguem a véspera, o dia da turma e os menores", async () => {
  const window = async (birth: string,days: number[],time: string|null,deadline="2026-11-24T23:00:00-03:00") =>
    (await db.query<{ opening: Date; closing: Date }>(`select volei_registration_opens('2026-11-24',$1::date,$2::smallint[],$3::time) opening,
      volei_registration_closes('2026-11-24',$1::date,$4::timestamptz) closing`, [birth,days,time,deadline])).rows[0];
  expect((await window("1995-01-01",[2],"18:00")).opening.toISOString()).toBe("2026-11-23T03:00:00.000Z");
  expect((await window("1995-01-01",[3],"18:00")).opening.toISOString()).toBe("2026-11-24T01:00:00.000Z");
  expect((await window("1995-01-01",[2],"17:00")).opening.toISOString()).toBe("2026-11-24T01:00:00.000Z");
  const minor = await window("2010-01-01",[2],"18:00");
  expect(minor.opening.toISOString()).toBe("2026-11-24T11:00:00.000Z");
  expect(minor.closing.toISOString()).toBe("2026-11-24T21:00:00.000Z");
  expect((await window("2010-01-01",[],null,"2026-11-24T17:00:00-03:00")).closing.toISOString()).toBe("2026-11-24T20:00:00.000Z");
  expect((await window("1995-01-01",[],null)).closing.toISOString()).toBe("2026-11-25T02:00:00.000Z");
});
it("nenhum RPC público contorna a abertura ou a conferência; admin continua incluindo fora do prazo", async () => {
  const member = await legacy();
  await expect(db.query("select volei_phone_manage_profile($1,$2,'join')",[event,secret])).rejects.toThrow(/Confira/);
  const reviewed = (await review()).rows[0].result;
  expect(reviewed.joined).toBe(false);
  expect(reviewed.message).toMatch(/abrem/);
  await expect(db.query("select volei_phone_manage($1,$2,'join')",[event,secret])).rejects.toThrow(/abrem/);
  await expect(db.query("select volei_respond($1,$2,'confirmado',$3)",[event,member,token])).rejects.toThrow(/abrem/);
  await db.exec(`set request.jwt.claim.sub='${admin}'`);
  await db.query("select volei_respond($1,$2,'confirmado')",[event,member]);
  expect((await db.query("select status from volei_attendance")).rows[0]).toEqual({ status: "confirmado" });
  await db.exec("update volei_events set closed=true,presence_closed_at=now()");
  await expect(db.query("select volei_respond($1,$2,'confirmado')",[event,member])).rejects.toThrow(/concluída/);
});
it("alterar nascimento exige nova conferência e nova validação da turma", async () => {
  const member = await legacy();
  await review();
  await db.exec("update volei_members set student_weekdays='{2}',student_class_time='18:00'");
  await db.query("update volei_members set birth_date='1996-01-01' where id=$1",[member]);
  expect((await db.query("select participation_reviewed_at,student_class_time from volei_members")).rows[0])
    .toEqual({ participation_reviewed_at: null, student_class_time: null });
});
it("banco recusa turma das 18h declarada por menor mesmo com formulário adulterado", async () => {
  await db.exec("update volei_events set date=(now() at time zone 'America/Sao_Paulo')::date");
  await expect(db.query("select volei_register_participation_profile($1,'Menor','+5561999991234',$2,'2010-01-01','{2}','18:00')",[event,secret])).rejects.toThrow(/horário da turma/);
  expect((await db.query("select * from volei_members")).rows).toHaveLength(0);
  await legacy();
  await db.exec("update volei_members set birth_date='2010-01-01'");
  await expect(db.query("select volei_review_and_join($1,$2,null,'2010-01-01','{2}','18:00')",[event,secret])).rejects.toThrow(/horário da turma/);
});
it("fila real promove aluno adulto, demais adultos e menor, sem tirar vagas confirmadas", async () => {
  await db.exec(`update volei_events set date=(now() at time zone 'America/Sao_Paulo')::date;
    insert into volei_members(name,birth_date,membership_status) select 'Lotação '||n,'1995-01-01','approved' from generate_series(1,17) n;`);
  await db.query("insert into volei_attendance(event_id,member_id,status) select $1,id,'confirmado' from volei_members",[event]);
  await db.exec(`insert into volei_members(name,birth_date,membership_status,is_core,student_weekdays,student_class_time)
    values ('Menor aluno principal','2010-01-01','approved',true,array[extract(dow from (now() at time zone 'America/Sao_Paulo'))::smallint],'18:00'),
      ('Adulto regular','1995-01-01','approved',false,'{}',null),
      ('Aluno adulto','1995-01-01','approved',false,array[extract(dow from (now() at time zone 'America/Sao_Paulo'))::smallint],'18:00');`);
  await db.query(`insert into volei_attendance(event_id,member_id,status,registered_at)
    select $1,id,'espera',now()-case name when 'Menor aluno principal' then interval '3 hours' when 'Adulto regular' then interval '2 hours' else interval '1 hour' end
    from volei_members where name not like 'Lotação%'`,[event]);
  const confirmed = async () => (await db.query<{ name: string }>("select name from volei_members m join volei_attendance a on a.member_id=m.id where a.status='confirmado' and name not like 'Lotação%' order by name")).rows.map(row=>row.name);
  await db.query("select volei_admin_fill_slots($1)",[event]);
  expect(await confirmed()).toEqual(["Aluno adulto"]);
  for (const n of [1,2]) {
    await db.query("update volei_attendance set status='nao_vai' where member_id=(select id from volei_members where name=$1)",[`Lotação ${n}`]);
    await db.query("select volei_admin_fill_slots($1)",[event]);
    expect(await confirmed()).toEqual(n === 1 ? ["Adulto regular","Aluno adulto"] : ["Adulto regular","Aluno adulto","Menor aluno principal"]);
  }
  expect((await db.query<{ count: number }>("select count(*)::integer as count from volei_attendance where status='confirmado'")).rows[0].count).toBe(18);
});
