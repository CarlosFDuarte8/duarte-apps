import { notFound } from "next/navigation";
import Link from "next/link";
import { snapshot } from "@/lib/escalas/repository";
import { ScheduleEditor } from "@/components/escalas/forms";
import {
  PageHeader,
  StatusBadge,
  monthLabel,
} from "@/components/escalas/admin-ui";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await snapshot();
  const period = state.periods.find((p) => p.id === id);
  if (!period) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Escala"
        title={monthLabel(period.month)}
        description={
          period.status === "draft"
            ? 'Ajuste as atribuições e use "Salvar e publicar" para exibir este mês na área pública. Como rascunho, só a administração enxerga esta escala.'
            : undefined
        }
        actions={
          <>
            <StatusBadge status={period.status} />
            {period.status === "published" && (
              <Link
                className="sc-button sc-btn-ghost"
                href={`/escalas/${period.month.replace("-", "/")}`}
              >
                Ver página pública
              </Link>
            )}
          </>
        }
      />
      <ScheduleEditor
        key={`${period.id}-${state.revision}`}
        period={period}
        context={{
          members: state.members,
          dependencies: state.dependencies,
          rules: state.rules,
        }}
        revision={state.revision}
      />
    </>
  );
}
