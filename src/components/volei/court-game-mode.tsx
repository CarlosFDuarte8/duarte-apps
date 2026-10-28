"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { LogOut, X } from "lucide-react";
import { CourtScoreboard } from "./court-scoreboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type {
  CourtState,
  CourtRosterPerson,
  CourtAction,
} from "@/lib/volei/court";
export function CourtGameMode({
  eventId,
  state,
  roster,
  pending,
  closed,
  feedback,
  act,
  onExit,
}: {
  eventId: string;
  state: CourtState;
  roster: CourtRosterPerson[];
  pending: boolean;
  closed: boolean;
  feedback: ReactNode;
  act: (action: CourtAction) => void;
  onExit: () => void;
}) {
  const [tab, setTab] = useState<"quadra" | "chegadas" | "saidas">("quadra");
  const [search, setSearch] = useState("");
  const people = new Map(roster.map((p) => [p.key, p]));
  const active = state.arrivals.filter((p) => !p.departedAt);
  const next = state.waiting.find((i) => state.teams[i].length);
  const last = state.history.at(-1);
  const name = (key: string) =>
    people.get(key)?.name ??
    state.arrivals.find((p) => p.key === key)?.name ??
    "Participante";
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const visible = (
    tab === "saidas"
      ? active.map((p) => p.key)
      : roster
          .filter(
            (p) =>
              !state.arrivals.some((a) => a.key === p.key && !a.departedAt),
          )
          .map((p) => p.key)
  ).filter((key) => normalize(name(key)).includes(normalize(search)));
  function player(key: string, action?: "arrive" | "leave", label?: string) {
    return (
      <li key={key}>
        <PersonAvatar name={name(key)} photoUrl={people.get(key)?.photo_url} />
        <strong>{name(key)}</strong>
        {action && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={pending || closed}
                variant={action === "leave" ? "outline" : "default"}
                aria-label={`${label}: ${name(key)}`}
              >
                {action === "leave" && <LogOut aria-hidden="true" />}
                {label}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {label}: {name(key)}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {action === "leave"
                    ? "A presença será mantida. A vaga na quadra será ajustada com quem está aguardando."
                    : "A chegada será registrada na frequência e o participante entrará na organização dos times."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => act({ type: action, key })}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </li>
    );
  }
  return (
    <section className="vc-game" aria-label="Modo jogo" aria-busy={pending}>
      <header className="vc-game-header">
        <div>
          <small>QUADRA · AO VIVO</small>
          <h2>Modo jogo</h2>
        </div>
        <Button variant="outline" onClick={onExit}>
          <X aria-hidden="true" /> Sair
        </Button>
      </header>
      {feedback}
      {closed && (
        <p className="vc-notice">
          Somente consulta. Este jogo está encerrado ou ainda não chegou o dia.
        </p>
      )}
      <nav className="vc-game-tabs" aria-label="Ações do modo jogo">
        {(
          [
            ["quadra", "Na quadra"],
            ["chegadas", "Chegadas"],
            ["saidas", "Saídas"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "outline"}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setSearch("");
            }}
          >
            {label}
          </Button>
        ))}
      </nav>
      {tab === "quadra" ? (
        <>
          {!state.started ? (
            <div className="vc-empty">
              <h3>Vamos começar?</h3>
              <p>
                Registre as chegadas e sorteie os times com quem está no local.
              </p>
              <Button
                disabled={pending || closed || active.length < 2}
                onClick={() => act({ type: "shuffle" })}
              >
                Sortear times equilibrados
              </Button>
            </div>
          ) : (
            <>
              <CourtScoreboard
                state={state}
                pending={pending}
                closed={closed}
                act={act}
              />
              <div className="vc-game-match vc-live-lineups">
                {state.playing.map((i) => (
                  <article key={i} className="vc-game-team">
                    <h3>
                      Time {String.fromCharCode(65 + i)}{" "}
                      <small>{state.teams[i].length}/6</small>
                    </h3>
                    <ul>{state.teams[i].map((key) => player(key))}</ul>
                  </article>
                ))}
              </div>
              <aside className="vc-game-next">
                <h3>
                  {next === undefined
                    ? "Sem time aguardando"
                    : `Próximo: Time ${String.fromCharCode(65 + next)}`}
                </h3>
                {next !== undefined && (
                  <>
                    <p>
                      {state.teams[next].length}/6 jogadores
                      {state.teams[next].length < 6
                        ? " · Completa com jogadores do perdedor, alternando quem continua."
                        : ""}
                    </p>
                    <details className="vc-game-lineup">
                      <summary>Ver jogadores do próximo time</summary>
                      <ul>{state.teams[next].map((key) => player(key))}</ul>
                    </details>
                  </>
                )}
                <p>
                  Fila:{" "}
                  {state.waiting
                    .filter((i) => state.teams[i].length)
                    .map((i) => `Time ${String.fromCharCode(65 + i)}`)
                    .join(" → ") || "Sem espera"}
                </p>
              </aside>
              {last && (
                <div className="vc-notice" role="status">
                  Última partida: Time {String.fromCharCode(65 + last.winner)}{" "}
                  venceu.
                  {last.borrowed.length > 0 && (
                    <p>
                      Entraram para completar:{" "}
                      {last.borrowed.map(name).join(", ")}.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="vc-game-people">
          <label>
            Buscar participante
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o nome"
            />
          </label>
          <ul>
            {visible.map((key) =>
              player(
                key,
                tab === "saidas" ? "leave" : "arrive",
                tab === "saidas"
                  ? "Registrar saída"
                  : state.arrivals.some((p) => p.key === key)
                    ? "Voltou"
                    : "Chegou",
              ),
            )}
          </ul>
          {!visible.length && (
            <p className="vc-empty">
              {search
                ? "Nenhum participante encontrado para essa busca."
                : tab === "saidas"
                  ? "Nenhum participante no local para registrar saída."
                  : "Todos os confirmados já estão no local."}
            </p>
          )}
          <p>As saídas mantêm a presença registrada na frequência.</p>
        </div>
      )}
      <Button asChild variant="outline">
        <Link href={`/admin/volei/${eventId}/historico`}>
          Ver histórico das partidas
        </Link>
      </Button>
    </section>
  );
}
