import Link from "next/link";
import { snapshot } from "@/lib/escalas/repository";
import { today, validatePeriod } from "@/lib/escalas/domain";
import {
  CATEGORY_NAMES,
  PageHeader,
  StatusBadge,
  monthLabel,
} from "@/components/escalas/admin-ui";

const periodOptions = [
  { value: "atuais", label: "Atuais e futuros" },
  { value: "anteriores", label: "Anteriores" },
  { value: "todos", label: "Todos" },
] as const;
const statusOptions = [
  { value: "", label: "Todos" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "publicado", label: "Publicados" },
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; status?: string }>;
}) {
  const state = await snapshot();
  const query = await searchParams;
  const period = periodOptions.some((o) => o.value === query.periodo)
    ? (query.periodo as (typeof periodOptions)[number]["value"])
    : "atuais";
  const status = statusOptions.some((o) => o.value === query.status)
    ? (query.status ?? "")
    : "";
  const currentMonth = today().slice(0, 7);
  const hiddenPast = state.periods.filter((p) => p.month < currentMonth).length;
  const periods = state.periods
    .filter(
      (p) =>
        (period === "todos" ||
          (period === "atuais" ? p.month >= currentMonth : p.month < currentMonth)) &&
        (!status || p.status === (status === "rascunho" ? "draft" : "published")),
    )
    .sort((a, b) => a.month.localeCompare(b.month));
  const href = (next: { periodo?: string; status?: string }) => {
    const params = new URLSearchParams();
    const periodo = next.periodo ?? period;
    const st = next.status ?? status;
    if (periodo !== "atuais") params.set("periodo", periodo);
    if (st) params.set("status", st);
    const query = params.toString();
    return query ? `?${query}` : "?";
  };
  return (
    <>
      <PageHeader
        eyebrow="Escalas"
        title="Escalas e histórico"
        description="Rascunhos só aparecem para a administração até serem publicados."
        actions={
          <Link className="sc-button" href="/admin/escalas/nova">
            Gerar próximos meses
          </Link>
        }
      />
      <div className="sc-panel sc-period-filters">
        <div className="sc-field">
          <span id="sc-period-label">Período</span>
          <div
            className="sc-segmented"
            role="group"
            aria-labelledby="sc-period-label"
          >
            {periodOptions.map((o) => (
              <Link
                key={o.value}
                href={href({ periodo: o.value })}
                aria-current={period === o.value ? "true" : undefined}
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="sc-field">
          <span id="sc-status-label">Status</span>
          <div
            className="sc-segmented"
            role="group"
            aria-labelledby="sc-status-label"
          >
            {statusOptions.map((o) => (
              <Link
                key={o.value}
                href={href({ status: o.value })}
                aria-current={status === o.value ? "true" : undefined}
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {period === "atuais" && hiddenPast > 0 && periods.length > 0 && (
        <p className="sc-muted">
          {hiddenPast} {hiddenPast === 1 ? "mês anterior oculto" : "meses anteriores ocultos"}.{" "}
          <Link href={href({ periodo: "anteriores" })}>Ver anteriores</Link>
        </p>
      )}
      {!periods.length && (
        <div className="sc-card sc-notice">
          <strong>Nenhuma escala encontrada.</strong>
          <p>
            {state.periods.length
              ? "Ajuste o período ou o status para ver outras escalas."
              : "Gere um período ou importe as escalas de 2026."}
          </p>
        </div>
      )}
      <div className="sc-period-grid">
        {periods.map((p) => {
          const conflicts = validatePeriod(p, state).length;
          return (
            <section className="sc-card sc-period" key={p.id}>
              <div className="sc-period-head">
                <h2>
                  <Link href={`/admin/escalas/${p.id}`}>
                    {monthLabel(p.month)}
                  </Link>
                </h2>
                <StatusBadge status={p.status} />
              </div>
              <dl className="sc-meta">
                <div>
                  <dt>Eventos</dt>
                  <dd>{p.events.length}</dd>
                </div>
                <div>
                  <dt>Conflitos</dt>
                  <dd className={conflicts ? "sc-text-warn" : undefined}>
                    {conflicts}
                  </dd>
                </div>
                <div>
                  <dt>Categorias</dt>
                  <dd>{p.categories.map((c) => CATEGORY_NAMES[c]).join(", ")}</dd>
                </div>
              </dl>
              <div className="sc-period-actions">
                <Link className="sc-button" href={`/admin/escalas/${p.id}`}>
                  {p.status === "draft" ? "Editar e publicar" : "Editar"}
                </Link>
                {p.status === "published" && (
                  <Link
                    className="sc-button sc-btn-ghost"
                    href={`/escalas/${p.month.replace("-", "/")}`}
                  >
                    Ver página pública
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
