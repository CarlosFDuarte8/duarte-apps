"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { MemberPreferences } from "./member-preferences";
import { PhoneInput } from "./phone-input";
import { displayPhone } from "@/lib/volei/phone";
import { WEEKDAY_LABELS } from "@/lib/volei/frequency";
import "./management.css";
import {
  addMember,
  adjustPoints,
  deleteMember,
  resetMemberDevice,
  saveMemberContact,
  setBlocked,
  updateMember,
  reviewMembership,
} from "@/app/admin/volei-actions";
import type { VoleiMember } from "@/lib/volei/domain";
import type { PointLogRow } from "@/lib/volei/repository";
import { useRun } from "./use-run";
import "./volei.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function MemberCard({
  member,
  log,
}: {
  member: VoleiMember;
  log: PointLogRow[];
}) {
  const { run, pending, feedback } = useRun();
  const [contactName, setContactName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [confirmReset, setConfirmReset] = useState(false);
  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState(1);
  const [blockReason, setBlockReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function apply(sign: 1 | -1) {
    run(
      () => adjustPoints(member.id, sign * Math.abs(delta), reason),
      () => setReason(""),
    );
  }

  return (
    <article
      className={`sc-card vl-member${member.blocked ? " vl-blocked" : ""}`}
    >
      <header className="vl-row">
        <div>
          <h3>
            {member.name}
            {member.is_core && <Badge>Grupo principal</Badge>}
            {member.membership_status === "pending" && (
              <Badge variant="outline">Aprovação pendente</Badge>
            )}
            {member.membership_status === "rejected" && (
              <Badge variant="outline">Cadastro não aprovado</Badge>
            )}
            {!member.is_active && (
              <span className="sc-badge sc-badge-muted vl-gap">Inativo</span>
            )}
            {member.blocked && (
              <span className="sc-badge sc-badge-danger vl-gap">Bloqueado</span>
            )}
          </h3>
          {member.blocked && (
            <p className="vl-reason">Motivo: {member.blocked_reason}</p>
          )}
          <p className="vm-member-summary">
            {member.phone
              ? displayPhone(member.phone)
              : "Telefone não informado"}{" "}
            ·{" "}
            {member.preferred_weekdays?.length
              ? member.preferred_weekdays
                  .map((d) => WEEKDAY_LABELS[d])
                  .join(", ")
              : "Sem dias fixos"}
            {member.preferred_dates?.length
              ? ` · ${member.preferred_dates.length} datas avulsas`
              : ""}
          </p>
        </div>
        <strong className="vl-points" aria-label="Pontos">
          {member.points} pontos manuais
        </strong>
      </header>
      {["pending", "rejected"].includes(
        member.membership_status ?? "approved",
      ) && (
        <div className="vl-actions">
          <Button
            disabled={pending}
            onClick={() => run(() => reviewMembership(member.id, "approved"))}
          >
            Aprovar entrada no grupo
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => reviewMembership(member.id, "rejected"))}
          >
            Não aprovar
          </Button>
        </div>
      )}
      <details className="vm-member-details">
        <summary>Editar cadastro e preferências</summary>
        <div className="vm-member-detail-body">
          <MemberPreferences member={member} />

          <div className="vl-actions">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() =>
                  updateMember(member.id, {
                    name: member.name,
                    is_active: !member.is_active,
                  }),
                )
              }
            >
              {member.is_active ? "Desativar" : "Reativar"}
            </Button>
          </div>

          <form
            className="vl-box"
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                saveMemberContact(member.id, { name: contactName, phone }),
              );
            }}
          >
            <div className="sc-fields">
              <label>
                Nome
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Celular com DDD
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  maxLength={22}
                  placeholder="(61) 99999-9999"
                />
              </label>
            </div>
            <p className="volley-muted">
              O telefone identifica o membro e não aparece para o grupo.
              Alterá-lo libera o cadastro para um novo acesso.
            </p>
            <Button variant="outline" disabled={pending}>
              Salvar contato
            </Button>
          </form>

          <fieldset className="vl-box">
            <legend>Pontos</legend>
            <div className="vl-inline">
              <Input
                type="number"
                min={1}
                max={100}
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                aria-label="Quantidade de pontos"
              />
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo (obrigatório)"
                maxLength={200}
                aria-label="Motivo dos pontos"
              />
              <Button
                type="button"

                disabled={pending}
                onClick={() => apply(1)}
              >
                + Dar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => apply(-1)}
              >
                − Tirar
              </Button>
            </div>
            {log.length > 0 && (
              <details>
                <summary>Histórico recente</summary>
                <ul className="vl-log">
                  {log.map((l) => (
                    <li key={l.id}>
                      <strong className={l.delta > 0 ? "vl-pos" : "vl-neg"}>
                        {l.delta > 0 ? `+${l.delta}` : l.delta}
                      </strong>{" "}
                      {l.reason}{" "}
                      <small>({dateTime.format(new Date(l.created_at))})</small>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </fieldset>

          <fieldset className="vl-box">
            <legend>Bloqueio</legend>
            {member.blocked ? (
              <Button
                type="button"

                disabled={pending}
                onClick={() => run(() => setBlocked(member.id, false, ""))}
              >
                Desbloquear
              </Button>
            ) : (
              <div className="vl-inline">
                <Input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Motivo do bloqueio (obrigatório)"
                  maxLength={200}
                  aria-label="Motivo do bloqueio"
                />
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => setBlocked(member.id, true, blockReason),
                      () => setBlockReason(""),
                    )
                  }
                >
                  Bloquear
                </Button>
              </div>
            )}
          </fieldset>

          {feedback}

          <div className="vl-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                confirmReset
                  ? run(
                      () => resetMemberDevice(member.id),
                      () => setConfirmReset(false),
                    )
                  : setConfirmReset(true)
              }
            >
              {confirmReset
                ? "Confirmar liberação de acesso"
                : "Liberar acesso em outro aparelho"}
            </Button>
            {confirmReset && (
              <>
                <p className="volley-muted">
                  Confirme a identidade do membro antes de liberar. O próximo
                  acesso com este telefone poderá gerenciar sua inscrição.
                </p>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setConfirmReset(false)}
                >
                  Voltar
                </Button>
              </>
            )}
            {confirmDelete ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => deleteMember(member.id))}
              >
                Confirmar exclusão
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
              >
                Excluir membro
              </Button>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}

