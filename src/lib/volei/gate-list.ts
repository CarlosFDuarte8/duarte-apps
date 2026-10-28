import type { VoleiMember, AttendanceStatus } from "./domain";
export function buildGateList(
  members: VoleiMember[],
  attendance: { member_id: string; status: AttendanceStatus }[],
  guests: {
    id: string;
    member_id: string;
    name: string;
    status: AttendanceStatus;
  }[],
) {
  const allowed = new Map(
    members
      .filter(
        (m) => m.membership_status === "approved" && m.is_active && !m.blocked,
      )
      .map((m) => [m.id, m.name]),
  );
  return [
    ...attendance
      .filter((a) => a.status === "confirmado" && allowed.has(a.member_id))
      .map((a) => ({
        key: a.member_id,
        name: allowed.get(a.member_id)!,
        type: "Membro",
        responsible: "—",
      })),
    ...guests
      .filter((g) => g.status === "confirmado" && allowed.has(g.member_id))
      .map((g) => ({
        key: g.id,
        name: g.name,
        type: "Convidado",
        responsible: allowed.get(g.member_id)!,
      })),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
