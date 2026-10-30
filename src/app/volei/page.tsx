import { VolleyDashboard } from "@/components/volei/dashboard";
import { publicEvents } from "@/lib/volei/repository";
import { currentMonth, today } from "@/lib/volei/domain";
export const dynamic = "force-dynamic";
export default async function Page() {
  const months = [
    currentMonth(),
    (() => {
      const [y, m] = currentMonth().split("-").map(Number);
      return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
    })(),
  ];
  const events = (
    await Promise.all(months.map((m) => publicEvents(m, today())))
  ).flat();
  return (
    <VolleyDashboard
      month={currentMonth()}
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
