import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/escalas/supabase";
import { today } from "./domain";
import type { Complaint, NotificationSummary } from "./complaints";
function fail(error: { message: string } | null) {
  if (error) throw Error(error.message);
}
export async function notificationSummary(
  client: SupabaseClient,
): Promise<NotificationSummary> {
  const [members, complaints, unread] = await Promise.all([
    client
      .from("volei_members")
      .select("id", { count: "exact", head: true })
      .eq("membership_status", "pending"),
    client
      .from("volei_complaints")
      .select("id", { count: "exact", head: true })
      .neq("status", "resolved"),
    client
      .from("volei_complaints")
      .select("id", { count: "exact", head: true })
      .neq("status", "resolved")
      .is("read_at", null),
  ]);
  for (const result of [members, complaints, unread]) fail(result.error);
  return {
    pendingMembers: members.count ?? 0,
    openComplaints: complaints.count ?? 0,
    unreadComplaints: unread.count ?? 0,
  };
}
export async function complaintTargets(reporterId: string) {
  const client = serviceClient();
  const [members, guests, events] = await Promise.all([
    client
      .from("volei_members")
      .select("id,name")
      .eq("membership_status", "approved")
      .neq("id", reporterId)
      .order("name"),
    client
      .from("volei_guests")
      .select("id,name,volei_members(name),volei_events!inner(date)")
      .lte("volei_events.date", today())
      .order("registered_at", { ascending: false })
      .limit(200),
    client
      .from("volei_events")
      .select("id,date,title")
      .lte("date", today())
      .order("date", { ascending: false })
      .limit(100),
  ]);
  for (const result of [members, guests, events]) fail(result.error);
  return {
    members: members.data ?? [],
    guests: (guests.data ?? []) as unknown as {
      id: string;
      name: string;
      volei_members: { name: string } | null;
      volei_events: { date: string };
    }[],
    events: events.data ?? [],
  };
}
export async function listComplaints(
  client: SupabaseClient,
  resolved: boolean,
  page: number,
) {
  let query = client
    .from("volei_complaints")
    .select(
      "id,title,reporter_name,target_name,target_type,status,read_at,created_at",
      { count: "exact" },
    );
  query = resolved
    ? query.eq("status", "resolved")
    : query.neq("status", "resolved");
  const { data, error, count } = await query
    .order("created_at", { ascending: !resolved })
    .range((page - 1) * 20, page * 20 - 1);
  fail(error);
  return {
    items: (data ?? []) as Pick<
      Complaint,
      | "id"
      | "title"
      | "reporter_name"
      | "target_name"
      | "target_type"
      | "status"
      | "read_at"
      | "created_at"
    >[],
    total: count ?? 0,
  };
}
export async function getComplaint(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("volei_complaints")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  fail(error);
  return data as Complaint | null;
}
export async function complaintHistory(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("volei_complaint_updates")
    .select("id,from_status,to_status,note,created_at")
    .eq("complaint_id", id)
    .order("created_at", { ascending: false });
  fail(error);
  return data ?? [];
}
