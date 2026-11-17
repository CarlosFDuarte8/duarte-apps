import { VolleyDashboard } from "@/components/volei/dashboard";
import { publicEvents } from "@/lib/volei/repository";
import { currentMonth, today } from "@/lib/volei/domain";
import { publicWhatsAppGroup } from "@/lib/volei/group-settings";
import { WhatsAppGroupCard } from "@/components/volei/whatsapp-group";
export const dynamic = "force-dynamic";
export default async function Page() {
  const months = [
    currentMonth(),
    (() => {
      const [y, m] = currentMonth().split("-").map(Number);
      return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
    })(),
  ];
  const [eventMonths, group] = await Promise.all([
    Promise.all(months.map((m) => publicEvents(m, today()))),
    publicWhatsAppGroup(),
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
    />
  );
}
