"use client";
import { useState } from "react";
import { respond } from "@/app/volei/[token]/actions";
import styles from "./publico.module.css";
import { useRun } from "./use-run";
import { Button } from "@/components/ui/button";
import { ParticipationReview } from "./participation-review";
import type { ParticipationProfile } from "@/lib/volei/students";

type Mine =
  "confirmado" | "nao_vai" | "espera" | "ausente" | "reservado" | undefined;

export function Presence({
  token,
  eventId,
  mine,
  canRespond,
  canJoin = true,
  profile,
  admissionMessage,
  eventDate,
}: {
  token: string;
  eventId: string;
  mine: Mine;
  canRespond: boolean;
  canJoin?: boolean;
  profile: ParticipationProfile;
  admissionMessage?: string;
  eventDate?: string;
}) {
  const { run, pending, feedback } = useRun({ revalidated: true, successMessage: "Participação atualizada." });
  const [profileSaved, setProfileSaved] = useState(false);
  const joining = mine !== "confirmado" && mine !== "espera";

  function choose(status: "confirmado" | "nao_vai") {
    run(() => respond(
          token,
          eventId,
          mine === status || (mine === "espera" && status === "confirmado")
            ? "limpar"
            : status,
        ), undefined, "Atualizando sua presença…");
  }

  if (joining && !profile.reviewed) return <ParticipationReview eventId={eventId} eventDate={eventDate} token={token} profile={profile} onSaved={() => setProfileSaved(true)} disabled={!canRespond || pending} />;
  return (
    <>
    {!profile.reviewed && <ParticipationReview eventId={eventId} eventDate={eventDate} token={token} profile={profile} participating waiting={mine === "espera"} onSaved={() => setProfileSaved(true)} disabled={!canRespond || pending} />}
    <form onSubmit={(event) => {
      event.preventDefault();
      choose("confirmado");
    }}>
      {joining && !canJoin && admissionMessage && <p role="status" className="volley-muted">{admissionMessage}</p>}
      {profileSaved && <p role="status" className="volley-muted">Dados do cadastro atualizados.</p>}
      <div className={styles.botoes}>
        <Button
          type="submit"
          disabled={
            !canRespond ||
            pending ||
            (!canJoin && mine !== "confirmado" && mine !== "espera")
          }
          aria-pressed={mine === "confirmado" || mine === "espera"}
        >
          {mine === "espera" ? "Na lista de espera" : "Eu vou"}
        </Button>
        <Button
          type="button"
          disabled={!canRespond || pending}
          aria-pressed={mine === "nao_vai"}
          variant={mine === "nao_vai" ? "destructive" : "outline"}
          onClick={() => choose("nao_vai")}
        >
          Não vou
        </Button>
      </div>
      {feedback}
    </form>
    </>
  );
}
