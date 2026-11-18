"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EnrollmentDraft, ParticipationProfile } from "@/lib/volei/students";
import { reviewParticipation } from "@/app/volei/participation-actions";
import { ParticipationFields } from "./participation-fields";
import { useRun } from "./use-run";
import Link from "next/link";

export function ParticipationReview({ eventId, token, profile, disabled, participating = false, eventDate, onSaved, waiting = false }: {
  eventId: string; token?: string; profile: ParticipationProfile; disabled?: boolean; participating?: boolean; eventDate?: string; onSaved?: () => void; waiting?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [ready, setReady] = useState(false);
  const [birth, setBirth] = useState(profile.birthDate ?? "");
  const [enrollment, setEnrollment] = useState<EnrollmentDraft>({
    isStudent: profile.days.length > 0 ? true : null, days: profile.days, classTime: profile.classTime ?? "",
  });
  const { run, pending, feedback } = useRun({ revalidated: true, successMessage: "" });
  // A successful server render can remove this component while the dialog is open.
  useEffect(() => {
    const element = dialog.current;
    return () => element?.close();
  }, []);
  return <>
    {waiting && <p className="volley-muted">Confira seus dados para poder receber uma vaga desta fila. O horário original da sua inscrição será mantido.</p>}
    <Button type="button" disabled={disabled} className="game-primary" onClick={() => dialog.current?.showModal()}>
      {participating ? "Conferir meus dados" : "Confirmar minha presença"}
    </Button>
    <dialog ref={dialog} className="volley-participation-dialog" aria-labelledby={`${id}-title`} onCancel={event => { if (pending) event.preventDefault(); }}>
      <form onSubmit={event => {
        event.preventDefault();
        if (!ready) { event.currentTarget.querySelector<HTMLButtonElement>("[data-participation-next]")?.click(); return; }
        run(async () => {
          const result = await reviewParticipation({ eventId, token, birthDate: birth, enrollment });
          if (!result.error) onSaved?.();
          return result;
        }, () => dialog.current?.close(), "Conferindo dados e participação…");
      }}>
        <h2 id={`${id}-title`}>Confira seus dados</h2>
        <p>Antes de continuar, confirme seu nascimento e informe se você é aluno. Esta conferência é feita uma vez.</p>
        {profile.birthDate && <p>Para corrigir uma data já informada, {token ? "fale com o responsável" : <Link className="underline" href="/volei/meu-cadastro">abra Meu cadastro</Link>}.</p>}
        <ParticipationFields birthDate={birth} onBirthDateChange={setBirth} enrollment={enrollment} onEnrollmentChange={setEnrollment} onReadyChange={setReady} disabled={pending} onDate={eventDate} />
        <div className="volley-dialog-actions">
          <Button type="button" variant="outline" disabled={pending} onClick={() => dialog.current?.close()}>Voltar</Button>
          {ready && <Button type="submit" loading={pending}>Salvar e continuar</Button>}
        </div>
        {feedback}
      </form>
    </dialog>
  </>;
}
