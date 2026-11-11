import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/escalas/supabase";
import { signPhotos } from "./photos";
import {
  weekdayOf,
  daysInMonth,
  isEventOpen,
  type AttendanceStatus,
  type VoleiEvent,
  type VoleiMember,
  today,
} from "./domain";

const eventColumns =
  "id,date,title,start_time,location,notes,closed,registration_deadline,guests_open_at,presence_closed_at,max_teams";
const memberColumns =
  "id,name,token,points,blocked,blocked_reason,is_active,phone,is_core,student_weekdays,requested_student_weekdays,preferred_weekdays,preferred_dates,unavailable_dates,preference_notes,membership_status,birth_date,photo_path,skill_level,emergency_name,emergency_phone,emergency_relationship";

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

function monthRange(month: string) {
  return [
    `${month}-01`,
    `${month}-${String(daysInMonth(month)).padStart(2, "0")}`,
  ] as const;
}

export type AttendanceRow = {
  member_id: string;
  status: AttendanceStatus;
  checked_in_at?: string | null;
};
export type PointLogRow = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
};

/* ---------- Administração (cliente da sessão; o RLS exige o admin) ---------- */

export async function listEvents(client: SupabaseClient, month: string) {
  const [from, to] = monthRange(month);
  await syncPublicEventRange(serviceClient(), from, to);
  const { data, error } = await client
    .from("volei_events")
    .select(`${eventColumns}, volei_attendance(status), volei_guests(status)`)
    .gte("date", from)
    .lte("date", to)
    .order("date");
  fail(error);
  return (data ?? []).map((row) => {
    const {
      volei_attendance: rows,
      volei_guests: guests,
      ...event
    } = row as unknown as VoleiEvent & {
      volei_attendance: { status: AttendanceStatus }[];
      volei_guests: { status: AttendanceStatus }[];
    };
    return {
      event,
      confirmed:
        rows.filter((r) => r.status === "confirmado").length +
        guests.filter((g) => g.status === "confirmado").length,
      waiting: rows.filter((r) => r.status === "espera").length,
      reserved: rows.filter((r) => r.status === "reservado").length,
      guestsWaiting: guests.filter((g) => g.status === "espera").length,
      declined: rows.filter((r) => r.status === "nao_vai").length,
    };
  });
}

export async function listMembers(client: SupabaseClient) {
  const { data, error } = await client
    .from("volei_members")
    .select(memberColumns)
    .order("name");
  fail(error);
  return signPhotos((data ?? []) as VoleiMember[]);
}

export async function getMember(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("volei_members")
    .select(memberColumns)
    .eq("id", id)
    .maybeSingle();
  fail(error);
  return data ? (await signPhotos([data as VoleiMember]))[0] : null;
}

