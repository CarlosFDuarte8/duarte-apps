"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOperationStatus } from "./activity";
import { copyText } from "@/lib/volei/clipboard";
import { ActionFeedback } from "./action-feedback";
export { copyText } from "@/lib/volei/clipboard";

type Result = { error: string };

/** Executa uma server action, atualiza a tela e expõe pendência e erro. */
export function useRun({
  revalidated = false,
  successMessage = "Alterações salvas.",
}: { revalidated?: boolean; successMessage?: string } = {}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [message, setMessage] = useState("Salvando alterações…");
  const [recovery, setRecovery] = useState<"none" | "not-sent" | "uncertain">("none");
  const lock = useRef(false);
  useOperationStatus(pending, message, error, success);
  function run(
    action: () => Promise<Result>,
    after?: () => void,
    pendingMessage = "Salvando alterações…",
    operationSuccess = successMessage,
  ) {
    if (lock.current) return;
    setError("");
    setSuccess("");
    setRecovery("none");
    if (!navigator.onLine) {
      setError("Você está sem conexão. A ação não foi enviada e os dados continuam nesta tela. Reconecte-se e tente novamente.");
      setRecovery("not-sent");
      return;
    }
    lock.current = true;
    setMessage(pendingMessage);
    start(async () => {
      try {
        const result = await action();
        setError(result.error);
        if (!result.error) {
          setSuccess(operationSuccess);
          setMessage("Atualizando informações…");
          window.dispatchEvent(new Event("volley-notifications-changed"));
          // Actions using revalidatePath already return the updated server tree.
          if (!revalidated) router.refresh();
          after?.();
        }
      } catch {
        setError("Não recebemos a confirmação do servidor. Seus dados continuam nesta tela. Atualize a situação para conferir se a ação foi salva antes de enviar novamente.");
        setRecovery("uncertain");
      } finally {
        lock.current = false;
      }
    });
  }
  return {
    run,
    pending,
    error,
    success,
    feedback: <ActionFeedback error={error} recovery={recovery} pending={pending} onRefresh={() => {
      if (!navigator.onLine) return;
      setError(""); setSuccess(""); setRecovery("none");
      setMessage("Consultando a situação atual…");
      start(() => router.refresh());
    }} />,
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
