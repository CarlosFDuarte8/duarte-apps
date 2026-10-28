"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Minus,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  elapsedCourtMs,
  formatCourtTime,
  type CourtState,
  type CourtAction,
} from "@/lib/volei/court";
export function CourtScoreboard({
  state,
  pending,
  closed,
  act,
}: {
  state: CourtState;
  pending: boolean;
  closed: boolean;
  act: (a: CourtAction) => void;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const disabled =
    pending || closed || state.playing.some((i) => !state.teams[i].length);
  const [a, b] = state.playing;
  const scores = state.live?.scores ?? [0, 0, 0, 0];
  const winner = scores[a] === scores[b] ? null : scores[a] > scores[b] ? a : b;
  const running = !!state.live?.startedAt;
  const elapsed = elapsedCourtMs(
    state.live,
    now || (state.live?.startedAt ? Date.parse(state.live.startedAt) : 0),
  );
  return (
    <section className="vc-scoreboard" aria-label="Placar da partida">
      <div className="vc-score-caption">
        <span>
          <i aria-hidden="true" /> PARTIDA {state.round + 1}
        </span>
        <span>{running ? "EM JOGO" : "CRONÔMETRO PAUSADO"}</span>
      </div>
      <div className="vc-score-teams">
        {state.playing.map((team) => (
          <article className={`vc-score-side vc-score-side-${team}`} key={team}>
            <h2>
              <span>{String.fromCharCode(65 + team)}</span>Time{" "}
              {String.fromCharCode(65 + team)}
            </h2>
            <Button
              className="vc-score-digit"
              disabled={disabled || scores[team] >= 999}
              aria-label={`Adicionar ponto ao Time ${String.fromCharCode(65 + team)}`}
              onClick={() => act({ type: "point", team, delta: 1 })}
            >
              <strong>{String(scores[team]).padStart(2, "0")}</strong>
              <span>
                <Plus aria-hidden="true" /> PONTO
              </span>
            </Button>
            <Button
              variant="ghost"
              className="vc-score-minus"
              disabled={disabled || !scores[team]}
              aria-label={`Retirar ponto do Time ${String.fromCharCode(65 + team)}`}
              onClick={() => act({ type: "point", team, delta: -1 })}
            >
              <Minus aria-hidden="true" /> Corrigir
            </Button>
          </article>
        ))}
      </div>
      <div className="vc-score-clock">
        <div>
          <span>
            <Timer size={16} aria-hidden="true" />
            TEMPO DE JOGO
          </span>
          <output aria-label="Tempo da partida" role="timer">
            {formatCourtTime(elapsed)}
          </output>
        </div>
        <div className="vc-clock-actions">
          <Button
            disabled={disabled}
            onClick={() =>
              act({ type: "clock", command: running ? "pause" : "start" })
            }
          >
            {running ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
            {running ? "Pausar" : elapsed > 0 ? "Continuar" : "Iniciar"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={disabled || (!elapsed && !running)}
                aria-label="Zerar cronômetro"
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Zerar o cronômetro?</AlertDialogTitle>
                <AlertDialogDescription>
                  O tempo desta partida volta a zero e fica pausado. O placar
                  será mantido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => act({ type: "clock", command: "reset" })}
                >
                  Zerar tempo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="vc-score-finish"
            disabled={disabled || winner === null}
          >
            <Trophy aria-hidden="true" />
            Encerrar partida
            {winner !== null
              ? ` · Time ${String.fromCharCode(65 + winner)} venceu`
              : ""}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Encerrar com {scores[a]} × {scores[b]}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vitória do Time{" "}
              {winner === null ? "" : String.fromCharCode(65 + winner)}. O
              placar e o tempo serão salvos no histórico. O vencedor fica e o
              próximo time entra com placar e cronômetro zerados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conferir placar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (winner !== null) act({ type: "winner", team: winner });
              }}
            >
              Confirmar resultado e rodízio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {winner === null && (
        <p className="vc-score-hint">
          Toque no placar para marcar os pontos. Desempate antes de encerrar.
        </p>
      )}
    </section>
  );
}
