"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { importMembers } from "@/app/admin/volei-actions";
import { initialVoleiMembers } from "@/lib/volei/initial-members";

const STORAGE_KEY = "lista-presenca-v1";

function namesFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) return [...initialVoleiMembers];

  const data: unknown = JSON.parse(saved);
  const parsed = z
    .object({
      participantes: z.array(z.object({ nome: z.string().max(100) })).max(100),
    })
    .safeParse(data);
  if (!parsed.success) {
    throw new Error("Os dados salvos da lista antiga não estão no formato esperado.");
  }

  return parsed.data.participantes.map((person) => person.nome);
}

export function ImportLegacyMembers() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function importRoster() {
    setMessage("");
    setError(false);
    try {
      const names = namesFromStorage();
      if (names.length > 100) {
        setMessage("A lista antiga contém mais de 100 pessoas. Revise-a antes de importar.");
        setError(true);
        return;
      }
      startTransition(async () => {
        try {
          const result = await importMembers(names);
          if (result.error) {
            setMessage(result.error);
            setError(true);
            return;
          }
          setMessage(
            result.imported > 0
              ? `${result.imported} membro(s) importado(s).`
              : "Todos os nomes da lista já estão cadastrados.",
          );
        } catch {
          setMessage("Não foi possível importar. Recarregue a página e tente novamente.");
          setError(true);
        }
      });
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Não foi possível ler a lista antiga deste navegador.",
      );
      setError(true);
    }
  }

  return (
    <section className="sc-card sc-form-card">
      <h2>Importar lista antiga</h2>
      <p>
        Importa os nomes salvos neste navegador. Se não houver uma lista salva,
        usa os 12 nomes iniciais. Nomes já cadastrados não são duplicados.
      </p>
      <button
        type="button"
        className="sc-btn sc-btn-ghost"
        onClick={importRoster}
        disabled={pending}
      >
        {pending ? "Importando…" : "Importar nomes da lista antiga"}
      </button>
      {message && (
        <p
          className={`sc-feedback ${error ? "sc-feedback-error" : "sc-feedback-ok"}`}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </section>
  );
}
