"use client";
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  registerForGame,
  manageGame,
  identifyByPhone,
} from "@/app/volei/jogo/[id]/actions";
import { attendanceLabels, displayPhone } from "@/lib/volei/phone";
import type { AttendanceStatus } from "@/lib/volei/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VolleyIcon } from "./volley-icon";
import { PhoneInput } from "./phone-input";
export type MyGame = {
  name: string;
  phone: string;
  blocked: boolean;
  active: boolean;
  membershipStatus: "approved" | "pending" | "rejected";
  status?: AttendanceStatus;
  guest?: { name: string; status: AttendanceStatus };
};
export function GameResponse({
  eventId,
  open,
  mine,
  free,
  finished = false,
}: {
  eventId: string;
  open: boolean;
  mine: MyGame | null;
  free: number;
  finished?: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [register, setRegister] = useState(false);
  const [guest, setGuest] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const participating =
    mine?.status === "confirmado" || mine?.status === "espera";
  const approved = mine?.membershipStatus === "approved";
  const canJoin = open && approved && mine?.active && !mine.blocked;
  const activeGuest =
    mine?.guest &&
    (mine.guest.status === "confirmado" || mine.guest.status === "espera");
  function run(action: () => Promise<{ error: string }>, success: string) {
    setMessage("");
    start(async () => {
      try {
        const result = await action();
        setFailed(!!result.error);
        setMessage(result.error || success);
        if (!result.error) {
          dialog.current?.close();
          router.refresh();
        }
      } catch {
        setFailed(true);
        setMessage("Não foi possível conectar. Tente novamente.");
      }
    });
  }
  return (
    <section className="volley-card game-signup">
      <header className="game-section-heading">
        <span className="game-icon-box">
          <VolleyIcon name={participating ? "check" : "phone"} />
        </span>
        <div>
          <span className="game-kicker">SUA PARTICIPAÇÃO</span>
          <h2>
            {participating ? "Você está na lista!" : "Entre com seu celular"}
          </h2>
        </div>
      </header>
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
                        ? "Você será confirmado automaticamente se uma vaga for liberada."
                        : "Confirme abaixo para participar deste encontro."}
                  </p>
                </div>
              </div>
              {(!mine.active || mine.blocked) && (
                <p className="game-notice is-warning">
                  Seu cadastro está indisponível para novas inscrições. Fale com
                  o responsável.
                </p>
              )}
              {!participating && (
                <Button
                  className="game-primary"
                  disabled={pending || !canJoin}
                  onClick={() =>
                    run(
                      () => manageGame({ eventId, action: "join" }),
                      "Participação registrada.",
                    )
                  }
                >
                  <VolleyIcon name="check" />
                  {free
                    ? "Confirmar minha presença"
                    : "Entrar na lista de espera"}
                </Button>
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
                  variant="ghost"
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
            if (register)
              run(
                () => registerForGame({ eventId, name, phone }),
                "Cadastro enviado para aprovação.",
              );
            else {
              setMessage("");
              start(async () => {
                try {
                  const result = await identifyByPhone(phone);
                  setFailed(!!result.error);
                  setMessage(result.error);
                  if (!result.error) {
                    setRegister(!result.found);
                    router.refresh();
                  }
                } catch {
                  setFailed(true);
                  setMessage("Falha de conexão. Tente novamente.");
                }
              });
            }
          }}
        >
          <p className="game-description">
            Já faz parte do grupo? Informe seu celular para confirmar presença.
            Novos cadastros precisam da aprovação do responsável.
          </p>
          <label htmlFor={`${id}-phone`}>
            Celular com DDD
            <PhoneInput
              id={`${id}-phone`}
              value={phone}
              onChange={(value) => {
                setPhone(value);
                if (register) setRegister(false);
              }}
              maxLength={22}
              placeholder="(61) 99999-9999"
              required
            />
          </label>
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
            </>
          )}
          <Button type="submit" disabled={pending}>
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
      {message && (
        <p
          role={failed ? "alert" : "status"}
          className={failed ? "game-feedback is-error" : "game-feedback"}
        >
          {message}
        </p>
      )}
      <dialog
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
            disabled={pending}
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
      </dialog>
    </section>
  );
}
