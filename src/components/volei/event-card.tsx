import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventCapacity, type VoleiEvent } from "@/lib/volei/domain";
export type EventSummary = {
  event: VoleiEvent;
  confirmed: number;
  reserved?: number;
  waiting?: number;
  guestsWaiting?: number;
  declined?: number;
};
export function EventCard({
  event,
  confirmed,
  reserved = 0,
  waiting = 0,
  guestsWaiting = 0,
  admin = false,
}: EventSummary & { admin?: boolean }) {
  const date = new Date(`${event.date}T12:00:00Z`),
    capacity = eventCapacity(event);
  const free = Math.max(0, capacity - confirmed - reserved);
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
          <strong>
            {confirmed}
            <small>/{capacity}</small>
          </strong>
          confirmados
        </span>
        <span>
          <strong>{free}</strong>vagas
        </span>
        <span>
          <strong>{waiting + guestsWaiting}</strong>na espera
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
