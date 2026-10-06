import Link from "next/link";
import { snapshot } from "@/lib/escalas/repository";
import { validatePeriod } from "@/lib/escalas/domain";
import {
  CATEGORY_NAMES,
  PageHeader,
  StatusBadge,
  monthLabel,
} from "@/components/escalas/admin-ui";
export default async function Page() {
  const state = await snapshot();
  const periods = [...state.periods].sort((a, b) =>
    b.month.localeCompare(a.month),
  );
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
      {!periods.length && (
        <div className="sc-card sc-notice">
          <strong>Nenhuma escala gerada.</strong>
          <p>Gere um período ou importe as escalas de 2026.</p>
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
