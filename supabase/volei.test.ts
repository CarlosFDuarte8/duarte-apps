import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  emptyCourt,
  applyCourtAction,
  type CourtRosterPerson,
  type CourtState,
} from "../src/lib/volei/court";

const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const stranger = "00000000-0000-4000-8000-000000000002";

async function as(user: string | null, sql: string) {
  await db.exec(`set role ${user ? "authenticated" : "anon"}`);
  await db.exec(
    `select set_config('request.jwt.claim.sub','${user ?? ""}',false)`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    insert into auth.users values ('${admin}'),('${stranger}');`);
  for (const file of ["202609140001_escalas.sql", "202610240001_volei.sql"])
    await db.exec(
      await readFile(new URL(`./migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into public.users values ('${admin}','admin');
    insert into public.volei_members(name) values ('Ana');`);
  await db.exec(
    await readFile(
      new URL(
        "./migrations/202610270001_volei_registration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("./migrations/202610280001_volei_phone.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("./migrations/202610280002_volei_frequency.sql", import.meta.url),
      "utf8",
    ),
  );
}, 60000);
afterAll(async () => {
  await db.close();
});

describe("Inscrições compartilhadas", () => {
  const event = "00000000-0000-4000-8000-000000000100";
  it("mantém outros administradores das escalas fora da gestão do vôlei", async () => {
    await db.exec(`insert into public.users values ('${stranger}','admin')`);
    expect(
      (await as(stranger, "select * from public.volei_members")).rows,
    ).toHaveLength(0);
    const member = (
      await db.query<{ id: string }>(
        "select id from public.volei_members where name='Ana'",
      )
    ).rows[0];
    const e = "00000000-0000-4000-8000-000000000102";
    await db.exec(
      `insert into public.volei_events(id,date) values ('${e}','2099-01-03')`,
    );
    await expect(
      as(
        stranger,
        `select public.volei_respond('${e}','${member.id}','confirmado')`,
      ),
    ).rejects.toThrow();
    await expect(
      as(stranger, "insert into public.volei_members(name) values ('Intruso')"),
    ).rejects.toThrow();
  });
  it("confirma 18, cria espera e promove após cancelamento", async () => {
    await db.exec(`insert into public.volei_events(id,date) values ('${event}','2099-01-01');
      insert into public.volei_members(name) select 'Jogador '||n from generate_series(1,20) n;`);
    const members = await db.query<{ id: string }>(
      "select id from public.volei_members where name like 'Jogador %' order by name",
    );
    for (const m of members.rows)
      await as(
        admin,
        `select public.volei_respond('${event}','${m.id}','confirmado')`,
      );
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where status='confirmado'",
        )
      ).rows,
    ).toHaveLength(18);
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where status='espera'",
        )
      ).rows,
    ).toHaveLength(2);
    await as(
      admin,
      `select public.volei_respond('${event}','${members.rows[0].id}','nao_vai')`,
    );
    const promoted = await db.query<{ status: string }>(
      `select status from public.volei_attendance where member_id='${members.rows[18].id}'`,
    );
    expect(promoted.rows[0].status).toBe("confirmado");
    await expect(
      as(
        admin,
        `update public.volei_attendance set status='confirmado' where member_id='${members.rows[19].id}'`,
      ),
    ).rejects.toThrow();
  });
  it("valida token e mantém convidados na fila até liberação", async () => {
    const e = "00000000-0000-4000-8000-000000000101";
    const m = (
      await db.query<{ id: string; token: string }>(
        "select id,token from public.volei_members where name='Ana'",
      )
    ).rows[0];
    await db.exec(
      `insert into public.volei_events(id,date) values ('${e}','2099-01-02')`,
    );
    await expect(
      as(
        stranger,
        `select public.volei_respond('${e}','${m.id}','confirmado','invalido')`,
      ),
    ).rejects.toThrow();
    await as(
      stranger,
      `select public.volei_respond('${e}','${m.id}','confirmado','${m.token}','Convidado')`,
    );
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.volei_guests where event_id='${e}'`,
        )
      ).rows[0].status,
    ).toBe("espera");
    await expect(
      as(
        stranger,
        `select public.volei_respond('${e}','${m.id}','confirmado','${m.token}','Outro convidado')`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `update public.volei_events set guests_open_at=now()-interval '1 hour' where id='${e}'; select public.volei_fill_slots('${e}')`,
    );
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.volei_guests where event_id='${e}'`,
        )
      ).rows[0].status,
    ).toBe("confirmado");
    await db.exec(
      `update public.volei_events set registration_deadline=now()-interval '1 hour' where id='${e}'`,
    );
    await expect(
      as(
        stranger,
        `select public.volei_respond('${e}','${m.id}','confirmado','${m.token}')`,
      ),
    ).rejects.toThrow();
    await as(
      stranger,
      `select public.volei_respond('${e}','${m.id}','nao_vai','${m.token}','Convidado')`,
    );
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.volei_guests where event_id='${e}'`,
        )
      ).rows[0].status,
    ).toBe("nao_vai");
  });
});

