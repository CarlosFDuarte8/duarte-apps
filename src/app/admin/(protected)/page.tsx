import Link from "next/link";
import { snapshot } from "@/lib/escalas/repository";
import {
  today,
  shiftMonth,
  validatePeriod,
  weekday,
} from "@/lib/escalas/domain";
import {
  CATEGORY_NAMES,
  PageHeader,
  WEEKDAY_NAMES,
  shortMonthLabel,
} from "@/components/escalas/admin-ui";
export default async function Page() {
  const state = await snapshot();
  const events = state.periods.flatMap((p) => p.events);
  const currentDate = today();
  const next = events
    .filter((e) => e.date >= currentDate && e.kind === "culto")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const conflicts = state.periods
    .filter((p) => p.status === "draft")
    .flatMap((p) => validatePeriod(p, state));
  const stats = state.members.map((m) => ({
    ...m,
    count: events.filter((e) => e.assignments.some((a) => a.member_id === m.id))
      .length,
  }));
  const missing = Array.from({ length: 12 }, (_, i) =>
    shiftMonth(currentDate.slice(0, 7), i),
  ).filter((month) => !state.periods.some((p) => p.month === month));
  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Painel de escalas"
        description="Acompanhe os próximos cultos, pendências e a distribuição das participações."
        actions={
          <Link className="sc-button" href="/admin/escalas/nova">
            Gerar escalas
          </Link>
        }
      />
      <div className="sc-stats">
        <div className="sc-stat sc-stat-primary">
          Próximo culto
          <strong>
            {next?.date.split("-").reverse().join("/") ?? "Não gerado"}
          </strong>
          {next && <small>{WEEKDAY_NAMES[weekday(next.date)]}</small>}
        </div>
        <div className="sc-stat">
          Rascunhos
          <strong>
            {state.periods.filter((p) => p.status === "draft").length}
          </strong>
        </div>
        <div className={`sc-stat ${conflicts.length ? "sc-stat-warn" : ""}`}>
          Conflitos em rascunhos<strong>{conflicts.length}</strong>
        </div>
        <div className="sc-stat">
          Membros ativos / inativos
          <strong>
            {state.members.filter((m) => m.is_active).length} /{" "}
            {state.members.filter((m) => !m.is_active).length}
          </strong>
        </div>
      </div>
      <section className="sc-card">
        <h2>Meses ainda não gerados</h2>
        {missing.length ? (
          <>
            <ul className="sc-pills">
              {missing.map((month) => (
                <li key={month}>{shortMonthLabel(month)}</li>
              ))}
            </ul>
            <Link className="sc-button sc-btn-ghost" href="/admin/escalas/nova">
              Gerar escalas
            </Link>
          </>
        ) : (
          <p className="sc-muted">Os próximos 12 meses já foram gerados.</p>
        )}
      </section>
      <h2 className="sc-section-title">Participações por membro</h2>
      <p className="sc-muted">
        Uma participação por evento, mesmo quando a organista faz as duas
        funções. Inclui rascunhos; comparação com a média da própria categoria.
      </p>
      <div className="sc-scroll">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Membro</th>
              <th>Categoria</th>
              <th>Participações</th>
              <th>Distribuição</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((m) => {
              const peers = stats.filter((p) => p.category === m.category);
              const average =
                peers.reduce((n, p) => n + p.count, 0) / peers.length;
              return (
                <tr key={m.id}>
                  <td data-label="Membro">
                    <Link href={`/admin/membros/${m.id}`}>{m.name}</Link>
                  </td>
                  <td data-label="Categoria">{CATEGORY_NAMES[m.category]}</td>
                  <td data-label="Participações">{m.count}</td>
                  <td data-label="Distribuição">
                    <span
                      className={`sc-badge ${m.count > average ? "sc-badge-warn" : m.count < average ? "sc-badge-info" : "sc-badge-ok"}`}
                    >
                      {m.count > average
                        ? "Acima"
                        : m.count < average
                          ? "Abaixo"
                          : "Na média"}
                    </span>{" "}
                    <span className="sc-muted">média {average.toFixed(1)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2 className="sc-section-title">Atividade recente</h2>
      <ul className="sc-timeline">
        {state.logs.map((log) => (
          <li key={log.id}>
            <time dateTime={log.created_at}>
              {new Date(log.created_at).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </time>
            <span>{log.action}</span>
            <small title={log.actor_id}>
              administrador {String(log.actor_id).slice(0, 8)}
            </small>
          </li>
        ))}
      </ul>
    </>
  );
}
