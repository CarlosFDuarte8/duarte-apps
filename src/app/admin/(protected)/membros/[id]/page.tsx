import { notFound } from "next/navigation";
import Link from "next/link";
import { snapshot } from "@/lib/escalas/repository";
import { labels } from "@/lib/escalas/domain";
import { MemberForm } from "@/components/escalas/forms";
import {
  CATEGORY_NAMES,
  KIND_NAMES,
  PageHeader,
  StatusBadge,
} from "@/components/escalas/admin-ui";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await snapshot();
  const member = state.members.find((m) => m.id === id);
  if (!member) notFound();
  const links = state.dependencies.filter(
    (d) => d.trigger_member === id || d.required_member === id,
  );
  const history = state.periods.flatMap((p) =>
    p.events
      .filter((e) => e.assignments.some((a) => a.member_id === id))
      .map((e) => ({ period: p, event: e })),
  );
  return (
    <>
      <PageHeader
        eyebrow={`Membros · ${CATEGORY_NAMES[member.category]}`}
        title={member.name}
        actions={
          <Link className="sc-button sc-btn-ghost" href="/admin/membros">
            <span aria-hidden="true">←</span>&nbsp;Voltar à lista
          </Link>
        }
      />
      <MemberForm member={member} revision={state.revision} />
      <section className="sc-card">
        <h2>Vínculos</h2>
        {links.length ? (
          <ul className="sc-list-plain">
            {links.map((d) => (
              <li key={d.id}>
                {state.members.find((m) => m.id === d.trigger_member)?.name} exige{" "}
                {state.members.find((m) => m.id === d.required_member)?.name} ·{" "}
                {labels[d.required_role]} ·{" "}
                <span
                  className={`sc-badge ${d.enabled ? "sc-badge-ok" : "sc-badge-muted"}`}
                >
                  {d.enabled ? "ativo" : "inativo"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sc-muted">Nenhum vínculo cadastrado.</p>
        )}
      </section>
      <section className="sc-card">
        <h2>Histórico de participações</h2>
        {history.length ? (
          <ul className="sc-list-plain">
            {history.map(({ period: p, event: e }) => (
              <li key={e.id}>
                <Link href={`/admin/escalas/${p.id}`}>
                  {e.date.split("-").reverse().join("/")} ·{" "}
                  {KIND_NAMES[e.kind] ?? e.kind}
                </Link>{" "}
                <StatusBadge status={p.status} />
                <span className="sc-muted">
                  {" "}
                  —{" "}
                  {e.assignments
                    .filter((a) => a.member_id === id)
                    .map((a) => labels[a.role])
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sc-muted">Ainda sem participações.</p>
        )}
      </section>
    </>
  );
}