describe("Migration do vôlei", () => {
  it("gera token de 64 caracteres hexadecimais", async () => {
    const r = await db.query<{ token: string }>(
      "select token from public.volei_members",
    );
    expect(r.rows[0].token).toMatch(/^[a-f0-9]{64}$/);
  });
  it("admin ajusta pontos e registra o histórico", async () => {
    await as(
      admin,
      "select public.volei_adjust_points((select id from public.volei_members where name='Ana'), -2, 'Faltou')",
    );
    const m = await db.query<{ points: number }>(
      "select points from public.volei_members where name='Ana'",
    );
    const log = await db.query<{ delta: number }>(
      "select delta from public.volei_point_log",
    );
    expect(m.rows[0].points).toBe(-2);
    expect(log.rows).toEqual([{ delta: -2 }]);
  });
  it("não-admin não lê nem altera dados", async () => {
    expect(
      (await as(stranger, "select * from public.volei_members")).rows,
    ).toHaveLength(0);
    await expect(
      as(
        stranger,
        "select public.volei_adjust_points((select id from public.volei_members), 5, 'x')",
      ),
    ).rejects.toThrow();
  });
  it("anônimo não acessa as tabelas", async () => {
    await expect(
      as(null, "select * from public.volei_members"),
    ).rejects.toThrow();
  });
});

describe("Inscrição por telefone e acesso do aparelho", () => {
  const e = "00000000-0000-4000-8000-000000000200";
  const phone = "+5561999990001";
  const hash = "a".repeat(64);
  const otherHash = "b".repeat(64);
  it("define 18h em Brasília e liberação dos convidados como padrão", async () => {
    await db.exec(
      `insert into public.volei_events(id,date) values ('${e}','2099-02-01')`,
    );
    const r = await db.query<{ deadline: string; guests: string }>(
      `select (registration_deadline at time zone 'UTC')::text deadline,(guests_open_at at time zone 'UTC')::text guests from public.volei_events where id='${e}'`,
    );
    expect(r.rows[0].deadline).toContain("2099-02-01 21:00:00");
    expect(r.rows[0].guests).toBe(r.rows[0].deadline);
  });
  it("inscreve membro e convidado atomicamente, sem duplicar telefone", async () => {
    await db.query("select public.volei_phone_register($1,$2,$3,$4,$5)", [
      e,
      "Jogador do celular",
      phone,
      hash,
      "Amigo convidado",
    ]);
    await db.query("select public.volei_phone_register($1,$2,$3,$4,$5)", [
      e,
      "Jogador do celular",
      phone,
      hash,
      "Amigo convidado",
    ]);
    expect(
      (
        await db.query("select * from public.volei_members where phone=$1", [
          phone,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1",
          [e],
        )
      ).rows[0].status,
    ).toBe("confirmado");
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_guests where event_id=$1",
          [e],
        )
      ).rows[0].status,
    ).toBe("espera");
  });
  it("não permite tomar um número existente com outro aparelho", async () => {
    await expect(
      db.query("select public.volei_phone_register($1,$2,$3,$4)", [
        e,
        "Outra pessoa",
        phone,
        otherHash,
      ]),
    ).rejects.toThrow("outro navegador");
    await expect(
      db.query("select public.volei_phone_manage($1,$2,$3)", [
        e,
        otherHash,
        "cancel",
      ]),
    ).rejects.toThrow("Acesso não reconhecido");
    await expect(
      as(null, `select public.volei_phone_manage('${e}','${hash}','cancel')`),
    ).rejects.toThrow();
  });
  it("permite só um convidado por participante", async () => {
    await expect(
      db.query("select public.volei_phone_manage($1,$2,$3,$4)", [
        e,
        hash,
        "guest_join",
        "Segundo convidado",
      ]),
    ).rejects.toThrow("Já existe");
  });
  it("promove a fila após o prazo, mas não aceita novas inscrições", async () => {
    await db.query(
      "update public.volei_events set registration_deadline=now()-interval '1 minute',guests_open_at=now()-interval '1 minute' where id=$1",
      [e],
    );
    await db.query("select public.volei_fill_slots($1)", [e]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_guests where event_id=$1",
          [e],
        )
      ).rows[0].status,
    ).toBe("confirmado");
    await expect(
      db.query("select public.volei_phone_register($1,$2,$3,$4)", [
        e,
        "Atrasado",
        "+5561999990002",
        otherHash,
      ]),
    ).rejects.toThrow("Inscrições encerradas");
    expect(
      (
        await db.query(
          "select * from public.volei_members where phone='+5561999990002'",
        )
      ).rows,
    ).toHaveLength(0);
    await db.query("select public.volei_phone_manage($1,$2,$3)", [
      e,
      hash,
      "cancel",
    ]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1",
          [e],
        )
      ).rows[0].status,
    ).toBe("nao_vai");
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_guests where event_id=$1",
          [e],
        )
      ).rows[0].status,
    ).toBe("nao_vai");
  });
  it("o responsável libera a recuperação em outro aparelho e revoga o anterior", async () => {
    const next = "00000000-0000-4000-8000-000000000201";
    await db.exec(
      `insert into public.volei_events(id,date) values ('${next}','2099-02-02')`,
    );
    await as(
      admin,
      `update public.volei_members set device_secret_hash=null where phone='${phone}'`,
    );
    await db.query("select public.volei_phone_register($1,$2,$3,$4)", [
      next,
      "Jogador do celular",
      phone,
      otherHash,
    ]);
    await expect(
      db.query("select public.volei_phone_manage($1,$2,$3)", [
        next,
        hash,
        "cancel",
      ]),
    ).rejects.toThrow("Acesso não reconhecido");
    await db.query("select public.volei_phone_manage($1,$2,$3)", [
      next,
      otherHash,
      "cancel",
    ]);
  });
  it("reverte o cadastro inteiro se o convidado for inválido", async () => {
    const next = "00000000-0000-4000-8000-000000000201";
    await expect(
      db.query("select public.volei_phone_register($1,$2,$3,$4,$5)", [
        next,
        "Novo jogador",
        "+5561999990003",
        "c".repeat(64),
        "",
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "select * from public.volei_members where phone='+5561999990003'",
        )
      ).rows,
    ).toHaveLength(0);
  });
});

