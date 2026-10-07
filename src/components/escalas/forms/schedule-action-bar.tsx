import type { ReactNode } from "react";

/** Barra fixa com o estado dos conflitos e as ações de salvar, cancelar e imprimir. */
export function ScheduleActionBar({
  conflictCount,
  firstConflictDate,
  busy,
  published,
  feedback,
  onPublish,
  onSaveDraft,
  onCancel,
}: {
  conflictCount: number;
  firstConflictDate?: string;
  busy: boolean;
  published: boolean;
  feedback: ReactNode;
  onPublish: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="sc-editor-bar">
      <div className="sc-bar-status" aria-live="polite">
        {conflictCount ? (
          <a
            className="sc-status sc-status-bad"
            href={`#dia-${firstConflictDate}`}
          >
            <span aria-hidden="true">●</span> {conflictCount}{" "}
            {conflictCount === 1 ? "conflito" : "conflitos"} · publicação
            bloqueada
            <span className="sc-status-go"> Ver →</span>
          </a>
        ) : (
          <span className="sc-status sc-status-ok">
            <span aria-hidden="true">✓</span> Sem conflitos
          </span>
        )}
        {feedback}
      </div>
      <div className="sc-bar-actions">
        <button
          type="button"
          className="sc-btn"
          disabled={busy || conflictCount > 0}
          onClick={onPublish}
        >
          Salvar e publicar
        </button>
        <button
          type="button"
          className="sc-btn sc-btn-ghost"
          disabled={busy}
          onClick={onSaveDraft}
        >
          {published ? "Despublicar e salvar" : "Salvar rascunho"}
        </button>
        <button
          type="button"
          className="sc-btn sc-btn-ghost"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="sc-btn sc-btn-ghost sc-print"
          onClick={() => window.print()}
        >
          Imprimir / PDF
        </button>
      </div>
    </div>
  );
}
