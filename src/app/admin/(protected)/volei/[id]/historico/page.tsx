import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { courtData } from "@/lib/volei/court-repository";
import { formatDate } from "@/lib/volei/domain";
import { PageHeader } from "@/components/escalas/admin-ui";
import { Button } from "@/components/ui/button";
import "@/components/volei/court.css";
import { formatCourtTime } from "@/lib/volei/court";
const teamName = (i: number) => `Time ${String.fromCharCode(65 + i)}`;
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await courtData(client, id);
  if (!data) notFound();
  const { state } = data;
  const participation = new Map<string, { name: string; matches: number }>();
  for (const match of state.history)
    for (const lineup of match.lineups ?? [])
      for (const player of lineup.players) {
        const previous = participation.get(player.key);
        participation.set(player.key, {
          name: player.name,
          matches: (previous?.matches ?? 0) + 1,
        });
      }
  return (
    <>
      <PageHeader
        eyebrow="Vôlei · Histórico das partidas"
        title={formatDate(data.event.date)}
        description="Resultados e formações registrados na quadra."
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/volei/${id}/quadra`}>Voltar à quadra</Link>
          </Button>
        }
      />
      <div className="vc-board">
        <section className="volley-card vc-section">
          <h2>{state.round} partidas registradas</h2>
          <p className="vc-help">
            As letras identificam os times durante o jogo. Os jogadores podem
            mudar entre as partidas.
          </p>
          <div className="vc-metrics">
            {Array.from(
              new Set(state.history.flatMap((m) => [m.winner, m.loser])),
            )
              .sort()
              .map((team) => (
                <div key={team}>
                  <strong>
                    {state.history.filter((m) => m.winner === team).length}
                  </strong>
                  <span>Vitórias · {teamName(team)}</span>
                </div>
              ))}
          </div>
          {state.round > state.history.length && (
            <p className="vc-notice">
              Exibindo os últimos {state.history.length} registros. Os totais
              abaixo consideram esse período.
            </p>
          )}
        </section>
        <section className="volley-card vc-section">
          <h2>Participação nas partidas</h2>
          <p className="vc-help">
            Contagem de partidas jogadas, em ordem alfabética. A frequência do
            encontro continua separada.
          </p>
          {participation.size ? (
            <ul className="vc-history">
              {[...participation.values()]
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                .map((p, i) => (
                  <li key={i}>
                    <strong>{p.name}</strong> · {p.matches}{" "}
                    {p.matches === 1 ? "partida" : "partidas"}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="vc-empty">
              As formações passam a ser guardadas nas próximas vitórias
              registradas.
            </p>
          )}
        </section>
        <section className="volley-card vc-section">
          <h2>Partida por partida</h2>
          {!state.history.length ? (
            <p className="vc-empty">
              Nenhuma partida registrada. Marque o vencedor na quadra para
              começar.
            </p>
          ) : (
            <ol className="vc-history">
              {[...state.history].reverse().map((match) => (
                <li key={match.round}>
                  <strong>
                    Partida {match.round} · {teamName(match.winner)} venceu{" "}
                    {teamName(match.loser)}
                  </strong>
                  {match.result && (
                    <p>
                      <strong>
                        {match.result.scores
                          .map((s) => `${teamName(s.team)}: ${s.points}`)
                          .join(" × ")}
                      </strong>{" "}
                      · Tempo de jogo:{" "}
                      {formatCourtTime(match.result.durationSeconds * 1000)}
                    </p>
                  )}
                  <small>
                    {new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(match.at))}
                  </small>
                  {match.lineups?.map((lineup) => (
                    <p key={lineup.team}>
                      <strong>{teamName(lineup.team)}:</strong>{" "}
                      {lineup.players.map((p) => p.name).join(", ")}
                    </p>
                  ))}
                  {!match.lineups && (
                    <p>Formação indisponível neste registro antigo.</p>
                  )}
                  <p>
                    {match.incoming === match.loser
                      ? "Os mesmos times continuaram."
                      : `${teamName(match.incoming)} entrou; ${teamName(match.loser)} foi para a fila.`}
                  </p>
                  {!!match.borrowed.length && (
                    <p>
                      Jogadores aproveitados:{" "}
                      {match.borrowed
                        .map(
                          (key) =>
                            match.lineups
                              ?.flatMap((l) => l.players)
                              .find((p) => p.key === key)?.name ??
                            state.arrivals.find((p) => p.key === key)?.name ??
                            "Participante",
                        )
                        .join(", ")}
                      .
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