describe("Grupo principal e chamada", () => {
  const event = "00000000-0000-4000-8000-000000000300";
  it("prioriza o grupo principal na espera sem retirar confirmados", async () => {
    await db.exec(`insert into public.volei_events(id,date) values('${event}','2099-03-01');
   insert into public.volei_members(name) select 'Prioridade '||n from generate_series(1,20)n;`);
    const members = (
      await db.query<{ id: string }>(
        "select id from public.volei_members where name like 'Prioridade %' order by name",
      )
    ).rows;
    for (const m of members)
      await as(
        admin,
        `select public.volei_respond('${event}','${m.id}','confirmado')`,
      );
    await as(
      admin,
      `update public.volei_members set is_core=true where id='${members[19].id}'`,
    );
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.volei_attendance where event_id='${event}' and member_id='${members[19].id}'`,
        )
      ).rows[0].status,
    ).toBe("espera");
    await as(
      admin,
      `select public.volei_respond('${event}','${members[0].id}','nao_vai')`,
    );
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.volei_attendance where event_id='${event}' and member_id='${members[19].id}'`,
        )
      ).rows[0].status,
    ).toBe("confirmado");
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.volei_attendance where event_id='${event}' and member_id='${members[18].id}'`,
        )
      ).rows[0].status,
    ).toBe("espera");
  });
  it("só o responsável confere presença e encerra a chamada", async () => {
    const past = "00000000-0000-4000-8000-000000000301";
    await db.exec(
      `insert into public.volei_events(id,date) values('${past}','2020-01-01');`,
    );
    const m = (
      await db.query<{ id: string; token: string }>(
        "select id,token from public.volei_members order by name limit 2",
      )
    ).rows;
    await db.query(
      "insert into public.volei_attendance(event_id,member_id,status) values($1,$2,'confirmado'),($1,$3,'confirmado')",
      [past, m[0].id, m[1].id],
    );
    await expect(
      as(
        stranger,
        `select public.volei_record_presence('${past}','${m[0].id}',true)`,
      ),
    ).rejects.toThrow();
    await as(
      admin,
      `select public.volei_record_presence('${past}','${m[0].id}',true)`,
    );
    await as(admin, `select public.volei_close_presence('${past}')`);
    const records = (
      await db.query<{
        member_id: string;
        status: string;
        checked_in_at: string | null;
      }>(
        `select member_id,status,checked_in_at from public.volei_attendance where event_id='${past}'`,
      )
    ).rows;
    expect(
      records.find((r) => r.member_id === m[0].id)?.checked_in_at,
    ).not.toBeNull();
    expect(records.find((r) => r.member_id === m[1].id)?.status).toBe(
      "ausente",
    );
    await expect(
      as(
        stranger,
        `select public.volei_respond('${past}','${m[1].id}','nao_vai','${m[1].token}')`,
      ),
    ).rejects.toThrow("já foi conferida");
    await as(
      admin,
      `select public.volei_record_presence('${past}','${m[1].id}',true)`,
    );
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.volei_attendance where event_id='${past}' and member_id='${m[1].id}'`,
        )
      ).rows[0].status,
    ).toBe("confirmado");
  });
  it("não permite conferir jogos futuros ou cadastrar preferências inválidas", async () => {
    const m = (
      await db.query<{ id: string }>(
        "select id from public.volei_members limit 1",
      )
    ).rows[0];
    await expect(
      as(
        admin,
        `select public.volei_record_presence('${event}','${m.id}',true)`,
      ),
    ).rejects.toThrow("dia do jogo");
    await expect(
      as(
        admin,
        `update public.volei_members set preferred_weekdays=array[9]::smallint[] where id='${m.id}'`,
      ),
    ).rejects.toThrow();
  });
});

