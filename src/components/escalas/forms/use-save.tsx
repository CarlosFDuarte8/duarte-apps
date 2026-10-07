"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "@/app/admin/actions";

const SAVED_MESSAGE = "Salvo com sucesso.";

/** Envia uma alteração ao servidor e expõe estado de envio e mensagem de retorno. */
export function useSave(revision: number) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(kind: Parameters<typeof mutate>[0], data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await mutate(kind, data, revision);
      if (result.error) setMessage(result.error);
      else {
        setMessage(SAVED_MESSAGE);
        if (result.destination) router.push(result.destination);
        router.refresh();
      }
    } catch {
      setMessage("Falha na conexão. Recarregue e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return {
    save,
    busy,
    feedback: (
      <p
        className={`sc-feedback ${message === SAVED_MESSAGE ? "sc-feedback-ok" : "sc-feedback-error"}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    ),
  };
}
