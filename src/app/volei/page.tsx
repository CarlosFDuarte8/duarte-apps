import { VolleyDashboard } from "@/components/volei/dashboard";
import { publicEvents } from "@/lib/volei/repository";
import { currentMonth, today } from "@/lib/volei/domain";
import { publicWhatsAppGroup } from "@/lib/volei/group-settings";
import { WhatsAppGroupCard } from "@/components/volei/whatsapp-group";
import { currentPlayer } from "@/lib/volei/player-session";
import { memberQueuePosition } from "@/lib/volei/queue";
export const dynamic = "force-dynamic";
export default async function Page() {
  const months = [
    currentMonth(),
    (() => {
      const [y, m] = currentMonth().split("-").map(Number);
      return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
    })(),
  ];
  const [eventMonths, group, player] = await Promise.all([
    Promise.all(months.map((m) => publicEvents(m, today()))),
    publicWhatsAppGroup(),
    currentPlayer(),
  ]);
  const events = eventMonths.flat();
  return (
    <VolleyDashboard
      month={currentMonth()}
      groupInvite={<WhatsAppGroupCard group={group} />}
      items={events.map(({ event, attendance, guests }) => ({
        event,
        confirmed:
          attendance.filter((p) => p.status === "confirmado").length +
          guests.filter((p) => p.status === "confirmado").length,
        reserved: attendance.filter((p) => p.status === "reservado").length,
        waiting: attendance.filter((p) => p.status === "espera").length,
        guestsWaiting: guests.filter((p) => p.status === "espera").length,
      }))}
      personal={player ? {
        name: player.name,
        membershipStatus: player.membership_status,
        available: player.is_active && !player.blocked,
        statuses: Object.fromEntries(events.flatMap(game => {
          const record = game.attendance.find(row => row.member_id === player.id);
          return record ? [[game.event.id, record.status]] : [];
        })),
        positions: Object.fromEntries(events.map(game => [game.event.id, memberQueuePosition(game.attendance, player.id)])),
      } : null}
    />
  );
}
