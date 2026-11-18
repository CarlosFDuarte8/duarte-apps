import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VoleiEvent } from "@/lib/volei/domain";
import { eventStartTime } from "@/lib/volei/event-links";
import { validDirectionsURL } from "@/lib/volei/event-link-settings";

export function EventLinks({ event, inverse = false }: { event: VoleiEvent; inverse?: boolean }) {
  const showCalendar = event.calendar_enabled === true;
  const showDirections = event.directions_enabled === true && !!event.directions_url && validDirectionsURL(event.directions_url);
  if (!showCalendar && !showDirections) return null;
  return <div className="volley-event-links" data-tone={inverse ? "inverse" : undefined}>
    {showCalendar && <Button asChild variant="outline"><a href={`/volei/jogo/${event.id}/calendario`} download><CalendarDays aria-hidden="true" />{eventStartTime(event.start_time) ? "Salvar no calendário" : "Salvar o dia no calendário"}</a></Button>}
    {showDirections && <Button asChild variant="outline"><a href={event.directions_url!} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />Abrir rota</a></Button>}
  </div>;
}
