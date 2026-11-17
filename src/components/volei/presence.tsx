"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respond } from "@/app/volei/[token]/actions";
import styles from "./publico.module.css";
import { useOperationStatus } from "./activity";
import { Button } from "@/components/ui/button";
import { BirthDateField } from "./birth-date-field";

type Mine =
  "confirmado" | "nao_vai" | "espera" | "ausente" | "reservado" | undefined;

export function Presence({
  token,
  eventId,
  mine,
  canRespond,
  canJoin = true,
  needsBirthDate = false,
}: {
  token: string;
  eventId: string;
  mine: Mine;
  canRespond: boolean;
  canJoin?: boolean;
  needsBirthDate?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const joining = mine !== "confirmado" && mine !== "espera";
  useOperationStatus(pending, "Atualizando sua presença…", error);

  function choose(status: "confirmado" | "nao_vai") {
    start(async () => {
      try {
        const result = await respond(
          token,
          eventId,
          mine === status || (mine === "espera" && status === "confirmado")
            ? "limpar"
            : status,
          status === "confirmado" && joining && needsBirthDate
            ? birthDate
            : undefined,
        );
        setError(result.error);
        if (!result.error) router.refresh();
      } catch {
        setError("Falha na conexão. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      choose("confirmado");
    }}>
      {needsBirthDate && joining && canJoin && canRespond && (
        <BirthDateField value={birthDate} onChange={setBirthDate} disabled={pending} />
      )}
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
      {error && (
        <p role="alert" className={styles.erro}>
          {error}
        </p>
      )}
    </form>
  );
}
