"use client";
import { VolleyCard, VolleySectionHeader } from "@/components/volei/page-frame";

import { ParticipationFields } from "./participation-fields";
import { ParticipationReview } from "./participation-review";
import type { EnrollmentDraft, ParticipationProfile } from "@/lib/volei/students";
import type { AdmissionWindow } from "@/lib/volei/admission";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  registerForGame,
  manageGame,
} from "@/app/volei/jogo/[id]/actions";
import { identifyByPhone } from "@/app/volei/access-actions";
import { attendanceLabels, displayPhone } from "@/lib/volei/phone";
import type { AttendanceStatus } from "@/lib/volei/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VolleyIcon } from "./volley-icon";
import { PhoneField } from "./phone-input";
import { useCopy, useRun } from "./use-run";
import { QueuePosition } from "./queue-position";
export type MyGame = {
  name: string;
  phone: string;
  blocked: boolean;
  active: boolean;
  membershipStatus: "approved" | "pending" | "rejected";
  profile: ParticipationProfile;
  canReport?: boolean;
  status?: AttendanceStatus;
  queuePosition?: number | null;
  guest?: { name: string; status: AttendanceStatus; profileToken?: string; queuePosition?: number | null };
};
export function GameResponse({
  eventId,
  open,
  mine,
  free,
  finished = false,
  admission,
  eventDate,
}: {
  eventId: string;
  open: boolean;
  mine: MyGame | null;
  free: number;
  finished?: boolean;
  admission: AdmissionWindow;
  eventDate: string;
}) {
  const [phone, setPhone] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentDraft>({ isStudent: null, days: [], classTime: "" });
  const [ready, setReady] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [register, setRegister] = useState(false);
  const [guest, setGuest] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const { copy, copied } = useCopy();
  const { run: execute, pending, success, feedback } = useRun({ revalidated: true, successMessage: "" });
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const participating =
    mine?.status === "confirmado" || mine?.status === "espera";
  const approved = mine?.membershipStatus === "approved";
  const canJoin = open && admission.open && approved && mine?.active && !mine.blocked;
  const activeGuest =
    mine?.guest &&
    (mine.guest.status === "confirmado" || mine.guest.status === "espera");
  function run(action: () => Promise<{ error: string }>, success: string) {
    execute(action, () => dialog.current?.close(), mine ? "Atualizando sua participação…" : "Enviando cadastro para aprovação…", success);
  }
  return (
    <VolleyCard as="section" className="game-signup" id="minha-presenca">
      <VolleySectionHeader eyebrow="SUA PARTICIPAÇÃO" title={participating ? "Você está na lista!" : "Entre com seu celular"} icon={<VolleyIcon name={participating ? "check" : "phone"} />} />
      {mine ? (
        <>
          <div className="game-identity">
            <span className="game-avatar">
              {mine.name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>{mine.name}</strong>
              <span>
                <VolleyIcon name="phone" />
                {displayPhone(mine.phone)}
              </span>
            </div>
            <span className="game-device-badge">
              <VolleyIcon name="shield" />
              Seu acesso
            </span>
          </div>
          <Button asChild variant="outline">
            <Link href="/volei/meu-cadastro">
              Meu cadastro · foto e nascimento
            </Link>
          </Button>
          {mine.canReport && (
            <Button asChild variant="ghost">
              <Link href="/volei/relatar">
                Relatar uma situação ao responsável
              </Link>
            </Button>
          )}
          {!approved ? (
            <div className="game-notice is-warning">
              <VolleyIcon name="clock" />
              <div>
                <strong>
                  {mine.membershipStatus === "pending"
                    ? "Cadastro aguardando aprovação"
                    : "Cadastro não aprovado"}
                </strong>
                <p>
                  {mine.membershipStatus === "pending"
                    ? "O responsável precisa aprovar sua entrada no grupo antes de você confirmar presença. Volte por este mesmo navegador para acompanhar."
                    : "Fale com o responsável pelo grupo para verificar seu cadastro."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.refresh()}
                >
                  Atualizar situação
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`game-personal-status ${mine.status === "espera" ? "is-waiting" : ""}`}
              >
                <span className="game-status-dot" />
                <div>
                  <strong>
                    {mine.status
                      ? attendanceLabels[mine.status]
                      : "Pronto para o próximo jogo"}
                  </strong>
                  <p>
                    {mine.status === "confirmado"
                      ? "Sua vaga está garantida. Seu nome está na lista da portaria."
                      : mine.status === "espera"
                        ? "Acompanhe sua posição abaixo. A promoção depende das vagas e das regras da fila."
                        : "Confirme abaixo para participar deste encontro."}
                  </p>
                </div>
              </div>
              {mine.status === "espera" && <QueuePosition position={mine.queuePosition} />}
              {(!mine.active || mine.blocked) && (
                <p className="game-notice is-warning">
                  Seu cadastro está indisponível para novas inscrições. Fale com
                  o responsável.
                </p>
              )}
              {!participating && admission.state !== "open" && <p role="status" className="game-notice">{admission.message}</p>}
              {profileSaved && <p role="status" className="volley-muted">Dados do cadastro atualizados.</p>}
              {!mine.profile.reviewed ? <ParticipationReview eventId={eventId} eventDate={eventDate} profile={mine.profile} participating={participating} waiting={mine.status === "espera"} onSaved={() => setProfileSaved(true)} disabled={pending || !open || finished || !mine.active || mine.blocked} /> : !participating && (
                <form
                  className="game-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      () => manageGame({
                        eventId,
                        action: "join",
                      }),
                      "Participação registrada.",
                    );
                  }}
                >
                  <Button type="submit" className="game-primary" disabled={pending || !canJoin}>
                    <VolleyIcon name="check" />
                    {admission.state === "scheduled" ? "Aguardando abertura das inscrições" : free ? "Confirmar minha presença" : "Entrar na lista de espera"}
                  </Button>
                </form>
              )}
              {participating && (
                <>
                  <div className="game-divider" />
                  <div className="game-guest-heading">
                    <h3>Seu convidado</h3>
                    <span>1 por membro</span>
                  </div>
                  {activeGuest ? (
                    <div className="game-guest-entry">
                      <div>
                        <strong>{mine.guest!.name}</strong>
                        <span>
                          {mine.guest!.status === "confirmado"
                            ? "Confirmado · consta na portaria"
                            : "Aguardando vaga · membros têm prioridade"}
                        </span>
                        {mine.guest!.status === "espera" && <QueuePosition position={mine.guest!.queuePosition} guest />}
                      </div>
                      <Button
                        variant="ghost"
                        disabled={pending || finished}
                        onClick={() =>
                          run(
                            () =>
                              manageGame({ eventId, action: "guest_cancel" }),
                            "Convidado cancelado.",
                          )
                        }
                      >
                        Remover
                      </Button>
                      {mine.guest!.profileToken && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            copy(
                              new URL(
                                `/volei/convidado/${mine.guest!.profileToken}`,
                                window.location.origin,
                              ).href,
                            )
                          }
                        >
                          {copied
                            ? "Link copiado!"
                            : "Copiar link do convidado"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <form
                      className="game-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(
                          () =>
                            manageGame({
                              eventId,
                              action: "guest_join",
                              guest,
                              guestPhone,
                            }),
                          "Convidado incluído na espera.",
                        );
                      }}
                    >
                      <div className="game-notice is-warning">
                        <VolleyIcon name="users" />
                        <p>
                          <strong>Membros têm prioridade.</strong> O convidado
                          aguarda liberação e só poderá entrar se estiver
                          confirmado na lista do dia.
                        </p>
                      </div>
                      <label>
                        Nome do convidado
                        <Input
                          value={guest}
                          onChange={(e) => setGuest(e.target.value)}
                          required
                          minLength={2}
                          maxLength={100}
                          placeholder="Nome e sobrenome"
                        />
                      </label>
                      <div>
                        <PhoneField label="Telefone do convidado"
                          value={guestPhone}
                          onChange={setGuestPhone}
                          required
                        />
                        <small>
                          Identifica o convidado e fica privado. Após incluir,
                          envie o link para ele completar o cadastro.
                        </small>
                      </div>
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={pending || !canJoin}
                      >
                        Solicitar vaga para convidado
                      </Button>
                    </form>
                  )}
                </>
              )}
              {participating && (
                <Button
                  variant="outline" className="volley-cancel-participation"
                  disabled={pending || finished}
                  onClick={() => dialog.current?.showModal()}
                >
                  Não vou mais · cancelar participação
                </Button>
              )}
            </>
          )}
        </>
      ) : (
        <form
          className="game-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (pending) return;
            if (register && !ready) { e.currentTarget.querySelector<HTMLButtonElement>("[data-participation-next]")?.click(); return; }
            if (register)
              run(
                () =>
                  registerForGame({
                    eventId,
                    name,
                    phone,
                    birthDate,
                    enrollment,
                  }),
                "Cadastro enviado para aprovação.",
              );
            else {
              execute(async () => {
                const result = await identifyByPhone(phone);
                if (!result.error) setRegister(!result.found);
                return result;
              }, undefined, "Consultando seu telefone…", "");
            }
          }}
        >
          <p className="game-description">
            Já faz parte do grupo? Informe seu celular para confirmar presença.
            Novos cadastros precisam da aprovação do responsável.
          </p>
            <PhoneField label="Celular com DDD"
              id={`${id}-phone`}
              value={phone}
              onChange={(value) => {
                setPhone(value);
                setReady(false);
                if (register) setRegister(false);
              }}
              maxLength={22}
              placeholder="(61) 99999-9999"
              required
            />
          {register && (
            <>
              <div className="game-notice is-warning">
                <p>
                  Este número ainda não está cadastrado. Informe seu nome para
                  solicitar entrada no grupo. Isso não reserva nem confirma
                  vaga.
                </p>
              </div>
              <label htmlFor={`${id}-name`}>
                Seu nome completo
                <Input
                  id={`${id}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <ParticipationFields birthDate={birthDate} onBirthDateChange={setBirthDate} enrollment={enrollment} onEnrollmentChange={setEnrollment} onReadyChange={setReady} disabled={pending} onDate={eventDate} />
            </>
          )}
          {feedback}
          <Button
            type="submit"
            disabled={register && !ready}
            loading={pending}
            loadingText={
              register ? "Enviando cadastro…" : "Consultando telefone…"
            }
          >
            {pending
              ? "Verificando…"
              : register
                ? "Solicitar aprovação do cadastro"
                : "Continuar com meu celular"}
            <VolleyIcon name="arrow" />
          </Button>
          <div className="game-privacy-note">
            <VolleyIcon name="shield" />
            <p>
              Seu telefone fica privado. Volte por este navegador para gerenciar
              a inscrição. Se trocar de aparelho, peça a liberação ao
              responsável. O número ainda não é validado por SMS.
              {" "}<Link className="underline underline-offset-2" href="/volei/privacidade">Política de Privacidade</Link>.
            </p>
          </div>
        </form>
      )}
      {!open && (
        <p className="game-notice">
          Novas confirmações encerradas.{" "}
          {finished
            ? "Chamada concluída; correções com o responsável."
            : "Cancelamentos seguem disponíveis."}
        </p>
      )}
      {mine && feedback}
      {success && <p role="status" className="game-feedback">{success}</p>}
      {participating && <dialog
        ref={dialog}
        className="game-dialog"
        aria-labelledby={`${id}-cancel`}
      >
        <h2 id={`${id}-cancel`}>Liberar sua vaga?</h2>
        <p>
          Sua participação
          {activeGuest
            ? " e a do seu convidado serão canceladas"
            : " será cancelada"}
          . A vaga ficará disponível para os próximos da fila.
        </p>
        <div className="game-dialog-actions">
          <Button
            autoFocus
            variant="outline"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            loadingText="Liberando vaga…"
            onClick={() =>
              run(
                () => manageGame({ eventId, action: "cancel" }),
                "Vaga liberada. Obrigado por avisar.",
              )
            }
          >
            Sim, não vou
          </Button>
        </div>
        {feedback}
      </dialog>}
    </VolleyCard>
  );
}
