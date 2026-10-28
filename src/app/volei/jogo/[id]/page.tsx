import Link from "next/link";
import { notFound } from "next/navigation";
import { publicEvent } from "@/lib/volei/repository";
import { formatDate, isEventOpen } from "@/lib/volei/domain";
import { currentPlayer } from "@/lib/volei/player-session";
import { canSubmitComplaint } from "@/lib/volei/complaints";
import { serviceClient } from "@/lib/escalas/supabase";
import { GameResponse, type MyGame } from "@/components/volei/game-response";
import { GameRoster } from "@/components/volei/game-roster";
import { VolleyIcon } from "@/components/volei/volley-icon";
import "@/components/volei/game.css";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [game, player] = await Promise.all([publicEvent(id), currentPlayer()]);
  if (!game) notFound();
  const { event, attendance, guests } = game;
  const open = isEventOpen(event);
  const confirmed =
    attendance.filter((p) => p.status === "confirmado").length +
    guests.filter((p) => p.status === "confirmado").length;
  const reserved = attendance.filter((p) => p.status === "reservado").length;
  const ownGuest = player
    ? await serviceClient()
        .from("volei_guests")
        .select("name,status,profile_token")
        .eq("event_id", id)
        .eq("member_id", player.id)
        .maybeSingle()
    : null;
  const mine: MyGame | null = player
    ? {
        name: player.name,
        phone: player.phone,
        blocked: player.blocked,
        active: player.is_active,
        membershipStatus: player.membership_status,
        canReport: canSubmitComplaint(player),
        status: attendance.find((p) => p.member_id === player.id)?.status,
        guest: ownGuest?.data
          ? {
              name: ownGuest.data.name,
              status: ownGuest.data.status,
              profileToken: ownGuest.data.profile_token,
            }
          : undefined,
      }
    : null;
  const deadline = event.registration_deadline
    ? new Date(event.registration_deadline)
    : null;
  const timeFormat = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="game-page">
      <Link href="/volei" className="game-back">
        ← Todos os jogos
      </Link>
      <header className="game-event-header">
        <div className="game-event-intro">
          <span className="game-event-label">
            <span />
            ENCONTRO DO GRUPO
          </span>
          <h1>
            {event.title}
            <span>Todo mundo na quadra.</span>
          </h1>
          <div className="game-event-details">
            <span>
              <VolleyIcon name="clock" />
              {formatDate(event.date)}
              {event.start_time && ` · ${event.start_time}`}
            </span>
            {event.location && (
              <span>
                <VolleyIcon name="pin" />
                {event.location}
              </span>
            )}
          </div>
          {event.notes && <p className="game-event-notes">{event.notes}</p>}
        </div>
        <div className="game-deadline-box">
          <span className={`game-open-badge ${!open ? "is-closed" : ""}`}>
            <span />
            {open ? "INSCRIÇÕES ABERTAS" : "INSCRIÇÕES ENCERRADAS"}
          </span>
          <p>Confirmações até</p>
          <strong>
            {deadline ? timeFormat.format(deadline) : "18:00"}
            <small>horário de Brasília</small>
          </strong>
          <span>
            {deadline
              ? new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "long",
                }).format(deadline)
              : formatDate(event.date)}
          </span>
        </div>
      </header>
      <div className="game-summary-strip">
        <span>
          <VolleyIcon name="users" />
          <strong>{confirmed}</strong> confirmados
        </span>
        <span>
          <span className="game-available-dot" />
          <strong>{Math.max(0, 18 - confirmed - reserved)}</strong> vagas
          disponíveis
        </span>
        <span>
          <VolleyIcon name="ball" />3 times de 6 jogadores
        </span>
      </div>
      <div className="game-page-grid">
        <GameResponse
          eventId={id}
          open={open}
          finished={!!event.presence_closed_at}
          mine={mine}
          free={Math.max(0, 18 - confirmed - reserved)}
        />
        <GameRoster game={game} />
      </div>
      <footer className="game-page-footer">
        <VolleyIcon name="ball" />
        <p>
          Se não puder ir, avise por aqui.
          <br />
          <strong>Sua vaga faz falta para quem quer jogar.</strong>
        </p>
      </footer>
    </div>
  );
}
