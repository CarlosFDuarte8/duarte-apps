"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respond } from "@/app/volei/[token]/actions";
import styles from "./publico.module.css";
import { useOperationStatus } from "./activity";

type Mine =
  "confirmado" | "nao_vai" | "espera" | "ausente" | "reservado" | undefined;

export function Presence({
  token,
  eventId,
  mine,
  canRespond,
  canJoin = true,
}: {
  token: string;
  eventId: string;
  mine: Mine;
  canRespond: boolean;
  canJoin?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
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
        );
        setError(result.error);
        if (!result.error) router.refresh();
      } catch {
        setError("Falha na conexão. Tente novamente.");
      }
    });
  }

  return (
    <div>
      <div className={styles.botoes}>
        <button
          type="button"
          disabled={
            !canRespond ||
            pending ||
            (!canJoin && mine !== "confirmado" && mine !== "espera")
          }
          aria-pressed={mine === "confirmado" || mine === "espera"}
          className={`${styles.botao} ${styles.vou}`}
          onClick={() => choose("confirmado")}
        >
          {mine === "espera" ? "Na lista de espera" : "Eu vou"}
        </button>
        <button
          type="button"
          disabled={!canRespond || pending}
          aria-pressed={mine === "nao_vai"}
          className={`${styles.botao} ${styles.naoVou}`}
          onClick={() => choose("nao_vai")}
        >
          Não vou
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.erro}>
          {error}
        </p>
      )}
    </div>
  );
}
