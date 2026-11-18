import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { today } from "./domain";

export type TodayTasksData = {
  pending: number;
  event: { id: string; title: string; date: string; finalized: boolean; participants: number; present: number } | null;
};

export async function todayTasks(client: SupabaseClient): Promise<TodayTasksData> {
  const [game, memberships] = await Promise.all([
    client.from("volei_events").select("id,title,date,presence_closed_at,volei_attendance(status,checked_in_at),volei_guests(status,checked_in_at)").eq("date", today()).maybeSingle(),
    client.from("volei_members").select("id", { count: "exact", head: true }).eq("membership_status", "pending"),
  ]);
  if (game.error || memberships.error) throw new Error("Não foi possível consultar as tarefas de hoje.");
  const row = game.data as { id: string; title: string; date: string; presence_closed_at: string | null; volei_attendance: { status: string; checked_in_at: string | null }[]; volei_guests: { status: string; checked_in_at: string | null }[] } | null;
  const participants = row ? [...row.volei_attendance, ...row.volei_guests].filter(person => ["confirmado", "ausente"].includes(person.status)) : [];
  return {
    pending: memberships.count ?? 0,
    event: row ? { id: row.id, title: row.title, date: row.date, finalized: !!row.presence_closed_at, participants: participants.length, present: participants.filter(person => !!person.checked_in_at).length } : null,
  };
}
