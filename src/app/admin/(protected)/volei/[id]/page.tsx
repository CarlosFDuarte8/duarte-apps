import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVoleiAdmin as requireAdmin } from "@/lib/volei/auth";
import { PageHeader } from "@/components/escalas/admin-ui";
import { EventManager } from "@/components/volei/event-manager";
import { getEvent, listMembers, publicEvent } from "@/lib/volei/repository";
import { GameRoster } from "@/components/volei/game-roster";
import { formatDate } from "@/lib/volei/domain";
import { Button } from "@/components/ui/button";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { client } = await requireAdmin();
  const game = await publicEvent(id);
  const [found, members] = await Promise.all([
    getEvent(client, id),
    listMembers(client),
  ]);
  if (!found) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Vôlei"
        title={formatDate(found.event.date)}
        actions={
          <Link
            className="sc-button sc-btn-ghost"
            href={`/admin/volei?mes=${found.event.date.slice(0, 7)}`}
          >
            ← Voltar
          </Link>
        }
      />
      <Button asChild variant="outline">
        <Link href={`/admin/volei/frequencia/${id}`}>
          Conferir quem compareceu
        </Link>
      </Button>
      <Button asChild>
        <Link href={`/admin/volei/${id}/portaria`}>
          Lista de entrada para a portaria / imprimir
        </Link>
      </Button>
      <EventManager
        event={found.event}
        members={members}
        attendance={found.attendance}
      />
      {game && <GameRoster game={game} />}
    </>
  );
}
