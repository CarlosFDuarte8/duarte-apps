"use client";
import { useMemo, useState } from "react";
import type { publicEvent } from "@/lib/volei/repository";
import { VolleyIcon } from "./volley-icon";
import "./game.css";
import { eventCapacity, eventFreeSlots } from "@/lib/volei/domain";
type Game = NonNullable<Awaited<ReturnType<typeof publicEvent>>>;
export function GameRoster({
  game,
  updatedAt,
}: {
  game: Game;
  updatedAt: string;
}) {
  const [tab, setTab] = useState<"confirmed" | "waiting" | "guests">(
    "confirmed",
  );
  const { capacity, reserved, confirmed, waiting, guests } = useMemo(() => {
    const capacity = eventCapacity(game.event);
    const reserved = game.attendance.filter(
      (p) => p.status === "reservado",
    ).length;
    const confirmed = [
      ...game.attendance
        .filter((p) => p.status === "confirmado")
        .map((p) => ({
          id: p.member_id,
          name: p.name,
          guest: false,
          at: p.registered_at,
        })),
      ...game.guests
        .filter((p) => p.status === "confirmado")
        .map((p) => ({
          id: p.id,
          name: p.name,
          guest: true,
          at: p.registered_at,
        })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const waiting = game.attendance
      .filter((p) => p.status === "espera")
      .map((p) => ({
        id: p.member_id,
        name: p.name,
        guest: false,
        at: p.registered_at,
      }));
    const guests = [...game.guests]
      .filter((p) => p.status === "espera")
      .sort(
        (a, b) =>
          a.registered_at.localeCompare(b.registered_at) ||
          a.queue_order - b.queue_order,
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        guest: true,
        at: p.registered_at,
      }));
    return { capacity, reserved, confirmed, waiting, guests };
  }, [game]);
  const selected =
    tab === "confirmed" ? confirmed : tab === "waiting" ? waiting : guests;
  return (
    <section className="volley-card game-roster" id="lista-do-dia">
      <header className="game-roster-heading">
        <div>
          <span className="game-kicker">PARTICIPANTES DO ENCONTRO</span>
          <h2>Quem vem para o jogo</h2>
        </div>
        <span className="game-live">
          <span />
          Atualização a cada 30 s
        </span>
      </header>
      <div className="game-capacity">
        <div>
          <strong>
            {confirmed.length}
            <span> / {capacity} jogadores</span>
          </strong>
          <span>
            {eventFreeSlots(game.event, confirmed.length, reserved)} vagas
            livres
          </span>
        </div>
        <progress
          max={capacity}
          value={confirmed.length}
          aria-label={`${confirmed.length} de ${capacity} vagas ocupadas`}
        />
        <small>
          {game.event.max_teams ?? 3} times de 6 · {capacity} jogadores
          {reserved > 0 &&
            ` · ${reserved} ${reserved === 1 ? "vaga reservada" : "vagas reservadas"}`}
        </small>
        <p className="game-update-time">
          Última atualização:{" "}
          <time dateTime={updatedAt}>
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(new Date(updatedAt))}
          </time>
        </p>
      </div>
      <div
        className="game-roster-filters"
        role="group"
        aria-label="Exibir lista"
      >
        {(
          [
            ["confirmed", "Confirmados", confirmed.length],
            ["waiting", "Espera", waiting.length],
            ["guests", "Convidados", guests.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
            <span>{count}</span>
          </button>
        ))}
      </div>
      {tab === "guests" && (
        <div className="game-notice is-warning">
          <VolleyIcon name="users" />
          <p>
            <strong>Uma chance de entrar na quadra.</strong> Membros têm
            prioridade.{" "}
            {game.event.guests_open_at
              ? `A liberação de convidados começa em ${new Date(game.event.guests_open_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}, conforme as vagas livres.`
              : "Os convidados aguardam liberação pelo responsável."}
          </p>
        </div>
      )}
      {tab === "waiting" && (
        <p className="game-description">
          A lista é atualizada automaticamente quando uma vaga é liberada.
        </p>
      )}
      <div className="game-roster-content" aria-live="polite">
        {selected.length ? (
          <ol className="game-player-list">
            {selected.map((person, i) => (
              <li key={person.id}>
                <span className="game-player-position">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="game-player-avatar">
                  {person.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <strong>{person.name}</strong>
                  <small>
                    {person.guest
                      ? "Convidado"
                      : tab === "confirmed"
                        ? "Membro confirmado"
                        : "Aguardando uma vaga"}
                  </small>
                </div>
                <span
                  className={`game-player-mark ${tab !== "confirmed" ? "is-waiting" : ""}`}
                >
                  <VolleyIcon name={tab === "confirmed" ? "check" : "clock"} />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="game-empty">
            <span className="game-empty-icon">
              <VolleyIcon name={tab === "confirmed" ? "ball" : "users"} />
            </span>
            <h3>
              {tab === "confirmed"
                ? "A primeira vaga pode ser sua"
                : tab === "waiting"
                  ? "Ninguém na espera por enquanto"
                  : "Nenhum convidado aguardando"}
            </h3>
            <p>
              {tab === "confirmed"
                ? "Confirme sua presença e comece a montar esse jogo."
                : "Quando alguém entrar na fila, aparecerá aqui."}
            </p>
          </div>
        )}
      </div>
      <footer className="game-roster-footer">
        <VolleyIcon name="shield" />A lista pública mostra apenas nomes.
        Telefones ficam privados.
      </footer>
    </section>
  );
}
