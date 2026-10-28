"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { error: string };

/** Executa uma server action, atualiza a tela e expõe pendência e erro. */
export function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function run(action: () => Promise<Result>, after?: () => void) {
    start(async () => {
      try {
        const result = await action();
        setError(result.error);
        if (!result.error) {
          router.refresh();
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

/** Copia texto; usa um textarea temporário quando a Clipboard API não está disponível (HTTP, p.ex.). */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    await copyText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return { copied, copy };
}
