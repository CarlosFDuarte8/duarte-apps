"use client";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  categories,
  categorySchema,
  firstFreeMonth,
  monthRange,
  monthSchema,
  shiftMonth,
  today,
} from "@/lib/escalas/domain";
import { CATEGORY_NAMES } from "@/lib/escalas/names";
import { shortMonthLabel } from "@/components/escalas/admin-ui";
import { useSave } from "./use-save";

const generationSchema = z.object({
  start: monthSchema,
  end: monthSchema,
  categories: z.array(categorySchema).min(1),
});
type GenerationValues = z.infer<typeof generationSchema>;

const MAX_MONTHS = 12;
const PRESETS = [
  { count: 1, label: "Próximo mês livre" },
  { count: 3, label: "3 meses" },
  { count: 6, label: "6 meses" },
  { count: 12, label: "12 meses" },
];

/** Mensagem de erro do intervalo escolhido, ou vazio quando ele pode ser gerado. */
function rangeProblem(months: string[], existingMonths: string[]) {
  if (!months.length) return "O mês final deve ser igual ou posterior ao inicial.";
  if (months.length > MAX_MONTHS)
    return `Escolha no máximo ${MAX_MONTHS} meses por vez.`;
  const clashes = months.filter((m) => existingMonths.includes(m));
  return clashes.length
    ? `Já existe escala em ${clashes.map(shortMonthLabel).join(", ")}. Escolha meses ainda não gerados.`
    : "";
}

export function GenerationForm({
  revision,
  existingMonths,
}: {
  revision: number;
  existingMonths: string[];
}) {
  const first = firstFreeMonth(today().slice(0, 7), existingMonths);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<GenerationValues>({
    resolver: zodResolver(generationSchema),
    defaultValues: { start: first, end: first, categories: [...categories] },
  });
  const { save, busy, feedback } = useSave(revision);
  const start = useWatch({ control, name: "start" });
  const end = useWatch({ control, name: "end" });
  const selected = useWatch({ control, name: "categories" });
  const months = monthRange(start, end);
  const problem = rangeProblem(months, existingMonths);
  return (
    <form
      className="sc-form"
      onSubmit={handleSubmit((v) => save("generate", v))}
    >
      <section className="sc-card sc-form-card">
        <h2>Período</h2>
        <div
          className="sc-presets"
          role="group"
          aria-label="Atalhos de período"
        >
          {PRESETS.map((p) => {
            const presetEnd = shiftMonth(first, p.count - 1);
            return (
              <button
                type="button"
                key={p.count}
                className="sc-chip sc-preset"
                aria-pressed={start === first && end === presetEnd}
                onClick={() => {
                  setValue("start", first);
                  setValue("end", presetEnd);
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="sc-fields">
          <label>
            Mês inicial
            <input type="month" {...register("start")} required />
          </label>
          <label>
            Mês final
            <input type="month" {...register("end")} required />
          </label>
        </div>
        <div
          className={`sc-range-preview ${problem ? "is-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {problem ? (
            <strong>{problem}</strong>
          ) : (
            <>
              <strong>
                {months.length}{" "}
                {months.length === 1 ? "mês será gerado" : "meses serão gerados"}
              </strong>
              <ul className="sc-pills">
                {months.map((m) => (
                  <li key={m}>{shortMonthLabel(m)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
      <section className="sc-card sc-form-card">
        <h2>Categorias</h2>
        <fieldset>
          <legend>Quem entra na escala</legend>
          {categories.map((c) => (
            <label className="sc-check" key={c}>
              <input type="checkbox" value={c} {...register("categories")} />
              {CATEGORY_NAMES[c]}
            </label>
          ))}
        </fieldset>
        <p className="sc-muted">
          As escalas existentes não serão substituídas. Inclua as categorias dos
          membros vinculados para permitir combinações válidas.
        </p>
      </section>
      {Object.values(errors).map((e, i) => (
        <p className="sc-form-error" role="alert" key={i}>
          {e.message}
        </p>
      ))}
      <div className="sc-actions-bar sc-actions-sticky">
        <button
          className="sc-btn"
          disabled={busy || Boolean(problem) || selected.length === 0}
        >
          {busy ? "Gerando…" : "Gerar rascunhos"}
        </button>
        {feedback}
      </div>
    </form>
  );
}
