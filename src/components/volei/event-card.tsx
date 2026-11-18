import Link from "next/link";
import { Armchair, ArrowUpRight, Clock3, Hourglass, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventCapacity, eventFreeSlots, type VoleiEvent } from "@/lib/volei/domain";
import type { AdmissionWindow } from "@/lib/volei/admission";
export type EventSummary = {
  event: VoleiEvent;
  confirmed: number;
  reserved?: number;
  waiting?: number;
  guestsWaiting?: number;
  declined?: number;
  admission?: AdmissionWindow;
};
export function EventCard({
  event,
  confirmed,
  reserved = 0,
  waiting = 0,
  guestsWaiting = 0,
  admin = false,
  admission,
}: EventSummary & { admin?: boolean }) {
  const date = new Date(`${event.date}T12:00:00Z`);
  const capacity = eventCapacity(event);
  const free = eventFreeSlots(event, confirmed, reserved);
  return (
    <article className="vx-game-row" id={`encontro-${event.id}`}>
      <div className="vx-row-date">
        <strong>{event.date.slice(-2)}</strong>
        <span>
          {new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
            .format(date)
            .replace(".", "")}
        </span>
      </div>
      <div className="vx-row-info">
        <div>
          <span>
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              timeZone: "UTC",
            }).format(date)}
          </span>
          {event.closed && <small className="vx-closed">Fechado</small>}
        </div>
        <h3>{event.title}</h3>
        {!admin && admission && admission.state !== "open" && <p className="volley-muted">{admission.message}</p>}
        <p>
          {event.start_time && (
            <span>
              <Clock3 aria-hidden="true" />
              {event.start_time}
            </span>
          )}
          {event.location && (
            <span>
              <MapPin aria-hidden="true" />
              {event.location}
            </span>
          )}
        </p>
      </div>
      <div className="vx-row-stats">
        <span>
          <Users aria-hidden="true" />
          <strong>
            {confirmed}
            <small>/{capacity}</small>
          </strong>
          <span>confirmados</span>
        </span>
        <span>
          <Armchair aria-hidden="true" /><strong>{free}</strong><span>vagas</span>
        </span>
        <span>
          <Hourglass aria-hidden="true" /><strong>{waiting + guestsWaiting}</strong><span>na espera</span>
        </span>
      </div>
      <Button asChild variant="outline">
        <Link
          href={admin ? `/admin/volei/${event.id}` : `/volei/jogo/${event.id}`}
        >
          {admin ? "Gerenciar" : "Ver encontro"}
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </Button>
    </article>
  );
}
