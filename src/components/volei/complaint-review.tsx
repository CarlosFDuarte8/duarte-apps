"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import {
  readComplaint,
  reviewComplaint,
} from "@/app/admin/volei-notification-actions";
import {
  complaintStatuses,
  type ComplaintStatus,
} from "@/lib/volei/complaints";
import { useRun } from "./use-run";
export function ComplaintReview({
  id,
  status,
  note,
  readAt,
}: {
  id: string;
  status: ComplaintStatus;
  note: string;
  readAt: string | null;
}) {
  const [next, setNext] = useState<ComplaintStatus>(status);
  const [text, setText] = useState(note);
  const [saved, setSaved] = useState(false);
  const { run, pending, feedback } = useRun();
  const started = useRef(false);
  useEffect(() => {
    if (readAt || started.current) return;
    started.current = true;
    void readComplaint(id)
      .then((result) => {
        if (!result.error)
          window.dispatchEvent(new Event("volley-notifications-changed"));
      })
      .catch(() => {});
  }, [id, readAt]);
  return (
    <form
      className="vn-review-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        run(
          () => reviewComplaint({ id, status: next, note: text }),
          () => setSaved(true),
        );
      }}
    >
      <h2>Atendimento</h2>
      <label>
        Situação
        <NativeSelect
          value={next}
          disabled={pending}
          onChange={(e) => {
            setNext(e.target.value as ComplaintStatus);
            setSaved(false);
          }}
        >
          {Object.entries(complaintStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label>
        Registro interno do atendimento
        <Textarea
          value={text}
          disabled={pending}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          required={next === "resolved"}
          minLength={next === "resolved" ? 3 : undefined}
          maxLength={2000}
          rows={5}
          placeholder="Registre a análise, a providência tomada ou o motivo da conclusão."
        />
        <small>
          Privado. Não será enviado ao autor nem à pessoa mencionada.
        </small>
      </label>
      <Button disabled={pending}>
        {pending
          ? "Salvando…"
          : next === "resolved"
            ? "Concluir atendimento"
            : "Salvar atendimento"}
      </Button>
      {saved && (
        <p role="status" className="vm-success">
          Atendimento atualizado.
        </p>
      )}
      {feedback}
      <p className="vn-help">
        Apenas abrir ou ler mantém a queixa nas pendências. Ao concluir, ela sai
        do alerta e permanece no histórico.
      </p>
    </form>
  );
}
