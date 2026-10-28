import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/escalas/supabase";
import {
  daysInMonth,
  isEventOpen,
  type AttendanceStatus,
  type VoleiEvent,
  type VoleiMember,
} from "./domain";

const eventColumns =
  "id,date,title,start_time,location,notes,closed,registration_deadline,guests_open_at,presence_closed_at";
const memberColumns =
  "id,name,token,points,blocked,blocked_reason,is_active,phone,is_core,preferred_weekdays,preferred_dates,unavailable_dates,preference_notes,membership_status";

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
  await publicEvents(month, from);
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
  return (data ?? []) as VoleiMember[];
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

export async function listPointLogs(client: SupabaseClient) {
  const { data, error } = await client
    .from("volei_point_log")
    .select("id,member_id,delta,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  fail(error);
  const byMember = new Map<string, PointLogRow[]>();
  for (const row of (data ?? []) as (PointLogRow & { member_id: string })[]) {
    const list = byMember.get(row.member_id) ?? [];
    if (list.length < 10) list.push(row);
    byMember.set(row.member_id, list);
  }
  return byMember;
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

export async function publicEvents(month: string, fromDate: string) {
  const [from, to] = monthRange(month);
  const client = serviceClient();
  const upcoming = await client
    .from("volei_events")
    .select("id")
    .gte("date", from > fromDate ? from : fromDate)
    .lte("date", to);
  fail(upcoming.error);
  for (const e of upcoming.data ?? []) {
    const { error } = await client.rpc("volei_fill_slots", { p_event: e.id });
    fail(error);
  }
  const { data, error } = await serviceClient()
    .from("volei_events")
    .select(
      `${eventColumns}, volei_attendance(member_id,status,registered_at,queue_order, volei_members(name,is_core)), volei_guests(id,member_id,name,status,registered_at,queue_order)`,
    )
    .gte("date", from > fromDate ? from : fromDate)
    .lte("date", to)
    .order("date");
  fail(error);
  return (data ?? []).map((row) => {
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
        volei_members: { name: string; is_core: boolean } | null;
      }[];
    };
    return {
      event,
      guests: guests ?? [],
      attendance: rows
        .sort(
          (a, b) =>
            Number(!!b.volei_members?.is_core) -
              Number(!!a.volei_members?.is_core) ||
            a.registered_at.localeCompare(b.registered_at) ||
            a.queue_order - b.queue_order,
        )
        .map((r) => ({
          member_id: r.member_id,
          status: r.status,
          name: r.volei_members?.name ?? "",
          registered_at: r.registered_at,
        })),
    };
  });
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
    .select(eventColumns)
    .eq("id", id)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  const events = await publicEvents(data.date.slice(0, 7), data.date);
  return events.find((e) => e.event.id === id) ?? null;
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
