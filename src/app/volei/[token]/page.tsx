import { VolleyCard, VolleyPageHeader } from "@/components/volei/page-frame";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Presence } from "@/components/volei/presence";
import { GameRoster } from "@/components/volei/game-roster";
import { ownParticipationProfile } from "@/lib/volei/participation-profile";
import { admissionForEvent } from "@/lib/volei/participation-policy";
import { memberByToken, publicEvents } from "@/lib/volei/repository";
import {
  currentMonth,
  formatDate,
  isEventOpen,
  shiftMonth,
  today,
} from "@/lib/volei/domain";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Minha presença | Vôlei",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await memberByToken(token);
  if (!member || !member.is_active) notFound();
  const events = (
    await Promise.all(
      [currentMonth(), shiftMonth(currentMonth(), 1)].map((month) =>
        publicEvents(month, today()),
      ),
    )
  ).flat();
  return (
    <>
      <VolleyPageHeader
        eyebrow="SEU ESPAÇO NO GRUPO"
        title={<> Olá, {member.name.split(" ")[0]}! </>}
        description="Confirme sua participação nos próximos jogos e acompanhe as vagas. Seu link é pessoal: guarde com você."
      />
      {member.blocked && (
        <p role="alert" className="volley-error">
          Sua inscrição está temporariamente bloqueada. Fale com o responsável.
        </p>
      )}
      {!events.length && (
        <VolleyCard as="section">
          Nenhum jogo cadastrado para este mês e o próximo.
        </VolleyCard>
      )}
      {events.map((game) => (
        <section key={game.event.id} className="volley-form">
          <VolleyCard >
            <span className="volley-muted">{formatDate(game.event.date)}</span>
            <h2>{game.event.title}</h2>
            <p className="volley-muted">
              {[game.event.start_time, game.event.location]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Presence
              token={token}
              eventId={game.event.id}
              eventDate={game.event.date}
              mine={
                game.attendance.find((a) => a.member_id === member.id)?.status
              }
              canRespond={!member.blocked}
              canJoin={isEventOpen(game.event) && admissionForEvent(game.event, member).open}
              admissionMessage={admissionForEvent(game.event, member).message}
              profile={ownParticipationProfile(member)}
            />
            <Link className="volley-link" href={`/volei/jogo/${game.event.id}`}>
              Página do jogo e convidados →
            </Link>
          </VolleyCard>
          <GameRoster game={game} updatedAt={new Date().toISOString()} />
        </section>
      ))}
    </>
  );
}
