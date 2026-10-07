export function ScheduleSummary({
  filled,
  total,
  onlyIssues,
  onOnlyIssuesChange,
}: {
  filled: number;
  total: number;
  onlyIssues: boolean;
  onOnlyIssuesChange: (value: boolean) => void;
}) {
  const percent = total ? Math.round((filled / total) * 100) : 100;
  return (
    <section className="sc-card sc-editor-summary">
      <div className="sc-progress">
        <div className="sc-progress-head">
          <strong>
            {filled} de {total} funções preenchidas
          </strong>
          <span>{percent}%</span>
        </div>
        <div
          className="sc-progress-bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Funções preenchidas"
        >
          <i style={{ width: `${percent}%` }} />
        </div>
      </div>
      <p className="sc-muted">
        Revise as alterações antes de salvar. Observações dos eventos aparecem
        na escala pública. Cada salvamento registra autor e horário.
      </p>
      <label className="sc-check">
        <input
          type="checkbox"
          checked={onlyIssues}
          onChange={(e) => onOnlyIssuesChange(e.target.checked)}
        />
        Mostrar só dias com conflitos
      </label>
    </section>
  );
}
