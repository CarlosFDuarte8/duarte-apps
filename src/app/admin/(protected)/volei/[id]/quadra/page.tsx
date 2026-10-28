import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { courtData } from "@/lib/volei/court-repository";
import { formatDate, today } from "@/lib/volei/domain";
import { PageHeader } from "@/components/escalas/admin-ui";
import { Button } from "@/components/ui/button";
import { CourtBoard } from "@/components/volei/court-board";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await courtData(client, id);
  if (!data) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Vôlei · Gestão da quadra"
        title={formatDate(data.event.date)}
        description="Chegadas, times equilibrados, vencedor permanece e fila de rodízio."
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/volei/${id}`}>← Voltar ao jogo</Link>
          </Button>
        }
      />
      <CourtBoard
        eventId={id}
        version={data.version}
        state={data.state}
        roster={data.roster}
        maxTeams={data.event.max_teams ?? 3}
        closed={!!data.event.presence_closed_at || data.event.date > today()}
      />
      <Button asChild variant="outline">
        <Link href={`/admin/volei/frequencia/${id}`}>
          Conferir e concluir a chamada
        </Link>
      </Button>
    </>
  );
}
