import { publicEventDetails } from "@/lib/volei/repository";
import { eventCalendar } from "@/lib/volei/event-links";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await publicEventDetails(id);
  if (!event?.calendar_enabled) return new Response("Calendário indisponível.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(eventCalendar(event, new URL(request.url).origin), { headers: {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="volei-${event.date}.ics"`,
    "Cache-Control": "no-store",
  } });
}
