"use client";
import { useState } from "react";
import {
  deleteEvent,
  setAttendance,
  updateEvent,
} from "@/app/admin/volei-actions";
import {
  buildWhatsAppText,
  type AttendanceStatus,
  type VoleiEvent,
  type VoleiMember,
} from "@/lib/volei/domain";
import { useCopy, useRun } from "./use-run";
import { useRouter } from "next/navigation";
import { defaultDeadline } from "@/lib/volei/phone";
import "./volei.css";
import { NativeSelect } from "@/components/ui/native-select";

type Status = AttendanceStatus | "limpar";

export function EventManager({
  event,
  members,
  attendance,
}: {
  event: VoleiEvent;
  members: VoleiMember[];
  attendance: { member_id: string; status: AttendanceStatus }[];
}) {
  const router = useRouter();
  const { run, pending, feedback } = useRun();
  const { copied, copy } = useCopy();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const statusOf = new Map(attendance.map((a) => [a.member_id, a.status]));
  const confirmedNames = members
    .filter((m) => statusOf.get(m.id) === "confirmado")
    .map((m) => m.name);
  const text = buildWhatsAppText(event, confirmedNames);
  const localInput = (value?: string | null) =>
    value
      ? new Intl.DateTimeFormat("sv-SE", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .format(new Date(value))
          .replace(" ", "T")
      : "";

  return (
    <>
      <section className="volley-hero">
        <span className="volley-eyebrow">COMPARTILHE COM O GRUPO</span>
        <h1>O jogo está marcado.</h1>
        <p>
          Envie o link deste dia para os jogadores acompanharem as vagas e
          confirmarem com nome e celular, sem precisar de um link individual.
        </p>
        <button
          type="button"
          className="sc-btn"
          onClick={() =>
            copy(`${window.location.origin}/volei/jogo/${event.id}`)
          }
        >
          {copied ? "Link copiado" : "Copiar link público do jogo"}
        </button>
      </section>
      <section className="sc-card sc-form-card">
        <h2>Detalhes do dia</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() =>
              updateEvent(event.id, {
                title: f.get("title"),
                start_time: f.get("start_time"),
                location: f.get("location"),
                notes: f.get("notes"),
                closed: f.get("closed") === "on",
                max_teams: Number(f.get("max_teams")),
                registration_deadline: f.get("registration_deadline")
                  ? new Date(
                      `${f.get("registration_deadline")}:00-03:00`,
                    ).toISOString()
                  : null,
                guests_open_at: f.get("guests_open_at")
                  ? new Date(
                      `${f.get("guests_open_at")}:00-03:00`,
                    ).toISOString()
                  : null,
              }),
            );
          }}
        >
          <div className="sc-fields">
            <label>
              Times e capacidade
              <NativeSelect
                name="max_teams"
                defaultValue={String(event.max_teams ?? 3)}
              >
                <option value="3">3 times · 18 vagas</option>
                <option value="4">4 times · 24 vagas (exceção)</option>
              </NativeSelect>
            </label>
            <label>
              Prazo de inscrição (Brasília)
              <input
                type="datetime-local"
                name="registration_deadline"
                required
                defaultValue={localInput(
                  event.registration_deadline || defaultDeadline(event.date),
                )}
              />
            </label>
            <label>
              Liberar convidados a partir de (Brasília)
              <input
                type="datetime-local"
                name="guests_open_at"
                defaultValue={localInput(event.guests_open_at)}
              />
            </label>
            <label>
              Título
              <input
                name="title"
                defaultValue={event.title}
                required
                maxLength={100}
              />
            </label>
            <label>
              Horário
              <input
                name="start_time"
                defaultValue={event.start_time}
                maxLength={20}
              />
            </label>
            <label>
              Local
              <input
                name="location"
                defaultValue={event.location}
                maxLength={120}
              />
            </label>
            <label>
              Observações
              <input name="notes" defaultValue={event.notes} maxLength={500} />
            </label>
          </div>
          <p className="volley-muted">
            O prazo padrão é 18h do dia do jogo. Novas inscrições encerram no
            horário configurado; quem já está na espera pode receber vagas
            depois. Convidados só entram após a liberação, com membros à frente
            na fila.
          </p>
          <label className="sc-check">
            <input
              type="checkbox"
              name="closed"
              defaultChecked={event.closed}
            />
            Fechar confirmações deste dia
          </label>
          <div className="vl-actions">
            <button type="submit" className="sc-btn" disabled={pending}>
              Salvar detalhes
            </button>
            {confirmDelete ? (
              <button
                type="button"
                className="sc-btn sc-btn-danger"
                disabled={pending}
                onClick={() =>
                  run(
                    () => deleteEvent(event.id),
                    () => router.push("/admin/volei"),
                  )
                }
              >
                Confirmar exclusão
              </button>
            ) : (
              <button
                type="button"
                className="sc-btn sc-btn-ghost"
                onClick={() => setConfirmDelete(true)}
              >
                Excluir dia
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="sc-card sc-form-card">
        <div className="vl-row">
          <h2>Lista para o WhatsApp</h2>
          <div className="vl-actions">
            <button
              type="button"
              className="sc-btn"
              onClick={() => copy(text)}
              disabled={confirmedNames.length === 0}
            >
              {copied ? "Copiado ✓" : "Copiar lista"}
            </button>
            <a
              className="sc-button sc-btn-ghost"
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir no WhatsApp
            </a>
          </div>
        </div>
        <pre className="vl-preview">{text}</pre>
      </section>

      <section className="sc-card sc-form-card">
        <h2>Presença ({confirmedNames.length} confirmados)</h2>
        {feedback}
        <table className="sc-table">
          <thead>
            <tr>
              <th>Membro</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {members
              .filter((m) => m.is_active && m.membership_status === "approved")
              .map((m) => (
                <tr key={m.id}>
                  <td data-label="Membro">
                    {m.name}
                    {m.blocked && (
                      <span className="sc-badge sc-badge-danger vl-gap">
                        Bloqueado
                      </span>
                    )}
                  </td>
                  <td data-label="Situação">
                    <select
                      aria-label={`Situação de ${m.name}`}
                      value={statusOf.get(m.id) ?? "limpar"}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          setAttendance(
                            event.id,
                            m.id,
                            e.target.value as Status,
                          ),
                        )
                      }
                    >
                      <option value="limpar">Pendente</option>
                      <option value="reservado" disabled>
                        Vaga reservada
                      </option>
                      <option value="confirmado">Confirmado</option>
                      <option value="espera" disabled>
                        Em espera
                      </option>
                      <option value="ausente">Ausente</option>
                      <option value="nao_vai">Não vai</option>
                    </select>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
