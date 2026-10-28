import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEvent, listMembers, listGuestProfiles } from "./repository";
import {
  emptyCourt,
  courtStateSchema,
  resizeCourt,
  applyCourtAction,
  type CourtRosterPerson,
  type CourtAction,
} from "./court";
export async function courtData(client: SupabaseClient, eventId: string) {
  const [found, members, guests, session] = await Promise.all([
    getEvent(client, eventId),
    listMembers(client),
    listGuestProfiles(client, undefined, eventId),
    client
      .from("volei_court_sessions")
      .select("version,state")
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);
  if (!found) return null;
  if (session.error) throw Error(session.error.message);
  const byId = new Map(members.map((m) => [m.id, m]));
  const roster: CourtRosterPerson[] = [];
  for (const attendance of found.attendance) {
    const member = byId.get(attendance.member_id);
    if (
      !member ||
      attendance.status !== "confirmado" ||
      !member.is_active ||
      member.blocked ||
      member.membership_status !== "approved"
    )
      continue;
    roster.push({
      key: `m:${member.id}`,
      id: member.id,
      guest: false,
      memberId: member.id,
      name: member.name,
      skill: member.skill_level ?? null,
      checkedInAt: attendance.checked_in_at ?? null,
      photo_url: member.photo_url,
      emergency_name: member.emergency_name,
      emergency_phone: member.emergency_phone,
      emergency_relationship: member.emergency_relationship,
    });
  }
  for (const guest of guests.filter((g) => g.event_id === eventId)) {
    const member = byId.get(guest.member_id);
    if (
      guest.status !== "confirmado" ||
      guest.blocked ||
      !member ||
      !member.is_active ||
      member.blocked ||
      member.membership_status !== "approved"
    )
      continue;
    const attendance = found.guests.find((g) => g.id === guest.id);
    roster.push({
      key: `g:${guest.id}`,
      id: guest.id,
      guest: true,
      memberId: guest.member_id,
      name: guest.name,
      skill: guest.skill_level,
      checkedInAt: attendance?.checked_in_at ?? null,
      photo_url: guest.photo_url,
      emergency_name: guest.emergency_name,
      emergency_phone: guest.emergency_phone,
      emergency_relationship: guest.emergency_relationship,
    });
  }
  const parsed = courtStateSchema.safeParse(session.data?.state);
  let state = parsed.success
    ? resizeCourt(parsed.data, found.event.max_teams ?? 3)
    : emptyCourt(found.event.max_teams ?? 3);
  const allowed = new Set(roster.map((p) => p.key));
  for (const arrival of [...state.arrivals])
    if (
      !arrival.departedAt &&
      (!allowed.has(arrival.key) ||
        !roster.find((p) => p.key === arrival.key)?.checkedInAt)
    )
      state = applyCourtAction(state, roster, {
        type: "leave",
        key: arrival.key,
      });
  for (const person of roster
    .filter((p) => p.checkedInAt)
    .sort((a, b) => a.checkedInAt!.localeCompare(b.checkedInAt!)))
    if (!state.arrivals.some((p) => p.key === person.key))
      state = applyCourtAction(
        state,
        roster,
        { type: "arrive", key: person.key },
        Math.random,
        person.checkedInAt!,
      );
  return {
    event: found.event,
    roster,
    state,
    version: session.data?.version ?? 0,
  };
}
export async function mutateCourt(
  client: SupabaseClient,
  eventId: string,
  action: CourtAction,
  expectedVersion?: number,
) {
  const data = await courtData(client, eventId);
  if (!data) return { error: "Jogo não encontrado." };
  if (expectedVersion !== undefined && data.version !== expectedVersion)
    return { error: "A quadra foi atualizada. Recarregue e tente novamente." };
  let next;
  try {
    next = applyCourtAction(data.state, data.roster, action);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar os times.",
    };
  }
  const { error } = await client.rpc("volei_save_court", {
    p_event: eventId,
    p_version: data.version,
    p_state: next,
    p_undo_key: action.type === "undo" ? action.key : null,
  });
  return {
    error: error
      ? error.code === "P0001"
        ? error.message
        : "Não foi possível atualizar a quadra."
      : "",
  };
}