describe("Aprovação e reservas do grupo principal", () => {
  const e = "00000000-0000-4000-8000-000000000400";
  let core: string;
  const phone = "+5561999990400";
  const secret = "e".repeat(64);
  beforeAll(async () => {
    await db.exec(
      await readFile(
        new URL(
          "./migrations/202610280003_volei_membership_reservations.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("update public.volei_members set is_core=false");
    core = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,phone,is_core,membership_status) values('Principal reservado','+5561999990401',true,'approved') returning id",
      )
    ).rows[0].id;
    await db.exec(
      `insert into public.volei_events(id,date) values('${e}','2099-04-01');select public.volei_fill_slots('${e}')`,
    );
  });
  it("reserva a vaga antes da confirmação, mantendo após as 18h", async () => {
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [e, core],
        )
      ).rows[0].status,
    ).toBe("reservado");
    await db.query(
      "update public.volei_events set registration_deadline=now()-interval '1 minute' where id=$1",
      [e],
    );
    await db.query("select public.volei_fill_slots($1)", [e]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [e, core],
        )
      ).rows[0].status,
    ).toBe("reservado");
    await db.query(
      "update public.volei_events set registration_deadline='2099-04-01T21:00:00Z' where id=$1",
      [e],
    );
  });
  it("confirmar um telefone já aprovado não exige recadastrar o nome", async () => {
    const r = await db.query<{ volei_phone_identify: string }>(
      "select public.volei_phone_identify($1,$2)",
      ["+5561999990401", secret],
    );
    expect(r.rows[0].volei_phone_identify).toBe(core);
    await db.query("select public.volei_phone_manage($1,$2,'join')", [
      e,
      secret,
    ]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [e, core],
        )
      ).rows[0].status,
    ).toBe("confirmado");
  });
  it("um telefone desconhecido solicita aprovação, sem confirmar nem ocupar vaga", async () => {
    const unknown = await db.query<{ volei_phone_identify: string | null }>(
      "select public.volei_phone_identify($1,$2)",
      [phone, "f".repeat(64)],
    );
    expect(unknown.rows[0].volei_phone_identify).toBeNull();
    await db.query("select public.volei_phone_register($1,$2,$3,$4)", [
      e,
      "Solicitação pendente",
      phone,
      "f".repeat(64),
    ]);
    const m = (
      await db.query<{ id: string; membership_status: string }>(
        "select id,membership_status from public.volei_members where phone=$1",
        [phone],
      )
    ).rows[0];
    expect(m.membership_status).toBe("pending");
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where member_id=$1",
          [m.id],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.volei_phone_manage($1,$2,'join')", [
        e,
        "f".repeat(64),
      ]),
    ).rejects.toThrow("aprovado");
    await as(
      admin,
      `update public.volei_members set membership_status='approved' where id='${m.id}'`,
    );
    await db.query("select public.volei_phone_manage($1,$2,'join')", [
      e,
      "f".repeat(64),
    ]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [e, m.id],
        )
      ).rows[0].status,
    ).toBe("confirmado");
  });
  it("marcar não vou libera a reserva sem recriá-la", async () => {
    await db.query("select public.volei_phone_manage($1,$2,'cancel')", [
      e,
      secret,
    ]);
    await db.query("select public.volei_fill_slots($1)", [e]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [e, core],
        )
      ).rows[0].status,
    ).toBe("nao_vai");
  });
  it("datas preferidas limitam a reserva automática, sem bloquear inscrição fora delas", async () => {
    const preferred = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,is_core,membership_status,preferred_dates) values('Preferências pontuais',true,'approved',array['2099-04-02']::date[]) returning id",
      )
    ).rows[0].id;
    await db.query("select public.volei_fill_slots($1)", [e]);
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where event_id=$1 and member_id=$2",
          [e, preferred],
        )
      ).rows,
    ).toHaveLength(0);
    await as(
      admin,
      `select public.volei_respond('${e}','${preferred}','confirmado')`,
    );
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [e, preferred],
        )
      ).rows[0].status,
    ).toBe("confirmado");
  });
});

describe("Confirmação automática sem distinção pública", () => {
  const event = "30000000-0000-0000-0000-000000000004";
  let member: string;
  beforeAll(async () => {
    await db.exec("update public.volei_members set is_core=false");
    member = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,is_core,membership_status) values('Confirmação automática',true,'approved') returning id",
      )
    ).rows[0].id;
    await db.query(
      "insert into public.volei_events(id,date) values($1,'2099-05-01')",
      [event],
    );
    await db.query("select public.volei_fill_slots($1)", [event]);
    await db.exec(
      await readFile(
        new URL(
          "./migrations/202610280004_volei_core_confirmations.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  });
  it("converte reservas existentes em confirmações sem inventar check-in", async () => {
    const row = (
      await db.query<{ status: string; checked_in_at: string | null }>(
        "select status,checked_in_at from public.volei_attendance where event_id=$1 and member_id=$2",
        [event, member],
      )
    ).rows[0];
    expect(row).toMatchObject({ status: "confirmado", checked_in_at: null });
  });
  it("confirma automaticamente em novos jogos e mantém após o prazo", async () => {
    const next = (
      await db.query<{ id: string }>(
        "insert into public.volei_events(date) values('2099-05-02') returning id",
      )
    ).rows[0].id;
    await db.query("select public.volei_fill_slots($1)", [next]);
    await db.query(
      "update public.volei_events set registration_deadline=now()-interval '1 minute' where id=$1",
      [next],
    );
    await db.query("select public.volei_fill_slots($1)", [next]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [next, member],
        )
      ).rows[0].status,
    ).toBe("confirmado");
  });
  it("não confirma novamente quem marcou não vou", async () => {
    await as(
      admin,
      "select public.volei_respond('" + event + "','" + member + "','nao_vai')",
    );
    await db.query("select public.volei_fill_slots($1)", [event]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_attendance where event_id=$1 and member_id=$2",
          [event, member],
        )
      ).rows[0].status,
    ).toBe("nao_vai");
  });
});

