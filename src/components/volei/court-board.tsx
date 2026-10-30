"use client";
import { useState } from "react";
import Link from "next/link";
import { LogOut, Shuffle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { PersonAvatar } from "./person-avatar";
import { useRun } from "./use-run";
import { manageCourt, setCourtCapacity } from "@/app/admin/volei-court-actions";
import { saveSkillLevel } from "@/app/admin/volei-profile-actions";
import { skillLabels } from "@/lib/volei/profile";
import { displayPhone } from "@/lib/volei/phone";
import {
  teamLevel,
  type CourtRosterPerson,
  type CourtState,
  type CourtAction,
} from "@/lib/volei/court";
import "./court.css";
import { CourtGameMode } from "./court-game-mode";
import { GameOverlay } from "./game-overlay";
const teamName = (index: number) => String.fromCharCode(65 + index);
export function CourtBoard({
  eventId,
  state,
  version,
  roster,
  closed,
  maxTeams,
}: {
  eventId: string;
  state: CourtState;
  version: number;
  roster: CourtRosterPerson[];
  closed: boolean;
  maxTeams: 3 | 4;
}) {
  const { run, pending, feedback } = useRun();
  const [search, setSearch] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [gameMode, setGameMode] = useState(false);
  const byKey = new Map(roster.map((p) => [p.key, p]));
  const present = state.arrivals.filter((p) => !p.departedAt);
  const departed = state.arrivals.filter((p) => !!p.departedAt);
  const waiting = state.started
    ? state.waiting.flatMap((i) => state.teams[i])
    : present.map((p) => p.key);
  const absent = roster.filter(
    (p) => !state.arrivals.some((a) => a.key === p.key),
  );
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  function act(action: CourtAction) {
    run(
      () => manageCourt({ eventId, version, action }),
      undefined,
      action.type === "point"
        ? "Salvando ponto…"
        : action.type === "clock"
          ? "Atualizando cronômetro…"
          : action.type === "winner"
            ? "Salvando resultado e organizando rodízio…"
            : action.type === "shuffle"
              ? "Montando times equilibrados…"
              : "Atualizando a quadra…",
    );
  }
  function details(person: CourtRosterPerson) {
    return (
      <details className="vc-person-details">
        <summary>Nível e emergência</summary>
        <label>
          Nível privado
          <NativeSelect
            disabled={pending || closed}
            value={person.skill ?? 0}
            aria-label={`Nível de ${person.name}`}
            onChange={(e) =>
              run(() =>
                saveSkillLevel(
                  person.id,
                  person.guest,
                  Number(e.target.value) || null,
                ),
              )
            }
          >
            {skillLabels.map((label, index) => (
              <option key={label} value={index}>
                {index ? `${index} · ` : ""}
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
        {person.emergency_phone ? (
          <p>
            Emergência: <strong>{person.emergency_name}</strong>
            {person.emergency_relationship
              ? ` · ${person.emergency_relationship}`
              : ""}
            <a href={`tel:${person.emergency_phone}`}>
              {displayPhone(person.emergency_phone)}
            </a>
          </p>
        ) : (
          <p>Contato de emergência não informado.</p>
        )}
      </details>
    );
  }
  if (gameMode)
    return (
      <GameOverlay onExit={() => setGameMode(false)}>
        <CourtGameMode
          eventId={eventId}
          state={state}
          roster={roster}
          pending={pending}
          closed={closed}
          feedback={feedback}
          act={act}
          onExit={() => setGameMode(false)}
        />
      </GameOverlay>
    );
  return (
    <div className="vc-board">
      <Button onClick={() => setGameMode(true)}>Abrir modo jogo</Button>
      <Button asChild variant="outline">
        <Link href={`/admin/volei/${eventId}/historico`}>
          Histórico das partidas
        </Link>
      </Button>
      <div className="vc-metrics">
        <div>
          <strong>{present.length}</strong>
          <span>No local</span>
        </div>
        <div>
          <strong>
            {state.started
              ? state.playing.reduce((n, i) => n + state.teams[i].length, 0)
              : 0}
          </strong>
          <span>Na quadra</span>
        </div>
        <div>
          <strong>{waiting.length}</strong>
          <span>
            {state.started ? "Aguardando rodízio" : "Aguardando sorteio"}
          </span>
        </div>
        <div>
          <strong>{departed.length}</strong>
          <span>Já saíram</span>
        </div>
      </div>
      {feedback}
      {closed && (
        <p className="vc-notice">
          Consulta do histórico. As alterações ficam disponíveis no dia do jogo,
          até concluir a chamada.
        </p>
      )}
      <section className="volley-card vc-section">
        <div className="vc-heading">
          <div>
            <h2>Quadra e rodízio</h2>
            <p>
              O vencedor fica sem limite. O próximo time entra e aproveita
              jogadores do time que saiu quando precisar completar, alternando
              quem continua para que todos tenham rodízio.
            </p>
          </div>
          <div className="vc-actions">
            {state.started ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={pending || closed || present.length < 2}
                  >
                    <Shuffle aria-hidden="true" />
                    Sortear novamente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Sortear novamente os presentes?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Os times atuais serão refeitos usando os níveis e quem
                      está no local. As chegadas, saídas e partidas já
                      registradas serão mantidas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter times</AlertDialogCancel>
                    <AlertDialogAction onClick={() => act({ type: "shuffle" })}>
                      Refazer times
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                disabled={pending || closed || present.length < 2}
                onClick={() => act({ type: "shuffle" })}
              >
                <Shuffle aria-hidden="true" />
                Sortear times equilibrados
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={pending || closed}>
                  {maxTeams === 3 ? "Liberar 4º time" : "Voltar para 3 times"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {maxTeams === 3
                      ? "Liberar quatro times neste jogo?"
                      : "Voltar para três times?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {maxTeams === 3
                      ? "A capacidade passa de 18 para 24 participantes. As vagas adicionais seguem as regras de inscrição e a fila existente."
                      : "A capacidade volta a 18 participantes. Confirmados não serão removidos automaticamente; a redução será recusada se ultrapassar esse limite."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      run(() =>
                        setCourtCapacity(eventId, maxTeams === 3 ? 4 : 3),
                      )
                    }
                  >
                    Confirmar capacidade
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <p className="vc-notice">
          {maxTeams} times · até {maxTeams * 6} confirmados. Os níveis são
          privados; sem avaliação usa peso intermediário. Só quem chegou
          participa do sorteio.
        </p>
        {state.started ? (
          <>
            <div className={`vc-teams vc-teams-${maxTeams}`}>
              {state.teams.map((keys, index) => {
                const playing = state.playing.includes(index);
                const next =
                  state.waiting.find((i) => state.teams[i].length > 0) ===
                  index;
                return (
                  <article
                    className={`vc-team vc-team-${index}${playing ? " is-playing" : ""}`}
                    key={index}
                  >
                    <header>
                      <div>
                        <span className="vc-team-letter">
                          {teamName(index)}
                        </span>
                        <div>
                          <h3>Time {teamName(index)}</h3>
                          <small>
                            {keys.length}/6 jogadores · média{" "}
                            {teamLevel(keys, roster).toFixed(1)}
                          </small>
                        </div>
                      </div>
                      <Badge variant={playing ? "default" : "outline"}>
                        {playing ? "Jogando" : next ? "Próximo" : "Na fila"}
                      </Badge>
                    </header>
                    <ol>
                      {keys.map((key) => {
                        const person = byKey.get(key);
                        return (
                          <li key={key}>
                            <div className="vc-player-line">
                              <PersonAvatar
                                name={person?.name ?? "Participante"}
                                photoUrl={person?.photo_url}
                              />
                              <span>
                                <strong>
                                  {person?.name ??
                                    state.arrivals.find((a) => a.key === key)
                                      ?.name}
                                </strong>
                                <small>
                                  {person?.guest ? "Convidado" : "Membro"} ·{" "}
                                  {skillLabels[person?.skill ?? 0]}
                                </small>
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={pending || closed}
                                aria-label={`Registrar saída de ${person?.name}`}
                                onClick={() => act({ type: "leave", key })}
                              >
                                <LogOut aria-hidden="true" />
                              </Button>
                            </div>
                            {person && details(person)}
                          </li>
                        );
                      })}
                    </ol>
                    {!keys.length && (
                      <p className="vc-empty">
                        Aguardando as próximas chegadas.
                      </p>
                    )}
                    {!playing && keys.length > 0 && keys.length < 6 && (
                      <p className="vc-team-help">
                        Se entrar incompleto, recebe jogadores do time que saiu
                        priorizando o rodízio e depois o equilíbrio.
                      </p>
                    )}
                    {playing && (
                      <Button
                        disabled={pending || closed || !keys.length}
                        onClick={() => act({ type: "winner", team: index })}
                      >
                        <Trophy aria-hidden="true" />
                        Time {teamName(index)} venceu
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
            <p className="vc-queue">
              Fila de entrada:{" "}
              {state.waiting
                .filter((i) => state.teams[i].length)
                .map((i) => `Time ${teamName(i)} (${state.teams[i].length}/6)`)
                .join(" → ") ||
                "Sem time aguardando. Os dois times seguem jogando."}
            </p>
            <form
              className="vc-swap"
              onSubmit={(e) => {
                e.preventDefault();
                act({ type: "swap", first, second });
              }}
            >
              <h3>Ajustar os times manualmente</h3>
              <label>
                Primeiro jogador
                <NativeSelect
                  required
                  disabled={pending || closed}
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {state.teams.flatMap((team, i) =>
                    team.map((key) => (
                      <option key={key} value={key}>
                        {byKey.get(key)?.name} · Time {teamName(i)}
                      </option>
                    )),
                  )}
                </NativeSelect>
              </label>
              <label>
                Segundo jogador
                <NativeSelect
                  required
                  disabled={pending || closed}
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {state.teams.flatMap((team, i) =>
                    team.map((key) => (
                      <option key={key} value={key}>
                        {byKey.get(key)?.name} · Time {teamName(i)}
                      </option>
                    )),
                  )}
                </NativeSelect>
              </label>
              <Button
                variant="outline"
                disabled={
                  pending || closed || !first || !second || first === second
                }
              >
                Trocar jogadores
              </Button>
            </form>
          </>
        ) : (
          <div className="vc-empty">
            <p>
              Marque as chegadas abaixo e faça o primeiro sorteio. As próximas
              pessoas entram na fila sem refazer os times que já estão jogando.
            </p>
          </div>
        )}
      </section>
      <section className="volley-card vc-section">
        <h2>Registrar chegadas</h2>
        <p className="vc-help">
          A chegada conta como presença na frequência. A lista de espera da
          inscrição só autoriza entrada depois da confirmação da vaga.
        </p>
        <label>
          Buscar confirmado
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome do participante"
          />
        </label>
        <div className="vc-arrival-list">
          {absent
            .filter((p) => normalize(p.name).includes(normalize(search)))
            .map((person) => (
              <article key={person.key}>
                <div className="vc-player-line">
                  <PersonAvatar
                    name={person.name}
                    photoUrl={person.photo_url}
                  />
                  <span>
                    <strong>{person.name}</strong>
                    <small>
                      {person.guest ? "Convidado" : "Membro"} ·{" "}
                      {skillLabels[person.skill ?? 0]}
                    </small>
                  </span>
                  <Button
                    disabled={pending || closed}
                    onClick={() => act({ type: "arrive", key: person.key })}
                  >
                    Chegou
                  </Button>
                </div>
                {details(person)}
              </article>
            ))}
          {!absent.length && (
            <p className="vc-empty">
              Todos os confirmados já tiveram a chegada registrada.
            </p>
          )}
        </div>
        {!state.started && present.length > 0 && (
          <div className="vc-arrival-list">
            <h3>Já estão no local, por ordem de chegada</h3>
            {present.map((arrival) => (
              <article key={arrival.key}>
                <div className="vc-player-line">
                  <span>
                    <strong>{arrival.name}</strong>
                    <small>Chegada registrada</small>
                  </span>
                  <Button
                    variant="outline"
                    disabled={pending || closed}
                    onClick={() => act({ type: "leave", key: arrival.key })}
                  >
                    Registrar saída
                  </Button>
                </div>
                {byKey.get(arrival.key) && details(byKey.get(arrival.key)!)}
              </article>
            ))}
          </div>
        )}
        {departed.length > 0 && (
          <details className="vc-departed">
            <summary>Já saíram ({departed.length}) · presença mantida</summary>
            {departed.map((arrival) => (
              <div className="vc-player-line" key={arrival.key}>
                <span>
                  <strong>{arrival.name}</strong>
                  <small>A saída não cancela a presença no jogo.</small>
                </span>
                <Button
                  variant="outline"
                  disabled={pending || closed || !byKey.has(arrival.key)}
                  onClick={() => act({ type: "arrive", key: arrival.key })}
                >
                  Voltou
                </Button>
              </div>
            ))}
          </details>
        )}
      </section>
      {state.history.length > 0 && (
        <section className="volley-card vc-section">
          <h2>Últimos rodízios · {state.round} partidas</h2>
          <ol className="vc-history">
            {state.history
              .slice(-10)
              .reverse()
              .map((match) => (
                <li key={match.round}>
                  <strong>
                    Partida {match.round}: Time {teamName(match.winner)} venceu
                    e ficou.
                  </strong>
                  <p>
                    {match.incoming === match.loser
                      ? "Sem outro time na fila; os mesmos times continuam."
                      : `Entrou o Time ${teamName(match.incoming)}. O Time ${teamName(match.loser)} foi para a fila.`}
                  </p>
                  {match.borrowed.length > 0 && (
                    <small>
                      Aproveitados para completar:{" "}
                      {match.borrowed
                        .map(
                          (key) =>
                            byKey.get(key)?.name ??
                            state.arrivals.find((a) => a.key === key)?.name ??
                            "Participante",
                        )
                        .join(", ")}
                      .
                    </small>
                  )}
                </li>
              ))}
          </ol>
        </section>
      )}
    </div>
  );
}
