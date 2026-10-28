import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Presence } from "@/components/volei/presence";
import { GameRoster } from "@/components/volei/game-roster";
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
      <section className="volley-hero">
        <span className="volley-eyebrow">SEU ESPAÇO NO GRUPO</span>
        <h1>Olá, {member.name.split(" ")[0]}!</h1>
        <p>
          Confirme sua participação nos próximos jogos e acompanhe as vagas. Seu
          link é pessoal: guarde com você.
        </p>
      </section>
      {member.blocked && (
        <p role="alert" className="volley-error">
          Sua inscrição está temporariamente bloqueada. Fale com o responsável.
        </p>
      )}
      {!events.length && (
        <section className="volley-card">
          Nenhum jogo cadastrado para este mês e o próximo.
        </section>
      )}
      {events.map((game) => (
        <section key={game.event.id} className="volley-form">
          <div className="volley-card">
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
              mine={
                game.attendance.find((a) => a.member_id === member.id)?.status
              }
              canRespond={!member.blocked}
              canJoin={isEventOpen(game.event)}
            />
            <Link className="volley-link" href={`/volei/jogo/${game.event.id}`}>
              Página do jogo e convidados →
            </Link>
          </div>
          <GameRoster game={game} />
        </section>
      ))}
    </>
  );
}
