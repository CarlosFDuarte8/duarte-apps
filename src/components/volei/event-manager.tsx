"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { VolleyCard, VolleySectionHeader } from "@/components/volei/page-frame";

import { participationTime } from "@/lib/volei/participation-time";
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
import { buildGateList } from "@/lib/volei/gate-list";
import { ageLabel, ageOn } from "@/lib/volei/profile";
import { EventLinkSettings } from "./event-link-settings";
import { VolleyListFilters } from "./list-filters";
import { matchesName } from "@/lib/volei/list-search";

type Status = AttendanceStatus | "limpar";

export function EventManager({
  event,
  members,
  attendance,
  guests,
}: {
  event: VoleiEvent;
  members: VoleiMember[];
  attendance: {
    member_id: string;
    status: AttendanceStatus;
    registered_at?: string;
    confirmed_at?: string | null;
  }[];
  guests: {
    id: string;
    member_id: string;
    name: string;
    status: AttendanceStatus;
  }[];
}) {
  const router = useRouter();
  const { run, pending, feedback } = useRun({ revalidated: true });
  const { copied, copy } = useCopy();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState("");
  const availableMembers = members.filter(member => member.is_active && member.membership_status === "approved");
  const visibleMembers = availableMembers.filter(member => matchesName(member.name, search));
  const statusOf = new Map(attendance.map((a) => [a.member_id, a.status]));
  const confirmedNames = members
    .filter((m) => statusOf.get(m.id) === "confirmado")
    .map((m) => m.name);
  const confirmedGuests = buildGateList(members, [], guests);
  const text = buildWhatsAppText(event, confirmedNames, confirmedGuests);
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
      <VolleyCard as="section">
        <VolleySectionHeader
          eyebrow="COMPARTILHE COM O GRUPO"
          title="O jogo está marcado."
          description="Envie o link deste dia para os jogadores acompanharem as vagas e confirmarem com nome e celular, sem precisar de um link individual."
          actions={
            <Button
              type="button"
              onClick={() => copy(`${window.location.origin}/volei/jogo/${event.id}`)}
            >
              {copied ? "Link copiado" : "Copiar link público do jogo"}
            </Button>
          }
        />
      </VolleyCard>
      <VolleyCard as="section" className="sc-form-card">
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
                calendar_enabled: f.get("calendar_enabled") === "on",
                directions_enabled: f.get("directions_enabled") === "on",
                directions_url: f.get("directions_url"),
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
              <Input
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
              <Input
                type="datetime-local"
                name="guests_open_at"
                defaultValue={localInput(event.guests_open_at)}
              />
            </label>
            <label>
              Título
              <Input
                name="title"
                defaultValue={event.title}
                required
                maxLength={100}
              />
            </label>
            <label>
              Horário
              <Input
                name="start_time"
                defaultValue={event.start_time}
                maxLength={20}
              />
            </label>
            <label>
              Local
              <Input
                name="location"
                defaultValue={event.location}
                maxLength={120}
              />
            </label>
            <label>
              Observações
              <Input name="notes" defaultValue={event.notes} maxLength={500} />
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
          <EventLinkSettings event={event} pending={pending} />
          <div className="vl-actions">
            <Button type="submit" className="sc-btn" disabled={pending}>
              Salvar detalhes
            </Button>
            {confirmDelete ? (
              <Button
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
              </Button>
            ) : (
              <Button
                type="button"
                className="sc-btn sc-btn-ghost"
                onClick={() => setConfirmDelete(true)}
              >
                Excluir dia
              </Button>
            )}
          </div>
        </form>
      </VolleyCard>

      <VolleyCard as="section" className="sc-form-card">
        <div className="vl-row">
          <h2>Lista para o WhatsApp</h2>
          <div className="vl-actions">
            <Button
              type="button"
              className="sc-btn"
              onClick={() => copy(text)}
              disabled={confirmedNames.length + confirmedGuests.length === 0}
            >
              {copied ? "Copiado ✓" : "Copiar lista"}
            </Button>
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
      </VolleyCard>

      <VolleyCard as="section" className="sc-form-card">
        <h2>Presença ({confirmedNames.length} confirmados)</h2>
        <p className="volley-muted">O administrador pode confirmar ou incluir membros após o prazo e com as inscrições fechadas, até a conclusão da chamada. A capacidade e a ordem da fila continuam valendo. Para novas inclusões, use Adicionar participante.</p>
        {feedback}
        <VolleyListFilters search={search} onSearch={setSearch} searchLabel="Buscar membro nesta lista" shown={visibleMembers.length} total={availableMembers.length} active={!!search} onClear={() => setSearch("")} />
        <table className="sc-table vl-attendance-table">
          <thead>
            <tr>
              <th>Membro</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {visibleMembers
              .map((m) => {
                const record = attendance.find((row) => row.member_id === m.id);
                const time = record
                  ? participationTime(
                      record.status,
                      record.registered_at,
                      record.confirmed_at,
                    )
                  : null;
                return (
                  <tr key={m.id}>
                    <td data-label="Membro">
                      {m.name}
                      <small className="vl-participation-detail">
                        {ageOn(m.birth_date) !== null && ageOn(m.birth_date)! < 18
                          ? <strong>{ageLabel(m.birth_date)}</strong>
                          : ageLabel(m.birth_date)}
                      </small>
                      {!!m.student_weekdays?.length && (
                        <small className="vl-participation-detail">
                          {record?.status === "confirmado"
                            ? "Aluno confirmado"
                            : "Aluno"}
                        </small>
                      )}
                      {time && (
                        <small className="vl-participation-detail">
                          <time dateTime={time.dateTime}>{time.label}</time>
                        </small>
                      )}
                      {m.blocked && (
                        <span className="sc-badge sc-badge-danger vl-gap">
                          Bloqueado
                        </span>
                      )}
                    </td>
                    <td data-label="Situação">
                      <NativeSelect
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
                        <option value="confirmado" disabled={!!event.presence_closed_at}>Confirmado</option>
                        <option value="espera" disabled>
                          Em espera
                        </option>
                        <option value="ausente">Ausente</option>
                        <option value="nao_vai">Não vai</option>
                      </NativeSelect>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!visibleMembers.length && <p>Nenhum membro encontrado nesta lista.</p>}
      </VolleyCard>
    </>
  );
}