export async function memberPointLogs(
  client: SupabaseClient,
  memberId: string,
) {
  const { data, error } = await client
    .from("volei_point_log")
    .select("id,delta,reason,created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(10);
  fail(error);
  return (data ?? []) as PointLogRow[];
}

export async function getEvent(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("volei_events")
    .select(
      `${eventColumns}, volei_attendance(member_id,status,checked_in_at), volei_guests(id,member_id,name,status,checked_in_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  const {
    volei_attendance: attendance,
    volei_guests: guests,
    ...event
  } = data as unknown as VoleiEvent & {
    volei_attendance: AttendanceRow[];
    volei_guests: {
      id: string;
      member_id: string;
      name: string;
      status: AttendanceStatus;
      checked_in_at: string | null;
    }[];
  };
  return { event, attendance, guests };
}

/* ---------- Área pública (token individual; sempre pelo servidor) ---------- */

export async function memberByToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await serviceClient()
    .from("volei_members")
    .select("id,name,points,blocked,is_active,phone")
    .eq("token", token)
    .maybeSingle();
  fail(error);
  return data as Pick<
    VoleiMember,
    "id" | "name" | "points" | "blocked" | "is_active" | "phone"
  > | null;
}

export async function publicLeaderboard() {
  const { data, error } = await serviceClient()
    .from("volei_members")
    .select("name,points")
    .eq("is_active", true)
    .order("points", { ascending: false })
    .order("name");
  fail(error);
  return (data ?? []) as { name: string; points: number }[];
}

const publicEventColumns = `${eventColumns}, volei_attendance(member_id,status,registered_at,queue_order, volei_members(name,is_core,student_weekdays)), volei_guests(id,member_id,name,status,registered_at,queue_order)`;

function presentPublicEvent(row: unknown) {
  const {
    volei_attendance: rows,
    volei_guests: guests,
    ...event
  } = row as unknown as VoleiEvent & {
    volei_guests: GuestRow[];
    volei_attendance: {
      member_id: string;
      status: AttendanceStatus;
      registered_at: string;
      queue_order: number;
      volei_members: {
        name: string;
        is_core: boolean;
        student_weekdays?: number[];
      } | null;
    }[];
  };
  return {
    event,
    guests: guests ?? [],
    attendance: rows
      .sort(
        (a, b) =>
          Number(
            !!b.volei_members?.is_core ||
              !!b.volei_members?.student_weekdays?.includes(
                weekdayOf(event.date),
              ),
          ) -
            Number(
              !!a.volei_members?.is_core ||
                !!a.volei_members?.student_weekdays?.includes(
                  weekdayOf(event.date),
                ),
            ) ||
          a.registered_at.localeCompare(b.registered_at) ||
          a.queue_order - b.queue_order,
      )
      .map((r) => ({
        member_id: r.member_id,
        status: r.status,
        name: r.volei_members?.name ?? "",
        registered_at: r.registered_at,
        student: !!r.volei_members?.student_weekdays?.length,
      })),
  };
}

async function syncPublicEventRange(
  client: SupabaseClient,
  from: string,
  to: string,
) {
  const upcoming = await client
    .from("volei_events")
    .select("id")
    .gte("date", from)
    .lte("date", to);
  fail(upcoming.error);
  const ids = upcoming.data ?? [];
  // Different events have independent row locks. Bound concurrency to four.
  for (let offset = 0; offset < ids.length; offset += 4) {
    await Promise.all(
      ids.slice(offset, offset + 4).map(async (event) => {
        const { error } = await client.rpc("volei_fill_slots", {
          p_event: event.id,
        });
        fail(error);
      }),
    );
  }
}

export async function publicEvents(month: string, fromDate: string) {
  const [monthStart, to] = monthRange(month);
  const from = monthStart > fromDate ? monthStart : fromDate;
  const client = serviceClient();
  await syncPublicEventRange(client, from, to);
  const { data, error } = await client
    .from("volei_events")
    .select(publicEventColumns)
    .gte("date", from)
    .lte("date", to)
    .order("date");
  fail(error);
  return (data ?? []).map(presentPublicEvent);
}

export async function savePublicAttendance(
  token: string,
  eventId: string,
  status: AttendanceStatus | "limpar",
  now: string,
) {
  const member = await memberByToken(token);
  if (!member || !member.is_active) return { error: "Link inválido." };
  if (member.phone)
    return {
      error:
        "Seu cadastro agora usa o celular. Abra a página do jogo pelo mesmo navegador em que você se inscreveu.",
    };
  if (member.blocked)
    return {
      error: "Você está temporariamente bloqueado. Fale com o administrador.",
    };
  const client = serviceClient();
  const { data: event, error } = await client
    .from("volei_events")
    .select(eventColumns)
    .eq("id", eventId)
    .maybeSingle();
  fail(error);
  if (
    !event ||
    (status === "confirmado" && !isEventOpen(event as VoleiEvent, now))
  )
    return { error: "Este dia não aceita mais confirmações." };
  const result = await client.rpc("volei_respond", {
    p_event: eventId,
    p_member: member.id,
    p_status: status,
    p_token: token,
  });
  if (result.error)
    return {
      error:
        "Não foi possível registrar. Verifique se as inscrições estão abertas.",
    };
  return { error: "" };
}

export type GuestRow = {
  id: string;
  member_id: string;
  name: string;
  status: AttendanceStatus;
  registered_at: string;
  queue_order: number;
};

export type GuestProfileRow = GuestRow & {
  event_id: string;
  phone: string | null;
  birth_date: string | null;
  photo_path: string | null;
  photo_url?: string | null;
  volei_members: { id: string; name: string } | null;
  volei_events: {
    id: string;
    date: string;
    title: string;
    closed: boolean;
    presence_closed_at: string | null;
  } | null;
  blocked: boolean;
  blocked_reason: string;
  skill_level: number | null;
  emergency_name: string;
  emergency_phone: string;
  emergency_relationship: string;
};
const guestProfileColumns =
  "id,event_id,member_id,name,status,registered_at,queue_order,phone,birth_date,photo_path,skill_level,emergency_name,emergency_phone,emergency_relationship,volei_members(id,name),volei_events(id,date,title,closed,presence_closed_at)";

export async function listGuestProfiles(
  client: SupabaseClient,
  memberId?: string,
  eventId?: string,
) {
  let query = client
    .from("volei_guests")
    .select(guestProfileColumns)
    .order("registered_at", { ascending: false })
    .limit(200);
  if (memberId) query = query.eq("member_id", memberId);
  if (eventId) query = query.eq("event_id", eventId);
  const [{ data, error }, blocks] = await Promise.all([
    query,
    client.from("volei_guest_blocks").select("phone,reason"),
  ]);
  fail(error);
  fail(blocks.error);
  const blocked = new Map(blocks.data?.map((row) => [row.phone, row.reason]));
  return signPhotos(
    ((data ?? []) as unknown as GuestProfileRow[]).map((row) => ({
      ...row,
      blocked: blocked.has(row.phone),
      blocked_reason: blocked.get(row.phone) ?? "",
    })),
  );
}

export async function getGuestProfile(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("volei_guests")
    .select(guestProfileColumns)
    .eq("id", id)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  const row = data as unknown as GuestProfileRow;
  const block = row.phone
    ? await client
        .from("volei_guest_blocks")
        .select("reason")
        .eq("phone", row.phone)
        .maybeSingle()
    : null;
  fail(block?.error ?? null);
  return (
    await signPhotos([
      {
        ...row,
        blocked: !!block?.data,
        blocked_reason: block?.data?.reason ?? "",
      },
    ])
  )[0];
}

export async function guestByProfileToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await serviceClient()
    .from("volei_guests")
    .select(guestProfileColumns)
    .eq("profile_token", token)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  const row = data as unknown as GuestProfileRow;
  if (
    !row.volei_events ||
    row.volei_events.date < today() ||
    row.volei_events.closed ||
    row.volei_events.presence_closed_at ||
    !["confirmado", "espera"].includes(row.status)
  )
    return null;
  return (await signPhotos([row]))[0];
}

export async function publicEvent(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const client = serviceClient();
  const { error: syncError } = await client.rpc("volei_fill_slots", {
    p_event: id,
  });
  fail(syncError);
  const { data, error } = await client
    .from("volei_events")
    .select(publicEventColumns)
    .eq("id", id)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  return presentPublicEvent(data);
}

export async function frequencyEvents(
  client: SupabaseClient,
  from: string,
  to: string,
) {
  const { data, error } = await client
    .from("volei_events")
    .select(
      "id,date,title,presence_closed_at,volei_attendance(member_id,status,checked_in_at),volei_guests(status,checked_in_at)",
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });
  fail(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    title: row.title,
    presence_closed_at: row.presence_closed_at,
    attendance: row.volei_attendance,
    guests: row.volei_guests,
  })) as import("./frequency").FrequencyEvent[];
}
