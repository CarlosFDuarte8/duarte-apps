"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "./phone-input";
import { useRun } from "./use-run";
import {
  saveGuestPhone,
  setGuestBlocked,
} from "@/app/admin/volei-profile-actions";
export function GuestAdminControls({
  id,
  phone,
  blocked,
  reason,
}: {
  id: string;
  phone: string | null;
  blocked: boolean;
  reason: string;
}) {
  const [contact, setContact] = useState(phone ?? "");
  const [blockReason, setBlockReason] = useState("");
  const { run, pending, feedback } = useRun();
  return (
    <div className="vp-profile-form">
      <form
        className="vl-box"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveGuestPhone(id, contact));
        }}
      >
        <h2 className="vm-editor-heading">Telefone do convidado</h2>
        <PhoneInput
          value={contact}
          onChange={setContact}
          required
          aria-label="Telefone do convidado"
        />
        <p>
          O telefone identifica o convidado em outros jogos e permite aplicar o
          bloqueio.
        </p>
        <Button disabled={pending}>Salvar telefone</Button>
      </form>
      <section className="vl-box">
        <h2 className="vm-editor-heading">Acesso como convidado</h2>
        {blocked ? (
          <>
            <p>Bloqueado: {reason}</p>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setGuestBlocked(id, false, ""))}
            >
              Desbloquear convidado
            </Button>
          </>
        ) : (
          <form
            className="vp-profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => setGuestBlocked(id, true, blockReason));
            }}
          >
            <p>
              O bloqueio cancela as inscrições deste telefone nos jogos ainda
              não concluídos e impede novos convites. O histórico de presença é
              mantido.
            </p>
            <label>
              Motivo do bloqueio
              <Input
                required
                maxLength={200}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </label>
            <Button variant="destructive" disabled={pending || !phone}>
              Bloquear convidado
            </Button>
          </form>
        )}
      </section>
      {feedback}
    </div>
  );
}
