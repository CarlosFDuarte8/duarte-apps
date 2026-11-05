"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOperationStatus } from "./activity";
import { copyText } from "@/lib/volei/clipboard";
export { copyText } from "@/lib/volei/clipboard";

type Result = { error: string };

/** Executa uma server action, atualiza a tela e expõe pendência e erro. */
export function useRun({
  revalidated = false,
}: { revalidated?: boolean } = {}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [message, setMessage] = useState("Salvando alterações…");
  useOperationStatus(pending, message, error, success);
  function run(
    action: () => Promise<Result>,
    after?: () => void,
    pendingMessage = "Salvando alterações…",
  ) {
    setError("");
    setSuccess("");
    setMessage(pendingMessage);
    start(async () => {
      try {
        const result = await action();
        setError(result.error);
        if (!result.error) {
          setSuccess("Alterações salvas.");
          setMessage("Atualizando informações…");
          window.dispatchEvent(new Event("volley-notifications-changed"));
          // Actions using revalidatePath already return the updated server tree.
          if (!revalidated) router.refresh();
          after?.();
        }
      } catch {
        setError("Falha na conexão. Recarregue e tente novamente.");
      }
    });
  }
  return {
    run,
    pending,
    error,
    feedback: (
      <p className="sc-feedback sc-feedback-error" role="alert">
        {error}
      </p>
    ),
  };
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  useOperationStatus(false, "", error);
  async function copy(text: string) {
    if (timeout.current) clearTimeout(timeout.current);
    setCopied(false);
    setError("");
    try {
      await copyText(text);
      setCopied(true);
      timeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Não foi possível copiar. Tente novamente ou copie o endereço do navegador.",
      );
    }
  }
  return { copied, copy };
}