describe("Telefone internacional", () => {
  beforeAll(async () => {
    await db.exec(
      await readFile(
        new URL(
          "./migrations/202610280005_volei_international_phone.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  });
  it("identifica o mesmo telefone internacional sem duplicar cadastros", async () => {
    const phone = "+351912345678";
    const secret = "9".repeat(64);
    const member = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,phone,membership_status) values('Internacional',$1,'approved') returning id",
        [phone],
      )
    ).rows[0].id;
    expect(
      (
        await db.query<{ volei_phone_identify: string }>(
          "select public.volei_phone_identify($1,$2)",
          [phone, secret],
        )
      ).rows[0].volei_phone_identify,
    ).toBe(member);
    await expect(
      db.query(
        "insert into public.volei_members(name,phone) values('Duplicado',$1)",
        [phone],
      ),
    ).rejects.toThrow();
  });
  it("aceita pedido de cadastro internacional pendente", async () => {
    const event = (
      await db.query<{ id: string }>(
        "select id from public.volei_events where date='2099-05-01' limit 1",
      )
    ).rows[0].id;
    const result = await db.query<{ volei_phone_register: string }>(
      "select public.volei_phone_register($1,$2,$3,$4)",
      [event, "Novo internacional", "+447911123456", "8".repeat(64)],
    );
    expect(
      (
        await db.query<{ membership_status: string }>(
          "select membership_status from public.volei_members where id=$1",
          [result.rows[0].volei_phone_register],
        )
      ).rows[0].membership_status,
    ).toBe("pending");
  });
});

describe("Perfis privados e bloqueio de convidados", () => {
  const event = "30000000-0000-4000-8000-000000000006";
  const secret = "71".repeat(32);
  const otherSecret = "72".repeat(32);
  const phone = "+5561999990611";
  let sponsor: string;
  beforeAll(async () => {
    await db.exec(
      "create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])",
    );
    await db.exec(
      await readFile(
        new URL(
          "./migrations/202610280006_volei_profiles.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("update public.volei_members set is_core=false");
    sponsor = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,membership_status,device_secret_hash) values('Responsavel do convidado','approved',$1) returning id",
        [secret],
      )
    ).rows[0].id;
    const other = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,membership_status,device_secret_hash) values('Outro responsavel','approved',$1) returning id",
        [otherSecret],
      )
    ).rows[0].id;
    await db.query(
      "insert into public.volei_events(id,date,guests_open_at) values($1,'2099-06-01',now()-interval '1 minute')",
      [event],
    );
    for (const member of [sponsor, other])
      await as(
        admin,
        "select public.volei_respond('" +
          event +
          "','" +
          member +
          "','confirmado')",
      );
  });
  it("cria armazenamento privado e limita formatos e tamanho", async () => {
    const row = (
      await db.query<{
        public: boolean;
        file_size_limit: number;
        allowed_mime_types: string[];
      }>(
        "select public,file_size_limit,allowed_mime_types from storage.buckets where id='volei-profiles'",
      )
    ).rows[0];
    expect(row.public).toBe(false);
    expect(Number(row.file_size_limit)).toBe(1048576);
    expect(row.allowed_mime_types).toEqual(["image/webp"]);
  });
  it("convidado fica vinculado ao membro e recebe token individual", async () => {
    await db.query("select public.volei_add_phone_guest($1,$2,$3,$4)", [
      event,
      secret,
      "Convidado avulso",
      phone,
    ]);
    const guest = (
      await db.query<{
        member_id: string;
        profile_token: string;
        status: string;
      }>(
        "select member_id,profile_token,status from public.volei_guests where event_id=$1 and phone=$2",
        [event, phone],
      )
    ).rows[0];
    expect(guest.member_id).toBe(sponsor);
    expect(guest.profile_token).toMatch(/^[a-f0-9]{64}$/);
    expect(guest.status).toBe("confirmado");
    expect(
      (
        await db.query("select id from public.volei_members where phone=$1", [
          phone,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it("impede o mesmo telefone de ocupar duas vagas no jogo", async () => {
    await expect(
      db.query("select public.volei_add_phone_guest($1,$2,$3,$4)", [
        event,
        otherSecret,
        "Mesmo convidado",
        phone,
      ]),
    ).rejects.toThrow("inscrito");
  });
  it("protege nascimento e fotos por RLS e valida nascimento futuro", async () => {
    await expect(
      db.query(
        "update public.volei_members set birth_date='2099-01-01' where id=$1",
        [sponsor],
      ),
    ).rejects.toThrow();
    expect(
      (
        await as(
          stranger,
          "select phone,birth_date,photo_path,profile_token from public.volei_guests where event_id='" +
            event +
            "'",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      as(null, "select birth_date from public.volei_members"),
    ).rejects.toThrow();
  });
  it("bloqueia por telefone, libera a vaga e impede convite por outro membro", async () => {
    await expect(
      as(
        stranger,
        "select public.volei_set_guest_block('" + phone + "',true,'Motivo')",
      ),
    ).rejects.toThrow("restrito");
    await as(
      admin,
      "select public.volei_set_guest_block('" +
        phone +
        "',true,'Conduta inadequada')",
    );
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_guests where event_id=$1 and phone=$2",
          [event, phone],
        )
      ).rows[0].status,
    ).toBe("nao_vai");
    await expect(
      db.query("select public.volei_add_phone_guest($1,$2,$3,$4)", [
        event,
        otherSecret,
        "Outro nome",
        phone,
      ]),
    ).rejects.toThrow("bloqueado");
    await expect(
      db.query(
        "update public.volei_guests set status='confirmado' where event_id='" +
          event +
          "' and phone='" +
          phone +
          "'",
      ),
    ).rejects.toThrow("bloqueado");
  });
  it("desbloquear permite novo convite sem restaurar automaticamente o cancelado", async () => {
    await as(
      admin,
      "select public.volei_set_guest_block('" + phone + "',false)",
    );
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_guests where event_id=$1 and phone=$2",
          [event, phone],
        )
      ).rows[0].status,
    ).toBe("nao_vai");
    await db.query("select public.volei_add_phone_guest($1,$2,$3,$4)", [
      event,
      secret,
      "Convidado avulso",
      phone,
    ]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.volei_guests where event_id=$1 and phone=$2",
          [event, phone],
        )
      ).rows[0].status,
    ).toBe("confirmado");
  });
});

