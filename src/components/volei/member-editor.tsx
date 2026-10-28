"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberPreferences } from "./member-preferences";
import { PhoneInput } from "./phone-input";
import { displayPhone } from "@/lib/volei/phone";
import { ProfileForm } from "./profile-form";
import { SkillLevelForm } from "./skill-level-form";
import { PersonAvatar } from "./person-avatar";
import { saveAdminMemberProfile } from "@/app/admin/volei-profile-actions";
import { today } from "@/lib/volei/domain";
import { ageLabel } from "@/lib/volei/profile";
import { WEEKDAY_LABELS } from "@/lib/volei/frequency";
import "./management.css";
import "./members.css";
import {
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

export function MemberEditor({
  member,
  log,
}: {
  member: VoleiMember;
  log: PointLogRow[];
}) {
  const { run, pending, feedback } = useRun();
  const router = useRouter();
  const [contactName, setContactName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [contactSaved, setContactSaved] = useState(false);
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
        <PersonAvatar name={member.name} photoUrl={member.photo_url} />
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
            {ageLabel(member.birth_date)} ·{" "}
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
      {feedback}
      <section className="vm-member-editor-sections">
        <div className="vm-member-detail-body">
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
              setContactSaved(false);
              run(
                () =>
                  saveMemberContact(member.id, { name: contactName, phone }),
                () => setContactSaved(true),
              );
            }}
          >
            <h2 className="vm-editor-heading">Dados do membro</h2>
            <div className="sc-fields">
              <label>
                Nome
                <Input
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    setContactSaved(false);
                  }}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Celular com DDD
                <PhoneInput
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    setContactSaved(false);
                  }}
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
              {pending ? "Salvando…" : "Salvar contato"}
            </Button>
            {contactSaved && (
              <p className="vm-success" role="status">
                Contato atualizado.
              </p>
            )}
          </form>

          <section className="vl-box">
            <h2 className="vm-editor-heading">Foto e nascimento</h2>
            <ProfileForm
              emergency={member}
              name={member.name}
              birthDate={member.birth_date}
              photoUrl={member.photo_url}
              maxDate={today()}
              save={saveAdminMemberProfile.bind(null, member.id)}
            />
          </section>

          <MemberPreferences member={member} />
          <SkillLevelForm id={member.id} level={member.skill_level} />

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
                onClick={() =>
                  run(
                    () => deleteMember(member.id),
                    () => router.replace("/admin/volei/membros"),
                  )
                }
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
      </section>
    </article>
  );
}