export function MemberManager({
  members,
  logs,
}: {
  members: VoleiMember[];
  logs: Record<string, PointLogRow[]>;
}) {
  const { run, pending, feedback } = useRun();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("todos");
  const [day, setDay] = useState("");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = members
    .filter(
      (m) =>
        (normalize(m.name).includes(normalize(search)) ||
          (m.phone ?? "").includes(search)) &&
        (group === "todos" ||
          (group === "pending"
            ? m.membership_status === "pending"
            : group === "principal"
              ? m.is_core
              : group === "ativos"
                ? m.is_active && m.membership_status === "approved"
                : !m.is_active)) &&
        (!day || m.preferred_weekdays?.includes(Number(day))),
    )
    .sort(
      (a, b) =>
        Number(b.membership_status === "pending") -
          Number(a.membership_status === "pending") ||
        Number(!!b.is_core) - Number(!!a.is_core) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  return (
    <>
      <div className="vm-metrics">
        <div>
          <strong>
            {
              members.filter(
                (m) => m.is_active && m.membership_status === "approved",
              ).length
            }
          </strong>
          <span>Membros ativos</span>
        </div>
        <div>
          <strong>{members.filter((m) => m.is_core).length}</strong>
          <span>Grupo principal</span>
        </div>
        <div>
          <strong>
            {
              members.filter(
                (m) =>
                  m.preferred_weekdays?.length || m.preferred_dates?.length,
              ).length
            }
          </strong>
          <span>Com preferências</span>
        </div>
      </div>
      <form
        className="sc-card sc-form-card"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addMember(name, phone),
            () => {
              setName("");
              setPhone("");
            },
          );
        }}
      >
        <h2>Novo membro</h2>
        <div className="vl-inline">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
            maxLength={100}
            aria-label="Nome do membro"
            required
          />
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="Celular com DDD (opcional)"
            aria-label="Celular do membro"
            maxLength={22}
          />
          <Button type="submit" disabled={pending}>
            + Adicionar
          </Button>
        </div>
        {feedback}
      </form>
      <section className="volley-card vm-filters">
        <label>
          Buscar membro
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome ou telefone"
            type="search"
          />
        </label>
        <label>
          Grupo
          <NativeSelect
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="todos">Todos os membros</option>
            <option value="pending">Cadastros pendentes</option>
            <option value="principal">Grupo principal</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </NativeSelect>
        </label>
        <label>
          Dia fixo preferido
          <NativeSelect value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">Qualquer dia</option>
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={String(i)}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
      </section>
      <p className="vm-hint">
        {filtered.length} de {members.length} membros · Solicitações pendentes
        primeiro. Preferências definem os dias de reserva automática do grupo
        principal.
      </p>
      <div className="vl-members">
        {filtered.map((m) => (
          <MemberCard key={m.id} member={m} log={logs[m.id] ?? []} />
        ))}
        {filtered.length === 0 && <p>Nenhum membro encontrado.</p>}
      </div>
    </>
  );
}