describe("Relatos privados e fila de atendimento", () => {
  const secret = "81".repeat(32),
    regularSecret = "82".repeat(32),
    blockedSecret = "83".repeat(32),
    pendingSecret = "84".repeat(32);
  let reporter: string,
    target: string,
    guest: string,
    event: string,
    complaint: string;
  const description =
    "Um relato detalhado de um ocorrido durante o jogo, para ser avaliado pelo responsavel.";
  async function submit(
    type = "member",
    id = target,
    hash = secret,
    key = "00000000-0000-4000-8000-000000000711",
    eventId: string | null = null,
  ) {
    return db.query<{ volei_submit_complaint: string }>(
      "select public.volei_submit_complaint($1,$2,$3,$4,$5,$6,$7)",
      [hash, type, id, eventId, "Situacao durante o jogo", description, key],
    );
  }
  beforeAll(async () => {
    await db.exec(
      await readFile(
        new URL(
          "./migrations/202610280007_volei_complaints.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    reporter = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,is_core,membership_status,device_secret_hash) values('Autor principal',true,'approved',$1) returning id",
        [secret],
      )
    ).rows[0].id;
    target = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,membership_status,device_secret_hash) values('Membro mencionado','approved',$1) returning id",
        [regularSecret],
      )
    ).rows[0].id;
    await db.query(
      "insert into public.volei_members(name,is_core,membership_status,blocked,device_secret_hash) values('Principal bloqueado',true,'approved',true,$1),('Principal pendente',true,'pending',false,$2)",
      [blockedSecret, pendingSecret],
    );
    event = (
      await db.query<{ id: string }>(
        "insert into public.volei_events(date) values('2000-01-17') returning id",
      )
    ).rows[0].id;
    guest = (
      await db.query<{ id: string }>(
        "insert into public.volei_guests(event_id,member_id,name,status) values($1,$2,'Convidado mencionado','confirmado') returning id",
        [event, target],
      )
    ).rows[0].id;
  });
  it("recusa nao principais, pendentes, bloqueados e credenciais desconhecidas", async () => {
    for (const hash of [
      regularSecret,
      blockedSecret,
      pendingSecret,
      "ff".repeat(32),
    ])
      await expect(submit("member", target, hash)).rejects.toThrow("acesso");
    await expect(submit("member", reporter)).rejects.toThrow("outro membro");
    await expect(
      as(
        null,
        "select public.volei_submit_complaint(null,null,null,null,null,null,null)",
      ),
    ).rejects.toThrow();
  });
  it("registra o autor e nao duplica um envio repetido", async () => {
    complaint = (await submit()).rows[0].volei_submit_complaint;
    expect((await submit()).rows[0].volei_submit_complaint).toBe(complaint);
    const rows = (
      await db.query<{
        reporter_id: string;
        status: string;
        read_at: string | null;
      }>(
        "select reporter_id,status,read_at from public.volei_complaints where id=$1",
        [complaint],
      )
    ).rows;
    expect(rows).toEqual([
      { reporter_id: reporter, status: "open", read_at: null },
    ]);
  });
  it("permite apenas ao responsavel ler e atender", async () => {
    expect(
      (
        await as(
          stranger,
          "select * from public.volei_complaints where id='" + complaint + "'",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      as(null, "select * from public.volei_complaints"),
    ).rejects.toThrow();
    await expect(
      as(
        stranger,
        "select public.volei_review_complaint('" +
          complaint +
          "','resolved','Sem acao')",
      ),
    ).rejects.toThrow("restrito");
    expect(
      (
        await as(
          admin,
          "select * from public.volei_complaints where id='" + complaint + "'",
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      as(
        admin,
        "update public.volei_complaints set status='resolved' where id='" +
          complaint +
          "'",
      ),
    ).rejects.toThrow();
  });
  it("a leitura nao conclui nem remove a pendencia", async () => {
    await as(admin, "select public.volei_read_complaint('" + complaint + "')");
    const row = (
      await db.query<{ status: string; read_at: string | null }>(
        "select status,read_at from public.volei_complaints where id=$1",
        [complaint],
      )
    ).rows[0];
    expect(row.status).toBe("open");
    expect(row.read_at).not.toBeNull();
    expect(
      (
        await db.query(
          "select id from public.volei_complaints where id=$1 and status<>'resolved'",
          [complaint],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("mantem em analise e exige registro do atendimento para concluir", async () => {
    await as(
      admin,
      "select public.volei_review_complaint('" +
        complaint +
        "','in_review','Conversa agendada')",
    );
    await expect(
      as(
        admin,
        "select public.volei_review_complaint('" +
          complaint +
          "','resolved','')",
      ),
    ).rejects.toThrow("atendido");
    await as(
      admin,
      "select public.volei_review_complaint('" +
        complaint +
        "','resolved','Conversa realizada, orientacoes registradas')",
    );
    expect(
      (
        await db.query(
          "select id from public.volei_complaints where id=$1 and status<>'resolved'",
          [complaint],
        )
      ).rows,
    ).toHaveLength(0);
    const history = (
      await db.query<{ to_status: string }>(
        "select to_status from public.volei_complaint_updates where complaint_id=$1 order by created_at",
        [complaint],
      )
    ).rows;
    expect(history.map((row) => row.to_status)).toEqual([
      "in_review",
      "resolved",
    ]);
    expect(
      (
        await db.query<{ blocked: boolean }>(
          "select blocked from public.volei_members where id=$1",
          [target],
        )
      ).rows[0].blocked,
    ).toBe(false);
  });
  it("pode reabrir um atendimento e voltar a sinalizar a pendencia", async () => {
    await as(
      admin,
      "select public.volei_review_complaint('" +
        complaint +
        "','open','Reabrir para nova analise')",
    );
    expect(
      (
        await db.query<{ status: string; resolved_at: string | null }>(
          "select status,resolved_at from public.volei_complaints where id=$1",
          [complaint],
        )
      ).rows[0],
    ).toEqual({ status: "open", resolved_at: null });
  });
  it("vincula relato de convidado ao membro responsavel e preserva o historico", async () => {
    const id = (
      await submit(
        "guest",
        guest,
        secret,
        "00000000-0000-4000-8000-000000000712",
      )
    ).rows[0].volei_submit_complaint;
    await db.query("delete from public.volei_guests where id=$1", [guest]);
    expect(
      (
        await db.query<{
          target_name: string;
          sponsor_name: string;
          target_guest_id: string | null;
        }>(
          "select target_name,sponsor_name,target_guest_id from public.volei_complaints where id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({
      target_name: "Convidado mencionado",
      sponsor_name: "Membro mencionado",
      target_guest_id: null,
    });
  });
});

describe("Quadra, capacidade excepcional e presença", () => {
  let capacityEvent: string,
    courtEvent: string,
    people: string[],
    state: CourtState,
    roster: CourtRosterPerson[];
  let version = 0;
  async function save(
    next: CourtState,
    expected = version,
    undo: string | null = null,
    user = admin,
  ) {
    const sql =
      "select public.volei_save_court('" +
      courtEvent +
      "'," +
      expected +
      ",'" +
      JSON.stringify(next).replaceAll("'", "''") +
      "'::jsonb," +
      (undo ? "'" + undo + "'" : "null") +
      ")";
    return as(user, sql);
  }
  beforeAll(async () => {
    for (const migration of [
      "202610280008_volei_levels_capacity_emergency.sql",
      "202610280009_volei_court.sql",
    ])
      await db.exec(
        await readFile(
          new URL("./migrations/" + migration, import.meta.url),
          "utf8",
        ),
      );
    await db.exec("update public.volei_members set is_core=false");
    people = (
      await db.query<{ id: string }>(
        "insert into public.volei_members(name,membership_status,skill_level) select 'Atleta '||i,'approved',(i%5)+1 from generate_series(1,25)i returning id",
      )
    ).rows.map((row) => row.id);
    capacityEvent = (
      await db.query<{ id: string }>(
        "insert into public.volei_events(date) values('2098-08-01') returning id",
      )
    ).rows[0].id;
    courtEvent = (
      await db.query<{ id: string }>(
        "insert into public.volei_events(date) values('2000-01-23') returning id",
      )
    ).rows[0].id;
    for (const id of people)
      await as(
        admin,
        "select public.volei_respond('" +
          capacityEvent +
          "','" +
          id +
          "','confirmado')",
      );
    for (const id of people.slice(0, 6))
      await db.query(
        "insert into public.volei_attendance(event_id,member_id,status) values($1,$2,'confirmado')",
        [courtEvent, id],
      );
    roster = people.slice(0, 6).map((id, i) => ({
      key: "m:" + id,
      id,
      guest: false,
      memberId: id,
      name: "Atleta " + i,
      skill: (i % 5) + 1,
      checkedInAt: null,
    }));
    state = emptyCourt();
    for (const person of roster.slice(0, 4))
      state = applyCourtAction(state, roster, {
        type: "arrive",
        key: person.key,
      });
    state = applyCourtAction(state, roster, { type: "shuffle" }, () => 0.5);
  });
  it("mantem 18 como padrao e libera 24 com quatro times, promovendo a fila", async () => {
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where event_id=$1 and status='confirmado'",
          [capacityEvent],
        )
      ).rows,
    ).toHaveLength(18);
    await as(
      admin,
      "update public.volei_events set max_teams=4 where id='" +
        capacityEvent +
        "'",
    );
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where event_id=$1 and status='confirmado'",
          [capacityEvent],
        )
      ).rows,
    ).toHaveLength(24);
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where event_id=$1 and status='espera'",
          [capacityEvent],
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      as(
        admin,
        "update public.volei_events set max_teams=3 where id='" +
          capacityEvent +
          "'",
      ),
    ).rejects.toThrow("capacidade");
    expect(
      (
        await db.query<{ max_teams: number }>(
          "select max_teams from public.volei_events where id=$1",
          [capacityEvent],
        )
      ).rows[0].max_teams,
    ).toBe(4);
  });
  it("privacidade e validacao de niveis e emergencia", async () => {
    await expect(
      db.query("update public.volei_members set skill_level=6 where id=$1", [
        people[0],
      ]),
    ).rejects.toThrow();
    await db.query(
      "update public.volei_members set emergency_name='Contato',emergency_phone='+5561999991212' where id=$1",
      [people[0]],
    );
    expect(
      (
        await as(
          stranger,
          "select emergency_phone from public.volei_members where id='" +
            people[0] +
            "'",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      as(null, "select state from public.volei_court_sessions"),
    ).rejects.toThrow();
    await expect(save(state, 0, null, stranger)).rejects.toThrow("restrito");
  });
  it("salva times apenas com confirmados e integra a chegada com a frequencia", async () => {
    const result = await save(state);
    version = Number(
      (result.rows[0] as { volei_save_court: number }).volei_save_court,
    );
    expect(version).toBe(1);
    expect(
      (
        await db.query(
          "select * from public.volei_attendance where event_id=$1 and checked_in_at is not null",
          [courtEvent],
        )
      ).rows,
    ).toHaveLength(4);
    expect(
      (
        await as(
          stranger,
          "select state from public.volei_court_sessions where event_id='" +
            courtEvent +
            "'",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(save(state, 0)).rejects.toThrow("outro acesso");
  });
  it("recusa duplicatas, pessoas sem inscricao e mais de seis no mesmo time", async () => {
    const duplicate = structuredClone(state);
    duplicate.teams[1].push(duplicate.teams[0][0]);
    await expect(save(duplicate)).rejects.toThrow("dois times");
    const outsider = {
      ...roster[0],
      id: "00000000-0000-4000-8000-000000009999",
      key: "m:00000000-0000-4000-8000-000000009999",
    };
    const invalid = applyCourtAction(state, [...roster, outsider], {
      type: "arrive",
      key: outsider.key,
    });
    await expect(save(invalid)).rejects.toThrow("confirmados");
  });
  it("saida antecipada mantem a presenca, enquanto correcao explicita pode desfazer chegada", async () => {
    const key = state.teams[0][0];
    state = applyCourtAction(state, roster, { type: "leave", key });
    version = Number(
      ((await save(state)).rows[0] as { volei_save_court: number })
        .volei_save_court,
    );
    expect(
      (
        await db.query<{ checked_in_at: string | null }>(
          "select checked_in_at from public.volei_attendance where event_id=$1 and member_id=$2",
          [courtEvent, key.slice(2)],
        )
      ).rows[0].checked_in_at,
    ).not.toBeNull();
    state = applyCourtAction(state, roster, { type: "undo", key });
    version = Number(
      (
        (await save(state, version, key)).rows[0] as {
          volei_save_court: number;
        }
      ).volei_save_court,
    );
    expect(
      (
        await db.query<{ checked_in_at: string | null }>(
          "select checked_in_at from public.volei_attendance where event_id=$1 and member_id=$2",
          [courtEvent, key.slice(2)],
        )
      ).rows[0].checked_in_at,
    ).toBeNull();
  });
  it("nao deixa cancelamento publico apagar presenca ja registrada", async () => {
    const person = state.arrivals.find((p) => !p.departedAt)!;
    await expect(
      as(
        stranger,
        "update public.volei_attendance set checked_in_at=null,status='nao_vai' where event_id='" +
          courtEvent +
          "' and member_id='" +
          person.key.slice(2) +
          "'",
      ),
    ).rejects.toThrow();
    const token = (
      await db.query<{ token: string }>(
        "select token from public.volei_members where id=$1",
        [person.key.slice(2)],
      )
    ).rows[0].token;
    await db.exec("select set_config('request.jwt.claim.sub','',false)");
    await expect(
      db.query("select public.volei_respond($1,$2,'nao_vai',$3)", [
        courtEvent,
        person.key.slice(2),
        token,
      ]),
    ).rejects.toThrow("chegada");
  });
  it("concluir chamada preserva o historico e impede alterar quadra ou capacidade", async () => {
    await as(admin, "select public.volei_close_presence('" + courtEvent + "')");
    await expect(save(state)).rejects.toThrow("concluida".replace("i", "í"));
    await expect(
      as(
        admin,
        "update public.volei_events set max_teams=4 where id='" +
          courtEvent +
          "'",
      ),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "select * from public.volei_court_sessions where event_id=$1",
          [courtEvent],
        )
      ).rows,
    ).toHaveLength(1);
  });
});
