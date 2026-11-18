import { VolleyHeroDetail, VolleyPageHeader } from "@/components/volei/page-frame";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicEvent } from "@/lib/volei/repository";
import { formatDate, isEventOpen, eventFreeSlots } from "@/lib/volei/domain";
import { currentPlayer } from "@/lib/volei/player-session";
import { canSubmitComplaint } from "@/lib/volei/complaints";
import { serviceClient } from "@/lib/escalas/supabase";
import { GameResponse, type MyGame } from "@/components/volei/game-response";
import { GameRoster } from "@/components/volei/game-roster";
import { VolleyIcon } from "@/components/volei/volley-icon";
import { publicWhatsAppGroup } from "@/lib/volei/group-settings";
import { WhatsAppGroupCard } from "@/components/volei/whatsapp-group";
import "@/components/volei/game.css";
import { guestQueuePosition, memberQueuePosition } from "@/lib/volei/queue";
import { EventLinks } from "@/components/volei/event-links";
import { ownParticipationProfile } from "@/lib/volei/participation-profile";
import { admissionForEvent } from "@/lib/volei/participation-policy";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [game, player, group] = await Promise.all([publicEvent(id), currentPlayer(), publicWhatsAppGroup()]);
  if (!game) notFound();
  const { event, attendance, guests } = game;
  const open = isEventOpen(event);
  const admission = admissionForEvent(event, player);
  const confirmed =
    attendance.filter((p) => p.status === "confirmado").length +
    guests.filter((p) => p.status === "confirmado").length;
  const reserved = attendance.filter((p) => p.status === "reservado").length;
  const ownGuest = player
    ? await serviceClient()
        .from("volei_guests")
        .select("id,name,status,profile_token")
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
        profile: ownParticipationProfile(player),
        canReport: canSubmitComplaint(player),
        status: attendance.find((p) => p.member_id === player.id)?.status,
        queuePosition: memberQueuePosition(attendance, player.id),
        guest: ownGuest?.data
          ? {
              name: ownGuest.data.name,
              status: ownGuest.data.status,
              profileToken: ownGuest.data.profile_token,
              queuePosition: guestQueuePosition(guests, ownGuest.data.id),
            }
          : undefined,
      }
    : null;
  const displayedDate = admission.state === "scheduled" && admission.opensAt ? new Date(admission.opensAt) : new Date(admission.closesAt);
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
      <VolleyPageHeader
        mobileCompact
        eyebrow="LISTA DO DIA"
        title={event.title}
        description={<>
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
          {event.notes && (
            <details className="vx-event-notes">
              <summary>Orientações do encontro</summary>
              <p className="game-event-notes">{event.notes}</p>
            </details>
          )}
        </>}
        aside={<VolleyHeroDetail
          status={admission.open ? "INSCRIÇÕES ABERTAS" : admission.state === "closed" ? "INSCRIÇÕES ENCERRADAS" : admission.state === "scheduled" ? "AGUARDANDO ABERTURA" : "CONSULTE SUA INSCRIÇÃO"}
          active={admission.open}
          label={admission.state === "scheduled" ? "Suas inscrições abrem às" : "Confirmações até"}
          value={timeFormat.format(displayedDate)}
          description="Horário de Brasília"
          detail={new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "long",
                }).format(displayedDate)}
        />}
      />
      <EventLinks event={event} />
      <div className="game-summary-strip">
        <span>
          <VolleyIcon name="users" />
          <strong>{confirmed}</strong> confirmados
        </span>
        <span>
          <span className="game-available-dot" />
          <strong>
            {eventFreeSlots(event, confirmed, reserved)}
          </strong>{" "}
          vagas disponíveis
        </span>
        <span>
          <VolleyIcon name="ball" />
          {event.max_teams ?? 3} times de 6 jogadores
        </span>
      </div>
      <nav className="vx-event-jumps" aria-label="Acessos do encontro">
        <a href="#minha-presenca">
          Minha presença <span>↗</span>
        </a>
        <a href="#lista-do-dia">
          Lista de participantes <strong>{confirmed}</strong>
        </a>
      </nav>
      <div className="game-page-grid">
        <GameResponse
          eventId={id}
          eventDate={event.date}
          open={open}
          admission={admission}
          finished={!!event.presence_closed_at}
          mine={mine}
          free={eventFreeSlots(event, confirmed, reserved)}
        />
        <GameRoster game={game} updatedAt={new Date().toISOString()} />
      </div>
      <WhatsAppGroupCard group={group} />
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
